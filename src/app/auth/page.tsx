import { redirect } from "next/navigation";
import type { Route } from "next";

export default function AuthPage() {
  redirect("/auth/sign-in" as Route);
}
