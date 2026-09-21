export const familyErrorMessages = {
  SIGN_IN_REQUIRED: "Please sign in to continue.",
  INVALID_FAMILY_DATA: "Check your family details and try again.",
  FAMILY_LOAD_FAILED: "We couldn't load your family. Please try again.",
  FAMILY_SAVE_FAILED: "We couldn't confirm your changes were saved. Please try again.",
} as const;

export type FamilyErrorCode = keyof typeof familyErrorMessages;

// Never render server-provided error text, even from an older API deployment.
export function familyErrorMessage(payload: unknown, fallback: FamilyErrorCode): string {
  if (payload && typeof payload === "object" && "code" in payload && typeof payload.code === "string"
    && Object.hasOwn(familyErrorMessages, payload.code)) {
    return familyErrorMessages[payload.code as FamilyErrorCode];
  }
  return familyErrorMessages[fallback];
}

export class InvalidFamilyDataError extends Error {
  constructor() { super(familyErrorMessages.INVALID_FAMILY_DATA); this.name = "InvalidFamilyDataError"; }
}
