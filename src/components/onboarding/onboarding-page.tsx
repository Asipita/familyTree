"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FamilyTreeLogo } from "@/components/brand/family-tree-logo";
import { useFamily } from "@/components/family-provider";
import { relativeLink, type Person, type RelativeKind } from "@/lib/family";

type ConnectionChoice = "parent" | "child" | "partner" | RelativeKind;
type ConnectionDraft = { id: string; name: string; born: string; gender: "" | "male" | "female"; relation: ConnectionChoice };

const connectionOptions: { value: ConnectionChoice; label: string; provisional?: boolean }[] = [
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "partner", label: "Partner" },
  { value: "sibling", label: "Sibling", provisional: true },
  { value: "grandparent", label: "Grandparent", provisional: true },
  { value: "uncle", label: "Uncle", provisional: true },
  { value: "aunt", label: "Aunt", provisional: true },
  { value: "cousin", label: "Cousin", provisional: true },
];

export function OnboardingPage() {
  const router = useRouter();
  const { state, ready, error, update } = useFamily();
  const viewer = state.people.find((person) => person.id === state.viewerId);
  const [name, setName] = useState(viewer?.name === "You" ? "" : viewer?.name ?? "");
  const [born, setBorn] = useState(viewer?.born ?? "");
  const [gender, setGender] = useState<"" | "male" | "female">(viewer?.gender ?? "");
  const [connections, setConnections] = useState<ConnectionDraft[]>([]);
  const [connectionName, setConnectionName] = useState("");
  const [connectionBorn, setConnectionBorn] = useState("");
  const [connectionGender, setConnectionGender] = useState<"" | "male" | "female">("");
  const [connectionRelation, setConnectionRelation] = useState<ConnectionChoice>("parent");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (ready && state.onboardingComplete) router.replace("/tree");
  }, [ready, router, state.onboardingComplete]);

  function addConnection() {
    if (!connectionName.trim()) { setFormError("Give this person a name before adding them."); return; }
    setConnections((current) => [...current, { id: crypto.randomUUID(), name: connectionName.trim(), born: connectionBorn, gender: connectionGender, relation: connectionRelation }]);
    setConnectionName(""); setConnectionBorn(""); setConnectionGender(""); setConnectionRelation("parent"); setFormError("");
  }

  function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) { setFormError("Add your name to begin."); return; }
    if (!born) { setFormError("Add your date of birth to continue."); return; }
    if (!viewer) return;
    if (update((current) => {
      const people: Person[] = current.people.map((person) => person.id === current.viewerId ? { ...person, name: name.trim(), born, gender: gender || undefined, living: true, accountId: person.accountId } : person);
      let links = [...current.links];
      for (const connection of connections) {
        const id = connection.id;
        people.push({ id, name: connection.name, born: connection.born, living: true, biography: "", ...(connection.gender ? { gender: connection.gender } : {}) });
        if (connection.relation === "parent") links.push({ id: crypto.randomUUID(), kind: "parent", from: id, to: current.viewerId });
        else if (connection.relation === "child") links.push({ id: crypto.randomUUID(), kind: "parent", from: current.viewerId, to: id });
        else if (connection.relation === "partner") links.push({ id: crypto.randomUUID(), kind: "partner", from: current.viewerId, to: id });
        else links.push(relativeLink(connection.relation, id, current.viewerId));
      }
      if (links.some((link) => link.kind === "parent" && link.to === current.viewerId)) links = links.map((link) => link.kind === "relative" && link.complete === false && (link.from === current.viewerId || link.to === current.viewerId) ? { ...link, complete: true } : link);
      return { ...current, onboardingComplete: true, people, links };
    })) router.replace("/tree");
  }

  if (!ready) return <main className="onboarding-page"><p className="ft-loading">Opening your family…</p></main>;
  if (state.onboardingComplete) return null;

  return <main className="onboarding-page">
    <header className="onboarding-header"><a href="/" className="onboarding-brand"><FamilyTreeLogo size={34} /><span>FamilyTree</span></a><span className="onboarding-progress"><span /> Your first branch</span></header>
    <div className="onboarding-shell">
      <section className="onboarding-intro"><span className="ft-kicker">Before the branches spread</span><h1>Start with your place in the family.</h1><p>Tell us enough to place you accurately. You can add the people you remember now, or begin with just yourself.</p><div className="onboarding-tree-mark" aria-hidden="true"><span /><span /><span /><i /><i /><i /></div></section>
      <form className="onboarding-form" onSubmit={finish}>
        <section className="onboarding-card"><div className="onboarding-card-heading"><span className="onboarding-step">01</span><div><h2>Your details</h2><p>Your biography will be written by family.</p></div></div><div className="onboarding-grid"><label>Name<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required maxLength={100} placeholder="Your full name" /></label><label>Date of birth<input value={born} onChange={(event) => setBorn(event.target.value)} type="date" required max={new Date().toISOString().slice(0, 10)} /></label><label>Gender <small>optional</small><select value={gender} onChange={(event) => setGender(event.target.value as "" | "male" | "female")}><option value="">Choose if you wish</option><option value="female">Female</option><option value="male">Male</option></select></label></div></section>
        <section className="onboarding-card"><div className="onboarding-card-heading"><span className="onboarding-step">02</span><div><h2>Who do you remember?</h2><p>Add connections now, or come back to them from your tree.</p></div></div><div className="onboarding-connection-form"><label>Name<input value={connectionName} onChange={(event) => setConnectionName(event.target.value)} placeholder="A parent, uncle, or cousin" /></label><label>Relationship<select value={connectionRelation} onChange={(event) => setConnectionRelation(event.target.value as ConnectionChoice)}>{connectionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}{option.provisional ? " · connector needed" : ""}</option>)}</select></label><label>Date of birth <small>optional</small><input value={connectionBorn} onChange={(event) => setConnectionBorn(event.target.value)} type="date" max={new Date().toISOString().slice(0, 10)} /></label><label>Gender <small>optional</small><select value={connectionGender} onChange={(event) => setConnectionGender(event.target.value as "" | "male" | "female")}><option value="">Not set</option><option value="female">Female</option><option value="male">Male</option></select></label><button className="button button-secondary" type="button" onClick={addConnection}><Plus size={15} /> Add connection</button></div>{connections.length ? <div className="onboarding-connections">{connections.map((connection) => <div className="onboarding-connection" key={connection.id}><span className="ft-avatar">{connection.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><span><strong>{connection.name}</strong><small>{connectionOptions.find((option) => option.value === connection.relation)?.label}</small></span><button type="button" aria-label={`Remove ${connection.name}`} onClick={() => setConnections((current) => current.filter((item) => item.id !== connection.id))}><Trash2 size={15} /></button></div>)}</div> : <p className="onboarding-empty">No connections yet. You can add your first relative from the tree.</p>}</section>
        {formError && <p className="onboarding-error" role="alert">{formError}</p>}{error && <p className="onboarding-error" role="alert">{error}</p>}
        <div className="onboarding-actions"><span><Check size={15} /> You can edit details later</span><button className="button button-primary button-lg" type="submit">Open my tree <ArrowRight size={16} /></button></div>
      </form>
    </div>
  </main>;
}
