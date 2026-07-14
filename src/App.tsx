import React from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import ProfileSetup from "./auth/ProfileSetup";
import Dashboard from "./pages/Dashboard";
import RecipientForm from "./recipients/RecipientForm";
import RecipientList from "./recipients/RecipientList";
import Settings from "./pages/Settings";

function LoginScreen() {
  const { signIn, loading, error } = useAuth();
  return (
    <div className="center-page">
      <div className="stamp-badge" style={{ margin: "0 auto 18px" }}>
        PA
      </div>
      <h1 className="page-title" style={{ fontSize: 24 }}>
        Postman Recipient App
      </h1>
      <p className="page-subtitle">
        Sign in with your Gmail account. Your recipient data is stored in your
        own Google Drive -- never on a shared server.
      </p>
      {error && <p className="alert alert-error">{error}</p>}
      <button className="btn-primary btn-block" onClick={signIn} disabled={loading}>
        {loading ? "Setting up your Drive…" : "Sign in with Google"}
      </button>
    </div>
  );
}

function Gate({ children }: { children: React.ReactNode }) {
  const { token, profile, loading, error, signIn, signOut } = useAuth();

  if (!token) return <LoginScreen />;

  if (loading) {
    return <p className="center-page muted">Setting up your Drive…</p>;
  }

  if (!profile) {
    return (
      <div className="center-page">
        <p className="alert alert-error">
          {error ?? "Something went wrong setting up your Drive storage."}
        </p>
        <div className="btn-row" style={{ justifyContent: "center" }}>
          <button className="btn-primary" onClick={signIn}>
            Try again
          </button>
          <button className="btn-secondary" onClick={signOut}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  if (!profile.employee_id) return <ProfileSetup />;
  return <>{children}</>;
}

function TopBar() {
  const { token, profile } = useAuth();
  const location = useLocation();
  if (!token || !profile?.employee_id || location.pathname === "/") return null;

  return (
    <div className="topbar">
      <Link to="/" className="btn-ghost" style={{ color: "white", padding: "6px 8px" }}>
        ←
      </Link>
      <div className="stamp-badge" style={{ width: 28, height: 28, fontSize: 10 }}>
        PA
      </div>
      <div>
        <div className="topbar-title">Postman Recipient App</div>
        <div className="topbar-sub">{profile.employee_id}</div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Gate>
            <TopBar />
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/add" element={<RecipientForm />} />
              <Route path="/search" element={<RecipientList />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Gate>
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
