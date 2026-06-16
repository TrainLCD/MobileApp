# TrainLCD Worker (Cloudflare)

The Cloudflare Worker that powers the TrainLCD backend. It replaces the former
Firebase Cloud Functions, consolidating the HTTP, queue, and Cron handlers into a
single Worker.

## Features

- **TTS synthesis** (`POST /tts`): synthesizes SSML into audio via Azure Speech and caches it in KV/R2.
- **Session issuance** (`POST /auth/token`): issues a short-lived session JWT from an install ID (the replacement for Firebase anonymous auth).
- **Feedback intake** (`POST /postFeedback`): enqueues feedback onto the triage queue.
- **Image upload** (`POST /feedback/upload-image`): stores feedback images in R2 and returns a public URL.
- **App config delivery** (`GET /config/maintenance`, `GET /config/remote`): maintenance status and GPS thresholds (the replacement for Remote Config).
- **Feedback triage** (queue `feedback-triage`): summarizes and classifies feedback with Workers AI, then creates a GitHub Issue and notifies Discord.
- **TTS cache writes**: synthesized audio is written directly from the `/tts` handler to R2 + KV (no queue is used, because audio does not fit within the 128 KB Queues limit).
- **Review notifications** (Cron, hourly): notifies Discord of new App Store / Google Play reviews.

## Tech stack

- **Cloudflare Workers** — `fetch` / `queue` / `scheduled` handlers
- **Workers KV** — TTS cache metadata, config, and review read-state
- **R2** — audio binaries and feedback images
- **Cloudflare Queues** — `feedback-triage`
- **Workers AI** — feedback triage
- **Azure Speech** — TTS synthesis (SSML)
- **Google Android Publisher API** — Google Play review retrieval (service-account JWT)
- **TypeScript / Biome / Jest / Wrangler**

## Prerequisites

- Node.js 22.x / npm
- Wrangler (installed as a devDependency via `npm install`)
- A Cloudflare account (with KV/R2/Queues/Workers AI enabled)

## Setup

```bash
cd functions
npm install
```

### Creating bindings

Replace the `id` / `bucket_name` placeholders in `wrangler.jsonc` with the real
values issued by the commands below (for both dev and prod).

```bash
# KV
wrangler kv namespace create TTS_KV
wrangler kv namespace create CONFIG_KV
wrangler kv namespace create STATE_KV
# R2
wrangler r2 bucket create trainlcd-tts-dev
wrangler r2 bucket create trainlcd-uploads-dev
# Queues
wrangler queues create feedback-triage-dev
```

### Setting secrets

```bash
wrangler secret put SESSION_JWT_SECRET          # signing key for session JWTs (any long random string)
wrangler secret put AZURE_SPEECH_KEY            # Azure Speech subscription key
wrangler secret put GOOGLE_SA_KEY              # Android Publisher SA key JSON (single-line string)
wrangler secret put OCTOKIT_PAT
wrangler secret put DISCORD_CS_WEBHOOK_URL
wrangler secret put DISCORD_CRASH_WEBHOOK_URL
wrangler secret put DISCORD_REVIEW_WEBHOOK_URL
```

For local development, put the same keys in `.dev.vars` (gitignored).

You can also bulk-load secrets with the helper scripts: copy
`.secrets.env.example` to `.secrets.env`, fill in the values, then run
`./scripts/put-secrets.sh` (or `./scripts/put-secrets.ps1` on Windows).

### Non-secret configuration (vars)

See `vars` in `wrangler.jsonc`. Configure the Azure region, voice names, AI model
name, package name, public upload URL (the R2 public domain), and so on per
environment.

## Develop & deploy

```bash
npm run dev            # wrangler dev (local)
npm run typecheck      # tsc --noEmit
npm run lint           # biome check
npm test               # jest (pure functions)
npm run deploy:dev     # wrangler deploy (dev)
npm run deploy:prod    # wrangler deploy --env production
npm run tail           # follow logs
```

## Client wire protocol

`POST /tts` and `POST /postFeedback` keep the Firebase callable-compatible wire
format.

- Request: `{ "data": { ... } }` with `Authorization: Bearer <session JWT>`
- Success: `{ "result": { ... } }`
- Failure: an HTTP status plus `{ "error": { "message", "status" } }`

A session JWT is obtained from `POST /auth/token` (body `{ "installId": "<uuid>" }`).

## Testing strategy

Unit tests cover pure functions (SSML formatting, voice-name resolution, triage
JSON normalization, review parsing) with Jest. Runtime integration for HTTP /
queue / Cron is verified with `wrangler dev` / `wrangler dev --test-scheduled`.

## few-shot data

Feedback triage reads `config:fewshot` (`FEW_SHOT_KV_KEY`) from `CONFIG_KV`.
The few-shot data is unrelated to TTS, so it lives in the config KV (the same
namespace as `config:maintenance` / `config:remote`). The format is JSONL, one
example per line (see `fewshot.example.jsonl`):

```json
{"input": "user body text", "output": "{\"title\":...,\"isSpam\":false,...}"}
```

Upload (the file is stored verbatim as a single KV value):

```bash
# dev (without --local it writes to the production KV)
wrangler kv key put --binding CONFIG_KV "config:fewshot" --path fewshot.jsonl
# prod
wrangler kv key put --binding CONFIG_KV "config:fewshot" --path fewshot.jsonl --env production
```

If it is not present, triage fails hard with `FEW_SHOT_NOT_AVAILABLE` (a
fail-hard guard that prevents mis-training).

## Maintenance CLI

Maintenance tools that operate directly on KV (TTS_KV) and R2 (the audio bucket).
They use the Cloudflare REST API (KV) and the S3-compatible API (R2). Connection
details are passed via environment variables:

```bash
export CF_ACCOUNT_ID=...          # Cloudflare account ID
export CF_API_TOKEN=...           # API token with KV read/write permission
export CF_KV_NAMESPACE_ID=...     # TTS_KV namespace ID for the target environment
export R2_ACCESS_KEY_ID=...       # R2 S3 access key
export R2_SECRET_ACCESS_KEY=...
export R2_BUCKET=trainlcd-tts-dev # audio bucket name for the target environment

# Search the TTS cache by SSML body (delete if needed)
npm run find-tts-cache -- "東京" --field ssmlJa
npm run find-tts-cache -- "東京" --delete

# Detect orphaned audio that exists in R2 but has no KV metadata (delete if needed)
npm run find-orphaned-tts
npm run find-orphaned-tts -- --delete
```
