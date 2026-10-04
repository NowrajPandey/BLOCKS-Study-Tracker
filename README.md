# BLOCKS Study Tracker

A local-first PWA for tracking a Class 12 study plan: priority-scored backlog, three daily blocks, spaced revision, syllabus projection, and project/homework submissions.

## Run it

```bash
pnpm install
pnpm --filter @workspace/blocks-study-tracker run dev        # http://localhost:4173
pnpm --filter @workspace/blocks-study-tracker run test
pnpm --filter @workspace/blocks-study-tracker run typecheck
pnpm --filter @workspace/blocks-study-tracker run build      # artifacts/blocks-study-tracker/dist/public
```

Data lives in `localStorage` (`blocks-study-app-v1`). Nothing leaves the device unless you turn on cloud sync.

## What protects your data

| Layer | Where | When it runs |
| --- | --- | --- |
| File backup | `Settings → Your data → SAVE BACKUP TO COMPUTER` | On demand; a reminder banner appears on Today after 14 days |
| Local snapshots | IndexedDB (`blocks-backup`), last 30 kept | Automatically every 5 minutes after a change |
| Cloud sync + rollback history | Supabase, keyed by a private 128-bit sync key | On change (debounced), on tab hide, every 15 s while open |

Restoring a file, a snapshot, or a rollback point marks the device as the winner for the next sync, so an intentional restore is never overwritten by an older device.

## Deploy (free)

Static host + a free Postgres database. No server code to run.

1. **Push the repository to GitHub.** The repo currently has no remote:
   ```bash
   git remote add origin <your-github-url>
   git push -u origin HEAD
   ```
2. **Create the database.** On [supabase.com](https://supabase.com) make a free project, open **SQL Editor**, paste everything in [`supabase/sync.sql`](supabase/sync.sql), and run it once.
3. **Add the two environment variables** in your host's project settings (build settings → environment variables):
   - `VITE_SUPABASE_URL` — the project URL from *Settings → API*
   - `VITE_SUPABASE_ANON_KEY` — the anon/public key from *Settings → API*
4. **Deploy.**
   - **Vercel**: import the repo; [`vercel.json`](vercel.json) already sets install command, build command, output directory and SPA rewrites.
   - **Netlify**: build `pnpm --filter @workspace/blocks-study-tracker run build`, publish `artifacts/blocks-study-tracker/dist/public`, add a single rewrite of `/* → /index.html`.
   - **Cloudflare Pages**: same build command, same output directory, SPA *navigation* fallback to `/index.html`.
5. **Turn sync on.** Open Settings → *Sync & devices* → TURN ON SYNC, copy the key, paste it into the same screen on your other device. Both copies now merge automatically.
6. **Install it** on each device from the browser menu (or the in-app install banner) so it opens full screen and works offline.

CI (`.github/workflows/ci.yml`) runs typecheck, tests and build on every push and pull request.

### Sync design

- Every device pushes its full state; the server stores one row per account (SHA-256 of the sync key) plus the last 50 changed snapshots.
- Devices merge with a three-way merge: the last state both sides agreed on is the base, record arrays are unioned by id, deletions only apply when the other side did not edit that record, and a same-field conflict keeps the copy on the device you are looking at. The losing version is still in server history.
- RLS is enabled on both tables with no policies; the only reachable code paths are the `SECURITY DEFINER` RPCs, which all require the sync key.
