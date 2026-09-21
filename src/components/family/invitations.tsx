"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Check, Copy, UserPlus } from "lucide-react";
import { useFamily } from "@/components/family-provider";
import { canInvite, connectedPeople, initials } from "@/lib/family";
import { familyErrorMessage } from "@/lib/family-errors";
import { Empty, PageHeading } from "./workspace";

type Invitation = { id: string; personId: string; email: string; expiresAt: string; status: string };
export function InvitationsPage({ personId }: { personId?: string }) {
  const { state } = useFamily();
  const candidates = connectedPeople(state).filter(p => canInvite(state, p));
  const [selected, setSelected] = useState(personId ?? candidates[0]?.id ?? "");
  const [items, setItems] = useState<Invitation[]>([]);
  const [link, setLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const person = candidates.find(p => p.id === selected);
  async function load() {
    const response = await fetch("/api/invitations");
    const data = await response.json();
    if (!response.ok) throw new Error(familyErrorMessage(data, "INVITATION_FAILED"));
    setItems(data);
  }
  useEffect(() => { void load().catch(() => setError("Could not load invitations. Refresh to try again.")); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || !person) return;
    const data = new FormData(event.currentTarget);
    setBusy(true); setError(""); setLink(""); setCopied(false);
    try {
      const response = await fetch("/api/invitations", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ personId: selected, email: data.get("email") }) });
      const result = await response.json();
      if (!response.ok) { setError(familyErrorMessage(result, "INVITATION_FAILED")); return; }
      setLink(`${window.location.origin}${result.path}`);
      await load();
    } catch { setError("Could not complete the request. Check your invitations before creating another link."); }
    finally { setBusy(false); }
  }
  async function revoke(id: string) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/invitations", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
      if (!response.ok) { setError(familyErrorMessage(await response.json(), "INVITATION_FAILED")); return; }
      setLink(""); await load();
    } catch { setError("Could not revoke the invitation. Try again."); }
    finally { setBusy(false); }
  }
  return <div className="ft-page"><PageHeading eyebrow="Bring family closer" title="Invite a relative" description="Their place in the tree is already here." />
    <div className="ft-columns"><section className="ft-paper">
      {candidates.length ? <form className="ft-form" onSubmit={submit}>
        <label>Who are you inviting?<select value={selected} onChange={e => { setSelected(e.target.value); setLink(""); }} required><option value="" disabled>Choose a person</option>{candidates.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        {person && <div className="ft-invite-person"><span className="ft-avatar ft-avatar-large">{initials(person.name)}</span><div><strong>{person.name}</strong><small>One profile. Ready to claim.</small></div></div>}
        <label>Their email address<input name="email" type="email" required maxLength={320} autoComplete="off" placeholder="relative@example.com" /></label>
        <p className="ft-muted">Only an account with this verified email can use the link. It expires in 7 days.</p>
        <button className="button button-primary" disabled={busy || !person}><UserPlus size={17} />{busy ? "Working…" : "Create invitation link"}</button>
      </form> : <Empty title="No profiles ready to invite"><p>You can invite living relatives whose unclaimed profiles you created.</p><Link href="/tree">Back to your tree →</Link></Empty>}
      {link && <section className="ft-invite-link" aria-label="Invitation link"><h3>Ready to share</h3><p>Send this link privately to your relative. No email has been sent.</p><label className="ft-field">Invitation link<input readOnly value={link} onFocus={e => e.target.select()} /></label><button className="button button-secondary" onClick={async () => { try { await navigator.clipboard.writeText(link); setCopied(true); } catch { setError("Select the link above and copy it manually."); } }}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? "Copied" : "Copy link"}</button></section>}
    </section><aside className="ft-side-note"><UserPlus size={26} strokeWidth={1.3} /><h2>A familiar place to begin.</h2><p>They’ll join this tree as themselves, update their details, and add the people they know.</p><p>The stories you’ve written stay with their profile.</p></aside></div>
    {error && <p className="ft-alert" role="alert">{error}</p>}
    <div className="ft-section-title"><h2>Your invitations</h2></div><div className="ft-request-list">{items.map(item => <div key={item.id}><strong>{state.people.find(p => p.id === item.personId)?.name ?? "Relative"}</strong><p>{item.email}</p><span className="ft-badge">{item.status}</span>{item.status === "Pending" && <><p className="ft-muted">Expires {new Date(item.expiresAt).toLocaleDateString()}</p><button className="ft-text-button" disabled={busy} onClick={() => void revoke(item.id)}>Revoke invitation</button></>}</div>)}</div>
  </div>;
}
