"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { useFamily } from "@/components/family-provider";
import { canEditProfile, type Person } from "@/lib/family";

export function EditProfileButton({ person }: { person: Person }) {
  const { state } = useFamily();
  const [open, setOpen] = useState(false);
  if (!canEditProfile(state, person)) return null;
  return <><button className="button button-secondary" onClick={() => setOpen(true)}>Edit basic profile</button>{open && <ProfileEditor person={person} onClose={() => setOpen(false)} />}</>;
}
function ProfileEditor({ person, onClose }: { person: Person; onClose: () => void }) {
  const { save, error, reload } = useFamily();
  const ref = useRef<HTMLDialogElement>(null);
  const [living, setLiving] = useState(person.living);
  const [busy, setBusy] = useState(false);
  useEffect(() => { ref.current?.showModal(); }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const data = new FormData(event.currentTarget);
    const gender = String(data.get("gender") ?? "");
    setBusy(true);
    const saved = await save(state => {
      const current = state.people.find(p => p.id === person.id);
      if (!current || !canEditProfile(state, current)) throw new Error("You can no longer edit this profile.");
      return { ...state, people: state.people.map(p => p.id !== person.id ? p : { ...p, name: String(data.get("name")).trim(), born: String(data.get("born") ?? ""), gender: gender === "male" || gender === "female" ? gender : undefined, living, died: living ? undefined : String(data.get("died") ?? "") }) };
    });
    setBusy(false); if (saved) onClose();
  }
  return <dialog className="ft-dialog" ref={ref} onCancel={event => { if (busy) event.preventDefault(); else onClose(); }} aria-labelledby="profile-editor-title"><button className="ft-close" aria-label="Close profile editor" onClick={onClose} disabled={busy}><X size={20} /></button><span className="ft-kicker">The essentials</span><h2 id="profile-editor-title">Edit basic profile</h2><form className="ft-form" onSubmit={submit}>
    <label>Name<input name="name" required maxLength={300} defaultValue={person.name} autoFocus /></label>
    <label>Birth date or year <small>optional</small><input name="born" placeholder="YYYY-MM-DD or YYYY" pattern="[0-9]{4}(-[0-9]{2}-[0-9]{2})?" maxLength={10} defaultValue={person.born} /></label>
    <label>Gender <small>optional</small><select name="gender" defaultValue={person.gender ?? ""}><option value="">Not set</option><option value="female">Female</option><option value="male">Male</option></select></label>
    {!person.accountId && <label className="ft-check"><input type="checkbox" checked={living} onChange={e => setLiving(e.target.checked)} />This person is living</label>}
    {!living && <label>Death date or year <small>optional</small><input name="died" defaultValue={person.died ?? ""} placeholder="YYYY-MM-DD or YYYY" pattern="[0-9]{4}(-[0-9]{2}-[0-9]{2})?" maxLength={10} /></label>}
    {error && <div className="ft-alert" role="alert"><p>{error}</p><button className="ft-text-button" type="button" onClick={() => void reload()}>Reload tree data</button></div>}
    <button className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
  </form></dialog>;
}
