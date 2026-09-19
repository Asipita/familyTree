"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, Check, Eye, EyeOff, LockKeyhole, Mail, Send, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { FamilyTreeLogo } from "@/components/brand/family-tree-logo";

export type AuthMode = "sign-in" | "create" | "forgot-password";

const authRoute = (path: string) => path as Route;

type AuthShellProps = {
  mode: AuthMode;
};

const modeCopy: Record<AuthMode, { eyebrow: string; title: string; description: string }> = {
  "sign-in": {
    eyebrow: "Welcome back",
    title: "Return to your family archive.",
    description: "The people and stories you were gathering are still here, waiting where you left them.",
  },
  create: {
    eyebrow: "Begin an archive",
    title: "Start with the people you remember first.",
    description: "Give the stories, names, and small details that shaped your family a place to meet.",
  },
  "forgot-password": {
    eyebrow: "Find your way back",
    title: "The archive is still yours.",
    description: "Tell us where to send a quiet reminder, and we’ll help you return to your family’s stories.",
  },
};

function HeritageTree() {
  return (
    <svg className="auth-heritage-tree" viewBox="0 0 640 470" fill="none" aria-hidden="true">
      <path className="auth-tree-line auth-tree-line-soft" d="M320 434V273M320 273 180 178M320 273l140-95M180 178V94M180 178 76 119M180 178l104-59M460 178V94M460 178l-104-59M460 178l104-59" />
      <path className="auth-tree-line" d="M320 273 238 218M320 273l82-55M180 178 118 143M460 178l62-35" />
      <circle className="auth-tree-node auth-tree-node-main" cx="320" cy="273" r="20" />
      <circle className="auth-tree-node auth-tree-node-clay" cx="180" cy="178" r="15" />
      <circle className="auth-tree-node auth-tree-node-blue" cx="460" cy="178" r="15" />
      <circle className="auth-tree-node auth-tree-node-gold" cx="180" cy="94" r="11" />
      <circle className="auth-tree-node auth-tree-node-gold" cx="460" cy="94" r="11" />
      <circle className="auth-tree-node auth-tree-node-moss" cx="76" cy="119" r="10" />
      <circle className="auth-tree-node auth-tree-node-moss" cx="284" cy="119" r="10" />
      <circle className="auth-tree-node auth-tree-node-moss" cx="356" cy="35" r="10" />
      <circle className="auth-tree-node auth-tree-node-moss" cx="564" cy="119" r="10" />
      <circle className="auth-tree-ring" cx="320" cy="273" r="34" />
      <path className="auth-tree-mark" d="m311 273 7 7 13-16" />
    </svg>
  );
}

function StoryFragment() {
  return (
    <div className="auth-story-fragment">
      <div className="auth-story-fragment-top"><span>From the archive</span><span>01 / 12</span></div>
      <div className="auth-story-fragment-rule" />
      <p>“She never called it leadership. She just noticed what needed doing, and did it before anyone asked.”</p>
      <div className="auth-story-fragment-byline"><span className="auth-fragment-avatar">FN</span><span><strong>Funmi N. Adebayo</strong><small>A story carried forward by Kemi</small></span></div>
    </div>
  );
}

function AuthAside({ mode }: { mode: AuthMode }) {
  const asideCopy = mode === "create"
    ? { kicker: "Make room for the whole story", title: "A name is where an archive begins. The details are what make it yours.", note: "Private by default · Invite family when you’re ready" }
    : mode === "forgot-password"
      ? { kicker: "Your place is still here", title: "The archive remembers the shape of a family, even when you need a moment to find your way back.", note: "Your stories belong to your family" }
      : { kicker: "A living family archive", title: "Some things only family can remember. Give those details somewhere to stay.", note: "Built for the people who remember" };

  return (
    <aside className="auth-heritage-panel">
      <div className="auth-panel-grain" />
      <Link className="auth-brand" href={authRoute("/")} aria-label="Back to FamilyTree home">
        <span className="auth-brand-mark"><FamilyTreeLogo size={42} /></span>
        <span className="auth-brand-name">FamilyTree</span>
      </Link>
      <div className="auth-heritage-copy">
        <span className="auth-aside-kicker"><span /> {asideCopy.kicker}</span>
        <h2>{asideCopy.title}</h2>
      </div>
      <div className="auth-tree-stage">
        <HeritageTree />
        <span className="auth-tree-caption auth-tree-caption-top">The ones before us</span>
        <span className="auth-tree-caption auth-tree-caption-current"><i /> Your story joins here</span>
      </div>
      <StoryFragment />
      <div className="auth-aside-footer"><span><LockKeyhole size={13} /> {asideCopy.note}</span><span>© 2026 FamilyTree</span></div>
    </aside>
  );
}

