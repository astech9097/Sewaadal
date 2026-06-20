/** Member login: 2–6 alphanumeric characters */
export const MEMBER_USERNAME_REGEX = /^[a-zA-Z0-9]{2,6}$/;

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function validateMemberUsername(value: string): string | null {
  const trimmed = value.trim();
  if (!MEMBER_USERNAME_REGEX.test(trimmed)) {
    return "Username must be 2–6 letters or numbers (no spaces).";
  }
  return null;
}

export function isEmailLike(value: string): boolean {
  return value.includes("@");
}
