"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { FamilyTreeLogo } from "@/components/brand/family-tree-logo";
import { authClient } from "@/lib/auth/client";
import { familyErrorMessage } from "@/lib/family-errors";

export function JoinInvitation({ token }: { token: string }) {
  const { data: session, isPending } = authClient.useSession();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const attempted = useRef("");
  const inviteQuery = `?invite=${encodeURIComponent(token)}`;
  useEffect(() => {
    if (session?.user) return; // Acceptance also handles a lost success response.
    let active = true;
    void fetch("/api/invitations/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) })
      .then(async response => { const data = await response.json(); if (!active) return; if (!response.ok) { setError(familyErrorMessage(data, "INVITATION_FAILED")); setInvalid(true); } else setName(data.name); })
      .catch(() => { if (active) setError("Could not open the invitation. Refresh to try again."); });
    return () => { active = false; };
  }, [token, session?.user?.id]);

  async function accept() {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/invitations/accept", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token }) });
      const data = await response.json();
      if (!response.ok) { setError(familyErrorMessage(data, "INVITATION_FAILED")); setInvalid(data.code === "INVITATION_INVALID"); return; }
      // Reload the provider's personal viewpoint only after the claim commits.
      window.location.replace("/tree");
    } catch { setError("Could not confirm you joined. Try again; your profile will not be duplicated."); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (isPending || !session?.user?.emailVerified || attempted.current === `${session.user.id}:${token}`) return;
    attempted.current = `${session.user.id}:${token}`;
    void accept();
    // One automatic attempt per account/link. Failures leave an explicit retry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPending, session?.user?.id, session?.user?.emailVerified, token]);
  async function sendCode() {
    if (!session?.user.email) return;
    setBusy(true); setError("");
    try { const result = await authClient.emailOtp.sendVerificationOtp({ email: session.user.email, type: "email-verification" }); if (result.error) { setError("Could not send a verification code. Please try again."); return; } setCodeSent(true); }
    catch { setError("Could not send a verification code. Please try again."); }
    finally { setBusy(false); }
  }
  async function verify(event: FormEvent) {
    event.preventDefault(); if (!session?.user.email) return;
    setBusy(true); setError("");
    try { const result = await authClient.emailOtp.verifyEmail({ email: session.user.email, otp: code }); if (result.error) { setError("That code couldn't be confirmed. Try again or request a new one."); return; } window.location.reload(); }
    catch { setError("Could not verify the code. Please try again."); }
    finally { setBusy(false); }
  }
  return <main className="ft-recovery ft-join"><Link className="wordmark" href="/"><FamilyTreeLogo /><span className="wordmark-name">FamilyTree</span></Link><section className="ft-paper">
    <span className="ft-kicker">Your place in the family</span><h1>{invalid ? "This link isn’t available" : name ? `${name}, you’re connected.` : "Join your family"}</h1>
    {!invalid && <p>Your relatives have made a place for you. Join as yourself, with the stories and connections already here.</p>}
    {error && <p className="ft-alert" role="alert">{error}</p>}
    {isPending ? <p role="status">Checking your account…</p> : !session?.user ? !invalid && <div className="ft-actions"><Link className="button button-primary" href={{ pathname: "/auth/create", query: { invite: token } }}>Create my account</Link><Link className="button button-secondary" href={{ pathname: "/auth/sign-in", query: { invite: token } }}>Sign in</Link></div> : <>
      <p className="ft-muted">Signed in as {session.user.email}</p>
      {!invalid && (!session.user.emailVerified ? <div className="ft-form"><p>Confirm your email to claim this profile.</p>{codeSent ? <form className="ft-form" onSubmit={verify}><label>Email verification code<input autoComplete="one-time-code" inputMode="numeric" value={code} onChange={e => setCode(e.target.value)} required maxLength={12} /></label><button className="button button-primary" disabled={busy}>{busy ? "Confirming…" : "Confirm and join"}</button></form> : null}<button className={codeSent ? "ft-text-button" : "button button-primary"} disabled={busy} onClick={() => void sendCode()}>{codeSent ? "Send a new code" : "Send verification code"}</button></div> : <button className="button button-primary" disabled={busy} onClick={() => void accept()}>{busy ? "Joining your family…" : "Join this tree"}</button>)}
      <button className="ft-text-button ft-join-switch" disabled={busy} onClick={async () => { const result = await authClient.signOut(); if (!result.error) window.location.replace(`/auth/sign-in${inviteQuery}`); else setError("Could not sign out. Please try again."); }}>Use a different account</button>
    </>}
  </section></main>;
}
