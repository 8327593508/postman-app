import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { readAllRecipients, deleteRecipients } from "../drive/recipientsStore";
import { cacheAll, getAllCached, deleteMany } from "../db/localCache";
import { searchRecipients } from "./searchRecipients";
import { mapLink } from "../utils/mapLink";
import { downloadCSV } from "../io/csvExportImport";
import type { Recipient } from "../types";

export default function RecipientList() {
  const { token, profile } = useAuth();
  const [all, setAll] = useState<Recipient[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();
  }, [token, profile]);

  async function load() {
    if (!token || !profile) return;
    setLoading(true);
    setError(null);
    try {
      const fresh = await readAllRecipients(token, profile.recipients_file_id);
      setAll(fresh);
      await cacheAll(fresh);
    } catch {
      const cached = await getAllCached();
      setAll(cached);
    } finally {
      setLoading(false);
    }
  }

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDeleteSelected() {
    if (!token || !profile || selected.size === 0) return;
    const confirmed = window.confirm(
      `Delete ${selected.size} recipient${selected.size > 1 ? "s" : ""}? This cannot be undone.`
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      const idsToDelete = Array.from(selected);
      await deleteRecipients(token, profile.recipients_file_id, idsToDelete);
      await deleteMany(idsToDelete);

      setAll((prev) => prev.filter((r) => !selected.has(r.unique_id)));
      setSelected(new Set());
    } catch (e: any) {
      setError(e.message ?? "Failed to delete selected recipients.");
    } finally {
      setDeleting(false);
    }
  }

  const results = searchRecipients(all, query);

  return (
    <div className="page">
      <h1 className="page-title">Search recipients</h1>
      <p className="page-subtitle">Find by name, mobile, pincode, or village.</p>

      <input
        className="search-input"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && <p className="alert alert-error">{error}</p>}

      <div className="btn-row" style={{ marginBottom: 14 }}>
        <button className="btn-secondary" onClick={() => downloadCSV(all)}>
          Export all as CSV
        </button>
        {selected.size > 0 && (
          <button className="btn-danger" onClick={handleDeleteSelected} disabled={deleting}>
            {deleting ? "Deleting…" : `Delete selected (${selected.size})`}
          </button>
        )}
      </div>

      {loading && <p className="muted">Loading…</p>}
      {!loading && results.length === 0 && (
        <div className="empty-state">No matches found.</div>
      )}

      {results.map((r) => {
        const isSelected = selected.has(r.unique_id);
        return (
          <div key={r.unique_id} className={`recipient-card${isSelected ? " selected" : ""}`}>
            <input
              type="checkbox"
              className="recipient-checkbox"
              checked={isSelected}
              onChange={() => toggle(r.unique_id)}
              aria-label={`Select ${r.recipient_name}`}
            />
            <div style={{ flex: 1 }}>
              <div className="recipient-name">{r.recipient_name}</div>
              <p className="recipient-meta">{r.mobile_number}</p>
              <p className="recipient-meta">
                {r.care_of ? `${r.care_of}, ` : ""}
                {r.village_or_city}, {r.state} - {r.pincode}
              </p>
              {r.note && <p className="recipient-note">{r.note}</p>}
              <p className="recipient-timestamp">
                Added {new Date(r.timestamp).toLocaleDateString()}
              </p>
              {r.gps_location && (
                <a
                  className="recipient-link"
                  href={mapLink(r.gps_location.lat, r.gps_location.lng)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open route in Google Maps →
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
