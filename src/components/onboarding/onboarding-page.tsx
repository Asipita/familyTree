"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent, type SelectHTMLAttributes } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Plus, Trash2 } from "lucide-react";
import { FamilyTreeLogo } from "@/components/brand/family-tree-logo";
import { useFamily } from "@/components/family-provider";
import { relativeLink, type Person, type RelativeKind } from "@/lib/family";
import { resolveSiblingConnections } from "@/lib/family-relationships";

type ConnectionChoice = "parent" | "child" | "partner" | RelativeKind;
type ConnectionDraft = { id: string; name: string; born: string; gender: "" | "male" | "female"; relation: ConnectionChoice };

const connectionOptions: { value: ConnectionChoice; label: string }[] = [
  { value: "parent", label: "Parent" }, { value: "child", label: "Child" }, { value: "partner", label: "Partner" },
  { value: "sibling", label: "Sibling" }, { value: "grandparent", label: "Grandparent" }, { value: "uncle", label: "Uncle" }, { value: "aunt", label: "Aunt" }, { value: "cousin", label: "Cousin" },
];
const provisionalRelations = ["sibling", "grandparent", "uncle", "aunt", "cousin"];

function SelectField({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return <span className="onboarding-select"><select {...props}>{children}</select><ChevronDown size={16} aria-hidden="true" /></span>;
}

function Stepper({ step }: { step: number }) {
  return <ol className="onboarding-stepper" aria-label="Onboarding progress">{["Your details", "Add connections", "Review"].map((label, index) => { const number = index + 1; return <li className={number === step ? "is-current" : number < step ? "is-complete" : ""} key={label}><span>{number < step ? <Check size={14} /> : number}</span><small>{label}</small></li>; })}</ol>;
}

export function OnboardingModal() {
  const { state, ready, error, save } = useFamily();
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const submitting = useRef(false);
  const [saving, setSaving] = useState(false);
  const viewer = state.people.find((person) => person.id === state.viewerId);
  const [step, setStep] = useState(1);
  const name = viewer?.name ?? "";
  const initializedFor = useRef<string | undefined>(undefined);
  const [born, setBorn] = useState("");
  const [gender, setGender] = useState<"" | "male" | "female">("");
  const [connections, setConnections] = useState<ConnectionDraft[]>([]);
  const [connectionName, setConnectionName] = useState("");
  const [connectionBorn, setConnectionBorn] = useState("");
  const [connectionGender, setConnectionGender] = useState<"" | "male" | "female">("");
  const [connectionRelation, setConnectionRelation] = useState<ConnectionChoice>("parent");
  const [formError, setFormError] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const modal = dialog.current;
    const previousOverflow = document.body.style.overflow;
    modal?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      modal?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);
  useEffect(() => { heading.current?.focus(); }, [step, ready]);

  function containFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
    )).filter((element) => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    const active = document.activeElement;
    if (!first) { event.preventDefault(); heading.current?.focus(); }
    else if (event.shiftKey && (active === first || !controls.includes(active as HTMLElement))) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
  }

  useEffect(() => {
    if (!ready || !viewer?.accountId || initializedFor.current === viewer.accountId) return;
    initializedFor.current = viewer.accountId;
    setBorn(viewer.born);
    setGender(viewer.gender ?? "");
  }, [ready, viewer]);

  function continueDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!born) { setFormError("Add your date of birth to continue."); return; }
    setFormError(""); setStep(2);
  }
  function addConnection() {
    if (!connectionName.trim()) { setFormError("Add a name before creating a connection."); return; }
    setConnections((current) => [...current, { id: crypto.randomUUID(), name: connectionName.trim(), born: connectionBorn, gender: connectionGender, relation: connectionRelation }]);
    setConnectionName(""); setConnectionBorn(""); setConnectionGender(""); setConnectionRelation("parent"); setFormError("");
  }
  async function finish() {
    if (!viewer || submitting.current) return;
    if (!born || born > today) { setFormError("Enter a valid date of birth."); setStep(1); return; }
    submitting.current = true;
    setSaving(true);
    await save((current) => {
      const people: Person[] = current.people.map((person) => person.id === current.viewerId ? { ...person, born, gender: gender || undefined, living: true, accountId: person.accountId } : person);
      let links = [...current.links];
      for (const connection of connections) {
        const id = connection.id;
        people.push({ id, name: connection.name, born: connection.born, living: true, biography: "", ...(connection.gender ? { gender: connection.gender } : {}) });
        if (connection.relation === "parent") links.push({ id: crypto.randomUUID(), kind: "parent", from: id, to: current.viewerId });
        else if (connection.relation === "child") links.push({ id: crypto.randomUUID(), kind: "parent", from: current.viewerId, to: id });
        else if (connection.relation === "partner") links.push({ id: crypto.randomUUID(), kind: "partner", from: current.viewerId, to: id });
        else links.push(relativeLink(connection.relation, id, current.viewerId));
      }
      return resolveSiblingConnections({ ...current, onboardingComplete: true, people, links });
    });
    submitting.current = false;
    setSaving(false);
  }

  return <dialog ref={dialog} className="onboarding-modal" aria-labelledby="onboarding-title" aria-modal="true" onCancel={(event) => event.preventDefault()} onKeyDown={containFocus}>
    <header className="onboarding-modal-header">
      <span className="onboarding-brand"><FamilyTreeLogo size={28} /><span>FamilyTree</span></span>
      <h1 id="onboarding-title" ref={heading} tabIndex={-1}>Set up your tree</h1>
    </header>
    {!ready ? <p className="ft-loading" role="status">Opening your profile…</p> : <>
      <Stepper step={step} />
      <fieldset className="onboarding-form onboarding-modal-fields" disabled={saving || !viewer?.accountId} aria-busy={saving}>
        {step === 1 && <form className="onboarding-card" onSubmit={continueDetails}><div className="onboarding-card-heading"><span className="onboarding-step">01</span><div><h2>Your details</h2><p>Tell us about you.</p></div></div><div className="onboarding-grid"><label>Date of birth<input value={born} onChange={(event) => setBorn(event.target.value)} type="date" required max={today} /></label><label>Gender <small>optional</small><SelectField value={gender} onChange={(event) => setGender(event.target.value as "" | "male" | "female")}><option value="">Choose if you wish</option><option value="female">Female</option><option value="male">Male</option></SelectField></label></div>{formError && <p className="onboarding-error" role="alert">{formError}</p>}<div className="onboarding-actions"><span>Step 1 of 3</span><button className="button button-primary" type="submit">Continue <ArrowRight size={16} /></button></div></form>}
        {step === 2 && <section className="onboarding-card"><div className="onboarding-card-heading"><span className="onboarding-step">02</span><div><h2>Add connections</h2><p>Who do you remember?</p></div></div><div className="onboarding-connection-form"><label>Name<input value={connectionName} onChange={(event) => setConnectionName(event.target.value)} placeholder="A parent, uncle, or cousin" /></label><label>Relationship<SelectField value={connectionRelation} onChange={(event) => setConnectionRelation(event.target.value as ConnectionChoice)}>{connectionOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</SelectField></label><label>Date of birth <small>optional</small><input value={connectionBorn} onChange={(event) => setConnectionBorn(event.target.value)} type="date" max={today} /></label><label>Gender <small>optional</small><SelectField value={connectionGender} onChange={(event) => setConnectionGender(event.target.value as "" | "male" | "female")}><option value="">Not set</option><option value="female">Female</option><option value="male">Male</option></SelectField></label><button className="button button-secondary" type="button" onClick={addConnection}><Plus size={15} /> Add person</button></div>{connections.length ? <div className="onboarding-connections">{connections.map((connection) => <div className="onboarding-connection" key={connection.id}><span className="ft-avatar">{connection.name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span><span><strong>{connection.name}</strong><small>{connectionOptions.find((option) => option.value === connection.relation)?.label}{provisionalRelations.includes(connection.relation) ? " · provisional" : ""}</small></span><button type="button" aria-label={`Remove ${connection.name}`} onClick={() => setConnections((current) => current.filter((item) => item.id !== connection.id))}><Trash2 size={15} /></button></div>)}</div> : <p className="onboarding-empty">You can add people later.</p>}{formError && <p className="onboarding-error" role="alert">{formError}</p>}<div className="onboarding-actions"><button className="button button-secondary" type="button" onClick={() => { setFormError(""); setStep(1); }}><ArrowLeft size={16} /> Back</button><button className="button button-primary" type="button" onClick={() => { setFormError(""); setStep(3); }}>Continue <ArrowRight size={16} /></button></div></section>}
        {step === 3 && <section className="onboarding-card"><div className="onboarding-card-heading"><span className="onboarding-step">03</span><div><h2>Review</h2><p>Check your starting point.</p></div></div><div className="onboarding-review"><div><small>Your profile</small><strong>{name}</strong><span>{born}{gender ? ` · ${gender === "female" ? "Female" : "Male"}` : ""}</span></div><div><small>Connections</small>{connections.length ? connections.map((connection) => <span className="onboarding-review-person" key={connection.id}><strong>{connection.name}</strong><em>{connectionOptions.find((option) => option.value === connection.relation)?.label}{provisionalRelations.includes(connection.relation) ? " · provisional" : ""}</em></span>) : <span>No connections yet</span>}</div></div>{formError && <p className="onboarding-error" role="alert">{formError}</p>}<div className="onboarding-actions"><button className="button button-secondary" type="button" onClick={() => setStep(2)}><ArrowLeft size={16} /> Back</button><button className="button button-primary" type="button" onClick={() => void finish()}>{saving ? "Saving…" : "Open my tree"} <ArrowRight size={16} /></button></div></section>}
      </fieldset>
      {error && <p className="onboarding-error" role="alert">{error}</p>}
      {!viewer?.accountId && <button type="button" className="button button-secondary" onClick={() => window.location.reload()}>Reload profile</button>}
    </>}
  </dialog>;
}
