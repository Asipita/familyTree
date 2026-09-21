import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { emptyFamily, type FamilyState, type Person, type Story } from "@/lib/family";
import { getDb, withTransaction, type FamilyTransaction } from "@/lib/db/client";
import { familyLinks, familyMembers, familyViews, people, requests, stories, storyReviews } from "@/lib/db/schema";
import { retryDatabaseRead } from "@/lib/db/read-retry";
import { FamilyAccessError, InvalidFamilyDataError } from "@/lib/family-errors";
import { resolveSiblingConnections } from "@/lib/family-relationships";
import { authorizeFamilySave } from "@/lib/family-permissions";

export type AuthUser = { id: string; email?: string | null; name?: string | null; emailVerified?: boolean };
export type FamilyMember = typeof familyMembers.$inferSelect;
type QueryDb = ReturnType<typeof getDb> | FamilyTransaction;

export async function memberFor(db: QueryDb, userId: string) {
  const [member] = await db.select().from(familyMembers).where(eq(familyMembers.userId, userId)).limit(1);
  return member;
}
export async function lockUser(tx: FamilyTransaction, userId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${userId}, 0))`);
}
export async function lockView(tx: FamilyTransaction, viewId: string) {
  const [view] = await tx.select().from(familyViews).where(eq(familyViews.id, viewId)).for("update");
  if (!view) throw new FamilyAccessError("FAMILY_FORBIDDEN");
  return view;
}

function viewQueries(db: QueryDb, member: FamilyMember) {
  return [
    db.select().from(familyViews).where(eq(familyViews.id, member.viewId)).limit(1),
    db.select().from(people).where(eq(people.viewId, member.viewId)).orderBy(asc(people.name)),
    db.select().from(familyLinks).where(eq(familyLinks.viewId, member.viewId)).orderBy(asc(familyLinks.id)),
    db.select().from(stories).where(eq(stories.viewId, member.viewId)).orderBy(desc(stories.updated)),
    db.select().from(storyReviews).where(eq(storyReviews.viewId, member.viewId)).orderBy(asc(storyReviews.createdAt), asc(storyReviews.id)),
    db.select().from(requests).where(eq(requests.viewId, member.viewId)).orderBy(desc(requests.created)),
    db.select().from(familyMembers).where(eq(familyMembers.userId, member.userId)).limit(1),
  ] as const;
}
type QueryResults<T extends readonly unknown[]> = { [K in keyof T]: Awaited<T[K]> };
type Snapshot = QueryResults<ReturnType<typeof viewQueries>>;
function fromSnapshot(snapshot: Snapshot): FamilyState {
  const [[view], viewPeople, links, viewStories, reviews, viewRequests, [member]] = snapshot;
  if (!view || !member || member.viewId !== view.id) throw new FamilyAccessError("FAMILY_CONFLICT", 409);
  return resolveSiblingConnections({
    version: 1, revision: view.revision, viewerId: member.personId, onboardingComplete: member.onboardingComplete,
    people: viewPeople.map((p): Person => ({ id: p.id, name: p.name, born: p.born, living: p.living, biography: p.biography,
      createdBy: p.createdByUserId, ...(p.died ? { died: p.died } : {}), ...(p.biographyBy ? { biographyBy: p.biographyBy } : {}),
      ...(p.accountUserId ? { accountId: p.accountUserId } : {}), ...(p.gender === "male" || p.gender === "female" ? { gender: p.gender } : {}),
    })),
    links: links.map(l => ({ id: l.id, kind: l.kind as "parent" | "partner" | "relative", from: l.fromPersonId, to: l.toPersonId,
      ...(l.relation ? { relation: l.relation as NonNullable<FamilyState["links"][number]["relation"]> } : {}), complete: l.complete })),
    stories: viewStories.map(s => ({ id: s.id, subjectId: s.subjectId, authorId: s.authorId, title: s.title, html: s.html, source: s.source,
      status: s.status as Story["status"], updated: s.updated, reviews: reviews.filter(r => r.storyId === s.id).map(r => ({ personId: r.personId, note: r.note, decision: r.decision as "Approved" | "Changes requested" })) })),
    requests: viewRequests.map(r => ({ id: r.id, kind: r.kind as FamilyState["requests"][number]["kind"], personId: r.personId, detail: r.detail, status: r.status as "Prepared" | "Pending review", created: r.created })),
    settings: { email: member.email, reviewNotifications: member.reviewNotifications, discoverable: member.discoverable },
  });
}
export async function readState(tx: FamilyTransaction, member: FamilyMember) {
  return fromSnapshot(await Promise.all(viewQueries(tx, member)) as Snapshot);
}

export async function getOrCreateFamily(user: AuthUser) {
  const db = getDb();
  const member = await retryDatabaseRead(() => memberFor(db, user.id));
  if (member) return retryDatabaseRead(async () => fromSnapshot(await db.batch(viewQueries(db, member)) as Snapshot));
  return withTransaction(async tx => {
    await lockUser(tx, user.id);
    const existing = await memberFor(tx, user.id);
    if (existing) return readState(tx, existing);
    const viewId = randomUUID();
    await tx.insert(familyViews).values({ id: viewId, ownerUserId: user.id, viewerPersonId: emptyFamily.viewerId });
    await tx.insert(people).values({ viewId, id: emptyFamily.viewerId, name: user.name?.trim() || "You", born: "", living: true, biography: "", accountUserId: user.id, createdByUserId: user.id });
    const [created] = await tx.insert(familyMembers).values({ viewId, userId: user.id, personId: emptyFamily.viewerId, email: user.email ?? "" }).returning();
    return readState(tx, created);
  });
}

export async function saveFamily(user: AuthUser, input: FamilyState) {
  if (!input || input.version !== 1 || !Array.isArray(input.people) || !Array.isArray(input.links)
    || !Array.isArray(input.stories) || !Array.isArray(input.requests) || !input.settings
    || typeof input.onboardingComplete !== "boolean") throw new InvalidFamilyDataError();
  // No automatic write retries: an interrupted response may hide a committed write.
  return withTransaction(async tx => {
    await lockUser(tx, user.id);
    const member = await memberFor(tx, user.id);
    if (!member) throw new FamilyAccessError("FAMILY_FORBIDDEN");
    const view = await lockView(tx, member.viewId);
    const current = await readState(tx, member);
    const next = authorizeFamilySave(current, input, user.id);
    const viewId = member.viewId;
    for (const p of next.people) {
      const old = current.people.find(item => item.id === p.id);
      if (isDeepStrictEqual(old, p)) continue;
      const values = { name: p.name.trim(), born: p.born, died: p.died ?? null, living: p.living, biography: p.biography, biographyBy: p.biographyBy ?? null, gender: p.gender ?? null, updatedAt: new Date() };
      if (old) await tx.update(people).set(values).where(and(eq(people.viewId, viewId), eq(people.id, p.id)));
      else await tx.insert(people).values({ ...values, viewId, id: p.id, createdByUserId: user.id });
    }
    for (const l of next.links) {
      const old = current.links.find(item => item.id === l.id);
      if (old) {
        if (old.complete !== l.complete) await tx.update(familyLinks).set({ complete: l.complete ?? true }).where(and(eq(familyLinks.viewId, viewId), eq(familyLinks.id, l.id)));
      } else await tx.insert(familyLinks).values({ viewId, id: l.id, kind: l.kind, relation: l.relation ?? null, fromPersonId: l.from, toPersonId: l.to, complete: l.complete ?? true });
    }
    for (const story of next.stories) {
      const old = current.stories.find(item => item.id === story.id);
      if (isDeepStrictEqual(old, story)) continue;
      const { reviews } = story;
      const values = { id: story.id, subjectId: story.subjectId, authorId: story.authorId, title: story.title, html: story.html, source: story.source, status: story.status, updated: story.updated };
      if (old) await tx.update(stories).set({ ...values, updatedAt: new Date() }).where(and(eq(stories.viewId, viewId), eq(stories.id, story.id)));
      else await tx.insert(stories).values({ ...values, viewId });
      for (const review of reviews.slice(old?.reviews.length ?? 0)) await tx.insert(storyReviews).values({ ...review, viewId, storyId: story.id });
    }
    for (const r of next.requests.filter(r => !current.requests.some(old => old.id === r.id))) await tx.insert(requests).values({ id: r.id, kind: r.kind, personId: r.personId, detail: r.detail, status: r.status, created: r.created, viewId });
    await tx.update(familyMembers).set({ email: user.email ?? member.email, reviewNotifications: next.settings.reviewNotifications, discoverable: next.settings.discoverable, onboardingComplete: next.onboardingComplete, updatedAt: new Date() }).where(eq(familyMembers.userId, user.id));
    await tx.update(familyViews).set({ revision: view.revision + 1, updatedAt: new Date() }).where(eq(familyViews.id, viewId));
    // Snapshot and permission checks are in the write transaction, never after commit.
    return readState(tx, member);
  });
}
