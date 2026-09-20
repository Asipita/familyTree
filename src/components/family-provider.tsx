"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { seedFamily, type FamilyState } from "@/lib/family";

const storageKey = "familytree-personal-v1";
const Context = createContext<{ state: FamilyState; ready: boolean; error: string; update: (change: (state: FamilyState) => FamilyState) => boolean } | null>(null);

export function FamilyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(seedFamily);
  const current = useRef(state);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as FamilyState;
        if (saved.version !== 1 || !Array.isArray(saved.people) || !Array.isArray(saved.stories) || !Array.isArray(saved.links) || !Array.isArray(saved.requests) || !saved.settings || !saved.people.some(p => p.id === saved.viewerId)) throw new Error("Invalid saved data");
        current.current = saved; setState(saved);
      }
    } catch { setError("Saved changes could not be loaded. Your existing browser data has not been overwritten."); }
    setReady(true);
  }, []);
  function update(change: (state: FamilyState) => FamilyState) {
    try {
      const next = change(current.current);
      localStorage.setItem(storageKey, JSON.stringify(next));
      current.current = next; setState(next); setError(""); return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save. Please try again."); return false; }
  }
  return <Context.Provider value={{ state, ready, error, update }}>{children}</Context.Provider>;
}
export function useFamily() { const value = useContext(Context); if (!value) throw new Error("FamilyProvider is required"); return value; }
