import { auth } from "@/lib/auth/server";
import { createInvitation, listInvitations, revokeInvitation } from "@/lib/db/invitations";
import { apiFailure, privateJson, requireSameOrigin } from "@/lib/api-response";
import { FamilyAccessError } from "@/lib/family-errors";

async function currentUser() {
  const { data } = await auth.getSession();
  if (!data?.user) throw new FamilyAccessError("SIGN_IN_REQUIRED", 401);
  return data.user;
}
export async function GET() {
  try { return privateJson(await listInvitations(await currentUser())); }
  catch (error) { return apiFailure(error); }
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await currentUser();
    const input = await request.json();
    return privateJson(await createInvitation(user, input?.personId, input?.email), 201);
  } catch (error) { return apiFailure(error); }
}
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await currentUser();
    const input = await request.json();
    return privateJson(await revokeInvitation(user, input?.id));
  } catch (error) { return apiFailure(error); }
}
