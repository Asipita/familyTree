import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Sign in · FamilyTree",
  description: "Return to your FamilyTree account.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite } = await searchParams;
  return <AuthShell mode="sign-in" invite={invite} />;
}
