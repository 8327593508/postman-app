import React, { useRef, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { appendRecipients } from "../drive/recipientsStore";
import { cacheOne, getAllCached } from "../db/localCache";
import { parseCSV } from "../io/csvExportImport";
import { findDuplicates } from "../recipients/DeduplicationEngine";
import { v4 as uuidv4 } from "uuid";
import type { Recipient } from "../types";

export default function Settings() {
  const { token, profile } = useAuth();
  const fileInput = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token || !profile) return;
    setImporting(true);
    setStatus("Importing…");
    const text = await file.text();
    const rows = parseCSV(text);
    const existing = await getAllCached();
    const toAdd: Recipient[] = [];

    let skipped = 0;

    for (const row of rows) {
      const candidateBase = {
        recipient_name: row.recipient_name ?? "",
        mobile_number: row.mobile_number ?? "",
        pincode: row.pincode ?? "",
        village_or_city: row.village_or_city ?? "",
      };
      if (!candidateBase.recipient_name || !candidateBase.mobile_number) {
        skipped++;
        continue;
      }
      const dupes = findDuplicates([...existing, ...toAdd], candidateBase);
      if (dupes.length > 0) {
        skipped++;
        continue;
      }
      const recipient: Recipient = {
        unique_id: uuidv4(),
        recipient_name: candidateBase.recipient_name,
        care_of: row.care_of || undefined,
        village_or_city: candidateBase.village_or_city,
        state: row.state ?? "",
        pincode: candidateBase.pincode,
        mobile_number: candidateBase.mobile_number,
        gps_location:
          row.lat && row.lng ? { lat: Number(row.lat), lng: Number(row.lng) } : null,
        timestamp: new Date().toISOString(),
        note: row.note || undefined,
      };
      toAdd.push(recipient);
    }

    try {
      await appendRecipients(token, profile.recipients_file_id, toAdd);
      for (const r of toAdd) await cacheOne(r);
      setStatus(`Import complete: ${toAdd.length} added, ${skipped} skipped (duplicates or invalid rows).`);
    } catch (e: any) {
      setStatus(e.message ?? "Import failed.");
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Settings</h1>

      {profile && (
        <div className="card">
          <p className="field-label" style={{ marginBottom: 10 }}>Your profile</p>
          <p className="recipient-meta"><strong>Employee ID:</strong> {profile.employee_id}</p>
          <p className="recipient-meta"><strong>Mobile:</strong> {profile.mobile_number}</p>
          <p className="recipient-meta"><strong>Gmail:</strong> {profile.gmail}</p>
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <p className="field-label">Import recipients from CSV</p>
        <p className="page-subtitle" style={{ marginBottom: 12 }}>
          Rows matching an existing recipient (by mobile, or name + pincode + village) are skipped.
        </p>
        <input ref={fileInput} type="file" accept=".csv" onChange={handleImport} disabled={importing} />
        {status && <p className="alert alert-muted" style={{ marginTop: 12 }}>{status}</p>}
      </div>
    </div>
  );
}
