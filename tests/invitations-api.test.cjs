const { test } = require("node:test");
const assert = require("node:assert/strict");
const createLoader = require("./helpers/load-ts.cjs");
function setup(signedIn = true, failure) {
  const calls = [];
  const operation = async (...args) => { calls.push(args); if (failure) throw failure; return { ok: true }; };
  const load = createLoader({
    "@/lib/auth/server": { auth: { getSession: async () => ({ data: { user: signedIn ? { id: "user", email: "person@example.invalid", emailVerified: true } : null } }) } },
    "@/lib/db/invitations": { createInvitation: operation, listInvitations: operation, revokeInvitation: operation, previewInvitation: operation, acceptInvitation: operation },
  });
  return { calls, load };
}
for (const [file, method] of [["route.ts", "GET"], ["route.ts", "POST"], ["route.ts", "DELETE"], ["accept/route.ts", "POST"]]) {
  test(`signed-out ${file} ${method} is denied without database access`, async () => {
    const { load, calls } = setup(false);
    const response = await load(`src/app/api/invitations/${file}`)[method](new Request("http://localhost/api/invitations", { method }));
    assert.equal(response.status, 401); assert.deepEqual(calls, []);
    assert.equal(response.headers.get("cache-control"), "no-store");
  });
}
test("cross-origin claim requests are rejected", async () => {
  const { load, calls } = setup();
  const response = await load("src/app/api/invitations/accept/route.ts").POST(new Request("http://localhost/api/invitations/accept", { method: "POST", headers: { origin: "https://untrusted.invalid" }, body: "{}" }));
  assert.equal(response.status, 403); assert.deepEqual(calls, []);
});
test("acceptance uses the server session, never client-supplied identity", async () => {
  const { load, calls } = setup();
  const response = await load("src/app/api/invitations/accept/route.ts").POST(new Request("http://localhost/api/invitations/accept", { method: "POST", body: JSON.stringify({ token: "abc", userId: "forged", emailVerified: true }) }));
  assert.equal(response.status, 200); assert.equal(calls[0][0].id, "user"); assert.equal(calls[0][1], "abc");
});
test("unexpected database failures are never exposed to invitation recipients", async t => {
  t.mock.method(console, "error", () => {});
  const { load } = setup(true, new Error("select token_hash from invitations; secret-data"));
  const response = await load("src/app/api/invitations/preview/route.ts").POST(new Request("http://localhost/api/invitations/preview", { method: "POST", body: '{"token":"abc"}' }));
  assert.equal(response.status, 500); assert.doesNotMatch(await response.text(), /secret-data|token_hash|select/);
});
test("invitation return paths cannot become open redirects", () => {
  const { invitationDestination } = createLoader()("src/lib/invitation-navigation.ts");
  for (const value of ["https://evil.invalid", "//evil.invalid", ["a"], undefined, "?next=bad"]) assert.equal(invitationDestination(value), "/tree");
  assert.equal(invitationDestination("a".repeat(64)), `/join?invite=${"a".repeat(64)}`);
});
