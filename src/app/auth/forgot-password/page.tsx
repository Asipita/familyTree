import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Recover your archive · FamilyTree",
  description: "Find your way back to your FamilyTree archive.",
};

export default function ForgotPasswordPage() {
  return <AuthShell mode="forgot-password" />;
}
