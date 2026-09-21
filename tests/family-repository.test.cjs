const { test } = require("node:test");
const assert = require("node:assert/strict");
const { getTableName } = require("drizzle-orm");
const createLoader = require("./helpers/load-ts.cjs");

function setup({ readFailures = 0, batchFailure } = {}) {
  const view = { id: "view-id", ownerUserId: "user-id", viewerPersonId: "self", onboardingComplete: true };
  const snapshot = [[view], [{ id: "self", name: "Server profile", born: "1990-01-01", living: true, biography: "", accountUserId: "user-id" }], [], [], [], [], [{ email: "server@example.invalid", reviewNotifications: true, discoverable: false }]];
  const calls = { reads: 0, batches: [] };
  function query(kind, table) {
    const item = { kind, table: table && getTableName(table) };
    for (const method of ["where", "limit", "orderBy", "values", "set"]) item[method] = () => item;
    item.from = (target) => { item.table = getTableName(target); return item; };
    item.execute = async () => {
      calls.reads++;
      if (calls.reads <= readFailures) throw new TypeError("fetch failed");
      return [view];
    };
    return item;
  }
  const db = {
    select: () => query("select"), insert: table => query("insert", table),
    update: table => query("update", table), delete: table => query("delete", table),
    batch: async queries => {
      calls.batches.push(queries);
      if (batchFailure) throw batchFailure;
      return [...queries.slice(0, -7).map(() => []), ...snapshot];
    },
  };
  const load = createLoader({ "@/lib/db/client": { getDb: () => db } });
  const state = structuredClone(load("src/lib/family.ts").emptyFamily);
  state.onboardingComplete = true;
  return { repository: load("src/lib/db/family-repository.ts"), calls, state, user: { id: "user-id" } };
}

test("save returns the database snapshot from the write transaction without post-commit reads", async () => {
  const { repository, calls, state, user } = setup();
  const saved = await repository.saveFamily(user, state);
  assert.equal(calls.reads, 1);
  assert.equal(calls.batches.length, 1);
  const queries = calls.batches[0];
  assert.ok(queries.slice(0, -7).every(query => query.kind !== "select"));
  assert.deepEqual(queries.slice(-7).map(query => [query.kind, query.table]), ["family_views", "people", "family_links", "stories", "story_reviews", "requests", "family_settings"].map(table => ["select", table]));
  assert.equal(saved.people[0].name, "Server profile");
  assert.equal(saved.settings.email, "server@example.invalid");
  assert.equal(saved.onboardingComplete, true);
});

test("save retries the read-only lookup but executes its write batch only once", async () => {
  const { repository, calls, state, user } = setup({ readFailures: 1 });
  await repository.saveFamily(user, state);
  assert.equal(calls.reads, 2); assert.equal(calls.batches.length, 1);
});

test("does not blindly replay a write batch after a connection failure", async () => {
  const error = new TypeError("fetch failed");
  const { repository, calls, state, user } = setup({ batchFailure: error });
  await assert.rejects(repository.saveFamily(user, state), failure => failure === error);
  assert.equal(calls.batches.length, 1);
});

test("invalid envelopes are rejected before database access", async () => {
  const { repository, calls, user } = setup();
  for (const input of [null, {}, { version: 1, people: [] }]) {
    await assert.rejects(repository.saveFamily(user, input), { name: "InvalidFamilyDataError" });
  }
  assert.equal(calls.reads, 0); assert.equal(calls.batches.length, 0);
});
