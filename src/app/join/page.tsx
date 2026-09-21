import type { Metadata } from "next";
import { JoinInvitation } from "@/components/family/join-invitation";

export const metadata: Metadata = { title: "Join your family · FamilyTree", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function Page({ searchParams }: { searchParams: Promise<{ invite?: string }> }) {
  const { invite } = await searchParams;
  return <JoinInvitation token={typeof invite === "string" ? invite : ""} />;
}
