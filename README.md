# VoiceVerify — Voice Verification Platform

A Next.js 14 full-stack POC for outbound voice verification campaigns. Admins upload phone numbers, trigger automated calls via Exotel or Vobiz, and review voice responses — with optional Sarvam AI transcription.

## Requirements

- Node.js 18+
- MongoDB (local or Atlas)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
# Edit .env.local — set MONGODB_URI, telephony credentials, Sarvam key
```

### 3. Expose local server to internet (required for telephony webhooks)

Exotel and Vobiz need to POST back to your server. Use ngrok in local dev:

```bash
npx ngrok http 3000
# Copy the https://xxxxx.ngrok.io URL
# Set WEBHOOK_BASE_URL and NEXT_PUBLIC_BASE_URL in .env.local
```

### 4. Start dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to the dashboard.

---

## Usage

1. **Campaigns → New Campaign**: enter name, question (spoken via TTS), paste phone numbers (one per line or `phone,name` CSV)
2. **Campaign detail**: click **Start Calling** to trigger outbound calls to all contacts
3. **Results**: live-updating call results — audio playback, transcript, intent badge, and manual intent buttons

---

## Feature Toggles (Top Bar)

**Provider toggle (Exotel / Vobiz):** Switches the active telephony provider. Persisted in MongoDB.

**Auto Transcribe (STT):**
- **ON** — Sarvam AI transcribes each recording after the call completes; intent extracted via keyword matching (YES/NO/UNCLEAR)
- **OFF** — Play recordings manually via the audio player; click YES / NO / UNCLEAR to set intent

Manual intent buttons appear on every call card regardless of STT state (use them to correct wrong auto-intent).

---

## Architecture

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router |
| Language | TypeScript |
| Database | MongoDB (native driver) — async, no schema setup |
| IDs | MongoDB ObjectId (hex strings in API responses) |
| Telephony | Exotel or Vobiz (switchable via UI) |
| STT | Sarvam AI `saarika:v2` model |
| Polling | SWR — Results page polls `/api/calls` every 5s |

**Recording proxy:** Exotel recordings require Basic Auth — served through `/api/calls/:id/recording-proxy`. Vobiz recordings are direct public URLs.

**Webhooks:** Same Next.js server handles provider callbacks at `/api/webhook/{provider}/...`. These must be reachable from the internet (use ngrok for local dev).

---

## Exotel Trial Note

Trial accounts can only call verified numbers. Register all test phone numbers as verified callers in the Exotel dashboard before triggering calls.

---

## Project Structure

```
app/
  api/             — Route handlers (settings, campaigns, calls, webhooks)
  dashboard/       — Stats overview
  campaigns/       — Campaign list, create, detail + trigger
  results/         — Live call results with SWR polling
components/
  layout/          — Sidebar, TopBar
  settings/        — ProviderToggle, STTToggle
  dashboard/       — StatsGrid, RecentCallsTable
  campaigns/       — CampaignCard, CreateCampaignForm, NumbersUploader
  results/         — CallCard, AudioPlayer, IntentBadge, ManualIntentButtons
lib/
  db.ts            — MongoDB singleton + all async query functions
  types.ts         — Shared TypeScript interfaces
  providers/       — Exotel + Vobiz outbound call implementations
  services/        — STT pipeline (Sarvam AI) + intent extraction
```
