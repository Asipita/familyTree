import { createHash, randomBytes } from "node:crypto";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { getDb, withTransaction } from "@/lib/db/client";
import { familyMembers, familyViews, invitations, people } from "@/lib/db/schema";
import { lockUser, lockView, memberFor, readState, type AuthUser } from "@/lib/db/family-repository";
import { canInvite } from "@/lib/family";
import { FamilyAccessError, InvalidFamilyDataError } from "@/lib/family-errors";

const invalid = (): never => { throw new FamilyAccessError("INVITATION_INVALID", 410); };
const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");
const validToken = (token: unknown): token is string => typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
const emailKey = (email: string) => email.trim().toLowerCase();

export async function createInvitation(user: AuthUser, personId: unknown, email: unknown) {
  if (typeof personId !== "string" || typeof email !== "string" || email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new InvalidFamilyDataError();
  return withTransaction(async tx => {
    await lockUser(tx, user.id);
    const member = await memberFor(tx, user.id);
    if (!member) throw new FamilyAccessError("FAMILY_FORBIDDEN");
    await lockView(tx, member.viewId);
    const state = await readState(tx, member);
    const person = state.people.find(p => p.id === personId);
    if (!person || !canInvite(state, person)) throw new FamilyAccessError("FAMILY_FORBIDDEN");
    if (emailKey(email) === emailKey(user.email ?? "")) throw new InvalidFamilyDataError();
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await tx.update(invitations).set({ revokedAt: new Date() }).where(and(eq(invitations.viewId, member.viewId), eq(invitations.personId, personId), isNull(invitations.acceptedAt), isNull(invitations.revokedAt)));
    const [invite] = await tx.insert(invitations).values({ viewId: member.viewId, personId, invitedByUserId: user.id, email: emailKey(email), tokenHash: tokenHash(token), expiresAt }).returning({ id: invitations.id });
    return { id: invite.id, path: `/join?invite=${token}`, expiresAt: expiresAt.toISOString() };
  });
}

export async function listInvitations(user: AuthUser) {
  const db = getDb();
  const member = await memberFor(db, user.id);
  if (!member) throw new FamilyAccessError("FAMILY_FORBIDDEN");
  const rows = await db.select({ id: invitations.id, personId: invitations.personId, email: invitations.email, expiresAt: invitations.expiresAt, acceptedAt: invitations.acceptedAt, revokedAt: invitations.revokedAt })
    .from(invitations).where(and(eq(invitations.viewId, member.viewId), eq(invitations.invitedByUserId, user.id))).orderBy(desc(invitations.createdAt));
  return rows.map(r => ({ id: r.id, personId: r.personId, email: r.email, expiresAt: r.expiresAt.toISOString(), status: r.acceptedAt ? "Accepted" : r.revokedAt ? "Revoked" : r.expiresAt <= new Date() ? "Expired" : "Pending" }));
}

export async function revokeInvitation(user: AuthUser, id: unknown) {
  if (typeof id !== "string" || !/^[a-f0-9-]{36}$/.test(id)) throw new InvalidFamilyDataError();
  return withTransaction(async tx => {
    await lockUser(tx, user.id);
    const member = await memberFor(tx, user.id);
    if (!member) throw new FamilyAccessError("FAMILY_FORBIDDEN");
    await lockView(tx, member.viewId);
    await tx.update(invitations).set({ revokedAt: new Date() }).where(and(eq(invitations.id, id), eq(invitations.viewId, member.viewId), eq(invitations.invitedByUserId, user.id), isNull(invitations.acceptedAt)));
    return { ok: true };
  });
}

export async function previewInvitation(token: unknown) {
  if (!validToken(token)) return invalid();
  const db = getDb();
  const [invite] = await db.select().from(invitations).where(eq(invitations.tokenHash, tokenHash(token))).limit(1);
  if (!invite || invite.revokedAt || invite.acceptedAt || invite.expiresAt <= new Date()) return invalid();
  const [person] = await db.select({ name: people.name, living: people.living, account: people.accountUserId }).from(people).where(and(eq(people.viewId, invite.viewId), eq(people.id, invite.personId)));
  if (!person?.living || person.account) return invalid();
  // Possession of a link only reveals the invited name, never the family's records.
  return { name: person.name, expiresAt: invite.expiresAt.toISOString() };
}

export async function acceptInvitation(user: AuthUser, token: unknown) {
  if (!validToken(token)) return invalid();
  return withTransaction(async tx => {
    await lockUser(tx, user.id);
    const [lookup] = await tx.select({ viewId: invitations.viewId }).from(invitations).where(eq(invitations.tokenHash, tokenHash(token))).limit(1);
    if (!lookup) return invalid();
    // All operations on an invitation take the tree lock before its row lock.
    await lockView(tx, lookup.viewId);
    const [invite] = await tx.select().from(invitations).where(eq(invitations.tokenHash, tokenHash(token))).for("update");
    if (!invite || invite.revokedAt) return invalid();
    const member = await memberFor(tx, user.id);
    // Retrying a successfully accepted link is safe for its recipient only.
    if (invite.acceptedByUserId === user.id && member?.viewId === invite.viewId && member.personId === invite.personId) return { ok: true };
    if (invite.acceptedAt || invite.expiresAt <= new Date()) return invalid();
    if (!user.email || emailKey(user.email) !== invite.email) throw new FamilyAccessError("INVITATION_EMAIL");
    if (!user.emailVerified) throw new FamilyAccessError("INVITATION_VERIFY_EMAIL");
    const [person] = await tx.select().from(people).where(and(eq(people.viewId, invite.viewId), eq(people.id, invite.personId)));
    if (!person?.living || person.accountUserId) return invalid();
    if (member) {
      // The provider may have created an empty starting point after sign-up.
      // Never discard an established tree or silently merge two identities.
      if (member.viewId === invite.viewId) throw new FamilyAccessError("INVITATION_EXISTING_TREE", 409);
      await lockView(tx, member.viewId);
      const personal = await readState(tx, member);
      if (personal.onboardingComplete || personal.people.length !== 1 || personal.links.length || personal.stories.length || personal.requests.length || personal.people[0].biography) throw new FamilyAccessError("INVITATION_EXISTING_TREE", 409);
      // Keep the empty starter records intact; only move this user's viewpoint.
      await tx.update(familyMembers).set({ viewId: invite.viewId, personId: invite.personId, onboardingComplete: true, email: user.email, updatedAt: new Date() }).where(eq(familyMembers.userId, user.id));
    } else {
      await tx.insert(familyMembers).values({ userId: user.id, viewId: invite.viewId, personId: invite.personId, onboardingComplete: true, email: user.email });
    }
    await tx.update(people).set({ accountUserId: user.id, updatedAt: new Date() }).where(and(eq(people.viewId, invite.viewId), eq(people.id, invite.personId)));
    await tx.update(invitations).set({ acceptedByUserId: user.id, acceptedAt: new Date() }).where(eq(invitations.id, invite.id));
    await tx.update(invitations).set({ revokedAt: new Date() }).where(and(eq(invitations.viewId, invite.viewId), eq(invitations.personId, invite.personId), isNull(invitations.acceptedAt), isNull(invitations.revokedAt)));
    await tx.update(familyViews).set({ revision: sql`${familyViews.revision} + 1`, updatedAt: new Date() }).where(eq(familyViews.id, invite.viewId));
    return { ok: true };
  });
}
