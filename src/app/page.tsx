import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleUserRound,
  Feather,
  GitBranch,
  HeartHandshake,
  LockKeyhole,
  Menu,
  Quote,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { FamilyTreeLogo } from "@/components/brand/family-tree-logo";

const familyMembers = [
  { initials: "AN", tone: "clay", name: "Adaeze Nwosu" },
  { initials: "TO", tone: "moss", name: "Tunde Okafor" },
  { initials: "KM", tone: "blue", name: "Kemi Martins" },
  { initials: "YO", tone: "gold", name: "Yinka Ojo" },
];

function FamilyNode({
  label,
  detail,
  tone = "default",
  accent = false,
}: {
  label: string;
  detail: string;
  tone?: string;
  accent?: boolean;
}) {
  return (
    <div className={`family-node ${accent ? "family-node-accent" : ""}`}>
      <span className={`family-avatar ${tone}`}>
        {label
          .split(" ")
          .map((word) => word[0])
          .join("")}
      </span>
      <span>
        <strong>{label}</strong>
        <small>{detail}</small>
      </span>
    </div>
  );
}

export default function Home() {
  return (
    <main>
      <div className="announcement">
        <span className="announcement-dot" />
        <span>Built for the stories that should never be lost</span>
        <ChevronRight size={14} strokeWidth={1.8} />
      </div>

      <nav className="site-nav shell" aria-label="Main navigation">
        <a className="wordmark" href="#top" aria-label="FamilyTree home">
          <span className="brand-mark brand-mark-small"><FamilyTreeLogo size={40} /></span>
          <span className="wordmark-name">FamilyTree</span>
        </a>
        <div className="nav-links">
          <a href="#why">Why FamilyTree</a>
          <a href="#how">How it works</a>
          <a href="#stories">Stories</a>
        </div>
        <div className="nav-actions">
          <a className="nav-login" href="#login">Sign in</a>
          <Button size="sm" variant="dark">Start your archive <ArrowUpRight size={15} /></Button>
        </div>
        <button className="mobile-menu" aria-label="Open menu"><Menu size={21} /></button>
      </nav>

      <section className="hero shell" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-line" /> A living family archive</div>
          <h1>The people who made your family possible deserve <em>more than a name and a date.</em></h1>
          <p className="hero-intro">
            FamilyTree gives your family a beautiful, trusted place to preserve the lives, lessons, and legacies that shaped you.
          </p>
          <div className="hero-actions">
            <Button size="lg">Begin your family story <ArrowUpRight size={17} /></Button>
            <a className="text-link" href="#how">See how it works <ChevronRight size={16} /></a>
          </div>
          <div className="trust-note">
            <span className="trust-avatars" aria-hidden="true">
              {familyMembers.slice(0, 3).map((member) => <span key={member.initials} className={`mini-avatar ${member.tone}`}>{member.initials}</span>)}
            </span>
            <span><strong>Made for families,</strong> by the people who remember them.</span>
          </div>
        </div>

        <div className="hero-archive" aria-label="Preview of a family archive">
          <div className="archive-glow" />
          <div className="archive-card">
            <div className="archive-topline"><span>THE ADEBAYO FAMILY</span><span>EST. 1948</span></div>
            <div className="archive-title-row">
              <div>
                <span className="archive-kicker">Our living archive</span>
                <h2>Where we come from</h2>
              </div>
              <span className="archive-seal"><ShieldCheck size={21} strokeWidth={1.5} /></span>
            </div>
            <div className="tree-preview">
              <div className="tree-connector tree-connector-top" />
              <FamilyNode label="Chief Adewale" detail="1928 — 2004" tone="clay" />
              <div className="tree-connector tree-connector-branch" />
              <div className="tree-children">
                <FamilyNode label="Funmi Adebayo" detail="1948 — 2021" tone="moss" accent />
                <FamilyNode label="Segun Adebayo" detail="1952 — 2017" tone="blue" />
              </div>
              <div className="tree-connector tree-connector-bottom" />
              <div className="tree-current">
                <span className="current-dot" /> Your generation is here
              </div>
            </div>
            <div className="archive-footer">
              <span><BookOpen size={14} /> 12 stories preserved</span>
              <span><UsersRound size={14} /> 8 family members</span>
            </div>
          </div>
          <div className="archive-note archive-note-top"><Feather size={14} /> Written by family</div>
          <div className="archive-note archive-note-bottom"><LockKeyhole size={13} /> Private by default</div>
        </div>
      </section>

      <section className="belief-strip shell" id="why">
        <div className="belief-heading"><span className="eyebrow-line" /> The idea</div>
        <div className="belief-copy"><p>Every family has a hero. FamilyTree helps their story travel further.</p><span className="belief-mark">✳</span></div>
      </section>

      <section className="principles shell" id="how">
        <div className="section-intro">
          <span className="eyebrow">A better way to remember</span>
          <h2>History becomes meaningful when it sounds like the people who lived it.</h2>
          <p>Not a database of names. A considered, collective record of the people, places, and choices that brought your family here.</p>
        </div>
        <div className="principle-grid">
          <article className="principle-card principle-card-featured">
            <span className="principle-icon"><Feather size={20} /></span>
            <span className="principle-number">01</span>
            <h3>Write it in your own voice.</h3>
            <p>Capture the small details, the hard-won wisdom, and the stories only your family can tell.</p>
            <a href="#stories">Explore the story editor <ArrowUpRight size={14} /></a>
          </article>
          <article className="principle-card">
            <span className="principle-icon"><HeartHandshake size={20} /></span>
            <span className="principle-number">02</span>
            <h3>Remember together.</h3>
            <p>Invite relatives to add context, pair-review memories, and keep every story honest and whole.</p>
            <div className="review-stack"><span className="review-avatar clay">AO</span><span className="review-avatar moss">KM</span><span className="review-avatar blue">+4</span><span className="review-label">Reviewed by family</span></div>
          </article>
          <article className="principle-card">
            <span className="principle-icon"><GitBranch size={20} /></span>
            <span className="principle-number">03</span>
            <h3>See the connections.</h3>
            <p>Place every life in context, then connect their stories to the family tree for generations to come.</p>
            <div className="micro-tree"><span /><span /><span /><span /><span /></div>
          </article>
        </div>
      </section>

      <section className="story-feature shell" id="stories">
        <div className="story-photo">
          <div className="photo-sun" />
          <div className="photo-portrait"><span>FN</span></div>
          <div className="photo-caption"><span>From the archive</span><strong>Funmi N. Adebayo</strong></div>
        </div>
        <div className="story-copy">
          <span className="eyebrow">A story worth carrying forward</span>
          <Quote className="quote-mark" size={34} strokeWidth={1.2} />
          <blockquote>“She never called it leadership. She just noticed what needed doing, and did it before anyone asked.”</blockquote>
          <p className="story-byline">— Kemi Martins, granddaughter</p>
          <div className="story-rule" />
          <p className="story-description">The most valuable parts of a life are often held in someone else’s memory. FamilyTree makes room for those memories to meet.</p>
          <Button variant="secondary">Read a sample story <ArrowUpRight size={16} /></Button>
        </div>
      </section>

      <section className="cta shell">
        <div className="cta-decoration cta-decoration-left">✳</div>
        <div className="cta-content">
          <Sparkles size={21} strokeWidth={1.5} />
          <h2>Start with one story.</h2>
          <p>The rest of your family history can meet you there.</p>
          <Button size="lg" variant="dark">Create your family archive <ArrowUpRight size={17} /></Button>
          <span className="cta-note"><Check size={14} /> Free to begin · Your family owns its stories</span>
        </div>
        <div className="cta-decoration cta-decoration-right">✳</div>
      </section>

      <footer className="site-footer shell">
        <div className="footer-brand"><a className="wordmark" href="#top"><span className="brand-mark brand-mark-small"><FamilyTreeLogo size={40} /></span><span className="wordmark-name">FamilyTree</span></a><p>Keep the story in the family.</p></div>
        <div className="footer-links"><a href="#why">Our approach</a><a href="#how">How it works</a><a href="#stories">Stories</a><a href="#privacy">Privacy</a></div>
        <div className="footer-meta"><span>© 2026 FamilyTree</span><span className="footer-status"><span /> Built with care</span></div>
      </footer>
    </main>
  );
}
