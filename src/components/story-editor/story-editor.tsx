"use client";

import { useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TiptapLink from "@tiptap/extension-link";
import {
  ArrowLeft,
  Bold,
  Check,
  ChevronDown,
  Cloud,
  Eye,
  Heading1,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  Minus,
  MoreHorizontal,
  Quote,
  Redo2,
  Send,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

type ToolbarButtonProps = {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
};

function ToolbarButton({ active = false, children, label, onClick }: ToolbarButtonProps) {
  return <button className={`story-toolbar-button ${active ? "is-active" : ""}`} onClick={onClick} aria-label={label} title={label}>{children}</button>;
}

export function StoryEditor() {
  const [saveState, setSaveState] = useState("Saved to demo archive");
  const saveTimer = useRef<number | null>(null);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TiptapLink.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      Placeholder.configure({ placeholder: "Begin with the moment you remember most clearly…" }),
    ],
    content: `
      <p>She never called it leadership. She just noticed what needed doing, and did it before anyone asked.</p>
      <p>In the town where my mother grew up, people knew Funmi by the way she made room. There was always another chair, another plate, another person who needed to be heard.</p>
      <h2>What she gave us</h2>
      <p>She taught us that a family is not only the people you are born to. It is also the people you make space for, especially when it is inconvenient.</p>
      <blockquote><p>“If there is enough for one, there is enough to share.”</p></blockquote>
      <p>I still hear her say it whenever the table feels too full.</p>
    `,
    onUpdate: () => {
      setSaveState("Saving…");
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => setSaveState("Saved just now"), 650);
    },
  });

  const addLink = () => {
    if (!editor) return;
    const url = window.prompt("Paste a link");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <main className="story-editor-page">
      <header className="story-editor-topbar">
        <div className="story-breadcrumbs">
          <Link href="/archive" className="story-back-link"><ArrowLeft size={15} /> Back to tree</Link>
          <span className="story-breadcrumb-divider">/</span>
          <span>Stories</span>
          <span className="story-breadcrumb-divider">/</span>
          <strong>New story</strong>
        </div>
        <div className="story-topbar-actions">
          <span className="story-save-state"><Cloud size={14} /> {saveState}</span>
          <button className="story-topbar-icon" aria-label="More story options"><MoreHorizontal size={18} /></button>
          <Button variant="secondary" size="sm"><Eye size={15} /> Preview</Button>
          <Button variant="dark" size="sm"><Send size={14} /> Send for review</Button>
        </div>
      </header>

      <div className="story-editor-layout">
        <aside className="story-context-rail">
          <span className="story-rail-kicker">Writing for</span>
          <div className="story-person-card">
            <span className="story-person-avatar">FN</span>
            <span><strong>Funmi N. Adebayo</strong><small>Mother · 1948 — 2021</small></span>
            <ChevronDown size={15} />
          </div>
          <div className="story-rail-divider" />
          <span className="story-rail-kicker">Story details</span>
          <div className="story-detail-row"><span>Status</span><strong className="story-draft-badge">Draft</strong></div>
          <div className="story-detail-row"><span>Visibility</span><strong>Family only</strong></div>
          <div className="story-detail-row"><span>Contributors</span><strong>3 family members</strong></div>
          <div className="story-rail-prompt"><span>Keep it yours</span><p>Write what only your family would know. The small details are often the ones that stay.</p></div>
          <Link href="/archive" className="story-rail-back"><ArrowLeft size={14} /> Return to family tree</Link>
        </aside>

        <section className="story-editor-sheet" aria-label="Story editor">
          <div className="story-editor-heading">
            <span className="story-editor-eyebrow">A story worth carrying forward</span>
            <input className="story-title-input" aria-label="Story title" defaultValue="The woman who made room" />
            <div className="story-title-meta"><span>About Funmi N. Adebayo</span><span>·</span><span>Written by Kemi Martins</span></div>
          </div>
          <div className="story-toolbar" role="toolbar" aria-label="Text formatting">
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
          <div className="story-editor-body"><EditorContent editor={editor} /></div>
          <div className="story-editor-footer"><span>Tip: Type <kbd>/</kbd> to think in blocks</span><span><Check size={13} /> {saveState}</span></div>
        </section>
      </div>
    </main>
  );
}
