const { test } = require("node:test");
const assert = require("node:assert/strict");
const load = require("./helpers/load-ts.cjs")();
const { graphFor } = load("src/lib/family-tree-layout.ts");
const { resolveSiblingConnections } = load("src/lib/family-relationships.ts");
const { emptyFamily } = load("src/lib/family.ts");
const { parentConnectorPath, unionConnectorPath } = load("src/lib/parent-connector.ts");
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

test("a direct parent stays one generation above a family connection", () => {
  const graph = graphFor(family(["self", "aisha", "father"], [
    { id: "family-connection", kind: "relative", relation: "other", from: "aisha", to: "self", complete: false },
    parent("father", "aisha"),
  ]));
  assert.equal(position(graph, "father").y, position(graph, "aisha").y - 190);
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

test("two parents use one shared horizontal rail with a centred vertical stem", () => {
  const graph = graphFor(family(["self", "mother", "father"], [parent("mother", "self"), parent("father", "self")]));
  const union = sharedUnion(graph, "self");
  const incoming = graph.edges.filter(edge => edge.target === union.id);
  assert.equal(incoming.length, 2);
  assert.ok(incoming.every(edge => edge.type === "parentUnion"));
  const centreX = union.position.x + 6;
  assert.equal(centreX, (position(graph, "mother").x + position(graph, "father").x) / 2 + 101);
  const targetY = union.position.y - 3;
  for (const edge of incoming) {
    const source = position(graph, edge.source);
    const path = parentConnectorPath({ sourceX: source.x + 101, sourceY: source.y + 83, targetX: centreX, targetY });
    assert.ok(path.endsWith(`${targetY - 20} H ${centreX} V ${targetY}`));
    assert.equal((path.match(/ H /g) ?? []).length, 1, "no extra horizontal jogs");
    assert.equal((path.match(/ V /g) ?? []).length, 2, "only the outer drop and central stem");
  }
});

test("independent parent groups use separate child connector lanes", () => {
  const graph = graphFor(family(["self", "sibling", "parent-a", "parent-b"], [
    parent("parent-a", "self"), parent("parent-b", "sibling"),
    { id: "cousin-link", kind: "relative", relation: "cousin", from: "sibling", to: "self" },
  ]));
  const rails = ["self", "sibling"].map(child => graph.edges.find(edge => edge.target === child && edge.source.startsWith("union:"))?.data?.railY);
  assert.ok(rails.every(rail => typeof rail === "number"));
  assert.notEqual(rails[0], rails[1], "separate families must not merge into one horizontal rail");
});

test("parent rail height is shared even if handle heights differ", () => {
  const left = parentConnectorPath({ sourceX: 100, sourceY: 82, targetX: 220, targetY: 120 });
  const right = parentConnectorPath({ sourceX: 340, sourceY: 86, targetX: 220, targetY: 120 });
  assert.ok(left.endsWith("100 H 220 V 120"));
  assert.ok(right.endsWith("100 H 220 V 120"));
});

test("single-parent and child connectors use routed union stems that avoid card overlaps", () => {
  const graph = graphFor(family(["self", "mother"], [parent("mother", "self")]));
  const union = sharedUnion(graph, "self");
  assert.ok(union);
  // Single-parent → union and union → child both go through routed stems now so
  // their rails can shift horizontally around intermediate cards (Bug 2 fix).
  const parentEdge = graph.edges.find(edge => edge.source === "mother" && edge.target === union.id);
  const childEdge = graph.edges.find(edge => edge.source === union.id && edge.target === "self");
  assert.equal(parentEdge?.type, "unionStem");
  assert.equal(childEdge?.type, "unionStem");
  // Collinear short paths still collapse to a single vertical stem.
  assert.equal(parentConnectorPath({ sourceX: 100, sourceY: 80, targetX: 100, targetY: 120 }), "M 100 80 V 120");
  assert.equal(unionConnectorPath({ sourceX: 100, sourceY: 80, targetX: 100, targetY: 120 }), "M 100 80 V 120");
});

test("union connectors route around cards crossed by a vertical leg", () => {
  const path = unionConnectorPath(
    { sourceX: 100, sourceY: 80, targetX: 0, targetY: 260 },
    [{ left: 50, right: 150, top: 120, bottom: 200 }],
  );
  assert.match(path, /M 100 80 V 104/);
  assert.doesNotMatch(path, /V 166/);
});

test("a parent's sibling sits to the left of the adjacent parent pair", () => {
  const input = family(["self", "father", "uncle", "mother", "grandparent"], [
    parent("grandparent", "father"), parent("grandparent", "uncle"), parent("father", "self"), parent("mother", "self"),
  ]);
  const before = structuredClone(input);
  for (const state of [input, { ...input, people: [...input.people].reverse(), links: [...input.links].reverse() }]) {
    const graph = graphFor(state);
    const father = position(graph, "father"), mother = position(graph, "mother"), uncle = position(graph, "uncle");
    assert.ok(uncle.x < father.x && father.x < mother.x);
    assert.equal(mother.x - father.x, 242, "co-parents have one compact card gap");
    assert.equal(father.y, mother.y);
    assert.equal(father.y, uncle.y);
    assert.ok(sharedUnion(graph, "father", "uncle"), "their ancestral connection remains intact");
    const union = sharedUnion(graph, "self");
    assert.equal(union.position.x + 6, (father.x + mother.x) / 2 + 101);
    assert.deepEqual(graphFor(state), graph, "layout is repeatable");
  }
  assert.deepEqual(input, before, "layout never changes the saved relationships");
});

test("declared siblings without known ancestors stay outside their relative's couple", () => {
  const graph = graphFor(family(["self", "father", "uncle", "mother"], [
    sibling("father", "uncle"), parent("father", "self"), parent("mother", "self"),
  ]));
  const father = position(graph, "father"), mother = position(graph, "mother"), uncle = position(graph, "uncle");
  assert.equal(Math.abs(father.x - mother.x), 242);
  assert.equal(Math.abs(father.x - uncle.x), 242);
  const edge = graph.edges.find(edge => edge.id === "father-uncle");
  assert.equal(edge.style.strokeDasharray, "7 7");
  assert.equal(edge.sourceHandle, father.x < uncle.x ? "relative-right-source" : "relative-left-source");
});

test("multiple couples remain compact within the same generation", () => {
  const graph = graphFor(family(["self", "sister", "mother", "father", "partner", "sister-partner", "child", "niece"], [
    parent("mother", "self"), parent("father", "self"), sibling("self", "sister"),
    parent("self", "child"), parent("partner", "child"), parent("sister", "niece"), parent("sister-partner", "niece"),
  ]));
  for (const [a, b] of [["self", "partner"], ["sister", "sister-partner"], ["mother", "father"]]) {
    assert.equal(Math.abs(position(graph, a).x - position(graph, b).x), 242);
    assert.equal(position(graph, a).y, position(graph, b).y);
  }
  assert.equal(position(graph, "self").y, position(graph, "sister").y);
  assert.equal(position(graph, "child").y, position(graph, "niece").y);
});

test("partners without children are kept together beside a sibling", () => {
  const graph = graphFor(family(["self", "sister", "partner"], [
    sibling("self", "sister"), { id: "partnership", kind: "partner", from: "self", to: "partner" },
  ]));
  assert.equal(Math.abs(position(graph, "self").x - position(graph, "partner").x), 242);
  assert.equal(Math.abs(position(graph, "self").x - position(graph, "sister").x), 242);
});

test("overlapping partnerships do not duplicate or overlap cards", () => {
  const graph = graphFor(family(["self", "partner-a", "partner-b", "sister", "child-a", "child-b"], [
    sibling("self", "sister"), parent("self", "child-a"), parent("partner-a", "child-a"),
    parent("self", "child-b"), parent("partner-b", "child-b"),
    { id: "partnership", kind: "partner", from: "self", to: "partner-a" },
  ]));
  const row = graph.nodes.filter(node => node.type === "person" && node.position.y === position(graph, "self").y).sort((a, b) => a.position.x - b.position.x);
  assert.equal(row.length, 4);
  assert.equal(new Set(graph.nodes.map(node => node.id)).size, graph.nodes.length);
  row.slice(1).forEach((node, index) => assert.equal(node.position.x - row[index].position.x, 242));
  assert.ok([row[0].id, row.at(-1).id].includes("sister"), "other relatives stay outside the connected partner unit");
});
