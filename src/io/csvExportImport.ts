import type { Recipient } from "../types";

const HEADERS: (keyof Recipient)[] = [
  "unique_id",
  "recipient_name",
  "care_of",
  "village_or_city",
  "state",
  "pincode",
  "mobile_number",
  "timestamp",
  "note",
];

export function toCSV(rows: Recipient[]): string {
  if (rows.length === 0) return HEADERS.join(",") + "\n";
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    HEADERS.join(","),
    ...rows.map((r) => {
      const base = HEADERS.map((h) => escape(r[h])).join(",");
      const lat = r.gps_location?.lat ?? "";
      const lng = r.gps_location?.lng ?? "";
      return `${base},${escape(lat)},${escape(lng)}`;
    }),
  ];
  return lines.join("\n") + "\n";
}

export function downloadCSV(rows: Recipient[], filename = "recipients.csv") {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parses a CSV file (matching the export format above) back into partial
 * Recipient objects. Caller is responsible for running dedup + assigning
 * unique_id/timestamp for any genuinely new rows.
 */
export function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = values[i] ?? ""));
    return row;
  });
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') inQuotes = true;
      else if (char === ",") {
        result.push(current);
        current = "";
      } else current += char;
    }
  }
  result.push(current);
  return result;
}
