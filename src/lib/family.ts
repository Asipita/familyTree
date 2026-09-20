export type Person = {
  id: string; name: string; born: string; died?: string; living: boolean;
  biography: string; biographyBy?: string; accountId?: string; gender?: "male" | "female";
};
export type RelativeKind = "sibling" | "grandparent" | "uncle" | "aunt" | "cousin" | "other";
export type FamilyLink = { id: string; kind: "parent" | "partner" | "relative"; from: string; to: string; relation?: RelativeKind; complete?: boolean };
export type StoryStatus = "Draft" | "In review" | "Published";
export type Story = { id: string; subjectId: string; authorId: string; title: string; html: string; source: string; status: StoryStatus; updated: string; reviews: { personId: string; note: string; decision: "Approved" | "Changes requested" }[] };
export type Request = { id: string; kind: "Invitation" | "Claim" | "Connection"; personId: string; detail: string; status: "Prepared" | "Pending review"; created: string };
export type FamilyState = { version: 1; viewerId: string; onboardingComplete: boolean; people: Person[]; links: FamilyLink[]; stories: Story[]; requests: Request[]; settings: { email: string; reviewNotifications: boolean; discoverable: boolean } };

export const emptyFamily: FamilyState = {
  version: 1,
  viewerId: "self",
  onboardingComplete: false,
  people: [{ id: "self", name: "You", born: "", living: true, biography: "" }],
  links: [],
  stories: [],
  requests: [],
  settings: { email: "", reviewNotifications: true, discoverable: false },
};

export function initials(name: string) { return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase(); }
export function lifespan(person: Person) { return `${person.born || "Unknown"} — ${person.living ? "Living" : person.died || "Unknown"}`; }
export function canWrite(viewerId: string, subjectId: string) { return viewerId !== subjectId; }
export function canEditStory(viewerId: string, story: Story) { return story.authorId === viewerId && canWrite(viewerId, story.subjectId); }
export function connectedPeople(state: FamilyState) {
  const ids = new Set([state.viewerId]);
  let changed = true;
  while (changed) { changed = false; for (const link of state.links) if (ids.has(link.from) || ids.has(link.to)) { for (const id of [link.from, link.to]) if (!ids.has(id)) { ids.add(id); changed = true; } } }
  return state.people.filter(person => ids.has(person.id));
}
export function relationTo(state: FamilyState, target: string) {
  const viewer = state.viewerId;
  if (viewer === target) return "You";
  const parents = (id: string) => state.links.filter(l => l.kind === "parent" && l.to === id).map(l => l.from);
  if (parents(viewer).includes(target)) return "Parent";
  if (parents(target).includes(viewer)) return "Child";
  if (state.links.some(l => l.kind === "partner" && [l.from, l.to].includes(viewer) && [l.from, l.to].includes(target))) return "Partner";
  if (parents(viewer).some(p => parents(target).includes(p))) return "Sibling";
  if (parents(viewer).some(p => parents(p).includes(target))) return "Grandparent";
  if (parents(viewer).some(p => parents(p).some(g => parents(target).includes(g)))) return "Parent’s sibling";
  if (parents(target).some(p => parents(p).some(g => parents(viewer).some(v => parents(v).includes(g))))) return "Cousin";
  const provisional = state.links.find(link => link.kind === "relative" && link.relation && ((link.from === viewer && link.to === target) || (link.to === viewer && link.from === target)));
  if (provisional?.relation) return provisional.relation[0].toUpperCase() + provisional.relation.slice(1);
  return "Family connection";
}

export function relativeLink(kind: RelativeKind, from: string, to: string, complete = false): FamilyLink {
  return { id: crypto.randomUUID(), kind: "relative", relation: kind, from, to, complete };
}

// Central checks are also used by the editor: hiding a button is not the rule.
export function putStory(state: FamilyState, story: Story): FamilyState {
  const previous = state.stories.find(item => item.id === story.id);
  if (!state.people.some(p => p.id === story.subjectId) || !canEditStory(state.viewerId, story) || (previous && !canEditStory(state.viewerId, previous))) throw new Error("You can only write about another person and edit your own contributions.");
  if (!story.title.trim()) throw new Error("Give this story a title.");
  if (story.status === "In review" && !story.html.replace(/<[^>]*>/g, "").trim()) throw new Error("Write a little of the story before requesting a review.");
  const updated = { ...story, status: story.status === "Published" ? "Draft" as const : story.status, reviews: previous?.reviews ?? [] };
  return { ...state, stories: previous ? state.stories.map(item => item.id === story.id ? updated : item) : [...state.stories, updated] };
}
export function reviewStory(state: FamilyState, id: string, decision: "Approved" | "Changes requested", note: string): FamilyState {
  const story = state.stories.find(s => s.id === id);
  if (!story || story.status !== "In review" || story.authorId === state.viewerId || story.subjectId === state.viewerId) throw new Error("This story needs a review from another relative.");
  if (!note.trim()) throw new Error("Add a note for the writer.");
  return { ...state, stories: state.stories.map(s => s.id !== id ? s : { ...s, status: decision === "Approved" ? "Published" : "Draft", reviews: [...s.reviews, { personId: state.viewerId, note: note.trim(), decision }] }) };
}
