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
- Whole site switches between English and Burmese

**Admin (`/admin`)**
- Create and edit dramas (English + Burmese title and story, genre, free episode count, poster)
- Upload a long video and choose how many episodes; or upload single episodes
- Processing pipeline: extract audio → transcribe English → translate to Burmese → detect scene changes → cut at natural pauses → encode episodes
- Review episodes before they go live, preview them, and edit subtitles line by line
- Dashboard with revenue, active passes, users and views

## Tech

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · next-intl · Prisma (SQLite locally) · ffmpeg (bundled via `ffmpeg-static`) · framer-motion

## Getting started

Requires Node.js 20+.

```bash
npm install
cp .env.example .env      # on Windows: copy .env.example .env
npm run setup             # creates the database and demo data (takes a few minutes the first time)
npm run dev
```

Open http://localhost:3000

- Admin: `admin@zat.local` / `admin1234` → http://localhost:3000/admin
- Viewer: `viewer@zat.local` / `viewer1234`

`npm run setup` also creates `demo-long-video.mp4` in the project folder. Upload it in the admin dashboard with "Long video → split into episodes" to try the auto-split.

## Burmese translation of the site

UI text lives in `messages/en.json`. `messages/my.json` has the same keys with empty values: fill them in, and any key left empty falls back to English.

## Mocked services (switch on with real keys in `.env`)

| Service | Now | To go live |
|---|---|---|
| Speech-to-text | Mock English dialogue | Set `OPENAI_API_KEY` (Whisper) |
| Translation | Mock Burmese lines | `TRANSLATION_PROVIDER=openai` or `gemini` with its key |
| Payments | Instant fake payment | Implement Dinger / 2C2P in `src/lib/payments.ts` |
| Video storage | Local `./storage` folder | Bunny Stream / S3 in `src/lib/storage.ts` |
| Banner ads | Placeholder | Set `NEXT_PUBLIC_ADSENSE_CLIENT` |
| Video ads | Simulated pre-roll | Google IMA SDK in `src/components/player/preroll-ad.tsx` |

## Project structure

```
messages/            en.json, my.json (UI translations)
prisma/              schema.prisma, seed.ts
src/app/(site)/      viewer pages: home, browse, drama, subscribe, account
src/app/watch/       full-screen player
src/app/admin/       admin dashboard
src/app/api/         video streaming, subtitles, uploads, processing jobs
src/lib/pipeline.ts  upload → split → subtitles pipeline
src/lib/ai/          transcription, translation, split-point logic
```

## Going to production

- Change `prisma/schema.prisma` provider to `postgresql` and set `DATABASE_URL`
- Set a long random `AUTH_SECRET`
- Move video storage to Bunny Stream (or S3 + CDN) and serve signed URLs
- Run the processing pipeline in a separate worker if uploads get heavy
