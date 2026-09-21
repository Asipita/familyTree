import { isDeepStrictEqual as equal } from "node:util";
import { canEditProfile, canEditStory, connectedPeople, reviewStory, type FamilyState, type Person } from "@/lib/family";
import { FamilyAccessError, InvalidFamilyDataError } from "@/lib/family-errors";
import { resolveSiblingConnections } from "@/lib/family-relationships";

function invalid(): never { throw new InvalidFamilyDataError(); }
function forbidden(): never { throw new FamilyAccessError("FAMILY_FORBIDDEN"); }
const text = (value: unknown, max: number, required = false) => typeof value === "string" && value.length <= max && (!required || !!value.trim());
const basic = (p: Person) => [p.name, p.born, p.died ?? "", p.living, p.gender ?? ""];
const uniqueIds = (items: { id: string }[]) => new Set(items.map(p => p.id)).size === items.length;

// Treat the full snapshot as untrusted input. Only permitted differences reach SQL.
export function authorizeFamilySave(current: FamilyState, input: FamilyState, userId: string): FamilyState {
  if (!input || input.version !== 1 || !Array.isArray(input.people) || !Array.isArray(input.links)
    || !Array.isArray(input.stories) || !Array.isArray(input.requests) || !input.settings
    || typeof input.onboardingComplete !== "boolean") invalid();
  if (input.revision !== current.revision) throw new FamilyAccessError("FAMILY_CONFLICT", 409);
  if (input.viewerId !== current.viewerId || (current.onboardingComplete && !input.onboardingComplete)) forbidden();
  if (input.people.length > 5000 || input.links.length > 15000 || input.stories.length > 10000 || input.requests.length > 5000) invalid();
  for (const p of input.people) {
    if (!p || !text(p.id, 120, true) || !text(p.name, 300, true) || !text(p.born, 10)
      || (p.died !== undefined && !text(p.died, 10)) || typeof p.living !== "boolean" || !text(p.biography, 4000)
      || (p.gender !== undefined && !["male", "female"].includes(p.gender))) invalid();
  }
  if (!uniqueIds(input.people)) invalid();
  const existing = new Map(current.people.map(p => [p.id, p]));
  const people = input.people.map(person => {
    const old = existing.get(person.id);
    if (old) {
      if ((person.accountId ?? null) !== (old.accountId ?? null) || (person.createdBy ?? null) !== (old.createdBy ?? null)) forbidden();
      if (!equal(basic(person), basic(old)) && !canEditProfile(current, old)) forbidden();
      if (old.accountId && !person.living) forbidden();
      if (person.biography !== old.biography || person.biographyBy !== old.biographyBy) {
        if (person.id === current.viewerId || person.biographyBy !== current.viewerId) forbidden();
      }
    } else {
      if (person.accountId || (person.createdBy && person.createdBy !== userId)) forbidden();
      if (person.biography && person.biographyBy !== current.viewerId) forbidden();
    }
    return { ...person, createdBy: old?.createdBy ?? userId };
  });
  if (current.people.some(p => !people.some(n => n.id === p.id))) forbidden();
  const ids = new Set(people.map(p => p.id));
  for (const link of input.links) {
    if (!link || !text(link.id, 300, true) || !ids.has(link.from) || !ids.has(link.to) || link.from === link.to
      || !["parent", "partner", "relative"].includes(link.kind)
      || (link.kind === "relative" && !["sibling", "grandparent", "uncle", "aunt", "cousin", "other"].includes(link.relation ?? ""))) invalid();
  }
  if (!uniqueIds(input.links)) invalid();
  const next = resolveSiblingConnections({ ...input, people });
  for (const old of current.links) {
    const link = next.links.find(l => l.id === old.id);
    if (!link || !equal([link.kind, link.from, link.to, link.relation], [old.kind, old.from, old.to, old.relation])) forbidden();
    if (link.complete !== old.complete && !(link.kind === "relative" && link.relation === "sibling" && link.complete)) forbidden();
  }
  if (connectedPeople(next).length !== people.length) invalid();
  for (const story of next.stories) {
    if (!story || !text(story.id, 120, true) || !ids.has(story.subjectId) || !ids.has(story.authorId)
      || !text(story.title, 300, true) || !text(story.html, 100000) || !text(story.source, 4000)
      || !text(story.updated, 40) || !["Draft", "In review", "Published"].includes(story.status) || !Array.isArray(story.reviews)) invalid();
    const old = current.stories.find(s => s.id === story.id);
    if (equal(old, story)) continue;
    if (!old) {
      if (!canEditStory(current.viewerId, story) || story.status === "Published" || story.reviews.length) forbidden();
    } else if (canEditStory(current.viewerId, old)) {
      if (story.authorId !== old.authorId || story.subjectId !== old.subjectId || !equal(story.reviews, old.reviews) || story.status === "Published") forbidden();
    } else {
      const review = story.reviews.at(-1);
      if (!review || review.personId !== current.viewerId || !text(review.note, 4000, true)
        || !["Approved", "Changes requested"].includes(review.decision)) forbidden();
      let reviewed: FamilyState;
      try { reviewed = reviewStory(current, story.id, review.decision, review.note); } catch { return forbidden(); }
      if (!equal(story, reviewed.stories.find(s => s.id === story.id))) forbidden();
    }
  }
  if (!uniqueIds(next.stories) || current.stories.some(s => !next.stories.some(n => n.id === s.id))) forbidden();
  for (const request of next.requests) {
    if (!request || !text(request.id, 120, true) || !ids.has(request.personId) || !text(request.detail, 5000)
      || !text(request.created, 40) || !["Prepared", "Pending review"].includes(request.status)) invalid();
    const old = current.requests.find(r => r.id === request.id);
    if (old ? !equal(old, request) : !["Connection", "Claim"].includes(request.kind)) forbidden();
  }
  if (!uniqueIds(next.requests) || current.requests.some(r => !next.requests.some(n => n.id === r.id))) forbidden();
  if (!text(next.settings.email, 320) || typeof next.settings.reviewNotifications !== "boolean" || typeof next.settings.discoverable !== "boolean") invalid();
  return next;
}
