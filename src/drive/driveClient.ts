// Thin wrapper around the Google Drive REST API (v3).
// Only ever touches files this app creates (drive.file scope) -- this is
// the only scope the whole app needs, which keeps it exempt from Google's
// OAuth "sensitive scope" verification requirement.

import type { UserProfile } from "../types";

const DRIVE_BASE = "https://www.googleapis.com/drive/v3";
const UPLOAD_BASE = "https://www.googleapis.com/upload/drive/v3";

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function findFileByName(
  token: string,
  name: string,
  parentId?: string
): Promise<{ id: string; name: string } | null> {
  const q = [
    `name='${name.replace(/'/g, "\\'")}'`,
    "trashed=false",
    parentId ? `'${parentId}' in parents` : null,
  ]
    .filter(Boolean)
    .join(" and ");
  const url = `${DRIVE_BASE}/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
  const res = await fetch(url, { headers: authHeaders(token) });
  if (!res.ok) throw new Error(`Drive search failed: ${res.status}`);
  const data = await res.json();
  return data.files?.[0] ?? null;
}

async function createFolder(token: string, name: string): Promise<string> {
  const res = await fetch(`${DRIVE_BASE}/files`, {
    method: "POST",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!res.ok) throw new Error(`Folder creation failed: ${res.status}`);
  const data = await res.json();
  return data.id as string;
}

export async function createJsonFile(
  token: string,
  name: string,
  parentId: string,
  content: unknown
): Promise<string> {
  const metadata = { name, parents: [parentId], mimeType: "application/json" };
  const boundary = "postman_app_boundary";
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${JSON.stringify(content)}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    `${UPLOAD_BASE}/files?uploadType=multipart&fields=id`,
    {
      method: "POST",
      headers: {
        ...authHeaders(token),
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  if (!res.ok) throw new Error(`File creation failed: ${res.status}`);
  const data = await res.json();
  return data.id as string;
}

export async function downloadJsonFile<T>(token: string, fileId: string): Promise<T> {
  const res = await fetch(`${DRIVE_BASE}/files/${fileId}?alt=media`, {
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error(`File download failed: ${res.status}`);
  return res.json();
}

export async function updateJsonFile(
  token: string,
  fileId: string,
  content: unknown
): Promise<void> {
  const res = await fetch(`${UPLOAD_BASE}/files/${fileId}?uploadType=media`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(content),
  });
  if (!res.ok) throw new Error(`File update failed: ${res.status}`);
}

const FOLDER_NAME = "PostmanApp";
const PROFILE_FILE_NAME = "profile.json";

/**
 * Ensures the user has a PostmanApp folder, a recipients.json data file,
 * and a profile.json in their own Drive. Creates whatever is missing.
 * Returns the existing or newly-created UserProfile.
 */
export async function ensureUserStorage(
  token: string,
  gmail: string,
  createRecipientsFile: (token: string, folderId: string) => Promise<string>
): Promise<{ profile: UserProfile; isNew: boolean }> {
  let folderId = (await findFileByName(token, FOLDER_NAME))?.id;
  if (!folderId) {
    folderId = await createFolder(token, FOLDER_NAME);
  }

  const existingProfileFile = await findFileByName(
    token,
    PROFILE_FILE_NAME,
    folderId
  );
  if (existingProfileFile) {
    let profile = await downloadJsonFile<UserProfile>(token, existingProfileFile.id);
    sessionStorage.setItem("profile_file_id", existingProfileFile.id);

    // Migration safety net: older profiles created before this storage
    // change won't have a recipients_file_id yet. Create it if missing.
    if (!profile.recipients_file_id) {
      const recipientsFileId = await createRecipientsFile(token, folderId);
      profile = { ...profile, recipients_file_id: recipientsFileId };
      await updateJsonFile(token, existingProfileFile.id, profile);
    }

    return { profile: { ...profile, gmail }, isNew: false };
  }

  const recipientsFileId = await createRecipientsFile(token, folderId);

  const profile: UserProfile = {
    employee_id: "",
    mobile_number: "",
    gmail,
    recipients_file_id: recipientsFileId,
    drive_folder_id: folderId,
    created_at: new Date().toISOString(),
  };
  const profileFileId = await createJsonFile(
    token,
    PROFILE_FILE_NAME,
    folderId,
    profile
  );
  sessionStorage.setItem("profile_file_id", profileFileId);

  return { profile, isNew: true };
}

/**
 * Re-fetches the current profile.json from Drive (fresh, not cached).
 * Used to detect whether another device has claimed a newer session.
 */
export async function fetchLatestProfile(
  token: string,
  folderId: string
): Promise<UserProfile | null> {
  const found = await findFileByName(token, PROFILE_FILE_NAME, folderId);
  if (!found) return null;
  return downloadJsonFile<UserProfile>(token, found.id);
}

export async function saveProfile(
  token: string,
  profile: UserProfile
): Promise<void> {
  let profileFileId = sessionStorage.getItem("profile_file_id");
  if (!profileFileId) {
    const found = await findFileByName(
      token,
      PROFILE_FILE_NAME,
      profile.drive_folder_id
    );
    if (!found) throw new Error("profile.json not found in Drive");
    profileFileId = found.id;
    sessionStorage.setItem("profile_file_id", profileFileId);
  }
  await updateJsonFile(token, profileFileId, profile);
}
