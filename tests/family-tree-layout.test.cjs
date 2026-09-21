const { test } = require("node:test");
const assert = require("node:assert/strict");
const load = require("./helpers/load-ts.cjs")();
const { graphFor } = load("src/lib/family-tree-layout.ts");
const { resolveSiblingConnections } = load("src/lib/family-relationships.ts");
const { emptyFamily } = load("src/lib/family.ts");
const person = id => ({ id, name: id, born: "", living: true, biography: "" });
const parent = (from, to) => ({ id: `${from}-${to}`, kind: "parent", from, to });
const sibling = (from, to, complete = false) => ({ id: `${from}-${to}`, kind: "relative", relation: "sibling", from, to, complete });
function family(ids, links) { return { ...structuredClone(emptyFamily), people: ids.map(person), links }; }
function position(graph, id) { return graph.nodes.find(node => node.id === id).position; }
function sharedUnion(graph, ...children) { return graph.nodes.find(node => node.type === "union" && children.every(child => graph.edges.some(edge => edge.source === node.id && edge.target === child))); }

test("onboarding siblings stay on the same row with a dashed lateral link before parents are known", () => {
  const graph = graphFor(family(["self", "sister"], [sibling("sister", "self")]));
  assert.equal(position(graph, "self").y, position(graph, "sister").y);
  assert.equal(graph.edges[0].style.strokeDasharray, "7 7");
  assert.equal(graph.edges[0].type, "straight");
  assert.match(graph.edges[0].sourceHandle, /relative-/);
});

for (const legacyComplete of [false, true]) {
  test(`adding a parent after onboarding joins both siblings beneath it (legacy complete=${legacyComplete})`, () => {
    const input = family(["self", "sister", "mother"], [sibling("sister", "self", legacyComplete), parent("mother", "self")]);
    const resolved = resolveSiblingConnections(input);
    assert.ok(resolved.links.some(link => link.kind === "parent" && link.from === "mother" && link.to === "sister"));
    const graph = graphFor(input);
    const union = sharedUnion(graph, "self", "sister");
    assert.ok(union);
    assert.ok(graph.edges.some(edge => edge.source === "mother" && edge.target === union.id));
    assert.equal(position(graph, "self").y, position(graph, "sister").y);
    assert.ok(position(graph, "mother").y < union.position.y);
    assert.ok(union.position.y < position(graph, "self").y);
    assert.ok(!graph.edges.some(edge => edge.source === "sister" && edge.target === "self"));
    assert.equal(input.links.length, 2, "does not mutate stored input");
  });
}

test("siblings remain aligned when one has children and a partner with known ancestors", () => {
  const graph = graphFor(family(["self", "sister", "mother", "child", "partner", "partner-parent", "partner-grandparent"], [
    sibling("sister", "self"), parent("mother", "self"), parent("sister", "child"), parent("partner", "child"),
    parent("partner-parent", "partner"), parent("partner-grandparent", "partner-parent"),
  ]));
  assert.equal(position(graph, "self").y, position(graph, "sister").y);
  assert.equal(position(graph, "partner").y, position(graph, "sister").y);
  assert.ok(position(graph, "child").y > position(graph, "self").y);
});

test("adding a second parent connects every declared sibling without duplicates", () => {
  const input = family(["self", "sister", "brother", "mother", "father"], [sibling("sister", "self"), sibling("brother", "sister"), parent("mother", "self"), parent("father", "self")]);
  const resolved = resolveSiblingConnections(input);
  assert.equal(resolved.links.filter(link => link.kind === "parent").length, 6);
  assert.deepEqual(resolveSiblingConnections(resolved), resolved);
  const graph = graphFor(resolved);
  assert.ok(sharedUnion(graph, "self", "sister", "brother"));
  assert.equal(position(graph, "mother").y, position(graph, "father").y);
});

test("parent-first and sibling-first entry produce equivalent connections", () => {
  const ids = ["self", "sister", "mother"];
  const a = resolveSiblingConnections(family(ids, [sibling("sister", "self"), parent("mother", "self")]));
  const b = resolveSiblingConnections(family(ids, [parent("mother", "self"), sibling("sister", "self")]));
  const paths = state => state.links.filter(link => link.kind === "parent").map(link => `${link.from}/${link.to}`).sort();
  assert.deepEqual(paths(a), paths(b));
});

test("adding a parent does not silently resolve an uncle's missing connector", () => {
  const uncle = { id: "uncle-self", kind: "relative", from: "uncle", to: "self", relation: "uncle", complete: false };
  const resolved = resolveSiblingConnections(family(["self", "sister", "mother", "uncle"], [sibling("sister", "self"), parent("mother", "self"), uncle]));
  assert.equal(resolved.links.find(link => link.id === uncle.id).complete, false);
  assert.ok(!resolved.links.some(link => link.kind === "parent" && link.to === "uncle"));
});

test("generation alignment keeps all person cards from overlapping", () => {
  const graph = graphFor(family(["self", "sister", "brother", "mother", "father", "child"], [sibling("sister", "self"), sibling("brother", "self"), parent("mother", "self"), parent("father", "self"), parent("sister", "child")]));
  const people = graph.nodes.filter(node => node.type === "person");
  for (const a of people) for (const b of people) if (a.id !== b.id && a.position.y === b.position.y) {
    assert.ok(Math.abs(a.position.x - b.position.x) >= 242);
  }
});
