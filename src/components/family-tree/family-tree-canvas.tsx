"use client";

import { useCallback, useMemo, useState, type FormEvent, type MouseEvent } from "react";
import { BookOpen, MessageCircle, PencilLine, Plus, UsersRound, X } from "lucide-react";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

type PersonData = {
  name: string;
  dates: string;
  initials: string;
  tone: "clay" | "moss" | "blue" | "gold";
  relation?: string;
};

type MemberRelation = "parent" | "child" | "sibling" | "partner" | "grandparent" | "cousin" | "other";

type NewMemberForm = {
  name: string;
  dates: string;
  relation: MemberRelation;
  connectedTo: string;
};

type UnionData = {
  dates: string;
};

type PersonStoryDetails = {
  biography: string;
  storyTitle: string;
  storyStatus: "Published" | "In review" | "Draft";
  storyCount: number;
  contributors: string[];
};

function PersonNode({ data }: NodeProps<Node<PersonData, "person">>) {
  return (
    <div className="flow-person-node">
      <Handle className="flow-handle" type="target" position={Position.Top} />
      <span className={`flow-person-avatar ${data.tone}`}>{data.initials}</span>
      <span className="flow-person-copy">
        <strong>{data.name}</strong>
        <small>{data.dates}</small>
        {data.relation ? <em>{data.relation}</em> : null}
      </span>
      <Handle className="flow-handle" type="source" position={Position.Bottom} />
    </div>
  );
}

