const { test } = require("node:test");
const assert = require("node:assert/strict");
const createLoader = require("./helpers/load-ts.cjs");

const privateMessage = 'Failed query: select "owner_user_id" from "family_views" params: private-person-id';
function connectionError() {
  const cause = new Error("Error connecting to database: TypeError: fetch failed");
  cause.name = "NeonDbError";
  return new Error(privateMessage, { cause });
}

function setup({ sessionError, repositoryError, signedIn = true } = {}) {
  const calls = [];
  const load = createLoader({
    "@/lib/auth/server": { auth: { getSession: async () => {
      if (sessionError) throw sessionError;
      return { data: { user: signedIn ? { id: "test-user" } : null } };
    } } },
    "@/lib/db/family-repository": {
      getOrCreateFamily: async () => { calls.push("read"); if (repositoryError) throw repositoryError; return { version: 1 }; },
      saveFamily: async () => { calls.push("write"); if (repositoryError) throw repositoryError; return { version: 1 }; },
    },
  });
  return { load, calls, route: load("src/app/api/family/route.ts") };
}

for (const method of ["GET", "PUT"]) {
  test(`${method} masks database errors, returns 503 and logs matching reference`, async (t) => {
    const logs = [];
    t.mock.method(console, "error", (...args) => logs.push(args));
    const error = connectionError();
    const { route } = setup({ repositoryError: error });
    const response = await route[method](new Request("http://localhost/api/family", { method: "PUT", body: "{}" }));
    assert.equal(response.status, 503);
    const payload = await response.json();
    assert.match(payload.requestId, /^[a-f0-9-]{36}$/);
    assert.equal(response.headers.get("x-request-id"), payload.requestId);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(Object.keys(payload).sort(), ["code", "error", "requestId"]);
    assert.doesNotMatch(JSON.stringify(payload), /select|owner_user_id|family_views|private-person-id|fetch failed|stack|cause|params/i);
    assert.equal(logs[0][1].requestId, payload.requestId);
    assert.equal(logs[0][1].error, error);
  });

  test(`${method} catches unexpected auth-service errors without exposing internals`, async (t) => {
    t.mock.method(console, "error", () => {});
    const { route } = setup({ sessionError: new Error(privateMessage) });
    const response = await route[method](new Request("http://localhost/api/family", { method: "PUT", body: "{}" }));
    assert.equal(response.status, 500);
    assert.doesNotMatch(await response.text(), /Failed query|private-person-id/);
  });

  test(`${method} returns 401 without accessing the repository when signed out`, async () => {
    const { route, calls } = setup({ signedIn: false });
    assert.equal((await route[method]()).status, 401);
    assert.deepEqual(calls, []);
  });
}

test("non-transient database errors are 500, not client validation errors", async (t) => {
  t.mock.method(console, "error", () => {});
  const { route } = setup({ repositoryError: new Error(privateMessage) });
  assert.equal((await route.PUT(new Request("http://localhost/api/family", { method: "PUT", body: "{}" }))).status, 500);
});

test("malformed JSON is a safe 400 and never reaches the repository", async () => {
  const { route, calls } = setup();
  const response = await route.PUT(new Request("http://localhost/api/family", { method: "PUT", body: "{secret-invalid-json" }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "INVALID_FAMILY_DATA");
  assert.deepEqual(calls, []);
});

test("client messages are allowlisted by code, never copied from server error text", () => {
  const { familyErrorMessage, familyErrorMessages } = createLoader()("src/lib/family-errors.ts");
  for (const payload of [{ error: privateMessage }, { code: privateMessage, error: privateMessage }, { code: "__proto__" }, null]) {
    assert.equal(familyErrorMessage(payload, "FAMILY_SAVE_FAILED"), familyErrorMessages.FAMILY_SAVE_FAILED);
  }
  assert.equal(familyErrorMessage({ code: "INVALID_FAMILY_DATA", error: privateMessage }, "FAMILY_SAVE_FAILED"), familyErrorMessages.INVALID_FAMILY_DATA);
});

test("successful saves still return the saved state", async () => {
  const { route } = setup();
  const response = await route.PUT(new Request("http://localhost/api/family", { method: "PUT", body: "{}" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { version: 1 });
});
