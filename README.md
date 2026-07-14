# Postman Recipient App — MVP

A serverless, per-user field-collection app for delivery personnel. Data lives
entirely in each user's own Google Drive (a `recipients.json` file inside a
`PostmanApp` folder) — there is no central database and no backend server.

**Storage design note:** recipient data is stored as a plain JSON file in
Drive rather than a Google Sheet. This is deliberate: it means the app only
ever needs the `drive.file` OAuth scope, which Google classifies as
non-sensitive and does **not** require app verification before public launch.
Using Google Sheets would have required the `spreadsheets` scope, which is
sensitive and needs a ~1-2 week Google review (privacy policy, homepage, demo
video) before non-test users could sign in.

## What's already configured

Your `.env` file is pre-filled with the Client ID you created in Google Cloud
Console:

```
VITE_GOOGLE_CLIENT_ID=737813674782-a804vu4jdvef9pejmcfhsie982fmdsac.apps.googleusercontent.com
```

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:5173. Click **Sign in with Google** — you must be
listed as a **test user** in Google Auth Platform → Audience for login to
work while the app is still in "Testing" publish status.

On first login, the app automatically:
1. Creates a `PostmanApp` folder in your Google Drive
2. Creates a `recipients.json` file inside it (starts as an empty array)
3. Creates a `profile.json` file inside it to store your employee ID, mobile
   number, and current active-session marker

You'll then be asked to enter your Employee ID and mobile number once — this
is saved to `profile.json` in your own Drive, not to any external server.

## How data flows

- **Add recipient** → captures GPS via the browser → checks for duplicates
  against your local cache (mobile number match, or name+pincode+village
  match) → if a match exists, shows the existing record and **does not**
  create a new entry → otherwise appends to your `recipients.json` file.
- **Search** → filters your recipients by name, mobile, pincode, or village.
  Always available, never blocks — it's just a lookup.
- **Delete** → select one or more recipients on the Search page and click
  "Delete selected" to permanently remove them (e.g. to fix a wrongly
  entered record). This asks for confirmation once.
- **Export** → downloads all your recipients as a CSV file.
- **Import** (Settings page) → upload a CSV; each row is deduplicated the
  same way as manual entry before being appended.
- **Route** → each recipient with GPS coordinates has an "Open route in
  Google Maps" link.
- **Single active session** → signing in on a new device marks it as
  active in your `profile.json`; any other signed-in device detects this
  within ~20 seconds and is automatically signed out.

## Project structure

```
src/
  auth/         Google sign-in (GIS) + AuthContext + first-login profile setup
  drive/        Drive API: folder/profile.json bootstrap, recipients.json store
  db/           IndexedDB local cache (search + dedup without refetching)
  recipients/   Form, list/search/delete, GPS capture, dedup engine
  io/           CSV export/import
  utils/        Google Maps link generator
  pages/        Dashboard, Settings
```

## Deploy

```bash
npm run build
```

Deploy the `dist/` folder to Vercel, Netlify, or Firebase Hosting (all have
free tiers suitable for this). After deploying:

1. Go back to Google Cloud Console → Google Auth Platform → Clients → your
   web client.
2. Add your production URL (e.g. `https://your-app.vercel.app`) to
   **Authorized JavaScript origins**.
3. Since the app only requests the non-sensitive `drive.file` scope, you can
   move the OAuth consent screen's publishing status from "Testing" to "In
   production" without a Google verification review — any Gmail user will
   then be able to sign in, not just your listed test users.

## Known MVP limitations / next steps

- Offline queueing (IndexedDB write-behind sync) is not yet wired in — if
  you're offline, add/search will fail rather than queue. This is flagged
  as a future enhancement.
- No "save anyway" override on duplicate detection — per spec, a match
  always blocks the new entry.
- No SMS OTP login. Real SMS OTP requires a paid gateway or Firebase Phone
  Auth (which has its own quota/billing beyond a small free tier) — outside
  what a $0, no-backend app can do. The single-active-session feature is the
  current substitute safeguard.
- No native mobile app yet; the web app is responsive and works fine on
  mobile browsers, including geolocation.

