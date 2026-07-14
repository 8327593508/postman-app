import React, { useState } from "react";
import { useAuth } from "./AuthContext";

export default function ProfileSetup() {
  const { profile, updateProfile } = useAuth();
  const [employeeId, setEmployeeId] = useState("");
  const [mobile, setMobile] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!profile) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!employeeId.trim() || !mobile.trim()) {
      setError("Both fields are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateProfile({
        ...profile!,
        employee_id: employeeId.trim(),
        mobile_number: mobile.trim(),
      });
    } catch (e: any) {
      setError(e.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page" style={{ maxWidth: 380 }}>
      <div className="stamp-badge" style={{ margin: "8px auto 16px" }}>
        PA
      </div>
      <h1 className="page-title" style={{ textAlign: "center" }}>Complete your profile</h1>
      <p className="page-subtitle" style={{ textAlign: "center" }}>
        One-time step. Saved to your own Drive, not to any external server.
      </p>
      <form onSubmit={handleSubmit} className="card">
        <label className="field">
          <span className="field-label">Employee ID</span>
          <input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Mobile number</span>
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} />
        </label>
        {error && <p className="alert alert-error">{error}</p>}
        <button type="submit" className="btn-primary btn-block" disabled={saving}>
          {saving ? "Saving…" : "Continue"}
        </button>
      </form>
    </div>
  );
}
