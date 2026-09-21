import type { Metadata, Route } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { auth } from "@/lib/auth/server";
import { invitationDestination } from "@/lib/invitation-navigation";

export const metadata: Metadata = {
  title: "Sign in · FamilyTree",
  description: "Return to your FamilyTree account.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite } = await searchParams;
  const { data: session } = await auth.getSession();
  if (session?.user) redirect(invitationDestination(invite) as Route);

  return <AuthShell mode="sign-in" invite={invite} />;
}
