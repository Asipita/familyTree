"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Check, GitBranch, Search } from "lucide-react";
import { useFamily } from "@/components/family-provider";
import { canWrite, canEditStory, connectedPeople, initials, lifespan, relationTo, reviewStory, type Person, type Story } from "@/lib/family";
import { PageHeading, Empty } from "./workspace";

export function StoryRow({ story }: { story: Story }) {
  const { state } = useFamily();
  const person = state.people.find(p => p.id === story.subjectId);
  const author = state.people.find(p => p.id === story.authorId);
  return <Link className="ft-story-row" href={`/stories/${story.id}`}><span className="ft-story-mark"><BookOpen size={22} strokeWidth={1.3} /></span><span className="ft-row-copy"><small>About {person?.name}</small><h2>{story.title}</h2><p>By {author?.name} · {story.updated.slice(0, 10)}</p></span><span className={`ft-badge ft-status-${story.status.replaceAll(" ", "-").toLowerCase()}`}>{story.status}</span><ArrowUpRight size={18} /></Link>;
}
export function StoriesPage() {
  const { state } = useFamily(); const [query, setQuery] = useState(""); const [status, setStatus] = useState("All");
  const people = connectedPeople(state);
  const stories = state.stories.filter(s => people.some(p => p.id === s.subjectId) && (status === "All" || s.status === status) && `${s.title} ${state.people.find(p => p.id === s.subjectId)?.name}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="ft-page"><PageHeading eyebrow="In their words" title="Family stories" description="Lives remembered by the people who knew them." action={<Link className="button button-primary" href="/stories/new">Write a story <ArrowUpRight size={16} /></Link>} /><div className="ft-tools"><label className="ft-search"><Search size={17} /><input aria-label="Search stories" placeholder="Find a story or a person" value={query} onChange={e => setQuery(e.target.value)} /></label><select aria-label="Story status" value={status} onChange={e => setStatus(e.target.value)}>{["All", "Published", "In review", "Draft"].map(s => <option key={s}>{s}</option>)}</select></div><div className="ft-list">{stories.map(s => <StoryRow key={s.id} story={s} />)}</div>{!stories.length && <Empty title="No stories here yet"><p>Try another search, or write about someone in your tree.</p></Empty>}</div>;
}
export function PeoplePage() {
  const { state } = useFamily(); const [query, setQuery] = useState("");
  const people = connectedPeople(state).filter(p => p.name.toLowerCase().includes(query.toLowerCase()));
  return <div className="ft-page"><PageHeading eyebrow="The people behind the names" title="Your family" description="Every person has one place in the network, with or without an account." action={<Link className="button button-primary" href="/tree">Add a relative <ArrowUpRight size={16} /></Link>} /><label className="ft-search"><Search size={17} /><input aria-label="Search people" placeholder="Find someone in your family" value={query} onChange={e => setQuery(e.target.value)} /></label><div className="ft-people-grid">{people.map(p => <Link key={p.id} className="ft-person-card" href={`/people/${p.id}`}><span className="ft-avatar ft-avatar-large">{initials(p.name)}</span><small>{relationTo(state, p.id)}</small><h2>{p.name}</h2><p>{lifespan(p)}</p><span className="ft-person-foot">{p.accountId ? "Account connected" : p.living ? "Profile not yet claimed" : "Remembered by family"}<ArrowUpRight size={16} /></span></Link>)}</div>{!people.length && <Empty title="No matching people" />}</div>;
}
export function PersonPage({ id }: { id: string }) {
  const { state, update } = useFamily(); const person = state.people.find(p => p.id === id);
  const [editing, setEditing] = useState(false); const [bio, setBio] = useState(person?.biography ?? ""); const [saved, setSaved] = useState(false);
  if (!person) return <div className="ft-page"><Empty title="Person not found"><Link href="/people">Back to your family</Link></Empty></div>;
  const own = !canWrite(state.viewerId, id); const stories = state.stories.filter(s => s.subjectId === id);
  const relatives = state.links.filter(l => l.from === id || l.to === id).map(l => ({ person: state.people.find(p => p.id === (l.from === id ? l.to : l.from))!, label: l.kind === "partner" ? "Partner" : l.from === id ? "Child" : "Parent" }));
  function saveBiography(e: React.FormEvent) { e.preventDefault(); if (update(s => { if (!canWrite(s.viewerId, id)) throw new Error("Your biography is written by relatives."); return { ...s, people: s.people.map(p => p.id === id ? { ...p, biography: bio.trim(), biographyBy: s.viewerId } : p) }; })) { setEditing(false); setSaved(true); } }
  return <div className="ft-page"><Link className="ft-back" href="/people">← Your family</Link><div className="ft-profile-header"><span className="ft-avatar ft-portrait">{initials(person.name)}</span><div><span className="ft-kicker">{relationTo(state, id)}</span><h1>{person.name}</h1><p>{lifespan(person)}</p><span className="ft-badge">{person.accountId ? "Account connected" : person.living ? "Unclaimed profile" : "Remembered by family"}</span></div></div><div className="ft-columns"><section><div className="ft-section-title"><h2>A life, remembered</h2>{!own && <button className="ft-text-button" onClick={() => setEditing(!editing)}>{editing ? "Cancel" : person.biography ? "Edit biography" : "Add biography"}</button>}</div>{editing ? <form className="ft-form" onSubmit={saveBiography}><label>Biography<textarea required maxLength={4000} value={bio} onChange={e => setBio(e.target.value)} /></label><button className="button button-primary">Save biography</button></form> : <p className="ft-biography">{person.biography || "Their biography is waiting for someone who knows them."}</p>}{person.biographyBy && <p className="ft-muted">Contributed by {state.people.find(p => p.id === person.biographyBy)?.name}</p>}{saved && <p role="status">Biography saved.</p>}{own && <p className="ft-note">Your biography is written by relatives. You can update your personal details in <Link href="/settings">My account</Link>.</p>}<div className="ft-section-title"><h2>Stories about {person.name.split(" ")[0]}</h2>{!own && <Link className="ft-text-button" href={`/stories/new?person=${id}`}>Write a story ↗</Link>}</div>{stories.map(s => <StoryRow key={s.id} story={s} />)}{!stories.length && <Empty title="The first story is still to come" />}</section><aside className="ft-side-note"><span className="ft-kicker">Connected lives</span>{relatives.map((r, i) => <Link className="ft-relative" key={i} href={`/people/${r.person.id}`}><span className="ft-avatar">{initials(r.person.name)}</span><span><strong>{r.person.name}</strong><small>{r.label}</small></span></Link>)}{!relatives.length && <p>No relatives connected yet.</p>}<Link className="ft-text-button" href="/tree">See your tree ↗</Link>{person.living && !person.accountId && <div className="ft-claim-note"><h3>A person, not yet an account</h3><p>{person.name.split(" ")[0]} can request to claim this profile when they join. Existing family contributions stay attached.</p><Link href={`/invitations?person=${id}`} className="ft-text-button">Invite this person ↗</Link><Link href={`/setup?claim=${id}`} className="ft-text-button">This is me →</Link></div>}</aside></div></div>;
}

// Render only supported document elements, never raw saved HTML.
import { useEffect } from "react";
function DocumentNode({ node }: { node: Node }): React.ReactNode {
  if (node.nodeType === 3) return node.textContent;
  if (!(node instanceof Element)) return null;
  const children = Array.from(node.childNodes).map((child, i) => <DocumentNode key={i} node={child} />);
  switch (node.tagName.toLowerCase()) {
    case "p": return <p>{children}</p>; case "h1": case "h2": return <h2>{children}</h2>; case "h3": return <h3>{children}</h3>;
    case "strong": return <strong>{children}</strong>; case "em": return <em>{children}</em>; case "u": return <u>{children}</u>; case "s": return <s>{children}</s>;
    case "ul": return <ul>{children}</ul>; case "ol": return <ol>{children}</ol>; case "li": return <li>{children}</li>; case "blockquote": return <blockquote>{children}</blockquote>; case "hr": return <hr />; case "br": return <br />;
    case "a": { const href = node.getAttribute("href") ?? ""; return /^https?:\/\//i.test(href) ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <>{children}</>; }
    default: return null;
  }
}
export function StoryDocument({ html }: { html: string }) {
  const [nodes, setNodes] = useState<Node[]>([]);
  useEffect(() => { setNodes(Array.from(new DOMParser().parseFromString(html, "text/html").body.childNodes)); }, [html]);
  return <div className="ft-prose">{nodes.map((node, i) => <DocumentNode key={i} node={node} />)}</div>;
}
export function StoryPage({ id }: { id: string }) {
  const { state } = useFamily(); const story = state.stories.find(s => s.id === id);
  if (!story) return <div className="ft-page"><Empty title="Story not found"><Link href="/stories">Back to stories</Link></Empty></div>;
  const subject = state.people.find(p => p.id === story.subjectId)!; const author = state.people.find(p => p.id === story.authorId)!;
  return <div className="ft-page ft-reader"><Link className="ft-back" href="/stories">← Family stories</Link><header className="ft-reader-heading"><span className="ft-kicker">A life through another’s eyes</span><h1>{story.title}</h1><div className="ft-reader-meta"><Link href={`/people/${subject.id}`}>About {subject.name}</Link><span>Written by {author.name}</span><span className="ft-badge">{story.status}</span></div></header><StoryDocument html={story.html} /><footer className="ft-reader-footer"><h3>Where this memory comes from</h3><p>{story.source || "The author has not added a source yet."}</p><h3>Family contributions</h3>{story.reviews.length ? story.reviews.map((r, i) => <p key={i}><strong>{state.people.find(p => p.id === r.personId)?.name}</strong> · {r.decision}<br />{r.note}</p>) : <p>No reviews yet.</p>}<div className="ft-actions">{canEditStory(state.viewerId, story) && <Link className="button button-secondary" href={`/stories/${id}/edit`}>Edit your story</Link>}{story.status === "In review" && <Link className="button button-primary" href={`/reviews?story=${id}`}>Open review</Link>}</div></footer></div>;
}
export function ReviewsPage({ initialStory }: { initialStory?: string }) {
  const { state, update } = useFamily(); const [selected, setSelected] = useState(initialStory ?? ""); const [note, setNote] = useState(""); const [message, setMessage] = useState("");
  const people = connectedPeople(state); const pending = state.stories.filter(s => s.status === "In review" && people.some(p => p.id === s.subjectId));
  const story = pending.find(s => s.id === selected) ?? pending[0];
  function decide(decision: "Approved" | "Changes requested") { if (!story) return; if (update(s => reviewStory(s, story.id, decision, note))) { setMessage(decision === "Approved" ? "Review saved. The story is now published." : "Your feedback is saved. The story is back with its writer."); setNote(""); } }
  return <div className="ft-page"><PageHeading eyebrow="Remember it together" title="Family review" description="Confirm the details, add context, or leave room for another recollection." />{message && <p className="ft-note" role="status">{message}</p>}{!story ? <Empty title="You’re all caught up"><p>Stories sent for review will appear here.</p><Link href="/stories">Browse family stories →</Link></Empty> : <div className="ft-review-layout"><nav aria-label="Stories awaiting review">{pending.map(s => <button className={story.id === s.id ? "is-active" : ""} key={s.id} onClick={() => { setSelected(s.id); setNote(""); }}><span className="ft-kicker">In review</span><strong>{s.title}</strong><small>By {state.people.find(p => p.id === s.authorId)?.name}</small></button>)}</nav><section className="ft-review-paper"><h2>{story.title}</h2><StoryDocument html={story.html} /><p className="ft-note">Source: {story.source || "Not yet added"}</p>{story.authorId === state.viewerId || story.subjectId === state.viewerId ? <p className="ft-note">Another relative must review this story. You cannot approve your own contribution or biography.</p> : <form className="ft-form" onSubmit={e => { e.preventDefault(); decide("Approved"); }}><label>Your note<textarea required value={note} onChange={e => setNote(e.target.value)} placeholder="What do you remember?" /></label><div className="ft-actions"><button className="button button-primary"><Check size={16} /> Approve story</button><button className="button button-secondary" type="button" onClick={() => decide("Changes requested")}>Request changes</button></div></form>}</section></div>}</div>;
}
