"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowUpRight, Check, Eye, EyeOff, LockKeyhole, Mail, Send, ShieldCheck, Sparkles } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FamilyTreeLogo } from "@/components/brand/family-tree-logo";
import { authClient } from "@/lib/auth/client";

export type AuthMode = "sign-in" | "create" | "forgot-password";

const authRoute = (path: string) => path as Route;

type AuthShellProps = {
  mode: AuthMode;
};

const modeCopy: Record<AuthMode, { eyebrow: string; title: string; description: string }> = {
  "sign-in": {
    eyebrow: "Welcome back",
    title: "Welcome back.",
    description: "Your family stories are waiting.",
  },
  create: {
    eyebrow: "Join FamilyTree",
    title: "Start with who you remember.",
    description: "Build a private place for names, memories, and the people who connect them.",
  },
  "forgot-password": {
    eyebrow: "Find your way back",
    title: "Find your way back.",
    description: "Enter your email and we’ll help you back in.",
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
      <p>“She made room. That was her kind of leadership.”</p>
      <div className="auth-story-fragment-byline"><span className="auth-fragment-avatar">FN</span><span><strong>Funmi N. Adebayo</strong><small>A story carried forward by Kemi</small></span></div>
    </div>
  );
}

function AuthAside({ mode }: { mode: AuthMode }) {
  const asideCopy = mode === "create"
    ? { kicker: "Make room for the whole story", title: "Start with the people you remember.", note: "Your place in a shared family history" }
    : mode === "forgot-password"
      ? { kicker: "Your place is still here", title: "Find your way back.", note: "Connected by people, remembered by family" }
      : { kicker: "A connected family history", title: "Keep the people who made you possible close.", note: "Built for the people who remember" };

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
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { data: session, isPending: sessionPending } = authClient.useSession();

  useEffect(() => {
    if (!sessionPending && session?.user) router.replace("/tree");
  }, [router, session?.user, sessionPending]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    try {
      if (isForgot) {
        const result = await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/auth/reset-password` });
        if (result.error) throw result.error;
        setSubmitted(true);
        return;
      }

      const password = String(data.get("password") ?? "");
      const firstName = String(data.get("firstName") ?? "").trim();
      const middleName = String(data.get("middleName") ?? "").trim();
      const surname = String(data.get("surname") ?? "").trim();
      if (isCreate && (!firstName || !surname)) throw new Error("Enter your first name and surname.");
      const name = [firstName, middleName, surname].filter(Boolean).join(" ");
      const result = isCreate
        ? await authClient.signUp.email({ email, password, name })
        : await authClient.signIn.email({ email, password });
      if (result.error) throw result.error;
      router.replace("/tree");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "We could not complete that request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={`auth-page auth-page-${mode}`}>
      <AuthAside mode={mode} />
      <section className="auth-form-region">
        <div className="auth-form-topbar">
          <Link className="auth-mobile-brand" href={authRoute("/")} aria-label="Back to FamilyTree home"><FamilyTreeLogo size={34} /><span>FamilyTree</span></Link>
          <Link className="auth-home-link" href={authRoute("/")}><ArrowLeft size={14} /> Back to home</Link>
          {!isForgot ? <span className="auth-top-prompt">{isCreate ? "Already have an account?" : "New to FamilyTree?"} <Link href={authRoute(isCreate ? "/auth/sign-in" : "/auth/create")}>{isCreate ? "Sign in" : "Begin one"}</Link></span> : null}
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
              <span className="auth-form-eyebrow"><span /> Next step</span>
              <h2>{isForgot ? "Recovery preview" : isCreate ? "Your place is ready." : "That’s the right door."}</h2>
              <p>{isForgot ? "If an account exists for that address, a recovery link is on its way." : isCreate ? "You are the first member of your personal tree. Add the people you remember next." : "Continue to explore FamilyTree."}</p>
              <Link className="button button-secondary button-md" href={authRoute(isForgot ? "/auth/sign-in" : isCreate ? "/onboarding" : "/tree")}>{isForgot ? "Return to sign in" : isCreate ? "Continue setup" : "Continue"}<ArrowUpRight size={15} /></Link>
            </div>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit}>
              {isCreate ? (
                <div className="auth-name-fields">
                  <label className="auth-field"><FieldLabel>First name</FieldLabel><input name="firstName" autoComplete="given-name" required maxLength={100} /></label>
                  <label className="auth-field"><FieldLabel>Surname</FieldLabel><input name="surname" autoComplete="family-name" required maxLength={100} /></label>
                  <label className="auth-field auth-middle-name"><FieldLabel optional>Middle name</FieldLabel><input name="middleName" autoComplete="additional-name" maxLength={100} /></label>
                </div>
              ) : null}
              <label className="auth-field"><FieldLabel>Email address</FieldLabel><span className="auth-input-wrap"><Mail size={16} /><input name="email" type="email" autoComplete="email" placeholder="you@example.com" required /></span></label>
              {!isForgot ? (
                <label className="auth-field"><FieldLabel>Password</FieldLabel><span className="auth-input-wrap"><LockKeyhole size={16} /><input name="password" type={showPassword ? "text" : "password"} autoComplete={isCreate ? "new-password" : "current-password"} placeholder="At least 8 characters" minLength={8} required /><button className="auth-password-toggle" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>
              ) : null}
              {mode === "sign-in" ? <div className="auth-form-options"><span className="auth-session-note">Secure session</span><Link href={authRoute("/auth/forgot-password")}>Forgot password?</Link></div> : null}
              {isCreate ? <div className="auth-trust-note"><ShieldCheck size={15} /><span>Your account is personal. Your biography is written by relatives.</span></div> : null}
              {error ? <p className="auth-error" role="alert">{error}</p> : null}
              <button className="button button-primary button-lg auth-submit" type="submit" disabled={busy || sessionPending}>{busy ? "Working…" : isForgot ? <><Send size={16} /> Send recovery note</> : isCreate ? <><Sparkles size={16} /> Create my account</> : <>Sign in <ArrowUpRight size={16} /></>}</button>
              {isForgot ? <p className="auth-form-footnote">Remember your password? <Link href={authRoute("/auth/sign-in")}>Return to sign in</Link></p> : null}
            </form>
          )}

          {!isCreate && !isForgot && !submitted ? <p className="auth-form-footnote">New here? <Link href={authRoute("/auth/create")}>Create an account</Link></p> : null}
          {isCreate && !submitted ? <p className="auth-form-footnote">Family stories deserve care and consent.</p> : null}
        </div>
      </section>
    </main>
  );
}