function UnionNode({ data }: NodeProps<Node<UnionData, "union">>) {
  return (
    <div className="flow-union-node">
      <Handle className="flow-handle" type="target" position={Position.Top} />
      <span className="flow-union-diamond" />
      <small>{data.dates}</small>
      <Handle className="flow-handle" type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { person: PersonNode, union: UnionNode };

const initialPersonStoryDetails: Record<string, PersonStoryDetails> = {
  adewale: {
    biography: "A patient builder who believed a family was strongest when everyone had a place at the table.",
    storyTitle: "A quiet kind of courage",
    storyStatus: "Published",
    storyCount: 3,
    contributors: ["Kemi", "Sade", "Tola"],
  },
  sade: {
    biography: "The keeper of the family house, known for remembering every birthday, visitor, and unfinished conversation.",
    storyTitle: "The house that was always open",
    storyStatus: "In review",
    storyCount: 2,
    contributors: ["Kemi", "Nneka"],
  },
  funmi: {
    biography: "She never called it leadership. She noticed what needed doing, and did it before anyone asked.",
    storyTitle: "The woman who made room",
    storyStatus: "In review",
    storyCount: 4,
    contributors: ["Kemi", "Adaeze", "Tola"],
  },
  bayo: {
    biography: "A steady presence with a practical kindness, whose best advice usually arrived while fixing something.",
    storyTitle: "The things he repaired",
    storyStatus: "Draft",
    storyCount: 1,
    contributors: ["Kemi"],
  },
  segun: {
    biography: "A thoughtful uncle who made room for questions and never rushed an answer that deserved more time.",
    storyTitle: "Notes from the long drive home",
    storyStatus: "Published",
    storyCount: 2,
    contributors: ["Tunde", "Kemi"],
  },
  nneka: {
    biography: "The family storyteller, with a gift for turning ordinary afternoons into memories worth keeping.",
    storyTitle: "Every afternoon had a name",
    storyStatus: "Draft",
    storyCount: 1,
    contributors: ["Tunde", "Kemi"],
  },
  kemi: {
    biography: "The person carrying the family archive forward, gathering the fragments and giving them somewhere to meet.",
    storyTitle: "What I remember first",
    storyStatus: "Draft",
    storyCount: 2,
    contributors: ["Tola", "Adaeze"],
  },
  tola: {
    biography: "A sibling, witness, and keeper of the details Kemi was too young to remember the first time around.",
    storyTitle: "Our mother’s blue cupboard",
    storyStatus: "In review",
    storyCount: 2,
    contributors: ["Kemi", "Nneka"],
  },
  tunde: {
    biography: "The cousin who keeps the family laughing, and remembers the stories that begin with ‘you had to be there.’",
    storyTitle: "You had to be there",
    storyStatus: "Published",
    storyCount: 2,
    contributors: ["Kemi", "Segun"],
  },
};

const initialNodes: Node[] = [
  {
    id: "adewale",
    type: "person",
    position: { x: 118, y: 18 },
    data: { name: "Chief Adewale", dates: "1928 — 2004", initials: "CA", tone: "clay", relation: "great-grandfather" },
  },
  {
    id: "sade",
    type: "person",
    position: { x: 332, y: 18 },
    data: { name: "Alhaja Sade", dates: "1933 — 2011", initials: "AS", tone: "gold", relation: "great-grandmother" },
  },
  {
    id: "union-parents",
    type: "union",
    position: { x: 290, y: 119 },
    data: { dates: "1946" },
  },
  {
    id: "funmi",
    type: "person",
    position: { x: 16, y: 202 },
    data: { name: "Funmi Adebayo", dates: "1948 — 2021", initials: "FN", tone: "moss", relation: "mother" },
  },
  {
    id: "bayo",
    type: "person",
    position: { x: 190, y: 202 },
    data: { name: "Bayo Martins", dates: "1947 — 2019", initials: "BM", tone: "gold", relation: "father" },
  },
  {
    id: "segun",
    type: "person",
    position: { x: 432, y: 202 },
    data: { name: "Segun Adebayo", dates: "1952 — 2017", initials: "SA", tone: "blue", relation: "uncle" },
  },
  {
    id: "nneka",
    type: "person",
    position: { x: 606, y: 202 },
    data: { name: "Nneka Adebayo", dates: "1954 —", initials: "NA", tone: "gold", relation: "aunt" },
  },
  {
    id: "union-funmi",
    type: "union",
    position: { x: 172, y: 299 },
    data: { dates: "1978" },
  },
  {
    id: "union-segun",
    type: "union",
    position: { x: 584, y: 299 },
    data: { dates: "1979" },
  },
  {
    id: "kemi",
    type: "person",
    position: { x: 20, y: 390 },
    data: { name: "Kemi Martins", dates: "1981 —", initials: "KM", tone: "clay", relation: "you" },
  },
  {
    id: "tola",
    type: "person",
    position: { x: 198, y: 390 },
    data: { name: "Tola Martins", dates: "1984 —", initials: "TM", tone: "moss", relation: "sibling" },
  },
  {
    id: "tunde",
    type: "person",
    position: { x: 580, y: 390 },
    data: { name: "Tunde Adebayo", dates: "1980 —", initials: "TA", tone: "blue", relation: "cousin" },
  },
];

const initialEdges: Edge[] = [
  { id: "adewale-union", source: "adewale", target: "union-parents", type: "smoothstep", style: { stroke: "#a9b8ab", strokeWidth: 1.5 } },
  { id: "sade-union", source: "sade", target: "union-parents", type: "smoothstep", style: { stroke: "#a9b8ab", strokeWidth: 1.5 } },
  { id: "union-funmi", source: "union-parents", target: "funmi", type: "smoothstep", style: { stroke: "#a9b8ab", strokeWidth: 1.5 } },
  { id: "union-segun", source: "union-parents", target: "segun", type: "smoothstep", style: { stroke: "#a9b8ab", strokeWidth: 1.5 } },
  { id: "funmi-union", source: "funmi", target: "union-funmi", type: "smoothstep", style: { stroke: "#a9b8ab", strokeWidth: 1.5 } },
  { id: "bayo-union", source: "bayo", target: "union-funmi", type: "smoothstep", style: { stroke: "#a9b8ab", strokeWidth: 1.5 } },
  { id: "segun-union", source: "segun", target: "union-segun", type: "smoothstep", style: { stroke: "#a9b8ab", strokeWidth: 1.5 } },
  { id: "nneka-union", source: "nneka", target: "union-segun", type: "smoothstep", style: { stroke: "#a9b8ab", strokeWidth: 1.5 } },
  { id: "union-kemi", source: "union-funmi", target: "kemi", type: "smoothstep", style: { stroke: "#a9b8ab", strokeWidth: 1.5 } },
  { id: "union-tola", source: "union-funmi", target: "tola", type: "smoothstep", style: { stroke: "#a9b8ab", strokeWidth: 1.5 } },
  { id: "union-tunde", source: "union-segun", target: "tunde", type: "smoothstep", style: { stroke: "#a9b8ab", strokeWidth: 1.5 } },
];

function PersonStoryPanel({
  details,
  person,
  onClose,
}: {
  details: PersonStoryDetails;
  person: PersonData;
  onClose: () => void;
}) {
  return (
    <aside className="flow-story-panel" aria-label={`${person.name} family details`} onClick={(event) => event.stopPropagation()}>
      <div className="flow-story-panel-header">
        <span className="archive-panel-kicker">Person in your family</span>
        <button className="flow-story-close" onClick={onClose} aria-label="Close family member details"><X size={17} /></button>
      </div>
      <div className="flow-story-identity">
        <span className={`flow-story-avatar ${person.tone}`}>{person.initials}</span>
        <span><h2>{person.name}</h2><small>{person.dates} · {person.relation}</small></span>
      </div>
      <div className="flow-story-bio">
        <span className="flow-story-label">A little of what we know</span>
        <p>{details.biography}</p>
      </div>
      <div className="flow-connected-story">
        <div className="flow-connected-story-top"><span><BookOpen size={14} /> Connected story</span><em className={`flow-story-status flow-story-status-${details.storyStatus.toLowerCase().replace(" ", "-")}`}>{details.storyStatus}</em></div>
        <h3>{details.storyTitle}</h3>
        <small>{details.storyCount} {details.storyCount === 1 ? "story" : "stories"} connected to this person</small>
        <div className="flow-story-contributors"><span className="flow-story-contributor-label"><UsersRound size={13} /> With family</span><span className="flow-contributor-stack">{details.contributors.map((contributor, index) => <i key={contributor} className={`flow-contributor-avatar ${["clay", "moss", "blue", "gold"][index % 4]}`}>{contributor.slice(0, 2).toUpperCase()}</i>)}</span></div>
      </div>
      <div className="flow-story-actions">
        <a className="button button-primary button-md" href="/archive/stories/new"><PencilLine size={15} /> Write a story</a>
        <a className="button button-secondary button-md" href="/archive/stories/new"><MessageCircle size={15} /> Edit story</a>
      </div>
    </aside>
  );
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getNewMemberPosition(anchor: Node, relation: MemberRelation, currentNodes: Node[]) {
  const offsets: Record<MemberRelation, { x: number; y: number }> = {
    parent: { x: 180, y: -145 },
    child: { x: 180, y: 145 },
    sibling: { x: 180, y: 0 },
    partner: { x: 180, y: 0 },
    grandparent: { x: 180, y: -145 },
    cousin: { x: 180, y: 145 },
    other: { x: 180, y: 100 },
  };
  const offset = offsets[relation];
  let x = anchor.position.x + offset.x;
  const y = Math.max(18, anchor.position.y + offset.y);

  while (currentNodes.some((node) => Math.abs(node.position.x - x) < 145 && Math.abs(node.position.y - y) < 74)) {
    x += 180;
  }

  return { x, y };
}

function AddFamilyMemberPanel({
  people,
  onClose,
  onSubmit,
}: {
  people: Node[];
  onClose: () => void;
  onSubmit: (form: NewMemberForm) => void;
}) {
  const [form, setForm] = useState<NewMemberForm>({
    name: "",
    dates: "",
    relation: "child",
    connectedTo: people[0]?.id ?? "",
  });

  const updateField = <K extends keyof NewMemberForm>(field: K, value: NewMemberForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.name.trim() || !form.connectedTo) return;
    onSubmit({ ...form, name: form.name.trim(), dates: form.dates.trim() || "—" });
  };

  return (
    <div className="family-tree-dialog-backdrop" onClick={onClose}>
      <section className="family-tree-dialog" aria-label="Add a family member" aria-modal="true" role="dialog" onClick={(event) => event.stopPropagation()}>
        <div className="family-tree-dialog-header">
          <div>
            <span className="archive-panel-kicker">Grow your archive</span>
            <h2>Add a family member</h2>
            <p>Place someone new in the family tree and start keeping their story close.</p>
          </div>
          <button className="flow-story-close" onClick={onClose} aria-label="Close add family member form"><X size={17} /></button>
        </div>

        <form className="family-tree-member-form" onSubmit={handleSubmit}>
          <label>
            <span>Name</span>
            <input autoFocus required value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="e.g. Amina Bello" />
          </label>
          <label>
            <span>Dates <small>optional</small></span>
            <input value={form.dates} onChange={(event) => updateField("dates", event.target.value)} placeholder="e.g. 1998 —" />
          </label>
          <div className="family-tree-form-grid">
            <label>
              <span>Relationship</span>
              <select value={form.relation} onChange={(event) => updateField("relation", event.target.value as MemberRelation)}>
                <option value="child">Child</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="partner">Partner</option>
                <option value="grandparent">Grandparent</option>
                <option value="cousin">Cousin</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              <span>Connect to</span>
              <select value={form.connectedTo} onChange={(event) => updateField("connectedTo", event.target.value)}>
                {people.map((person) => <option key={person.id} value={person.id}>{(person.data as PersonData).name}</option>)}
              </select>
            </label>
          </div>
          <p className="family-tree-form-note">This demo adds the member to the tree immediately. Their details can be expanded later.</p>
          <div className="family-tree-dialog-actions">
            <button className="button button-secondary button-md" type="button" onClick={onClose}>Cancel</button>
            <button className="button button-primary button-md" type="submit"><Plus size={15} /> Add member</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export function FamilyTreeCanvas({ onMemberCountChange }: { onMemberCountChange?: (count: number) => void }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [treeNodes, setTreeNodes] = useState<Node[]>(initialNodes);
  const [treeEdges, setTreeEdges] = useState<Edge[]>(initialEdges);
  const [storyDetails, setStoryDetails] = useState<Record<string, PersonStoryDetails>>(initialPersonStoryDetails);
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);
  const defaultEdgeOptions = useMemo(() => ({
    selectable: false,
    focusable: false,
  }), []);

  const handleNodeClick = useCallback((_event: MouseEvent, node: Node) => {
    if (node.type === "person") setSelectedNodeId(node.id);
  }, []);

  const handleAddMember = useCallback((form: NewMemberForm) => {
    const anchor = treeNodes.find((node) => node.id === form.connectedTo);
    if (!anchor) return;

    const id = `member-${Date.now()}`;
    const tone = (["clay", "moss", "blue", "gold"] as const)[treeNodes.length % 4];
    const newMember: Node = {
      id,
      type: "person",
      position: getNewMemberPosition(anchor, form.relation, treeNodes),
      data: {
        name: form.name,
        dates: form.dates,
        initials: getInitials(form.name),
        tone,
        relation: form.relation,
      },
    };
    const source = form.relation === "parent" || form.relation === "grandparent" ? id : form.connectedTo;
    const target = source === id ? form.connectedTo : id;
    const newEdge: Edge = {
      id: `${source}-${target}`,
      source,
      target,
      type: "smoothstep",
      style: { stroke: "#a9b8ab", strokeWidth: 1.5 },
    };

    setTreeNodes((current) => [...current, newMember]);
    setTreeEdges((current) => [...current, newEdge]);
    setStoryDetails((current) => ({
      ...current,
      [id]: {
        biography: "This family member has just been added to the archive. Their story is waiting to be written.",
        storyTitle: "A story waiting to be told",
        storyStatus: "Draft",
        storyCount: 0,
        contributors: ["KM"],
      },
    }));
    onMemberCountChange?.(treeNodes.filter((node) => node.type === "person").length + 1);
    setIsAddPanelOpen(false);
    setSelectedNodeId(id);
  }, [onMemberCountChange, treeNodes]);

  const selectedNode = selectedNodeId ? treeNodes.find((node) => node.id === selectedNodeId) : undefined;
  const selectedPerson = selectedNode?.type === "person" ? selectedNode.data as PersonData : undefined;
  const selectedDetails = selectedNodeId ? storyDetails[selectedNodeId] : undefined;

  return (
    <div className="family-tree-canvas" aria-label="Interactive family tree">
      <button className="family-tree-add-button" onClick={(event) => { event.stopPropagation(); setSelectedNodeId(null); setIsAddPanelOpen(true); }}>
        <Plus size={16} /> Add family member
      </button>
      <ReactFlow
        defaultEdgeOptions={defaultEdgeOptions}
        edges={treeEdges}
        fitView
        fitViewOptions={{ padding: 0.22, minZoom: 0.72, maxZoom: 1.15 }}
        nodes={treeNodes}
        nodeTypes={nodeTypes}
        nodesConnectable={false}
        nodesDraggable={false}
        onNodeClick={handleNodeClick}
        onPaneClick={() => setSelectedNodeId(null)}
        panOnDrag
        proOptions={{ hideAttribution: true }}
        zoomOnScroll={false}
      >
        <Background color="#cbd5cb" gap={22} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
      <div className="family-tree-legend"><span className="family-tree-legend-dot" /> Your branch <span className="family-tree-legend-line" /> Relationship</div>
      {selectedPerson && selectedDetails ? <PersonStoryPanel details={selectedDetails} onClose={() => setSelectedNodeId(null)} person={selectedPerson} /> : null}
      {isAddPanelOpen ? <AddFamilyMemberPanel onClose={() => setIsAddPanelOpen(false)} onSubmit={handleAddMember} people={treeNodes.filter((node) => node.type === "person")} /> : null}
    </div>
  );
}
