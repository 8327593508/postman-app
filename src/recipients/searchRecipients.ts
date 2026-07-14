import type { Recipient } from "../types";

export function searchRecipients(all: Recipient[], query: string): Recipient[] {
  const q = query.trim().toLowerCase();
  if (!q) return all;
  return all.filter(
    (r) =>
      r.recipient_name.toLowerCase().includes(q) ||
      r.mobile_number.includes(q) ||
      r.pincode.includes(q) ||
      r.village_or_city.toLowerCase().includes(q)
  );
}
