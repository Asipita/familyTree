import dagre from "dagre";
import type { Edge, Node } from "@xyflow/react";
import { connectedPeople, initials, lifespan, relationTo, type FamilyState } from "@/lib/family";
import { resolveSiblingConnections } from "@/lib/family-relationships";

const PERSON_WIDTH = 202;
const PERSON_HEIGHT = 80;
const GENERATION_GAP = 190;
const PERSON_GAP = 40;

type FamilyGroup = { parents: string[]; children: string[] };

// Co-parents/partners travel together. Preserve their left-to-right order from
// Dagre, then move whole units so a sibling sits beside their relative, not
// between that relative and their partner.
function arrangeRow(row: Node[], groups: FamilyGroup[], state: FamilyState) {
  if (row.length < 2) return;
  row.sort((a, b) => a.position.x - b.position.x || a.id.localeCompare(b.id));
  const originalCentre = (row[0].position.x + row[row.length - 1].position.x) / 2;
  const originalOrder = new Map(row.map((node, index) => [node.id, index]));
  const roots = new Map(row.map(node => [node.id, node.id]));
  function root(id: string): string {
    const parent = roots.get(id)!;
    if (parent === id) return id;
    const result = root(parent); roots.set(id, result); return result;
  }
  for (const group of groups) {
    const parents = group.parents.filter(id => roots.has(id));
    for (const id of parents.slice(1)) roots.set(root(id), root(parents[0]));
  }
  const units = new Map<string, Node[]>();
  for (const node of row) {
    const key = root(node.id);
    const unit = units.get(key) ?? [];
    unit.push(node); units.set(key, unit);
  }
  const siblings = new Map<string, [string, string]>();
  function addSiblings(a: string, b: string) {
    if (a === b || !roots.has(a) || !roots.has(b) || root(a) === root(b)) return;
    const pair: [string, string] = a < b ? [a, b] : [b, a];
    siblings.set(JSON.stringify(pair), pair);
  }
  // Include half-siblings as well as children belonging to one parent group.
  const childrenByParent = new Map<string, string[]>();
  for (const link of state.links) {
    if (link.kind === "parent" && roots.has(link.to)) {
      const children = childrenByParent.get(link.from) ?? [];
      children.push(link.to); childrenByParent.set(link.from, children);
    }
    if (link.kind === "relative" && link.relation === "sibling") addSiblings(link.from, link.to);
  }
  for (const children of childrenByParent.values()) {
    children.forEach((child, index) => children.slice(index + 1).forEach(other => addSiblings(child, other)));
  }
  let ordered = [...units.values()];
  function score(candidate: Node[][]): [number, number] {
    const positions = new Map(candidate.flat().map((node, index) => [node.id, index]));
    const distance = [...siblings.values()].reduce((sum, [a, b]) => sum + Math.abs(positions.get(a)! - positions.get(b)!), 0);
    const displacement = row.reduce((sum, node) => sum + (positions.get(node.id)! - originalOrder.get(node.id)!) ** 2, 0);
    return [distance, displacement];
  }
  function better(a: [number, number], b: [number, number]) {
    return a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]);
  }
  // Bounded local refinement keeps Dagre's ordering when equally good and
  // avoids factorial permutations on large generations.
  for (let pass = 0; pass < row.length; pass++) {
    let best = ordered;
    let bestScore = score(ordered);
    for (let index = 1; index < ordered.length; index++) {
      const candidate = [...ordered];
      [candidate[index - 1], candidate[index]] = [candidate[index], candidate[index - 1]];
      const candidateScore = score(candidate);
      if (better(candidateScore, bestScore)) { best = candidate; bestScore = candidateScore; }
    }
    if (best === ordered) break;
    ordered = best;
  }
  // Pack the row without inheriting empty slots from Dagre's separate ranks.
  // In particular a two-person parent unit has exactly one normal card gap.
  const packed = ordered.flat();
  const left = originalCentre - (packed.length - 1) * (PERSON_WIDTH + PERSON_GAP) / 2;
  packed.forEach((node, index) => { node.position.x = left + index * (PERSON_WIDTH + PERSON_GAP); });
}

