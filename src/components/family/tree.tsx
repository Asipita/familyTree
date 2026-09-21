"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Background, BaseEdge, Controls, Handle, Position, ReactFlow, useReactFlow, type Edge, type EdgeProps, type Node, type NodeProps, type ReactFlowInstance } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Plus, X } from "lucide-react";
import { useFamily } from "@/components/family-provider";
import { canWrite, connectedPeople, initials, lifespan, relationTo, relativeLink, type Person, type RelativeKind } from "@/lib/family";
import { graphFor } from "@/lib/family-tree-layout";
import { resolveSiblingConnections } from "@/lib/family-relationships";
import { parentConnectorPath } from "@/lib/parent-connector";

function PersonNode({ data }: NodeProps) { return <div className={`ft-node ${data.own ? "ft-node-own" : ""}`}><Handle type="target" position={Position.Top} /><span className="ft-avatar">{String(data.initials)}</span><span><strong>{String(data.name)}</strong><small>{String(data.dates)}</small><em>{String(data.relation)}</em></span><Handle type="source" position={Position.Bottom} /><Handle id="relative-left-source" type="source" position={Position.Left} /><Handle id="relative-right-source" type="source" position={Position.Right} /><Handle id="relative-left-target" type="target" position={Position.Left} /><Handle id="relative-right-target" type="target" position={Position.Right} /></div>; }
function UnionNode() { return <div className="ft-union"><Handle type="target" position={Position.Top} /><span /><Handle type="source" position={Position.Bottom} /></div>; }
const nodeTypes = { person: PersonNode, union: UnionNode };
function ParentUnionEdge(props: EdgeProps) {
  return <BaseEdge id={props.id} path={parentConnectorPath(props)} style={props.style} markerStart={props.markerStart} markerEnd={props.markerEnd} interactionWidth={props.interactionWidth} />;
}
const edgeTypes = { parentUnion: ParentUnionEdge };
function FitTree({ revision }: { revision: number }) { const { fitView } = useReactFlow(); useEffect(() => { const timer = setTimeout(() => void fitView({ padding: .3, duration: 250, maxZoom: 1 }), 100); return () => clearTimeout(timer); }, [fitView, revision]); return null; }

