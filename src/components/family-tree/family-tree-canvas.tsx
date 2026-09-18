"use client";

import { useMemo } from "react";
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

type UnionData = {
  dates: string;
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

const nodes: Node[] = [
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

const edges: Edge[] = [
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

export function FamilyTreeCanvas() {
  const defaultEdgeOptions = useMemo(() => ({
    selectable: false,
    focusable: false,
  }), []);

  return (
    <div className="family-tree-canvas" aria-label="Interactive family tree">
      <ReactFlow
        defaultEdgeOptions={defaultEdgeOptions}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.22, minZoom: 0.72, maxZoom: 1.15 }}
        nodes={nodes}
        nodeTypes={nodeTypes}
        nodesConnectable={false}
        nodesDraggable={false}
        panOnDrag
        proOptions={{ hideAttribution: true }}
        zoomOnScroll={false}
      >
        <Background color="#cbd5cb" gap={22} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
      <div className="family-tree-legend"><span className="family-tree-legend-dot" /> Your branch <span className="family-tree-legend-line" /> Relationship</div>
    </div>
  );
}