// Rank people, not relationship edges: siblings and partners share a generation.
function generationLevels(state: FamilyState, ids: Set<string>) {
  const roots = new Map([...ids].map(id => [id, id]));
  function root(id: string): string {
    const parent = roots.get(id)!;
    if (parent === id) return id;
    const result = root(parent); roots.set(id, result); return result;
  }
  function join(a: string, b: string) { if (ids.has(a) && ids.has(b)) roots.set(root(b), root(a)); }
  const links = state.links.filter(link => ids.has(link.from) && ids.has(link.to));
  for (const link of links) {
    if (link.kind === "partner" || (link.kind === "relative" && ["sibling", "cousin"].includes(link.relation ?? ""))) join(link.from, link.to);
  }
  for (const id of ids) {
    const parents = links.filter(link => link.kind === "parent" && link.to === id).map(link => link.from);
    const children = links.filter(link => link.kind === "parent" && link.from === id).map(link => link.to);
    for (const parent of parents.slice(1)) join(parents[0], parent);
    for (const child of children.slice(1)) join(children[0], child);
  }
  const levels = new Map([...ids].map(id => [root(id), 0]));
  const incoming = new Map([...levels.keys()].map(id => [id, 0]));
  const descendants = new Map([...levels.keys()].map(id => [id, new Map<string, number>()]));
  for (const link of links) {
    const distance = link.kind === "parent" ? 1 : link.kind === "relative" && link.relation === "grandparent" ? 2 : link.kind === "relative" && ["uncle", "aunt"].includes(link.relation ?? "") ? 1 : 0;
    const from = root(link.from), to = root(link.to);
    if (!distance || from === to) continue;
    const children = descendants.get(from)!;
    if (!children.has(to)) incoming.set(to, incoming.get(to)! + 1);
    children.set(to, Math.max(distance, children.get(to) ?? 0));
  }
  const pending = [...incoming].filter(([, count]) => count === 0).map(([id]) => id);
  while (pending.length) {
    const id = pending.shift()!;
    for (const [child, distance] of descendants.get(id)!) {
      levels.set(child, Math.max(levels.get(child)!, levels.get(id)! + distance));
      incoming.set(child, incoming.get(child)! - 1);
      if (incoming.get(child) === 0) pending.push(child);
    }
  }
  return new Map([...ids].map(id => [id, levels.get(root(id))!]));
}

export function graphFor(input: FamilyState): { nodes: Node[]; edges: Edge[] } {
  const state = resolveSiblingConnections(input);
  const people = connectedPeople(state);
  const ids = new Set(people.map(person => person.id));
  const nodes: Node[] = people.map(person => ({ id: person.id, type: "person", position: { x: 0, y: 0 }, data: {
    name: person.name, dates: lifespan(person), initials: initials(person.name), relation: relationTo(state, person.id), own: person.id === state.viewerId,
  } }));
  const edges: Edge[] = [];
  const groups = new Map<string, FamilyGroup>();
  for (const child of people) {
    const parents = [...new Set(state.links.filter(link => link.kind === "parent" && link.to === child.id && ids.has(link.from)).map(link => link.from))].sort();
    if (!parents.length) continue;
    const key = JSON.stringify(parents);
    const group = groups.get(key) ?? { parents, children: [] };
    group.children.push(child.id); groups.set(key, group);
  }
  for (const link of state.links.filter(link => link.kind === "partner" && ids.has(link.from) && ids.has(link.to))) {
    const parents = [link.from, link.to].sort();
    const key = JSON.stringify(parents);
    if (!groups.has(key)) groups.set(key, { parents, children: [] });
  }
  for (const [key, group] of groups) {
    const unionId = `union:${key}`;
    nodes.push({ id: unionId, type: "union", position: { x: 0, y: 0 }, data: {} });
    for (const parent of group.parents) edges.push({ id: `${parent}-${unionId}`, source: parent, target: unionId, type: group.parents.length > 1 ? "parentUnion" : "smoothstep" });
    for (const child of group.children) edges.push({ id: `${unionId}-${child}`, source: unionId, target: child, type: "smoothstep" });
  }
  const graph = new dagre.graphlib.Graph();
  graph.setGraph({ rankdir: "TB", nodesep: PERSON_GAP, ranksep: 48 });
  graph.setDefaultEdgeLabel(() => ({}));
  nodes.forEach(node => graph.setNode(node.id, { width: node.type === "person" ? PERSON_WIDTH : 12, height: node.type === "person" ? PERSON_HEIGHT : 12 }));
  // Provisional lateral links must never force a sibling onto a descendant rank.
  edges.forEach(edge => graph.setEdge(edge.source, edge.target));
  dagre.layout(graph);
  const levels = generationLevels(state, ids);
  const rows = new Map<number, Node[]>();
  for (const node of nodes.filter(node => node.type === "person")) {
    const level = levels.get(node.id)!;
    node.position = { x: graph.node(node.id).x - PERSON_WIDTH / 2, y: level * GENERATION_GAP };
    const row = rows.get(level) ?? []; row.push(node); rows.set(level, row);
  }
  for (const row of rows.values()) arrangeRow(row, [...groups.values()], state);
  const byId = new Map(nodes.map(node => [node.id, node]));
  for (const [key, group] of groups) {
    const parents = group.parents.map(id => byId.get(id)!);
    byId.get(`union:${key}`)!.position = {
      x: parents.reduce((sum, parent) => sum + parent.position.x + PERSON_WIDTH / 2, 0) / parents.length - 6,
      y: Math.max(...parents.map(parent => parent.position.y)) + PERSON_HEIGHT + 42,
    };
  }
  for (const link of state.links.filter(link => link.kind === "relative" && ids.has(link.from) && ids.has(link.to))) {
    if (link.relation === "sibling" && link.complete) continue;
    const source = byId.get(link.from)!, target = byId.get(link.to)!;
    const lateral = source.position.y === target.position.y;
    const pointsRight = source.position.x < target.position.x;
    edges.push({ id: link.id, source: link.from, target: link.to, type: lateral ? "straight" : "smoothstep",
      ...(lateral ? { sourceHandle: pointsRight ? "relative-right-source" : "relative-left-source", targetHandle: pointsRight ? "relative-left-target" : "relative-right-target" } : {}),
      style: link.complete === false ? { strokeDasharray: "7 7", stroke: "#b69c77" } : { stroke: "#9daa99" },
    });
  }
  return { nodes, edges };
}
