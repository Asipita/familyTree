"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import dagre from "dagre";
import { Background, Controls, Handle, Position, ReactFlow, useReactFlow, type Edge, type Node, type NodeProps, type ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, X } from "lucide-react";
import { useFamily } from "@/components/family-provider";
import { canWrite, connectedPeople, initials, lifespan, relationTo, type FamilyState, type Person } from "@/lib/family";

function PersonNode({ data }: NodeProps) { return <div className={`ft-node ${data.own ? "ft-node-own" : ""}`}><Handle type="target" position={Position.Top} /><span className="ft-avatar">{String(data.initials)}</span><span><strong>{String(data.name)}</strong><small>{String(data.dates)}</small><em>{String(data.relation)}</em></span><Handle type="source" position={Position.Bottom} /></div>; }
function UnionNode() { return <div className="ft-union"><Handle type="target" position={Position.Top} /><span /><Handle type="source" position={Position.Bottom} /></div>; }
const nodeTypes = { person: PersonNode, union: UnionNode };
function graphFor(state: FamilyState) {
  const people = connectedPeople(state); const ids = new Set(people.map(p => p.id));
  const nodes: Node[] = people.map(p => ({ id: p.id, type: "person", position: { x: 0, y: 0 }, data: { name: p.name, dates: lifespan(p), initials: initials(p.name), relation: relationTo(state, p.id), own: p.id === state.viewerId } }));
  const edges: Edge[] = []; const groups = new Map<string, { parents: string[]; children: string[] }>();
  for (const child of people) { const parents = state.links.filter(l => l.kind === "parent" && l.to === child.id && ids.has(l.from)).map(l => l.from).sort(); if (!parents.length) continue; const key = parents.join(":"); const group = groups.get(key) ?? { parents, children: [] }; group.children.push(child.id); groups.set(key, group); }
  for (const partner of state.links.filter(l => l.kind === "partner" && ids.has(l.from) && ids.has(l.to))) { const parents = [partner.from, partner.to].sort(); if (!groups.has(parents.join(":"))) groups.set(parents.join(":"), { parents, children: [] }); }
  for (const [key, group] of groups) { const unionId = `union:${key}`; nodes.push({ id: unionId, type: "union", position: { x: 0, y: 0 }, data: {} }); for (const parent of group.parents) edges.push({ id: `${parent}-${unionId}`, source: parent, target: unionId, type: "smoothstep" }); for (const child of group.children) edges.push({ id: `${unionId}-${child}`, source: unionId, target: child, type: "smoothstep" }); }
  const graph = new dagre.graphlib.Graph(); graph.setGraph({ rankdir: "TB", nodesep: 30, ranksep: 48 }); graph.setDefaultEdgeLabel(() => ({})); nodes.forEach(n => graph.setNode(n.id, { width: n.type === "person" ? 202 : 12, height: n.type === "person" ? 80 : 12 })); edges.forEach(e => graph.setEdge(e.source, e.target)); dagre.layout(graph);
  nodes.forEach(n => { const p = graph.node(n.id); n.position = { x: p.x - (n.type === "person" ? 101 : 6), y: p.y - (n.type === "person" ? 40 : 6) }; }); return { nodes, edges };
}
function FitTree({ revision }: { revision: number }) { const { fitView } = useReactFlow(); useEffect(() => { const timer = setTimeout(() => void fitView({ padding: .3, duration: 250, maxZoom: 1 }), 100); return () => clearTimeout(timer); }, [fitView, revision]); return null; }

