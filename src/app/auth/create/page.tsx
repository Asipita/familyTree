import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Create an archive · FamilyTree",
  description: "Start a private family archive with FamilyTree.",
};

export default function CreateArchivePage() {
  return <AuthShell mode="create" />;
}
