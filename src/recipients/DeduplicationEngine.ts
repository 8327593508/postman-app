import type { Recipient } from "../types";

const norm = (s: string) => s.trim().toLowerCase();

/**
 * A candidate is a duplicate if it shares a mobile number with an existing
 * recipient, OR matches on name + pincode + village/city (case-insensitive).
 */
export function findDuplicates(
  existing: Recipient[],
  candidate: Pick<
    Recipient,
    "mobile_number" | "recipient_name" | "pincode" | "village_or_city"
  >
): Recipient[] {
  return existing.filter(
    (r) =>
      r.mobile_number === candidate.mobile_number ||
      (norm(r.recipient_name) === norm(candidate.recipient_name) &&
        r.pincode === candidate.pincode &&
        norm(r.village_or_city) === norm(candidate.village_or_city))
  );
}
