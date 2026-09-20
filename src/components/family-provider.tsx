"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { authClient } from "@/lib/auth/client";
import { emptyFamily, type FamilyState } from "@/lib/family";

const Context = createContext<{ state: FamilyState; ready: boolean; error: string; update: (change: (state: FamilyState) => FamilyState) => boolean; save: (change: (state: FamilyState) => FamilyState) => Promise<boolean> } | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [state, setState] = useState(emptyFamily);
  const current = useRef(state);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const loadedFor = useRef<string | null>(null);
  const saving = useRef(false);
  useEffect(() => {
    loadedFor.current = null;
    if (sessionPending) return;
    if (!session?.user) { current.current = emptyFamily; setState(emptyFamily); setReady(true); return; }
    let cancelled = false;
    setReady(false);
    fetch("/api/family")
      .then(async (response) => {
        const payload = await response.json() as FamilyState | { error?: string };
        if (!response.ok || !("version" in payload)) throw new Error("error" in payload ? payload.error : "Your family view could not be loaded.");
        if (!cancelled) { loadedFor.current = session.user.id; current.current = payload; setState(payload); setError(""); }
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Your family view could not be loaded."); })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [session?.user?.id, sessionPending]);
  // Onboarding must remain open until the server confirms the completed profile.
  async function save(change: (state: FamilyState) => FamilyState) {
    if (saving.current) return false;
    saving.current = true;
    const userId = session?.user?.id;
    try {
      if (!userId || loadedFor.current !== userId) throw new Error("Your profile has not loaded. Refresh and try again.");
      const next = change(current.current);
      setError("");
      const response = await fetch("/api/family", {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next),
      });
      const payload = await response.json() as FamilyState | { error?: string };
      if (!response.ok || !("version" in payload)) throw new Error("error" in payload ? payload.error : "Your changes could not be saved.");
      if (loadedFor.current !== userId) return false;
      current.current = payload;
      setState(payload);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save. Please try again.");
      return false;
    } finally { saving.current = false; }
  }
  function update(change: (state: FamilyState) => FamilyState) {
    try {
      const next = change(current.current);
      current.current = next; setState(next); setError("");
      if (session?.user) {
        void fetch("/api/family", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next) })
          .then(async (response) => {
            if (!response.ok) {
              const payload = await response.json().catch(() => ({})) as { error?: string };
              throw new Error(payload.error ?? "Your changes could not be saved.");
            }
          })
          .catch((cause) => setError(cause instanceof Error ? cause.message : "Your changes could not be saved."));
      }
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save. Please try again."); return false; }
  }
  return <Context.Provider value={{ state, ready, error, update, save }}>{children}</Context.Provider>;
}
export function useFamily() { const value = useContext(Context); if (!value) throw new Error("FamilyProvider is required"); return value; }
