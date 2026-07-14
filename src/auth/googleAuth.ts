// Client-side OAuth using Google Identity Services (GIS).
// No backend involved: the browser gets a short-lived access token directly
// from Google, scoped only to files/sheets this app creates.

declare global {
  interface Window {
    google: any;
  }
}

const SCOPES =
  "https://www.googleapis.com/auth/drive.file " +
  "https://www.googleapis.com/auth/userinfo.email";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

let tokenClient: any = null;

export function initGoogleAuth(onToken: (token: string) => void) {
  if (!window.google) {
    throw new Error(
      "Google Identity Services script not loaded yet. Check your network / index.html."
    );
  }
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (resp: any) => {
      if (resp.access_token) {
        sessionStorage.setItem("gis_token", resp.access_token);
        sessionStorage.setItem(
          "gis_token_expiry",
          String(Date.now() + (resp.expires_in ?? 3600) * 1000)
        );
        onToken(resp.access_token);
      }
    },
  });
}

export function requestSignIn() {
  if (!tokenClient) throw new Error("Call initGoogleAuth first.");
  tokenClient.requestAccessToken();
}

export function getStoredToken(): string | null {
  const token = sessionStorage.getItem("gis_token");
  const expiry = Number(sessionStorage.getItem("gis_token_expiry") ?? 0);
  if (token && Date.now() < expiry) return token;
  return null;
}

export function signOut() {
  const token = getStoredToken();
  if (token && window.google) {
    window.google.accounts.oauth2.revoke(token, () => {});
  }
  sessionStorage.removeItem("gis_token");
  sessionStorage.removeItem("gis_token_expiry");
}

export async function fetchUserEmail(token: string): Promise<string> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch user info");
  const data = await res.json();
  return data.email as string;
}
