// Stores all of a user's recipients as a single JSON array in a
// "recipients.json" file inside their own PostmanApp Drive folder.
//
// This intentionally avoids the Google Sheets API. Sheets requires the
// "spreadsheets" OAuth scope, which Google classifies as "sensitive" and
// therefore subject to app verification before public launch. A plain
// Drive file only needs the "drive.file" scope (non-sensitive, no
// verification required), which keeps this app deployable to the public
// with zero review wait.
//
// Trade-off: there's no atomic "append a row" API for a plain file, so
// writes are read-modify-write. This is safe here because the app
// enforces a single active session per account (see AuthContext), so
// there's never more than one device writing at a time.

import { createJsonFile, downloadJsonFile, updateJsonFile } from "./driveClient";
import type { Recipient } from "../types";

const RECIPIENTS_FILE_NAME = "recipients.json";

export async function createRecipientsFile(
  token: string,
  folderId: string
): Promise<string> {
  return createJsonFile(token, RECIPIENTS_FILE_NAME, folderId, []);
}

export async function readAllRecipients(
  token: string,
  fileId: string
): Promise<Recipient[]> {
  const data = await downloadJsonFile<Recipient[]>(token, fileId);
  return Array.isArray(data) ? data : [];
}

export async function appendRecipient(
  token: string,
  fileId: string,
  recipient: Recipient
): Promise<void> {
  const current = await readAllRecipients(token, fileId);
  current.push(recipient);
  await updateJsonFile(token, fileId, current);
}

export async function appendRecipients(
  token: string,
  fileId: string,
  recipients: Recipient[]
): Promise<void> {
  if (recipients.length === 0) return;
  const current = await readAllRecipients(token, fileId);
  current.push(...recipients);
  await updateJsonFile(token, fileId, current);
}

export async function deleteRecipients(
  token: string,
  fileId: string,
  uniqueIds: string[]
): Promise<void> {
  const current = await readAllRecipients(token, fileId);
  const toDelete = new Set(uniqueIds);
  const remaining = current.filter((r) => !toDelete.has(r.unique_id));
  await updateJsonFile(token, fileId, remaining);
}
