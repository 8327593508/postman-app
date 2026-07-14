import React, { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "../auth/AuthContext";
import { appendRecipient } from "../drive/recipientsStore";
import { cacheOne, getAllCached } from "../db/localCache";
import { captureGPS, GPSResult } from "./GPSCapture";
import { findDuplicates } from "./DeduplicationEngine";
import { mapLink } from "../utils/mapLink";
import type { Recipient } from "../types";

const emptyForm = {
  recipient_name: "",
  care_of: "",
  village_or_city: "",
  state: "",
  pincode: "",
  mobile_number: "",
  note: "",
};

const GPS_FAILURE_MESSAGES: Record<Exclude<GPSResult, { ok: true }>["reason"], string> = {
  permission_denied:
    "Location access was blocked. Allow location for this site in your browser's site settings, then reload the page.",
  timeout:
    "Getting your location took too long. Make sure Wi-Fi and Windows Location Services are turned on, then try again.",
  unavailable:
    "Your location couldn't be determined right now. Try again, or enter coordinates manually below.",
  not_supported: "This browser doesn't support location access. Enter coordinates manually below.",
};

export default function RecipientForm() {
  const { token, profile } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [gpsResult, setGpsResult] = useState<GPSResult | null>(null);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "capturing" | "ok" | "failed">(
    "idle"
  );
  const [submitting, setSubmitting] = useState(false);
  const [duplicateMatches, setDuplicateMatches] = useState<Recipient[] | null>(null);
  const [savedOk, setSavedOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void attemptGPS();
  }, []);

  async function attemptGPS() {
    setGpsStatus("capturing");
    const result = await captureGPS();
    setGpsResult(result);
    setGpsStatus(result.ok ? "ok" : "failed");
  }

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !profile) return;
    setError(null);
    setDuplicateMatches(null);
    setSavedOk(false);

    if (
      !form.recipient_name.trim() ||
      !form.village_or_city.trim() ||
      !form.pincode.trim() ||
      !form.mobile_number.trim()
    ) {
      setError("Name, village/city, pincode, and mobile number are required.");
      return;
    }

    setSubmitting(true);
    try {
      let result = gpsResult;
      if (!result || !result.ok) {
        result = await captureGPS();
        setGpsResult(result);
        setGpsStatus(result.ok ? "ok" : "failed");
      }

      const finalGps = result.ok
        ? { lat: result.lat, lng: result.lng }
        : manualLat && manualLng
        ? { lat: Number(manualLat), lng: Number(manualLng) }
        : null;

      const existing = await getAllCached();
      const dupes = findDuplicates(existing, form);

      if (dupes.length > 0) {
        setDuplicateMatches(dupes);
        setSubmitting(false);
        return;
      }

      const candidate: Recipient = {
        unique_id: uuidv4(),
        recipient_name: form.recipient_name.trim(),
        care_of: form.care_of.trim() || undefined,
        village_or_city: form.village_or_city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        mobile_number: form.mobile_number.trim(),
        gps_location: finalGps,
        timestamp: new Date().toISOString(),
        note: form.note.trim() || undefined,
      };

      await appendRecipient(token, profile.recipients_file_id, candidate);
      await cacheOne(candidate);

      setForm(emptyForm);
      setManualLat("");
      setManualLng("");
      setSavedOk(true);
      void attemptGPS();
    } catch (e: any) {
      setError(e.message ?? "Failed to save recipient");
    } finally {
      setSubmitting(false);
    }
  }

  if (duplicateMatches) {
    return (
      <div className="page">
        <h1 className="page-title">Recipient already exists</h1>
        <p className="page-subtitle">No new entry was created. Here's what's already on file:</p>
        {duplicateMatches.map((r) => (
          <div key={r.unique_id} className="card">
            <div className="recipient-name">{r.recipient_name}</div>
            <p className="recipient-meta">{r.mobile_number}</p>
            <p className="recipient-meta">
              {r.care_of ? `${r.care_of}, ` : ""}
              {r.village_or_city}, {r.state} - {r.pincode}
            </p>
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
                View location on map →
              </a>
            )}
          </div>
        ))}
        <button
          className="btn-secondary btn-block"
          style={{ marginTop: 16 }}
          onClick={() => setDuplicateMatches(null)}
        >
          Back to form
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Add recipient</h1>
      <p className="page-subtitle">Details are saved straight to your own Drive.</p>

      <form onSubmit={handleSubmit} className="card">
        {savedOk && <p className="alert alert-success">Saved successfully.</p>}
        {error && <p className="alert alert-error">{error}</p>}

        <Field label="Recipient name *" value={form.recipient_name} onChange={(v) => update("recipient_name", v)} />
        <Field label="Care of" value={form.care_of} onChange={(v) => update("care_of", v)} />
        <Field label="Village / City *" value={form.village_or_city} onChange={(v) => update("village_or_city", v)} />
        <Field label="State" value={form.state} onChange={(v) => update("state", v)} />
        <Field label="Pincode *" value={form.pincode} onChange={(v) => update("pincode", v)} />
        <Field label="Mobile number *" value={form.mobile_number} onChange={(v) => update("mobile_number", v)} />
        <Field label="Note" value={form.note} onChange={(v) => update("note", v)} />

        {gpsStatus === "capturing" && (
          <p className="alert alert-muted">📍 Getting your location…</p>
        )}

        {gpsStatus === "ok" && gpsResult?.ok && (
          <p className="alert alert-success">
            📍 Location captured ({gpsResult.lat.toFixed(5)}, {gpsResult.lng.toFixed(5)})
          </p>
        )}

        {gpsStatus === "failed" && gpsResult && !gpsResult.ok && (
          <div style={{ marginBottom: 14 }}>
            <p className="alert alert-warning">{GPS_FAILURE_MESSAGES[gpsResult.reason]}</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={attemptGPS}
              style={{ marginBottom: 12 }}
            >
              Retry location
            </button>
            <Field label="Latitude (manual)" value={manualLat} onChange={setManualLat} />
            <Field label="Longitude (manual)" value={manualLng} onChange={setManualLng} />
          </div>
        )}

        <button type="submit" className="btn-primary btn-block" disabled={submitting}>
          {submitting
            ? gpsStatus === "capturing"
              ? "Getting location…"
              : "Saving…"
            : "Save recipient"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
