import { auth } from "@/lib/auth/server";
import { getOrCreateFamily, saveFamily } from "@/lib/db/family-repository";
import type { FamilyState } from "@/lib/family";
import { familyErrorMessages, InvalidFamilyDataError, type FamilyErrorCode } from "@/lib/family-errors";
import { isTransientDatabaseError } from "@/lib/db/read-retry";

function errorResponse(code: FamilyErrorCode, status: number, requestId?: string) {
  return Response.json({ code, error: familyErrorMessages[code], ...(requestId ? { requestId } : {}) }, {
    status, headers: { "Cache-Control": "no-store", ...(requestId ? { "X-Request-ID": requestId } : {}) },
  });
}

function serverFailure(operation: "read" | "write", error: unknown) {
  const requestId = crypto.randomUUID();
  console.error(`Family view ${operation} failed`, { requestId, error });
  return errorResponse(operation === "read" ? "FAMILY_LOAD_FAILED" : "FAMILY_SAVE_FAILED", isTransientDatabaseError(error) ? 503 : 500, requestId);
}

async function currentUser() {
  const session = await auth.getSession();
  return session.data?.user ?? null;
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return errorResponse("SIGN_IN_REQUIRED", 401);
    return Response.json(await getOrCreateFamily({ id: user.id, email: user.email, name: user.name }));
  } catch (error) {
    return serverFailure("read", error);
  }
}

export async function PUT(request: Request) {
  try {
    const user = await currentUser();
    if (!user) return errorResponse("SIGN_IN_REQUIRED", 401);
    let input: FamilyState;
    try { input = await request.json() as FamilyState; }
    catch { return errorResponse("INVALID_FAMILY_DATA", 400); }
    return Response.json(await saveFamily({ id: user.id, email: user.email, name: user.name }, input));
  } catch (error) {
    if (error instanceof InvalidFamilyDataError) return errorResponse("INVALID_FAMILY_DATA", 400);
    return serverFailure("write", error);
  }
}
