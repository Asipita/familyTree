"use client";

import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { ArrowLeft, Bold, Check, Eye, Heading1, Heading2, Italic, Link2, List, ListOrdered, Minus, Quote, Redo2, Send, Strikethrough, Underline as UnderlineIcon, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFamily } from "@/components/family-provider";
import { canWrite, canEditStory, connectedPeople, putStory, type Story } from "@/lib/family";
import { Empty } from "@/components/family/workspace";
import { StoryDocument } from "@/components/family/pages";

type ToolbarButtonProps = { label: string; active?: boolean; onClick: () => void; children: React.ReactNode };
function ToolbarButton({ active = false, children, label, onClick }: ToolbarButtonProps) {
  return <button type="button" className={`story-toolbar-button ${active ? "is-active" : ""}`} onClick={onClick} aria-label={label} aria-pressed={active} title={label}>{children}</button>;
}
export function StoryEditor({ storyId, subjectId }: { storyId?: string; subjectId?: string }) {
  const { state } = useFamily();
  const story = state.stories.find(s => s.id === storyId);
  const subject = subjectId ?? story?.subjectId;
  if (storyId && !story) return <div className="ft-page"><Empty title="Story not found"><Link href="/stories">Back to stories</Link></Empty></div>;
  if ((story && !canEditStory(state.viewerId, story)) || (subject && !canWrite(state.viewerId, subject))) return <div className="ft-page"><Empty title="This story needs another voice"><p>You cannot write your own biography or edit another relative’s contribution.</p><Link href="/stories">Back to stories →</Link></Empty></div>;
  if (subject && !state.people.some(p => p.id === subject)) return <div className="ft-page"><Empty title="Person not found" /></div>;
  return <WritingDesk key={storyId ?? subjectId ?? "new"} story={story} subjectId={subject} />;
}
function WritingDesk({ story, subjectId }: { story?: Story; subjectId?: string }) {
  const { state, update } = useFamily(); const router = useRouter();
  const subjects = connectedPeople(state).filter(p => canWrite(state.viewerId, p.id));
  const [subject, setSubject] = useState(subjectId ?? subjects[0]?.id ?? "");
  const [title, setTitle] = useState(story?.title ?? "");
  const [source, setSource] = useState(story?.source ?? "");
  const [saveState, setSaveState] = useState(story ? "Saved to your tree" : "New draft");
  const [preview, setPreview] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false); const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [id, setId] = useState(story?.id ?? "");
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ link: { openOnClick: false } }), Placeholder.configure({ placeholder: "Begin with a moment you remember…" })],
    content: story?.html ?? "<p></p>",
    onUpdate: () => setSaveState("Unsaved changes"),
  });
  if (!subjects.length) return <div className="ft-page"><Empty title="Start with a relative"><p>Add someone to your tree before writing their story.</p><Link className="button button-primary" href="/tree">Open my tree</Link></Empty></div>;
  const person = state.people.find(p => p.id === subject)!;
  async function save(status: Story["status"]) {
    if (!editor) return;
    const storyId = id || crypto.randomUUID();
    const next: Story = { id: storyId, subjectId: subject, authorId: state.viewerId, title: title.trim(), html: editor.getHTML(), source, status, updated: new Date().toISOString(), reviews: [] };
    setSaveState("Saving…");
    if (await update(s => putStory(s, next))) { setId(storyId); setSaveState("Saved to your tree"); if (status === "In review") router.push(`/stories/${storyId}`); } else setSaveState("Not saved — review the message above");
  }
  const addLink = () => { setUrl(editor?.getAttributes("link").href ?? ""); setLinkOpen(!linkOpen); };
  return <div className="ft-writing">
    <header className="ft-writing-bar"><Link href="/stories" className="ft-back"><ArrowLeft size={16} /> Stories</Link><span role="status">{saveState}</span><div className="ft-actions"><button className="button button-secondary button-sm" onClick={() => setPreview(!preview)}><Eye size={15} />{preview ? "Write" : "Preview"}</button><button className="button button-secondary button-sm" onClick={() => save("Draft")}>Save draft</button><button className="button button-primary button-sm" onClick={() => save("In review")}><Send size={15} />Send for review</button></div></header>
    <div className="ft-writing-layout"><aside className="ft-side-note"><span className="ft-kicker">Writing about</span><label className="ft-field">Person<select disabled={Boolean(story)} value={subject} onChange={e => { setSubject(e.target.value); setSaveState("Unsaved changes"); }}>{subjects.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label><p>A story by {state.people.find(p => p.id === state.viewerId)?.name}.</p><label className="ft-field">Source or context<textarea value={source} onChange={e => { setSource(e.target.value); setSaveState("Unsaved changes"); }} placeholder="A memory, conversation, letter, or photograph" /></label><p className="ft-muted">Family can review the details before this is published.</p></aside>
    <section className="story-editor-sheet"><div className="story-editor-heading"><span className="story-editor-eyebrow">About {person.name}</span><input className="story-title-input" aria-label="Story title" value={title} placeholder="Give this memory a title" maxLength={180} onChange={e => { setTitle(e.target.value); setSaveState("Unsaved changes"); }} /></div>
    {!preview && <>          <div className="story-toolbar" role="toolbar" aria-label="Text formatting">
            <div className="story-toolbar-group">
              <ToolbarButton label="Undo" onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={16} /></ToolbarButton>
              <ToolbarButton label="Redo" onClick={() => editor?.chain().focus().redo().run()}><Redo2 size={16} /></ToolbarButton>
            </div>
            <span className="story-toolbar-rule" />
            <div className="story-toolbar-group">
              <ToolbarButton label="Heading 1" active={editor?.isActive("heading", { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={17} /></ToolbarButton>
              <ToolbarButton label="Heading 2" active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={17} /></ToolbarButton>
              <ToolbarButton label="Bold" active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold size={16} /></ToolbarButton>
              <ToolbarButton label="Italic" active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={16} /></ToolbarButton>
              <ToolbarButton label="Underline" active={editor?.isActive("underline")} onClick={() => editor?.chain().focus().toggleUnderline().run()}><UnderlineIcon size={16} /></ToolbarButton>
              <ToolbarButton label="Strikethrough" active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></ToolbarButton>
            </div>
            <span className="story-toolbar-rule" />
            <div className="story-toolbar-group">
              <ToolbarButton label="Bulleted list" active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={17} /></ToolbarButton>
              <ToolbarButton label="Numbered list" active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={17} /></ToolbarButton>
              <ToolbarButton label="Quote" active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote size={16} /></ToolbarButton>
              <ToolbarButton label="Divider" onClick={() => editor?.chain().focus().setHorizontalRule().run()}><Minus size={17} /></ToolbarButton>
              <ToolbarButton label="Add link" active={editor?.isActive("link")} onClick={addLink}><Link2 size={16} /></ToolbarButton>
            </div>
          </div>

    {linkOpen && <form className="ft-link-form" onSubmit={e => { e.preventDefault(); if (!/^https?:\/\//i.test(url)) { setError("Use a link beginning with https:// or http://"); return; } editor?.chain().focus().setLink({ href: url }).run(); setLinkOpen(false); setError(""); }}><label>Link URL<input type="url" required value={url} onChange={e => setUrl(e.target.value)} /></label><button className="button button-secondary button-sm">Add link</button>{error && <p role="alert">{error}</p>}</form>}
    <div className="story-editor-body"><EditorContent editor={editor} /></div></>}
    {preview && <StoryDocument html={editor?.getHTML() ?? ""} />}
    <div className="story-editor-footer"><span>Written by family, reviewed together.</span><span><Check size={13} />{saveState}</span></div></section></div>
  </div>;
}