export function TreePage() {
  const { state, update } = useFamily(); const graph = useMemo(() => graphFor(state), [state]);
  const [selected, setSelected] = useState<string | null>(null); const [adding, setAdding] = useState(false);
  const flow = useRef<ReactFlowInstance<Node, Edge> | null>(null);
  const person = state.people.find(p => p.id === selected); const people = connectedPeople(state); const viewer = state.people.find(p => p.id === state.viewerId)!;
  function focusViewer() {
    const node = flow.current?.getNode(state.viewerId);
    if (node) void flow.current?.fitView({ nodes: [node], padding: .7, duration: 450, maxZoom: 1.15 });
  }
  return <div className="ft-tree"><ReactFlow nodes={graph.nodes} edges={graph.edges} nodeTypes={nodeTypes} nodesDraggable={false} nodesConnectable={false} fitView minZoom={.15} maxZoom={1.6} defaultEdgeOptions={{ style: { stroke: "#9daa99", strokeWidth: 1.4 }, selectable: false }} onInit={instance => { flow.current = instance; }} onNodeClick={(_, n) => { if (n.type === "person") setSelected(n.id); }} onPaneClick={() => setSelected(null)} proOptions={{ hideAttribution: true }}><Background color="#ccd4c8" gap={24} /><Controls showInteractive={false} /><FitTree revision={people.length} /></ReactFlow><div className="ft-tree-title"><button type="button" className="ft-tree-viewer" onClick={focusViewer} aria-label={`Focus ${viewer.name} on the family tree`}>{viewer.name}</button><small>{people.length} {people.length === 1 ? "person" : "people"} connected</small></div><button className="button button-primary ft-tree-add" onClick={() => setAdding(true)}><Plus size={17} /> Add relative</button>{person && <aside className="ft-tree-detail"><button className="ft-close" aria-label="Close person details" onClick={() => setSelected(null)}><X size={20} /></button><span className="ft-avatar ft-portrait">{initials(person.name)}</span><span className="ft-kicker">{relationTo(state, person.id)}</span><h2>{person.name}</h2><p>{lifespan(person)}</p><p className="ft-biography">{person.biography || "A biography waiting to be written by family."}</p><Link className="button button-secondary" href={`/people/${person.id}`}>View profile</Link>{canWrite(state.viewerId, person.id) ? <Link className="button button-primary" href={`/stories/new?person=${person.id}`}>Write a story</Link> : <p className="ft-note">Your relatives tell your story.</p>}</aside>}{adding && <AddRelative anchor={selected ?? state.viewerId} onClose={() => setAdding(false)} onAdded={setSelected} />}</div>;
}
function AddRelative({ anchor, onClose, onAdded }: { anchor: string; onClose: () => void; onAdded: (id: string) => void }) {
  const { state, update } = useFamily(); const ref = useRef<HTMLDialogElement>(null); const [living, setLiving] = useState(true); const [error, setError] = useState("");
  useEffect(() => { ref.current?.showModal(); }, []);
  function submit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); const data = new FormData(e.currentTarget); const name = String(data.get("name")).trim(); const born = String(data.get("born")); const died = String(data.get("died") ?? ""); const connectedTo = String(data.get("anchor")); const relation = String(data.get("relation")); if (!name) { setError("Enter a name."); return; } if (!living && born && died && Number(died) < Number(born)) { setError("Death year must be after birth year."); return; }
    const id = crypto.randomUUID(); const person: Person = { id, name, born, died: living ? undefined : died, living, biography: "" };
    if (update(s => { const links = [...s.links]; const connect = (kind: "parent" | "partner", from: string, to: string) => links.push({ id: crypto.randomUUID(), kind, from, to });
      if (relation === "parent") connect("parent", id, connectedTo); else if (relation === "child") connect("parent", connectedTo, id); else if (relation === "partner") connect("partner", connectedTo, id); else { const parents = s.links.filter(l => l.kind === "parent" && l.to === connectedTo); if (!parents.length) throw new Error("Add a shared parent before adding a sibling."); parents.forEach(p => connect("parent", p.from, id)); }
      return { ...s, people: [...s.people, person], links }; })) { onAdded(id); onClose(); }
  }
  return <dialog className="ft-dialog" ref={ref} onCancel={onClose}><button className="ft-close" aria-label="Close add relative" onClick={onClose}><X size={20} /></button><span className="ft-kicker">Another connection</span><h2>Add a relative</h2><form className="ft-form" onSubmit={submit}><label>Name<input required autoFocus name="name" maxLength={100} /></label><div className="ft-form-grid"><label>Relationship<select name="relation"><option value="parent">Parent</option><option value="child">Child</option><option value="partner">Partner</option><option value="sibling">Sibling</option></select></label><label>Of<select name="anchor" defaultValue={anchor}>{connectedPeople(state).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div><label>Birth year <small>optional</small><input name="born" type="number" min="1" max={new Date().getFullYear()} /></label><label className="ft-check"><input type="checkbox" checked={living} onChange={e => setLiving(e.target.checked)} /> This person is living</label>{!living && <label>Death year <small>optional</small><input type="number" name="died" min="1" max={new Date().getFullYear()} /></label>}<p className="ft-muted">A living person can request to claim this profile when they join.</p>{error && <p role="alert">{error}</p>}<button className="button button-primary">Add relative</button></form></dialog>;
}
