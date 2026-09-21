const { test } = require("node:test");
const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const createLoader = require("./helpers/load-ts.cjs");

function render({ ready = false, complete = false, accountId, userId = "user", error = "" } = {}) {
  const load = createLoader({
    "next/link": { default: props => React.createElement("a", { href: props.href }, props.children), __esModule: true },
    "next/navigation": { usePathname: () => "/tree", useRouter: () => ({}) },
    "@/components/brand/family-tree-logo": { FamilyTreeLogo: () => null },
    "@/components/onboarding/onboarding-page": { OnboardingModal: () => React.createElement("dialog", null, "Set up your tree") },
    "@/lib/auth/client": { authClient: { useSession: () => ({ data: userId ? { user: { id: userId, name: "Test User" } } : null }) } },
    "@/components/family-provider": { useFamily: () => ({ ready, error, state: {
      viewerId: "self", onboardingComplete: complete, stories: [], people: [{ id: "self", name: "Test User", accountId }],
    } }) },
  });
  const { Workspace } = load("src/components/family/workspace.tsx");
  return renderToStaticMarkup(React.createElement(Workspace, null, "FAMILY_CONTENT"));
}

test("refresh loading shows inline progress, never an onboarding modal or editable family", () => {
  const html = render();
  assert.doesNotMatch(html, /<dialog|Set up your tree|FAMILY_CONTENT/);
  assert.match(html, /Opening your family/);
});
test("completed accounts never see onboarding once loaded", () => {
  const html = render({ ready: true, complete: true, accountId: "user" });
  assert.doesNotMatch(html, /<dialog/); assert.match(html, /FAMILY_CONTENT/);
});
test("confirmed unfinished accounts still receive mandatory onboarding", () => {
  const html = render({ ready: true, accountId: "user" });
  assert.match(html, /<dialog/); assert.match(html, /inert=""/);
});
test("failed profile loads show retry, not an empty onboarding wizard", () => {
  const html = render({ ready: true, error: "Could not load your family." });
  assert.doesNotMatch(html, /<dialog|FAMILY_CONTENT/); assert.match(html, /Reload family/);
});
test("signed-out or stale account state never triggers onboarding", () => {
  for (const input of [{ ready: true, userId: null }, { ready: true, accountId: "another-user" }]) {
    assert.doesNotMatch(render(input), /<dialog|FAMILY_CONTENT/);
  }
});
