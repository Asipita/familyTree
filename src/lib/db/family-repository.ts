import { and, asc, desc, eq } from "drizzle-orm";
import { emptyFamily, type FamilyState, type Person, type Story } from "@/lib/family";
import { getDb } from "@/lib/db/client";
import { familyLinks, familySettings, familyViews, people, requests, stories, storyReviews } from "@/lib/db/schema";

type AuthUser = { id: string; email?: string | null; name?: string | null };

function asFamilyState(rows: {
  view: typeof familyViews.$inferSelect;
  people: (typeof people.$inferSelect)[];
  links: (typeof familyLinks.$inferSelect)[];
  stories: (typeof stories.$inferSelect)[];
  reviews: (typeof storyReviews.$inferSelect)[];
  requests: (typeof requests.$inferSelect)[];
  settings: typeof familySettings.$inferSelect | undefined;
}): FamilyState {
  const reviewsByStory = new Map<string, Story["reviews"]>();
  for (const review of rows.reviews) {
    const current = reviewsByStory.get(review.storyId) ?? [];
    current.push({ personId: review.personId, note: review.note, decision: review.decision as "Approved" | "Changes requested" });
    reviewsByStory.set(review.storyId, current);
  }

  return {
    version: 1,
    viewerId: rows.view.viewerPersonId,
    onboardingComplete: rows.view.onboardingComplete,
    people: rows.people.map((person): Person => ({
      id: person.id,
      name: person.name,
      born: person.born,
      ...(person.died ? { died: person.died } : {}),
      living: person.living,
      biography: person.biography,
      ...(person.biographyBy ? { biographyBy: person.biographyBy } : {}),
      ...(person.accountUserId ? { accountId: person.accountUserId } : {}),
      ...(person.gender === "male" || person.gender === "female" ? { gender: person.gender } : {}),
    })),
    links: rows.links.map((link) => ({ id: link.id, kind: link.kind as "parent" | "partner" | "relative", from: link.fromPersonId, to: link.toPersonId, ...(link.relation ? { relation: link.relation as "sibling" | "grandparent" | "uncle" | "aunt" | "cousin" | "other" } : {}), complete: link.complete })),
    stories: rows.stories.map((story) => ({
      id: story.id,
      subjectId: story.subjectId,
      authorId: story.authorId,
      title: story.title,
      html: story.html,
      source: story.source,
      status: story.status as Story["status"],
      updated: story.updated,
      reviews: reviewsByStory.get(story.id) ?? [],
    })),
    requests: rows.requests.map((request) => ({ id: request.id, kind: request.kind as "Invitation" | "Claim" | "Connection", personId: request.personId, detail: request.detail, status: request.status as "Prepared" | "Pending review", created: request.created })),
    settings: {
      email: rows.settings?.email ?? "",
      reviewNotifications: rows.settings?.reviewNotifications ?? true,
      discoverable: rows.settings?.discoverable ?? false,
    },
  };
}

async function readView(viewId: string) {
  const db = getDb();
  const [view] = await db.select().from(familyViews).where(eq(familyViews.id, viewId)).limit(1);
  if (!view) throw new Error("Family view not found.");
  const [viewPeople, links, viewStories, reviews, viewRequests, settings] = await Promise.all([
    db.select().from(people).where(eq(people.viewId, viewId)).orderBy(asc(people.name)),
    db.select().from(familyLinks).where(eq(familyLinks.viewId, viewId)).orderBy(asc(familyLinks.id)),
    db.select().from(stories).where(eq(stories.viewId, viewId)).orderBy(desc(stories.updated)),
    db.select().from(storyReviews).where(eq(storyReviews.viewId, viewId)).orderBy(asc(storyReviews.createdAt)),
    db.select().from(requests).where(eq(requests.viewId, viewId)).orderBy(desc(requests.created)),
    db.select().from(familySettings).where(eq(familySettings.viewId, viewId)).limit(1),
  ]);
  return asFamilyState({ view, people: viewPeople, links, stories: viewStories, reviews, requests: viewRequests, settings: settings[0] });
}

function initialFamilyForUser(user: AuthUser): FamilyState {
  const name = user.name?.trim() || user.email?.split("@")[0] || "You";
  return {
    ...emptyFamily,
    people: [{ id: emptyFamily.viewerId, name, born: "", living: true, biography: "", accountId: user.id }],
    settings: { ...emptyFamily.settings, email: user.email ?? "" },
  };
}

export async function getOrCreateFamily(user: AuthUser) {
  const db = getDb();
  const [existing] = await db.select().from(familyViews).where(eq(familyViews.ownerUserId, user.id)).limit(1);
  if (existing) return readView(existing.id);
  const view = await createView(user, initialFamilyForUser(user));
  return readView(view.id);
}

