import { openDB, IDBPDatabase } from "idb";
import type { Recipient } from "../types";

const DB_NAME = "postman_app_cache";
const STORE = "recipients";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "unique_id" });
        }
      },
    });
  }
  return dbPromise;
}

export async function cacheAll(recipients: Recipient[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE, "readwrite");
  await tx.store.clear();
  for (const r of recipients) await tx.store.put(r);
  await tx.done;
}

export async function cacheOne(recipient: Recipient): Promise<void> {
  const db = await getDb();
  await db.put(STORE, recipient);
}

export async function getAllCached(): Promise<Recipient[]> {
  const db = await getDb();
  return db.getAll(STORE);
}

export async function deleteMany(uniqueIds: string[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(STORE, "readwrite");
  for (const id of uniqueIds) await tx.store.delete(id);
  await tx.done;
}
