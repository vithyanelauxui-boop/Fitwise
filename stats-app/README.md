# Vroom stats (`/track`)

A private analytics page for the Vroom case study and prototype, behind a macOS-style lock screen (password, then Touch ID on each device).

## How it fits together

- `assets/fw-track.js` runs on `index.html` (case study) and `prototype.html`. It records the source (referrer, UTM tags, ad click IDs, in-app browsers), sections read and time on each, scroll depth, every tap, prototype pages (Home, PLP, PDP) and actions (search, Ask, plate lookup, filters, cart, reserve) and page speed. Prototype actions are observed from outside `src/app.js`, so the product code is unchanged.
- `api/hit.js` stores one small JSON record per session and page in Vercel Blob, adding the visitor's state, city and PIN area from Vercel's network headers. No IP addresses or cookies are stored.
- `api/stats.js` returns the records to the signed-in dashboard; `api/auth.js` handles the password, Touch ID passkeys and lockout.
- This folder is the dashboard (React + Vite). `pnpm build` writes the static page to `../track`, which is committed so Vercel serves it as-is.

## Vercel setup (once, about a minute)

Merging deploys everything, and nothing breaks before setup: the tracker stays silent until storage exists, and `/track` says what is missing.

1. Storage → **Create** → **Blob** → connect it to this project. This adds `BLOB_READ_WRITE_TOKEN`, which also signs the login cookie.
2. Deployments → **Redeploy**, then open `/track` (or `/stats`).

The password is checked against a salted scrypt hash in `api/_auth.js`; the password itself is not in the repo. To change it, set `STATS_PASSWORD` in Vercel (Settings → Environment Variables), which takes priority over the hash. `STATS_KEY` is optional; set it only to rotate the login cookie's signing key.

Open any page once with `?me` to stop counting your own visits on that browser (`?notme` undoes it).

## Working on it

```bash
pnpm install
pnpm dev          # http://localhost:5173/track/?demo shows synthetic data
pnpm build        # writes ../track
```
