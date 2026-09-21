export const familyErrorMessages = {
  SIGN_IN_REQUIRED: "Please sign in to continue.",
  INVALID_FAMILY_DATA: "Check your family details and try again.",
  FAMILY_LOAD_FAILED: "We couldn't load your family. Please try again.",
  FAMILY_SAVE_FAILED: "We couldn't confirm your changes were saved. Please try again.",
  FAMILY_FORBIDDEN: "You don't have permission to change those details.",
  FAMILY_CONFLICT: "Your tree has changed. Reload it before saving again. Your unsaved form is still here.",
  INVITATION_INVALID: "This invitation is no longer available. Ask your relative for a new link.",
  INVITATION_EMAIL: "Sign in with the email address this invitation was created for.",
  INVITATION_VERIFY_EMAIL: "Confirm your email address before joining this tree.",
  INVITATION_EXISTING_TREE: "Your account already has a family tree. Joining requires a tree connection, which isn't available yet. Your existing tree has not been changed.",
  INVITATION_FAILED: "We couldn't complete this invitation. Please try again.",
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

export class FamilyAccessError extends Error {
  constructor(public code: FamilyErrorCode, public status = 403) { super(familyErrorMessages[code]); this.name = "FamilyAccessError"; }
}
