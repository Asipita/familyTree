import { auth } from "@/lib/auth/server";
import { acceptInvitation } from "@/lib/db/invitations";
import { apiFailure, privateJson, requireSameOrigin } from "@/lib/api-response";
import { FamilyAccessError } from "@/lib/family-errors";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const { data } = await auth.getSession();
    if (!data?.user) throw new FamilyAccessError("SIGN_IN_REQUIRED", 401);
    const input = await request.json();
    return privateJson(await acceptInvitation(data.user, input?.token));
  } catch (error) { return apiFailure(error); }
}
