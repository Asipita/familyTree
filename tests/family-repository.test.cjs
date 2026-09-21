const { test } = require("node:test");
const assert = require("node:assert/strict");
const { getTableName } = require("drizzle-orm");
const createLoader = require("./helpers/load-ts.cjs");

function setup({ failure, snapshotFailure = false } = {}) {
  const rows = {
    family_views: [{ id: "view-id", ownerUserId: "user-id", viewerPersonId: "self", onboardingComplete: true, revision: 0 }],
    family_members: [{ userId: "user-id", viewId: "view-id", personId: "self", onboardingComplete: true, email: "server@example.invalid", reviewNotifications: true, discoverable: false }],
    people: [{ id: "self", name: "Server profile", born: "1990", living: true, biography: "", createdByUserId: "user-id", accountUserId: "user-id" }],
    family_links: [], stories: [], story_reviews: [], requests: [],
  };
  const calls = { transactions: 0, committed: 0, rolledBack: 0, outsideReads: 0, queries: [] };
  function query(kind, table) {
    let target = table && getTableName(table), values;
    const item = {};
    for (const method of ["where", "limit", "orderBy", "for"]) item[method] = () => item;
    item.from = table => { target = getTableName(table); return item; };
    item.set = data => { values = data; return item; };
    item.then = (resolve, reject) => Promise.resolve().then(() => {
      calls.queries.push([kind, target]);
      if (failure) throw failure;
      if (snapshotFailure && kind === "select" && rows.family_views[0].revision === 1) throw new TypeError("fetch failed");
      if (kind === "update") Object.assign(rows[target][0], values);
      return rows[target];
    }).then(resolve, reject);
    return item;
  }
  const tx = { select: () => query("select"), update: table => query("update", table), execute: async () => { calls.queries.push(["lock", "user"]); } };
  const load = createLoader({ "@/lib/db/client": {
    getDb: () => { calls.outsideReads++; throw new Error("Unexpected query outside transaction"); },
    withTransaction: async work => {
      calls.transactions++; const before = structuredClone(rows);
      try { const result = await work(tx); calls.committed++; return result; }
      catch (error) { Object.assign(rows, before); calls.rolledBack++; throw error; }
    },
  } });
  const state = { ...structuredClone(load("src/lib/family.ts").emptyFamily), revision: 0, onboardingComplete: true,
    people: [{ id: "self", name: "Server profile", born: "1990", living: true, biography: "", createdBy: "user-id", accountId: "user-id" }],
    settings: { email: "server@example.invalid", reviewNotifications: true, discoverable: false } };
  return { repository: load("src/lib/db/family-repository.ts"), calls, rows, state, user: { id: "user-id" } };
}

test("permissions, writes, and the returned snapshot share one locked transaction", async () => {
  const { repository, calls, state, user } = setup();
  const saved = await repository.saveFamily(user, state);
  assert.equal(calls.transactions, 1); assert.equal(calls.committed, 1); assert.equal(calls.outsideReads, 0);
  assert.deepEqual(calls.queries[0], ["lock", "user"]);
  assert.equal(saved.revision, 1); assert.equal(saved.people[0].name, "Server profile");
  assert.ok(calls.queries.slice(-7).every(([kind]) => kind === "select"));
});
test("a failed final snapshot rolls back all writes instead of failing after commit", async () => {
  const { repository, calls, rows, state, user } = setup({ snapshotFailure: true });
  await assert.rejects(repository.saveFamily(user, state));
  assert.equal(calls.committed, 0); assert.equal(calls.rolledBack, 1); assert.equal(rows.family_views[0].revision, 0);
});
test("a write transaction is never blindly retried after a connection error", async () => {
  const error = new TypeError("fetch failed");
  const { repository, calls, state, user } = setup({ failure: error });
  await assert.rejects(repository.saveFamily(user, state), failure => failure === error);
  assert.equal(calls.transactions, 1); assert.equal(calls.rolledBack, 1);
});
test("invalid envelopes are rejected before database access", async () => {
  const { repository, calls, user } = setup();
  for (const input of [null, {}, { version: 1, people: [] }]) await assert.rejects(repository.saveFamily(user, input), { name: "InvalidFamilyDataError" });
  assert.equal(calls.transactions, 0);
});
