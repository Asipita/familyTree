import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Create an account · FamilyTree",
  description: "Start a personal family tree with FamilyTree.",
};

export default async function CreateArchivePage({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite } = await searchParams;
  return <AuthShell mode="create" invite={invite} />;
}
