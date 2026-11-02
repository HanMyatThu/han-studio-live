# Zat · Short dramas with Burmese subtitles

A mobile-first streaming site for short vertical dramas. The admin uploads English videos; the system splits long videos into episodes and generates Burmese subtitles automatically. Viewers watch the first episodes free, then buy a VIP pass. Free viewers see ads.

## Features

**Viewers**
- Home page with featured carousel, Top 10, trending, new releases and genres
- Drama page with free / VIP / locked episodes
- Full-screen vertical player: swipe or arrow keys between episodes, Burmese / English / off subtitles, speed, autoplay next, resume where you left off
- Pre-roll video ad and banner ads for free users only
- VIP passes (7 / 30 / 90 days) paid with KBZPay, WavePay, AYA Pay or MPU (**mocked** for now)
- Account page with pass status, payment history and My List
- "For You" feed: swipe through episode 1 of every drama, TikTok-style
- Likes and comments on every episode
- Preview clips that autoplay on the home page
- Installable as an app (PWA) with an offline page
- Whole site switches between English and Burmese

**Admin (`/admin`)**
- Create and edit dramas (English + Burmese title and story, genre, free episode count, poster)
- Upload a long video and choose how many episodes; or upload single episodes
- Processing pipeline: extract audio → transcribe English → translate to Burmese → detect scene changes → cut at natural pauses → encode episodes
- Review episodes before they go live, preview them, and edit subtitles line by line
- Automatic episode thumbnails, poster (when you haven't uploaded one) and preview clip
- User management: search, make admin, ban, delete
- Comment moderation
- Dashboard with revenue, active passes, users and views

## Tech

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · next-intl · Prisma + PostgreSQL · hls.js · Bunny Stream · ffmpeg (bundled via `ffmpeg-static`) · framer-motion

## Getting started

Requires Node.js 20+ and Docker Desktop (for the PostgreSQL database).

```bash
npm install
cp .env.example .env      # on Windows: copy .env.example .env
docker compose up -d db   # starts PostgreSQL on localhost:5432
npm run setup             # creates the database and demo data (takes a few minutes the first time)
npm run dev
```

Open http://localhost:3000

- Admin: `admin@zat.local` / `admin1234` → http://localhost:3000/admin
- Viewer: `viewer@zat.local` / `viewer1234`

`npm run setup` also creates `demo-long-video.mp4` in the project folder. Upload it in the admin dashboard with "Long video → split into episodes" to try the auto-split.

## After pulling new changes

**Moving from SQLite to PostgreSQL (November 2026):** the database is now PostgreSQL. Old demo data in `prisma/dev.db` is not copied over. Change `DATABASE_URL` in your `.env` to `postgresql://zat:zat@localhost:5432/zat`, then run `docker compose up -d db` and `npm run setup`.

If the database schema changed, run:

```bash
npx prisma db push
```

Then in `/admin/dramas`, click **Generate missing artwork** once to create thumbnails, posters and preview clips for videos uploaded before this feature existed.

## Burmese translation of the site

UI text lives in `messages/en.json`. `messages/my.json` has the same keys with empty values: fill them in, and any key left empty falls back to English.

## Mocked services (switch on with real keys in `.env`)

| Service | Now | To go live |
|---|---|---|
| Speech-to-text | Mock English dialogue | Set `OPENAI_API_KEY` (Whisper) |
| Translation | Mock Burmese lines | `TRANSLATION_PROVIDER=openai` or `gemini` with its key |
| Payments | Instant fake payment | Implement Dinger / 2C2P in `src/lib/payments.ts` |
| Video storage | Local `./storage` folder | Bunny Stream: see below |
| Banner ads | Placeholder | Set `NEXT_PUBLIC_ADSENSE_CLIENT` |
| Video ads | Simulated pre-roll | Google IMA SDK in `src/components/player/preroll-ad.tsx` |

## Streaming with Bunny Stream

With `STORAGE_DRIVER="local"` episodes stream as MP4 from this server. With Bunny, every finished episode is uploaded to Bunny Stream, encoded into several qualities, and played as HLS from Bunny's CDN. The local copy is deleted.

1. Bunny dashboard → **Stream** → your library.
   - **Encoding**: enable 360p, 480p and 720p (data saver uses 360p/480p).
   - **Security**: turn on **Token Authentication**.
2. Put these in `.env`:
   ```
   STORAGE_DRIVER="bunny"
   BUNNY_STREAM_LIBRARY_ID="…"        # API tab: Video Library ID
   BUNNY_STREAM_API_KEY="…"           # API tab: API Key
   BUNNY_STREAM_CDN_URL="https://vz-….b-cdn.net"   # API tab: CDN Hostname
   BUNNY_TOKEN_KEY="…"                # Security tab: token authentication key
   ```
3. Restart the app. New uploads go to Bunny automatically (episodes show a **Bunny** badge).
4. Existing episodes: open a drama in the admin and click **Move to Bunny**.

Viewers get a quality button in the player: **Auto**, **Saver** (max 480p, about a third of the data) and **HD**. Saver is picked automatically on 2G/3G or when the phone's data saver is on.

## Deploying to a server

See [deploy/DEPLOY.md](deploy/DEPLOY.md) (Docker, PostgreSQL, automatic HTTPS, backups).

## Project structure

```
messages/            en.json, my.json (UI translations)
prisma/              schema.prisma, seed.ts (demo data), init.ts (server: plans + admin)
deploy/              Caddyfile, backup script, deploy guide
src/app/(site)/      viewer pages: home, browse, drama, subscribe, account
src/app/watch/       full-screen player
src/app/admin/       admin dashboard
src/app/api/         video streaming, subtitles, uploads, processing jobs
src/lib/pipeline.ts  upload → split → subtitles pipeline
src/lib/ai/          transcription, translation, split-point logic
```

## Going to production

- Set a long random `AUTH_SECRET` and a strong `ADMIN_PASSWORD`
- Use Bunny Stream for video (above)
- Run the processing pipeline in a separate worker if uploads get heavy
