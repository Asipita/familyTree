"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { FamilyTreeLogo } from "@/components/brand/family-tree-logo";
import { authClient } from "@/lib/auth/client";

export function RecoveryScreen({ mode, token = "" }: { mode: "reset" | "verify"; token?: string }) {
  const [message, setMessage] = useState(""); const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== "verify" || !token) return;
    let active = true;
    void authClient.verifyEmail({ query: { token, callbackURL: "/auth/verify-email" } }).then(result => {
      if (!active) return;
      if (result.error) setError(result.error.message || "This verification link is no longer valid.");
      else setMessage("Your email is confirmed. You can continue into your family tree.");
    }).catch(() => { if (active) setError("This verification link is no longer valid. Request a new one below."); });
    return () => { active = false; };
  }, [mode, token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setBusy(true);
    const data = new FormData(event.currentTarget);
    try {
      if (mode === "reset") {
        if (!token) throw new Error("This recovery link is missing or incomplete.");
        if (data.get("password") !== data.get("confirmation")) throw new Error("The passwords do not match.");
        const result = await authClient.resetPassword({ newPassword: String(data.get("password")), token });
        if (result.error) throw result.error;
        setMessage("Your password has been updated. You can sign in with it now.");
      } else {
        const email = String(data.get("email") ?? "").trim();
        const result = await authClient.sendVerificationEmail({ email, callbackURL: `${window.location.origin}/auth/verify-email` });
        if (result.error) throw result.error;
        setMessage("If that account needs verification, a new message is on its way.");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not complete that request. Please try again.");
    } finally { setBusy(false); }
  }

  return <main className="ft-recovery"><Link className="wordmark" href="/"><FamilyTreeLogo /><span className="wordmark-name">FamilyTree</span></Link><section className="ft-paper"><span className="ft-kicker">Your personal account</span><h1>{mode === "reset" ? "Choose a new password" : "Confirm your email"}</h1><p>{mode === "reset" ? "Use the link from your recovery email to choose a new password." : "Email verification keeps your personal family view connected to you."}</p><form className="ft-form" onSubmit={handleSubmit}>
    {mode === "reset" ? <><label>New password<input name="password" type="password" autoComplete="new-password" minLength={8} required /></label><label>Confirm password<input name="confirmation" type="password" autoComplete="new-password" minLength={8} required /></label></> : <label>Email address<input type="email" name="email" autoComplete="email" required /></label>}{error && <p role="alert">{error}</p>}{message && <p className="ft-note" role="status">{message}</p>}<button className="button button-primary" disabled={busy}>{busy ? "Working…" : mode === "reset" ? "Update password" : "Send verification email"}</button></form><p><Link className="ft-text-button" href="/auth/sign-in">Return to sign in →</Link></p></section></main>;
}