async function createView(user: AuthUser, state: FamilyState) {
  const db = getDb();
  const [view] = await db.insert(familyViews).values({ ownerUserId: user.id, viewerPersonId: state.viewerId, onboardingComplete: state.onboardingComplete }).returning();
  if (!view) throw new Error("Could not create the family view.");
  await db.insert(people).values(state.people.map((person) => ({ viewId: view.id, id: person.id, name: person.name, born: person.born, died: person.died ?? null, living: person.living, biography: person.biography, biographyBy: person.biographyBy ?? null, accountUserId: person.id === state.viewerId ? user.id : null, gender: person.gender ?? null })));
  if (state.links.length) await db.insert(familyLinks).values(state.links.map((link) => ({ viewId: view.id, id: link.id, kind: link.kind, relation: link.relation ?? null, complete: link.complete ?? true, fromPersonId: link.from, toPersonId: link.to })));
  if (state.stories.length) await db.insert(stories).values(state.stories.map((story) => ({ viewId: view.id, id: story.id, subjectId: story.subjectId, authorId: story.authorId, title: story.title, html: story.html, source: story.source, status: story.status, updated: story.updated })));
  const reviews = state.stories.flatMap((story) => story.reviews.map((review) => ({ viewId: view.id, storyId: story.id, personId: review.personId, note: review.note, decision: review.decision })));
  if (reviews.length) await db.insert(storyReviews).values(reviews);
  if (state.requests.length) await db.insert(requests).values(state.requests.map((request) => ({ viewId: view.id, id: request.id, kind: request.kind, personId: request.personId, detail: request.detail, status: request.status, created: request.created })));
  await db.insert(familySettings).values({ viewId: view.id, ...state.settings });
  return view;
}

export async function saveFamily(user: AuthUser, input: FamilyState) {
  const db = getDb();
  const [view] = await db.select().from(familyViews).where(eq(familyViews.ownerUserId, user.id)).limit(1);
  if (!view) {
    await createView(user, initialFamilyForUser(user));
    return saveFamily(user, input);
  }
  if (input.version !== 1 || !input.people.some((person) => person.id === view.viewerPersonId)) throw new Error("Invalid family data.");
  const safeState = { ...input, viewerId: view.viewerPersonId };
  const operations: any[] = [
    db.delete(storyReviews).where(eq(storyReviews.viewId, view.id)),
    db.delete(stories).where(eq(stories.viewId, view.id)),
    db.delete(familyLinks).where(eq(familyLinks.viewId, view.id)),
    db.delete(requests).where(eq(requests.viewId, view.id)),
    db.delete(people).where(eq(people.viewId, view.id)),
    db.insert(people).values(safeState.people.map((person) => ({ viewId: view.id, id: person.id, name: person.name, born: person.born, died: person.died ?? null, living: person.living, biography: person.biography, biographyBy: person.biographyBy ?? null, accountUserId: person.id === view.viewerPersonId ? user.id : null, gender: person.gender ?? null }))),
    ...(safeState.links.length ? [db.insert(familyLinks).values(safeState.links.map((link) => ({ viewId: view.id, id: link.id, kind: link.kind, relation: link.relation ?? null, complete: link.complete ?? true, fromPersonId: link.from, toPersonId: link.to })))] : []),
    ...(safeState.stories.length ? [db.insert(stories).values(safeState.stories.map((story) => ({ viewId: view.id, id: story.id, subjectId: story.subjectId, authorId: story.authorId, title: story.title, html: story.html, source: story.source, status: story.status, updated: story.updated })))] : []),
    db.update(familyViews).set({ viewerPersonId: safeState.viewerId, onboardingComplete: safeState.onboardingComplete, updatedAt: new Date() }).where(eq(familyViews.id, view.id)),
    db.update(familySettings).set({ ...safeState.settings, updatedAt: new Date() }).where(eq(familySettings.viewId, view.id)),
  ];
  const reviews = safeState.stories.flatMap((story) => story.reviews.map((review) => ({ viewId: view.id, storyId: story.id, personId: review.personId, note: review.note, decision: review.decision })));
  if (reviews.length) operations.push(db.insert(storyReviews).values(reviews));
  if (safeState.requests.length) operations.push(db.insert(requests).values(safeState.requests.map((request) => ({ viewId: view.id, id: request.id, kind: request.kind, personId: request.personId, detail: request.detail, status: request.status, created: request.created }))));
  await db.batch(operations as never);
  return readView(view.id);
}
