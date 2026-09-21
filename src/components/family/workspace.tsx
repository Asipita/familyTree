"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BookOpen, GitBranch, UsersRound, MessageSquare, UserPlus, Network, Settings, LogOut } from "lucide-react";
import { FamilyTreeLogo } from "@/components/brand/family-tree-logo";
import { useFamily } from "@/components/family-provider";
import { authClient } from "@/lib/auth/client";
import { initials } from "@/lib/family";
import { OnboardingModal } from "@/components/onboarding/onboarding-page";

const nav = [
  { href: "/tree", label: "My tree", icon: GitBranch }, { href: "/stories", label: "Stories", icon: BookOpen },
  { href: "/people", label: "People", icon: UsersRound }, { href: "/reviews", label: "Reviews", icon: MessageSquare },
  { href: "/connections", label: "Connections", icon: Network }, { href: "/invitations", label: "Invite family", icon: UserPlus },
  { href: "/settings", label: "My account", icon: Settings },
] as const;

export function Workspace({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const { state, ready, error, reload } = useFamily();
  const { data: session } = authClient.useSession();
  const viewer = state.people.find(p => p.id === state.viewerId)!;
  const accountName = viewer.accountId === session?.user?.id ? viewer.name : session?.user?.name?.trim() || viewer.name;
  const hasProfile = ready && Boolean(session?.user?.id) && viewer.accountId === session?.user?.id;
  const needsOnboarding = hasProfile && !state.onboardingComplete;

  useEffect(() => {
    if (ready && !hasProfile && !error) router.replace("/auth/sign-in");
  }, [ready, hasProfile, error, router]);

  async function logOut() {
    setLoggingOut(true);
    const result = await authClient.signOut();
    if (!result.error) { router.replace("/auth/sign-in"); router.refresh(); }
    else setLoggingOut(false);
  }
  return <><div inert={needsOnboarding} className={`ft-workspace ${path === "/tree" ? "ft-tree-workspace" : ""}`}>
    <aside className="ft-sidebar">
      <Link className="wordmark" href="/"><FamilyTreeLogo size={36} /><span className="wordmark-name">FamilyTree</span></Link>
      <nav aria-label="Family navigation">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} aria-current={path === href || path.startsWith(`${href}/`) ? "page" : undefined}><Icon size={18} />{label}{href === "/reviews" && state.stories.some(s => s.status === "In review") ? <i /> : null}</Link>)}</nav>
      <div className="ft-sidebar-bottom"><Link href={`/people/${viewer.id}`} className="ft-account"><span className="ft-avatar">{initials(accountName)}</span><span><strong>{accountName}</strong><small>Your view of the family</small></span></Link><button type="button" className="ft-logout" onClick={() => void logOut()} disabled={loggingOut}><LogOut size={16} /> {loggingOut ? "Logging out…" : "Log out"}</button></div>
    </aside>
    <main className="ft-main" aria-busy={!ready}>{error && <div className="ft-alert" role="alert"><p>{error}</p>{hasProfile && <button className="ft-text-button" onClick={() => void reload()}>Reload tree data</button>}</div>}{hasProfile ? children : !ready ? <p className="ft-loading" role="status">Opening your family…</p> : error ? <button type="button" className="button button-secondary" onClick={() => window.location.reload()}>Reload family</button> : null}</main>
  </div>{needsOnboarding && <OnboardingModal />}</>;
}
export function PageHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <header className="ft-heading"><div><span className="ft-kicker">{eyebrow}</span><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</header>;
}
export function Empty({ title, children }: { title: string; children?: React.ReactNode }) { return <div className="ft-empty"><GitBranch size={30} strokeWidth={1} /><h2>{title}</h2>{children}</div>; }
