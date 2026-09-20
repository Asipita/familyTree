import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Create an account · FamilyTree",
  description: "Start a personal family tree with FamilyTree.",
};

export default function CreateArchivePage() {
  return <AuthShell mode="create" />;
}
