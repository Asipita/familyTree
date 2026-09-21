const { test } = require("node:test");
const assert = require("node:assert/strict");
const load = require("./helpers/load-ts.cjs")();
const { authorizeFamilySave } = load("src/lib/family-permissions.ts");
const { emptyFamily, canEditProfile, canInvite, putStory, reviewStory } = load("src/lib/family.ts");
const person = (id, createdBy, accountId) => ({ id, name: id, born: "1990", living: true, biography: "", createdBy, ...(accountId ? { accountId } : {}) });
function fixture(viewerId = "guest") {
  return { ...structuredClone(emptyFamily), revision: 3, onboardingComplete: true, viewerId,
    people: [person("host", "host-user", "host-user"), person("guest", "host-user", "guest-user"), person("uncle", "host-user"), person("child", "guest-user")],
    links: ["guest", "uncle", "child"].map(to => ({ id: to, kind: "parent", from: "host", to, complete: true })) };
}
function change(state, id, fields) { const next = structuredClone(state); Object.assign(next.people.find(p => p.id === id), fields); return next; }
const deny = fn => assert.throws(fn, error => error.code === "FAMILY_FORBIDDEN");
const save = (state, next) => authorizeFamilySave(state, next, state.people.find(p => p.id === state.viewerId).accountId);
const story = subjectId => ({ id: "story", subjectId, authorId: "guest", title: "A memory", html: "<p>Remembered together.</p>", source: "Family", status: "Draft", updated: "2026-09-21", reviews: [] });

test("a claimed person edits their own basic profile even though someone else created it", () => {
  const state = fixture();
  assert.ok(canEditProfile(state, state.people[1]));
  assert.equal(save(state, change(state, "guest", { name: "New name", born: "1991-02-03", gender: "female" })).people[1].name, "New name");
});
test("creator loses basic-profile control when a person claims it", () => {
  const state = fixture("host");
  assert.equal(canEditProfile(state, state.people[1]), false);
  deny(() => save(state, change(state, "guest", { born: "1980" })));
});
test("guest edits unclaimed profiles they created, but not another creator's profiles", () => {
  const state = fixture();
  save(state, change(state, "child", { name: "Child name" }));
  deny(() => save(state, change(state, "uncle", { name: "Uncle name" })));
  assert.equal(canInvite(state, state.people[2]), false);
  assert.equal(canInvite(state, state.people[3]), true);
});
test("claim ownership and creator attribution cannot be forged or removed", () => {
  const state = fixture();
  for (const fields of [{ accountId: "guest-user" }, { createdBy: "guest-user" }, { createdBy: undefined }]) deny(() => save(state, change(state, "uncle", fields)));
  deny(() => save(state, { ...state, viewerId: "host" }));
  deny(() => save(state, change(state, "guest", { living: false })));
});
test("new relatives are attributed to the authenticated creator", () => {
  const state = fixture();
  const next = structuredClone(state);
  next.people.push({ id: "new", name: "New relative", born: "", living: true, biography: "" });
  next.links.push({ id: "new-link", kind: "parent", from: "guest", to: "new" });
  assert.equal(save(state, next).people.at(-1).createdBy, "guest-user");
  next.people.at(-1).accountId = "host-user";
  deny(() => save(state, next));
});
test("a guest can add stories and biography for every other node regardless of creator", () => {
  const state = fixture();
  for (const id of ["host", "uncle", "child"]) {
    save(state, putStory(state, story(id)));
    save(state, change(state, id, { biography: "A family memory", biographyBy: "guest" }));
  }
});
test("claiming never permits editing or writing one's own biography or story", () => {
  const state = fixture();
  deny(() => save(state, change(state, "guest", { biography: "My life", biographyBy: "guest" })));
  deny(() => save(state, { ...state, stories: [story("guest")] }));
  state.stories = [{ ...story("guest"), authorId: "host" }];
  const next = structuredClone(state); next.stories[0].title = "Rewrite";
  deny(() => save(state, next));
});
test("existing contributions, authors, and reviews cannot be rewritten by another member", () => {
  const state = fixture(); state.stories = [{ ...story("uncle"), authorId: "host" }];
  for (const fields of [{ authorId: "guest" }, { html: "Changed" }, { status: "Published" }]) {
    const next = structuredClone(state); Object.assign(next.stories[0], fields); deny(() => save(state, next));
  }
});
test("only a valid review transition can publish another relative's story", () => {
  const state = fixture(); state.stories = [{ ...story("uncle"), authorId: "host", status: "In review" }];
  const reviewed = reviewStory(state, "story", "Approved", "I remember this too.");
  save(state, reviewed);
  reviewed.stories[0].reviews[0].personId = "host";
  deny(() => save(state, reviewed));
});
test("a writer cannot self-publish or replace review history", () => {
  const state = fixture(); state.stories = [story("host")];
  const next = structuredClone(state); next.stories[0].status = "Published";
  deny(() => save(state, next));
});
test("stale shared snapshots fail with a conflict instead of overwriting changes", () => {
  const state = fixture();
  assert.throws(() => save(state, { ...state, revision: 2 }), error => error.code === "FAMILY_CONFLICT" && error.status === 409);
});
test("removing existing people, links, or stories is rejected", () => {
  const state = fixture(); state.stories = [story("uncle")];
  for (const key of ["people", "links", "stories"]) {
    const next = structuredClone(state); next[key].pop();
    assert.throws(() => save(state, next));
  }
});
test("broken references and duplicate IDs never reach SQL", () => {
  const state = fixture();
  const duplicate = structuredClone(state); duplicate.people.push(duplicate.people[0]);
  assert.throws(() => save(state, duplicate), { name: "InvalidFamilyDataError" });
  const broken = structuredClone(state); broken.links.push({ id: "bad", kind: "parent", from: "outsider", to: "guest" });
  assert.throws(() => save(state, broken), { name: "InvalidFamilyDataError" });
});
