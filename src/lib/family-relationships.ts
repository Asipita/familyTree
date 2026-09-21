import type { FamilyState } from "@/lib/family";

// A declared sibling connection shares the known parents once its connector is added.
// Keep the sibling record as evidence, but draw the actual parent/child paths instead.
export function resolveSiblingConnections(state: FamilyState): FamilyState {
  const ids = new Set(state.people.map(person => person.id));
  const siblings = state.links.filter(link => link.kind === "relative" && link.relation === "sibling" && ids.has(link.from) && ids.has(link.to));
  if (!siblings.length) return state;
  const links = [...state.links];
  const visited = new Set<string>();
  for (const sibling of siblings) {
    if (visited.has(sibling.from)) continue;
    const group = new Set([sibling.from]);
    const pending = [sibling.from];
    while (pending.length) {
      const person = pending.pop()!;
      visited.add(person);
      for (const link of siblings) {
        const other = link.from === person ? link.to : link.to === person ? link.from : null;
        if (other && !group.has(other)) { group.add(other); pending.push(other); }
      }
    }
    const parents = new Set(links.filter(link => link.kind === "parent" && group.has(link.to) && ids.has(link.from) && !group.has(link.from)).map(link => link.from));
    for (const parent of parents) for (const child of group) {
      if (!links.some(link => link.kind === "parent" && link.from === parent && link.to === child)) {
        links.push({ id: `sibling-parent:${encodeURIComponent(parent)}:${encodeURIComponent(child)}`, kind: "parent", from: parent, to: child });
      }
    }
  }
  return { ...state, links: links.map(link => {
    if (link.kind !== "relative" || link.relation !== "sibling") return link;
    const parents = links.filter(parent => parent.kind === "parent" && parent.to === link.from).map(parent => parent.from);
    const complete = links.some(parent => parent.kind === "parent" && parent.to === link.to && parents.includes(parent.from));
    return { ...link, complete };
  }) };
}
