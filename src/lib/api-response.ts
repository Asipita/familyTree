import { FamilyAccessError, familyErrorMessages, InvalidFamilyDataError, type FamilyErrorCode } from "@/lib/family-errors";
import { isTransientDatabaseError } from "@/lib/db/read-retry";

export function privateJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
}
export function apiFailure(error: unknown, fallback: FamilyErrorCode = "INVITATION_FAILED") {
  if (error instanceof FamilyAccessError) return privateJson({ code: error.code, error: error.message }, error.status);
  if (error instanceof InvalidFamilyDataError || error instanceof SyntaxError) return privateJson({ code: "INVALID_FAMILY_DATA", error: familyErrorMessages.INVALID_FAMILY_DATA }, 400);
  const requestId = crypto.randomUUID();
  console.error("Family request failed", { requestId, error });
  return privateJson({ code: fallback, error: familyErrorMessages[fallback], requestId }, isTransientDatabaseError(error) ? 503 : 500);
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new FamilyAccessError("FAMILY_FORBIDDEN");
}
