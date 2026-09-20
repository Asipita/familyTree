export type Person = {
  id: string; name: string; born: string; died?: string; living: boolean;
  biography: string; biographyBy?: string; accountId?: string;
};
export type FamilyLink = { id: string; kind: "parent" | "partner"; from: string; to: string };
export type StoryStatus = "Draft" | "In review" | "Published";
export type Story = { id: string; subjectId: string; authorId: string; title: string; html: string; source: string; status: StoryStatus; updated: string; reviews: { personId: string; note: string; decision: "Approved" | "Changes requested" }[] };
export type Request = { id: string; kind: "Invitation" | "Claim" | "Connection"; personId: string; detail: string; status: "Prepared" | "Pending review"; created: string };
export type FamilyState = { version: 1; viewerId: string; people: Person[]; links: FamilyLink[]; stories: Story[]; requests: Request[]; settings: { email: string; reviewNotifications: boolean; discoverable: boolean } };

const people: Person[] = [
  { id: "adewale", name: "Chief Adewale", born: "1928", died: "2004", living: false, biography: "A patient builder who believed everyone deserved a place at the table.", biographyBy: "kemi" },
  { id: "sade", name: "Alhaja Sade", born: "1933", died: "2011", living: false, biography: "She remembered every birthday, visitor, and unfinished conversation.", biographyBy: "kemi" },
  { id: "funmi", name: "Funmi Adebayo", born: "1948", died: "2021", living: false, biography: "She never called it leadership. She noticed what needed doing, and did it before anyone asked.", biographyBy: "kemi" },
  { id: "bayo", name: "Bayo Martins", born: "1947", died: "2019", living: false, biography: "A steady presence whose best advice usually arrived while fixing something.", biographyBy: "tola" },
  { id: "segun", name: "Segun Adebayo", born: "1952", died: "2017", living: false, biography: "He made room for questions and never rushed an answer.", biographyBy: "tunde" },
  { id: "nneka", name: "Nneka Adebayo", born: "1954", living: true, biography: "Our storyteller, turning ordinary afternoons into memories worth keeping.", biographyBy: "tunde" },
  { id: "kemi", name: "Kemi Martins", born: "1981", living: true, accountId: "account-kemi", biography: "Kemi is gathering the fragments of our family history, one conversation at a time.", biographyBy: "tola" },
  { id: "tola", name: "Tola Martins", born: "1984", living: true, accountId: "account-tola", biography: "A keeper of the details the rest of us almost forgot.", biographyBy: "kemi" },
  { id: "tunde", name: "Tunde Adebayo", born: "1980", living: true, biography: "The cousin who remembers the stories that begin with ‘you had to be there.’", biographyBy: "tola" },
];
const connections: [FamilyLink["kind"], string, string][] = [
  ["partner", "adewale", "sade"], ["partner", "funmi", "bayo"], ["partner", "segun", "nneka"],
  ["parent", "adewale", "funmi"], ["parent", "sade", "funmi"], ["parent", "adewale", "segun"], ["parent", "sade", "segun"],
  ["parent", "funmi", "kemi"], ["parent", "bayo", "kemi"], ["parent", "funmi", "tola"], ["parent", "bayo", "tola"], ["parent", "segun", "tunde"], ["parent", "nneka", "tunde"],
];
export const seedFamily: FamilyState = {
  version: 1, viewerId: "kemi", people,
  links: connections.map(([kind, from, to]) => ({ id: `${kind}-${from}-${to}`, kind, from, to })),
  stories: [
    { id: "made-room", subjectId: "funmi", authorId: "kemi", title: "The woman who made room", status: "Published", updated: "2026-09-12", source: "Kemi’s memories of Sunday lunches at home.", reviews: [{ personId: "tola", note: "I remember that extra chair too.", decision: "Approved" }], html: "<p>She never called it leadership. She just noticed what needed doing, and did it before anyone asked.</p><p>In the town where my mother grew up, people knew Funmi by the way she made room. There was always another chair, another plate, another person who needed to be heard.</p><h2>What she gave us</h2><p>She taught us that a family is not only the people you are born to. It is also the people you make space for, especially when it is inconvenient.</p><blockquote><p>If there is enough for one, there is enough to share.</p></blockquote><p>I still hear her say it whenever the table feels too full.</p>" },
    { id: "blue-cupboard", subjectId: "funmi", authorId: "tola", title: "Our mother’s blue cupboard", status: "In review", updated: "2026-09-16", source: "Tola’s childhood recollection. The year still needs confirming.", reviews: [], html: "<p>There was a blue cupboard in the kitchen that nobody was allowed to throw away. Its doors never quite closed, but Mum said a house needed something older than its occupants.</p><h2>What was inside</h2><p>Spare plates, letters tied with string, and the good tablecloth. She could find anything without looking.</p><p>I think we brought it from the old house in 1989. Kemi remembers the move differently. I would like us to settle that detail together.</p>" },
    { id: "things-repaired", subjectId: "bayo", authorId: "kemi", title: "The things he repaired", status: "Draft", updated: "2026-09-18", source: "Personal recollection.", reviews: [], html: "<p>Dad kept a tin of screws under the workbench. Nothing was ever beyond repair, at least not until he had tried.</p>" },
    { id: "gathering", subjectId: "kemi", authorId: "tola", title: "The one who kept asking", status: "Published", updated: "2026-09-10", source: "Tola’s memories of family gatherings.", reviews: [{ personId: "nneka", note: "This sounds just like Kemi.", decision: "Approved" }], html: "<p>Kemi always asked one more question. Who was in the photograph? Where had they lived? Who remembered their voice?</p><p>Now those questions are bringing us together again.</p>" },
  ], requests: [], settings: { email: "kemi@example.com", reviewNotifications: true, discoverable: false },
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
  return "Family connection";
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
