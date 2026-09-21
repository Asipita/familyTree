import { previewInvitation } from "@/lib/db/invitations";
import { apiFailure, privateJson, requireSameOrigin } from "@/lib/api-response";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const input = await request.json();
    return privateJson(await previewInvitation(input?.token));
  } catch (error) { return apiFailure(error); }
}
