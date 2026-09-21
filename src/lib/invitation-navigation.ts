export function invitationDestination(value: unknown) {
  return typeof value === "string" && /^[a-f0-9]{64}$/.test(value) ? `/join?invite=${value}` : "/tree";
}
