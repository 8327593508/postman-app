# 📮 Postman Recipient App

**A free tool for delivery personnel to record who they deliver to — without anyone but them ever holding their data.**

Live app: `https://postman-app-two.vercel.app`

---

## Why this exists

Delivery work runs on memory and scraps of paper. A postman visiting the same village for years still re-asks for the same address, because there's no record that follows *him* — only whatever the courier company chooses to keep, if anything.

This app starts from a simple belief: **the person doing the work should own the record of the work.** Not a company server. Not a shared spreadsheet six other people can edit. Their own Google Drive, under their own account, visible to no one else — including the person who built this app.

That single design choice shapes everything else about how it works.

## Who it's for

Postmen, courier riders, last-mile delivery agents, field surveyors — anyone who repeatedly visits the same people and currently has no good way to remember them. No IT department, no company rollout, no training session required. Sign in with the Gmail account you already have, and you're using it.

## What it does

- **Add a recipient** — name, care-of, address, pincode, mobile number, and an optional note.
- **Automatic GPS capture** — the exact location is recorded the moment the entry is saved, so the *next* delivery doesn't require asking for directions again.
- **One tap to navigate** — every saved recipient has a direct link into Google Maps for routing back to them.
- **Search instantly** — by name, mobile number, pincode, or village/city.
- **No duplicate clutter** — if a recipient already exists (matched by mobile number, or by name + pincode + village), the app shows the existing record instead of creating a second one.
- **Fix mistakes** — select and delete any wrongly entered record, permanently, in one action.
- **Import / export CSV** — bring in an existing list, or take your data with you, any time.
- **One device at a time** — signing in on a new phone automatically signs out any other device on the same account, so a lost or shared phone can't silently keep collecting data in the background.

## Why it costs nothing — and always will

This isn't a "free tier" with a catch. There is no server to outgrow, no database to pay for, no company holding costs that eventually get passed on to users. The entire app is a static website; when you sign in, your browser talks *directly* to Google's own Drive API using your own Google account's permission. There is no middle system in between collecting, storing, or billing for that data.

That means the running cost of this app, no matter how many postmen use it, is **zero** — not "zero for now," but zero by construction. There's nothing to scale, because nothing central is being asked to hold anyone's data.

## Privacy, in plain terms

- Every recipient record lives inside a `PostmanApp` folder created **inside your own Google Drive**, the moment you first sign in.
- The app only ever asks Google for permission to touch files *it itself created* (`drive.file` — the narrowest access tier Google offers). It cannot browse, read, or touch anything else in your Drive.
- Nobody — not the developer of this app, not a company, not a third party — has a copy of your data. If you were to delete the `PostmanApp` folder from your Drive, the data is simply gone.
- As the developer, the only thing visible is anonymous, aggregate usage volume (API call counts) — never who made them or what the data contains.

---

## The build journey

This section documents how the app actually came together, step by step — useful both as a record and as a guide if you ever want to fork this and run your own version.

### 1. Defining the shape of the problem
Started from the real workflow: a delivery agent standing at a doorstep, phone in hand, needing to log a recipient in under thirty seconds and move on. Every design decision after this was filtered through that constraint — minimal typing, automatic GPS, no login friction beyond the Gmail sign-in they already have muscle memory for.

### 2. Choosing a fully serverless architecture
Rejected the idea of a shared backend/database from the start — that would mean recurring hosting costs, a security surface to maintain, and a central point where everyone's data pools together. Instead: a static React + TypeScript frontend, with Google's own APIs doing all the storage work, scoped per user.

### 3. Setting up Google Cloud
- Created a Google Cloud project (`postman-app`).
- Enabled the Google Drive API.
- Configured the OAuth consent screen (Google Auth Platform → Branding/Audience) with app name, support email, and external user type.
- Created a single OAuth **Client ID** (Web application) — this is the one credential the entire app runs on; every user who signs in does so through this same Client ID, each getting access only to their own Drive.

### 4. Building the MVP
Built out the core modules: Google sign-in (Google Identity Services), a first-login profile step (employee ID + mobile number), the recipient form with GPS capture, a duplicate-detection engine, search, and CSV import/export — backed by an IndexedDB local cache so search and duplicate checks feel instant.

### 5. Rethinking the storage layer to avoid needless friction
The original version stored recipient data in a Google Sheet per user. Sheets access requires Google's `spreadsheets` OAuth scope — which Google classifies as **sensitive**, meaning a public launch would require submitting the app for a verification review (privacy policy, homepage, demo video, ~1–2 week wait).

Rather than accept that wait, the storage layer was rebuilt to save recipient data as a plain JSON file (`recipients.json`) inside each user's own Drive folder instead. This only needs the `drive.file` scope — Google's **non-sensitive**, pre-approved tier. Net effect: **zero verification requirement, zero waiting, launch immediately.**

### 6. Adding safeguards
- **Duplicate blocking**: a match on mobile number, or on name + pincode + village, stops a new entry from being created and shows the existing one instead.
- **Single active session**: each sign-in writes a session marker into the user's own `profile.json`; every signed-in device quietly checks every ~20 seconds whether it's still the active one, and signs itself out automatically if not.
- **GPS diagnostics**: instead of a silent failure, the app now reports *why* location capture failed (permission blocked, timed out, unsupported) with a retry option and a manual fallback.

### 7. Visual design pass
Redesigned around a postal/field-work theme — deep navy and hi-vis amber, built for legibility on a phone screen in direct outdoor sunlight, with large touch targets suited to someone standing at a doorstep rather than sitting at a desk.

### 8. Deployment
- Pushed the project to GitHub.
- Deployed the static build to **Vercel** (free tier), with the OAuth Client ID set as an environment variable rather than hardcoded.
- Added the live Vercel URL to the OAuth client's Authorized JavaScript Origins in Google Cloud Console.
- Switched the OAuth consent screen's publishing status from **Testing** to **In production** — since the app only uses the non-sensitive `drive.file` scope, this required no review and took effect immediately.

The result: a link that anyone with a Gmail account can open, sign into with their own account, and start using — for free, with their data staying entirely their own.

---

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript + Vite |
| Auth | Google Identity Services (client-side OAuth) |
| Storage | Google Drive API (`drive.file` scope) — one JSON file per user |
| Local cache | IndexedDB (via `idb`) |
| Hosting | Vercel (static site, free tier) |
| Backend | None |

## Getting started (running your own copy)

```bash
npm install
npm run dev
```

Set `VITE_GOOGLE_CLIENT_ID` in a `.env` file, using a Client ID from your own Google Cloud project (Google Auth Platform → Clients → Create client → Web application).

## Roadmap

- Offline queueing, so entries made without signal sync automatically once back online.
- Native mobile app wrapper.
- Optional multi-stop route ordering for a day's deliveries.

---

*Built to put ownership of field data back where it belongs — with the person doing the work.*
