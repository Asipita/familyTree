import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  GitBranch,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { FamilyTreeLogo } from "@/components/brand/family-tree-logo";
import { FamilyTreeCanvas } from "@/components/family-tree/family-tree-canvas";

export default function ArchivePage() {
  return (
    <main className="archive-page archive-tree-page">
      <aside className="archive-sidebar">
        <div className="archive-sidebar-top">
          <Link className="archive-brand" href="/" aria-label="Back to FamilyTree home">
            <span className="brand-mark archive-brand-mark"><FamilyTreeLogo size={39} /></span>
            <span className="wordmark-name">FamilyTree</span>
          </Link>
          <div className="archive-switcher">
            <span className="archive-switcher-mark">A</span>
            <span><small>Your archive</small><strong>The Adebayo Family</strong></span>
            <ChevronDown size={15} />
          </div>
        </div>

        <nav className="archive-nav" aria-label="Archive navigation">
          <span className="archive-nav-label">Explore</span>
          <a className="archive-nav-item active" href="#tree"><GitBranch size={17} /> Family tree</a>
          <a className="archive-nav-item" href="#tree"><BookOpen size={17} /> Stories <span className="archive-nav-count">12</span></a>
          <a className="archive-nav-item" href="#tree"><UsersRound size={17} /> People <span className="archive-nav-count">8</span></a>
        </nav>

        <div className="archive-sidebar-bottom">
          <div className="archive-sidebar-summary">
            <span className="archive-sidebar-summary-label">Archive at a glance</span>
            <div className="archive-summary-stats"><span><strong>12</strong><small>stories</small></span><span><strong>9</strong><small>people</small></span><span><strong>3</strong><small>generations</small></span></div>
            <div className="archive-sidebar-privacy"><ShieldCheck size={14} /><span>Private archive</span><i /></div>
          </div>
          <div className="archive-account-row"><span className="archive-account-avatar">KM</span><span><strong>Kemi Martins</strong><small>Archive editor</small></span></div>
          <Link className="archive-back-home" href="/"><ArrowLeft size={15} /> Back to homepage</Link>
        </div>
      </aside>

      <section className="archive-main archive-tree-main" id="tree">
        <FamilyTreeCanvas />
        <div className="archive-tree-overlay archive-tree-overlay-title">
          <span className="archive-panel-kicker">Family tree</span>
          <strong>The Adebayo Family</strong>
          <small>9 people · 3 generations</small>
        </div>
      </section>
    </main>
  );
}
