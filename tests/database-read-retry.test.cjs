const { test } = require("node:test");
const assert = require("node:assert/strict");
const { isTransientDatabaseError, retryDatabaseRead } = require("./helpers/load-ts.cjs")()("src/lib/db/read-retry.ts");

test("retries temporary read failures and returns the recovered result", async () => {
  let calls = 0;
  const result = await retryDatabaseRead(async () => {
    if (++calls < 3) throw new Error("Failed query", { cause: new TypeError("fetch failed") });
    return "recovered";
  });
  assert.equal(result, "recovered"); assert.equal(calls, 3);
});

test("stops retrying after three read attempts", async () => {
  let calls = 0;
  const failure = Object.assign(new Error("connection reset"), { code: "ECONNRESET" });
  await assert.rejects(retryDatabaseRead(async () => { calls++; throw failure; }), (error) => error === failure);
  assert.equal(calls, 3);
});

test("does not retry missing tables, bad credentials or constraint failures", async () => {
  for (const code of ["42P01", "28P01", "23505"]) {
    let calls = 0;
    const failure = Object.assign(new Error("database failure"), { code });
    await assert.rejects(retryDatabaseRead(async () => { calls++; throw failure; }));
    assert.equal(calls, 1);
  }
});

test("recognizes Neon source errors without trusting SQL text in the wrapper", () => {
  assert.equal(isTransientDatabaseError({ sourceError: { cause: { code: "UND_ERR_CONNECT_TIMEOUT" } } }), true);
  assert.equal(isTransientDatabaseError(new Error("select 'fetch failed'")), false);
  const cycle = {}; cycle.cause = cycle;
  assert.equal(isTransientDatabaseError(cycle), false);
});
