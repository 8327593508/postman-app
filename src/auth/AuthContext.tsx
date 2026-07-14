import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import { v4 as uuidv4 } from "uuid";
import {
  initGoogleAuth,
  requestSignIn,
  getStoredToken,
  signOut as gisSignOut,
  fetchUserEmail,
} from "./googleAuth";
import {
  ensureUserStorage,
  saveProfile as saveProfileToDrive,
  fetchLatestProfile,
} from "../drive/driveClient";
import { createRecipientsFile } from "../drive/recipientsStore";
import type { UserProfile } from "../types";

const SESSION_ID_KEY = "my_session_id";
const SESSION_POLL_MS = 20000;

interface AuthState {
  token: string | null;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  signIn: () => void;
  signOut: () => void;
  updateProfile: (p: UserProfile) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const forceSignOut = useCallback((reason: string) => {
    if (pollRef.current) clearInterval(pollRef.current);
    gisSignOut();
    sessionStorage.removeItem(SESSION_ID_KEY);
    setToken(null);
    setProfile(null);
    setError(reason);
  }, []);

  const bootstrap = useCallback(
    async (t: string, isFreshSignIn: boolean) => {
      setLoading(true);
      setError(null);
      try {
        const gmail = await fetchUserEmail(t);
        const { profile: p } = await ensureUserStorage(t, gmail, createRecipientsFile);

        // Claim this device as the active session on a fresh sign-in, or if
        // no session has been claimed locally yet (first run after refresh).
        let mySessionId = sessionStorage.getItem(SESSION_ID_KEY);
        if (isFreshSignIn || !mySessionId) {
          mySessionId = uuidv4();
          sessionStorage.setItem(SESSION_ID_KEY, mySessionId);
          const claimed: UserProfile = {
            ...p,
            active_session_id: mySessionId,
            active_session_started_at: new Date().toISOString(),
          };
          await saveProfileToDrive(t, claimed);
          setProfile(claimed);
        } else {
          // Returning to an already-claimed session: make sure we're still
          // the active one (someone could have signed in elsewhere while
          // this tab was closed/reloading).
          if (p.active_session_id && p.active_session_id !== mySessionId) {
            forceSignOut(
              "You were signed out because this account was signed in on another device."
            );
            return;
          }
          setProfile(p);
        }

        // Start polling Drive to detect a newer login from another device.
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(async () => {
          try {
            const latest = await fetchLatestProfile(t, p.drive_folder_id);
            const currentSessionId = sessionStorage.getItem(SESSION_ID_KEY);
            if (
              latest?.active_session_id &&
              currentSessionId &&
              latest.active_session_id !== currentSessionId
            ) {
              forceSignOut(
                "You were signed out because this account was signed in on another device."
              );
            }
          } catch {
            // Network hiccup during polling -- ignore, try again next tick.
          }
        }, SESSION_POLL_MS);
      } catch (e: any) {
        setError(e.message ?? "Failed to set up Drive storage");
      } finally {
        setLoading(false);
      }
    },
    [forceSignOut]
  );

  useEffect(() => {
    initGoogleAuth((t) => {
      setToken(t);
      bootstrap(t, true); // real sign-in click -> claim this device as active
    });
    // If we already have a valid cached token (same tab session), resume
    // without re-claiming, unless another device has since taken over.
    const existing = getStoredToken();
    if (existing) bootstrap(existing, false);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [bootstrap]);

  const signIn = () => requestSignIn();

  const signOut = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    gisSignOut();
    sessionStorage.removeItem(SESSION_ID_KEY);
    setToken(null);
    setProfile(null);
  };

  const updateProfile = async (p: UserProfile) => {
    if (!token) throw new Error("Not signed in");
    // Preserve the active session marker when saving unrelated profile edits.
    const merged = { ...p, active_session_id: profile?.active_session_id, active_session_started_at: profile?.active_session_started_at };
    await saveProfileToDrive(token, merged);
    setProfile(merged);
  };

  return (
    <AuthContext.Provider
      value={{ token, profile, loading, error, signIn, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