function FieldLabel({ children, optional = false }: { children: React.ReactNode; optional?: boolean }) {
  return <span className="auth-field-label">{children}{optional ? <small>optional</small> : null}</span>;
}

export function AuthShell({ mode }: AuthShellProps) {
  const copy = modeCopy[mode];
  const isCreate = mode === "create";
  const isForgot = mode === "forgot-password";
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className={`auth-page auth-page-${mode}`}>
      <AuthAside mode={mode} />
      <section className="auth-form-region">
        <div className="auth-form-topbar">
          <Link className="auth-mobile-brand" href={authRoute("/")} aria-label="Back to FamilyTree home"><FamilyTreeLogo size={34} /><span>FamilyTree</span></Link>
          <Link className="auth-home-link" href={authRoute("/")}><ArrowLeft size={14} /> Back to home</Link>
          {!isForgot ? <span className="auth-top-prompt">{isCreate ? "Already have an archive?" : "New to FamilyTree?"} <Link href={authRoute(isCreate ? "/auth/sign-in" : "/auth/create")}>{isCreate ? "Sign in" : "Begin one"}</Link></span> : null}
        </div>

        <div className="auth-form-wrap">
          <div className="auth-form-heading">
            <span className="auth-form-eyebrow"><span /> {copy.eyebrow}</span>
            <h1>{copy.title}</h1>
            <p>{copy.description}</p>
          </div>

          {submitted ? (
            <div className="auth-success-state" role="status">
              <span className="auth-success-icon"><Check size={19} /></span>
              <span className="auth-form-eyebrow"><span /> Demo flow ready</span>
              <h2>{isForgot ? "A recovery note is on its way." : isCreate ? "Your archive is ready to begin." : "That’s the right door."}</h2>
              <p>{isForgot ? "If an archive is tied to that address, the next step will arrive there. This preview keeps the flow local for now." : "The form is ready to connect to your authentication provider. For now, this preview keeps you in the FamilyTree experience."}</p>
              <Link className="button button-secondary button-md" href={authRoute(isForgot ? "/auth/sign-in" : "/archive")}>{isForgot ? "Return to sign in" : "Continue to the archive"}<ArrowUpRight size={15} /></Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {isCreate ? (
                <label className="auth-field"><FieldLabel>Your name</FieldLabel><input name="name" autoComplete="name" placeholder="Kemi Martins" required /></label>
              ) : null}
              <label className="auth-field"><FieldLabel>Email address</FieldLabel><span className="auth-input-wrap"><Mail size={16} /><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></span></label>
              {isCreate ? (
                <label className="auth-field"><FieldLabel>Archive name <span className="auth-field-optional">optional</span></FieldLabel><input name="archive" placeholder="The Martins Family" /></label>
              ) : null}
              {!isForgot ? (
                <label className="auth-field"><FieldLabel>Password</FieldLabel><span className="auth-input-wrap"><LockKeyhole size={16} /><input name="password" type={showPassword ? "text" : "password"} autoComplete={isCreate ? "new-password" : "current-password"} placeholder="At least 8 characters" minLength={8} required /><button className="auth-password-toggle" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
              ) : null}
              {mode === "sign-in" ? <div className="auth-form-options"><label className="auth-checkbox"><input type="checkbox" name="remember" /><span /> Keep me signed in</label><Link href={authRoute("/auth/forgot-password")}>Forgot password?</Link></div> : null}
              {isCreate ? <div className="auth-trust-note"><ShieldCheck size={15} /><span>Your archive is private by default. You decide who gets to contribute.</span></div> : null}
              <button className="button button-primary button-lg auth-submit" type="submit">{isForgot ? <><Send size={16} /> Send recovery note</> : isCreate ? <><Sparkles size={16} /> Create my archive</> : <>Open my archive <ArrowUpRight size={16} /></>}</button>
              {isForgot ? <p className="auth-form-footnote">Remember your password? <Link href={authRoute("/auth/sign-in")}>Return to sign in</Link></p> : null}
            </form>
          )}

          {!isForgot && !submitted ? <div className="auth-form-divider"><span>or</span></div> : null}
          {!isForgot && !submitted ? <button className="auth-passkey-button" type="button"><span className="auth-passkey-mark">✦</span> Continue with a passkey</button> : null}
          {!isCreate && !isForgot && !submitted ? <p className="auth-form-footnote">New here? <Link href={authRoute("/auth/create")}>Create a family archive</Link></p> : null}
          {isCreate && !submitted ? <p className="auth-form-footnote">By continuing, you agree that family stories deserve care, context, and consent.</p> : null}
        </div>
      </section>
    </main>
  );
}