export function TreePage() {
  const { state: rawState } = useFamily(); const state = useMemo(() => resolveSiblingConnections(rawState), [rawState]); const graph = useMemo(() => graphFor(state), [state]);
  const [selected, setSelected] = useState<string | null>(null); const [adding, setAdding] = useState(false);
  const flow = useRef<ReactFlowInstance<Node, Edge> | null>(null);
  const person = state.people.find(p => p.id === selected); const people = connectedPeople(state); const viewer = state.people.find(p => p.id === state.viewerId)!;
  function focusViewer() {
    const node = flow.current?.getNode(state.viewerId);
    if (node) void flow.current?.fitView({ nodes: [node], padding: .7, duration: 450, maxZoom: 1.15 });
  }
  const provisional = person && state.links.find(link => link.kind === "relative" && link.complete === false && [link.from, link.to].includes(person.id));
  return <div className="ft-tree"><ReactFlow nodes={graph.nodes} edges={graph.edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} nodesDraggable={false} nodesConnectable={false} fitView minZoom={.15} maxZoom={1.6} defaultEdgeOptions={{ style: { stroke: "#9daa99", strokeWidth: 1.4 }, selectable: false }} onInit={instance => { flow.current = instance; }} onNodeClick={(_, n) => { if (n.type === "person") setSelected(n.id); }} onPaneClick={() => setSelected(null)} proOptions={{ hideAttribution: true }}><Background color="#ccd4c8" gap={24} /><Controls showInteractive={false} /><FitTree revision={people.length} /></ReactFlow><div className="ft-tree-title"><button type="button" className="ft-tree-viewer" onClick={focusViewer} aria-label={`Focus ${viewer.name} on the family tree`}>{viewer.name}</button><small>{people.length} {people.length === 1 ? "person" : "people"} connected</small></div><button className="button button-primary ft-tree-add" onClick={() => setAdding(true)}><Plus size={17} /> Add relative</button>{person && <aside className="ft-tree-detail"><button className="ft-close" aria-label="Close person details" onClick={() => setSelected(null)}><X size={20} /></button><span className="ft-avatar ft-portrait">{initials(person.name)}</span><span className="ft-kicker">{relationTo(state, person.id)}</span><h2>{person.name}</h2><p>{lifespan(person)}</p>{provisional && <p className="ft-note">This {provisional.relation ?? "family"} connection needs a parent or other connector before it can be placed exactly.</p>}<p className="ft-biography">{person.biography || "A biography waiting to be written by family."}</p><Link className="button button-secondary" href={`/people/${person.id}`}>View profile</Link>{canWrite(state.viewerId, person.id) ? <Link className="button button-primary" href={`/stories/new?person=${person.id}`}>Write a story</Link> : <p className="ft-note">Your relatives tell your story.</p>}</aside>}{adding && <AddRelative anchor={selected ?? state.viewerId} onClose={() => setAdding(false)} onAdded={setSelected} />}</div>;
}
function AddRelative({ anchor, onClose, onAdded }: { anchor: string; onClose: () => void; onAdded: (id: string) => void }) {
  const { state, update } = useFamily(); const ref = useRef<HTMLDialogElement>(null); const [living, setLiving] = useState(true); const [error, setError] = useState("");
  useEffect(() => { ref.current?.showModal(); }, []);
  function submit(e: React.FormEvent<HTMLFormElement>) { e.preventDefault(); const data = new FormData(e.currentTarget); const name = String(data.get("name")).trim(); const born = String(data.get("born")); const died = String(data.get("died") ?? ""); const connectedTo = String(data.get("anchor")); const relation = String(data.get("relation")); if (!name) { setError("Enter a name."); return; } if (!living && born && died && Number(died) < Number(born)) { setError("Death year must be after birth year."); return; }
    const id = crypto.randomUUID(); const gender = String(data.get("gender") ?? ""); const person: Person = { id, name, born, died: living ? undefined : died, living, biography: "", ...(gender === "male" || gender === "female" ? { gender } : {}) };
    if (update(s => { let links = [...s.links]; const connect = (kind: "parent" | "partner", from: string, to: string) => links.push({ id: crypto.randomUUID(), kind, from, to });
      if (relation === "parent") connect("parent", id, connectedTo); else if (relation === "child") connect("parent", connectedTo, id); else if (relation === "partner") connect("partner", connectedTo, id); else links.push(relativeLink(relation as RelativeKind, id, connectedTo));
      return resolveSiblingConnections({ ...s, people: [...s.people, person], links }); })) { onAdded(id); onClose(); }
  }
  return <dialog className="ft-dialog" ref={ref} onCancel={onClose}><button className="ft-close" aria-label="Close add relative" onClick={onClose}><X size={20} /></button><span className="ft-kicker">Another connection</span><h2>Add a relative</h2><form className="ft-form" onSubmit={submit}><label>Name<input required autoFocus name="name" maxLength={100} /></label><div className="ft-form-grid"><label>Relationship<select name="relation"><option value="parent">Parent</option><option value="child">Child</option><option value="partner">Partner</option><option value="sibling">Sibling</option><option value="grandparent">Grandparent</option><option value="uncle">Uncle</option><option value="aunt">Aunt</option><option value="cousin">Cousin</option></select></label><label>Of<select name="anchor" defaultValue={anchor}>{connectedPeople(state).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div><label>Birth year <small>optional</small><input name="born" type="number" min="1" max={new Date().getFullYear()} /></label><label>Gender <small>optional</small><select name="gender"><option value="">Not set</option><option value="female">Female</option><option value="male">Male</option></select></label><label className="ft-check"><input type="checkbox" checked={living} onChange={e => setLiving(e.target.checked)} /> This person is living</label>{!living && <label>Death year <small>optional</small><input type="number" name="died" min="1" max={new Date().getFullYear()} /></label>}<p className="ft-muted">A living person can request to claim this profile when they join.</p>{error && <p role="alert">{error}</p>}<button className="button button-primary">Add relative</button></form></dialog>;
}
