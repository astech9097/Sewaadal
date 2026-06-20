/** Normalize Indian mobile numbers to 10-digit form for comparison. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

export function maskPhone(phone: string): string {
  const n = normalizePhone(phone);
  if (n.length < 4) return "****";
  return `******${n.slice(-4)}`;
}

export function isValidIndianMobile(phone: string): boolean {
  const n = normalizePhone(phone);
  return /^[6-9]\d{9}$/.test(n);
}
