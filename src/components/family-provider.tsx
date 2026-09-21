"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { authClient } from "@/lib/auth/client";
import { usePathname } from "next/navigation";
import { emptyFamily, type FamilyState } from "@/lib/family";
import { familyErrorMessage, familyErrorMessages } from "@/lib/family-errors";

const Context = createContext<{ state: FamilyState; ready: boolean; error: string; reload: () => Promise<void>; update: (change: (state: FamilyState) => FamilyState) => Promise<boolean>; save: (change: (state: FamilyState) => FamilyState) => Promise<boolean> } | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const deferFamily = pathname === "/join" || pathname.startsWith("/auth");
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const [state, setState] = useState(emptyFamily);
  const current = useRef(state);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const loadedFor = useRef<string | null>(null);
  const saving = useRef(false);
  useEffect(() => {
    loadedFor.current = null;
    if (deferFamily) return;
    if (sessionPending) return;
    if (!session?.user) { current.current = emptyFamily; setState(emptyFamily); setReady(true); return; }
    let cancelled = false;
    setReady(false);
    fetch("/api/family")
      .then(async (response) => {
        const payload = await response.json() as FamilyState | { error?: string };
        if (!response.ok || !payload || !("version" in payload)) {
          if (!cancelled) setError(familyErrorMessage(payload, "FAMILY_LOAD_FAILED"));
          return;
        }
        if (!cancelled) { loadedFor.current = session.user.id; current.current = payload; setState(payload); setError(""); }
      })
      .catch(() => { if (!cancelled) setError(familyErrorMessages.FAMILY_LOAD_FAILED); })
      .finally(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, [session?.user?.id, sessionPending, deferFamily]);
  // Onboarding must remain open until the server confirms the completed profile.
  async function save(change: (state: FamilyState) => FamilyState) {
    if (saving.current) return false;
    saving.current = true;
    const userId = session?.user?.id;
    try {
      if (!userId || loadedFor.current !== userId) { setError("Your profile has not loaded. Refresh and try again."); return false; }
      let next: FamilyState;
      try { next = change(current.current); }
      catch (cause) { setError(cause instanceof Error ? cause.message : "Check your changes and try again."); return false; }
      setError("");
      const response = await fetch("/api/family", {
        method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(next),
      });
      const payload = await response.json() as FamilyState | { error?: string };
      if (!response.ok || !payload || !("version" in payload)) { setError(familyErrorMessage(payload, "FAMILY_SAVE_FAILED")); return false; }
      if (loadedFor.current !== userId) return false;
      current.current = payload;
      setState(payload);
      return true;
    } catch {
      setError(familyErrorMessages.FAMILY_SAVE_FAILED);
      return false;
    } finally { saving.current = false; }
  }
  async function reload() {
    const userId = session?.user?.id;
    if (!userId || saving.current) return;
    try {
      const response = await fetch("/api/family");
      const payload = await response.json();
      if (!response.ok || payload?.version !== 1) { setError(familyErrorMessage(payload, "FAMILY_LOAD_FAILED")); return; }
      if (loadedFor.current !== userId) return;
      current.current = payload; setState(payload); setError("");
    } catch { setError(familyErrorMessages.FAMILY_LOAD_FAILED); }
  }
  return <Context.Provider value={{ state, ready, error, reload, update: save, save }}>{children}</Context.Provider>;
}
export function useFamily() { const value = useContext(Context); if (!value) throw new Error("FamilyProvider is required"); return value; }
