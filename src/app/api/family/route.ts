import { auth } from "@/lib/auth/server";
import { getOrCreateFamily, saveFamily } from "@/lib/db/family-repository";
import type { FamilyState } from "@/lib/family";

async function currentUser() {
  const session = await auth.getSession();
  return session.data?.user ?? null;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  try {
    return Response.json(await getOrCreateFamily({ id: user.id, email: user.email, name: user.name }));
  } catch (error) {
    console.error("Family view read failed", error);
    return Response.json({ error: "Your family view could not be loaded." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await currentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  try {
    const input = await request.json() as FamilyState;
    return Response.json(await saveFamily({ id: user.id, email: user.email, name: user.name }, input));
  } catch (error) {
    console.error("Family view write failed", error);
    return Response.json({ error: error instanceof Error ? error.message : "Your changes could not be saved." }, { status: 400 });
  }
}
