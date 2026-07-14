import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  return (
    <div className="page">
      <div className="stamp-badge" style={{ margin: "8px auto 16px" }}>
        PA
      </div>
      <h1 className="page-title" style={{ textAlign: "center" }}>
        Postman Recipient App
      </h1>
      {profile && (
        <p className="page-subtitle" style={{ textAlign: "center" }}>
          Signed in as {profile.gmail}
        </p>
      )}

      <div className="tile-grid">
        <Link to="/add" className="tile" style={{ textDecoration: "none" }}>
          <div className="tile-icon">➕</div>
          <div>
            <div className="tile-label">Add recipient</div>
            <div className="tile-desc">Capture details and GPS location</div>
          </div>
        </Link>

        <Link to="/search" className="tile" style={{ textDecoration: "none" }}>
          <div className="tile-icon">🔍</div>
          <div>
            <div className="tile-label">Search recipients</div>
            <div className="tile-desc">Find by name, mobile, or pincode</div>
          </div>
        </Link>

        <Link to="/settings" className="tile" style={{ textDecoration: "none" }}>
          <div className="tile-icon">⚙️</div>
          <div>
            <div className="tile-label">Settings</div>
            <div className="tile-desc">Profile, import data</div>
          </div>
        </Link>
      </div>

      <button className="btn-ghost btn-block" style={{ marginTop: 22 }} onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}
