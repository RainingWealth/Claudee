# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

**AI Agency Platform** — An internal web app for AI agencies with two core modules:

1. **WhatsApp CRM** — CRM-like interface for managing leads sourced from Meta Ads. Supports automated messaging via UltraMSG, per-contact bot toggle, configurable re-engagement scheduling, and conversation history.
2. **Voice AI Agent** — Outbound calling campaigns powered by Retell AI. Upload phone lists, configure operating hours and max concurrent calls, monitor live calls, and review call recordings/transcripts.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL + Realtime + Auth) |
| WhatsApp | UltraMSG REST API |
| Voice AI | Retell AI REST API |
| Meta Ads | Meta Lead Ads Webhook + Graph API |
| Background Jobs | Netlify Scheduled Functions |
| Deployment | Netlify |

## Development Setup

### Prerequisites

- Node.js 18+
- A Supabase project (free tier is fine)
- UltraMSG account with WhatsApp instance
- Retell AI account with agent configured
- Meta App with Lead Ads webhook (optional)

### Install Dependencies

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Key variables:
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase project settings
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase project settings (keep secret)
- `ULTRAMSG_INSTANCE_ID` + `ULTRAMSG_TOKEN` — from UltraMSG dashboard
- `RETELL_API_KEY` — from Retell AI dashboard
- `RETELL_FROM_NUMBER` — your Retell phone number in E.164 format (e.g. `+15551234567`)
- `META_VERIFY_TOKEN` — any random string; use same value in Meta App Dashboard
- `CRON_SECRET` — random secret to protect `/api/scheduled/*` endpoints

### Database Setup

Run the SQL migration in your Supabase project:

1. Go to Supabase Dashboard → SQL Editor → New Query
2. Paste and run the contents of `supabase/migrations.sql`

### Webhook Setup

**UltraMSG:** Set webhook URL in UltraMSG dashboard → Instance → Webhooks:
```
https://your-app.netlify.app/api/webhooks/ultramsg
```

**Retell AI:** Set webhook URL in Retell dashboard:
```
https://your-app.netlify.app/api/webhooks/retell
```

**Meta Lead Ads:** Set webhook in Meta App Dashboard → Webhooks → leadgen subscription:
```
https://your-app.netlify.app/api/webhooks/meta-leads
```

### Run Development Server

```bash
npm run dev
```

### Build

```bash
npm run build
```

### TypeScript Check

```bash
npx tsc --noEmit
```

## Project Structure

```
.
├── app/
│   ├── (auth)/login/           # Login page
│   ├── (dashboard)/            # Authenticated pages
│   │   ├── layout.tsx          # Sidebar layout
│   │   ├── page.tsx            # Main dashboard
│   │   ├── whatsapp/           # WhatsApp CRM pages
│   │   ├── voice/              # Voice campaign pages
│   │   └── analytics/          # Analytics page
│   └── api/
│       ├── webhooks/           # UltraMSG, Retell, Meta webhooks
│       ├── whatsapp/           # WhatsApp CRM API routes
│       ├── voice/              # Voice campaign API routes
│       ├── analytics/          # Analytics API route
│       ├── settings/           # App settings API
│       └── scheduled/          # Re-engagement + voice-runner cron endpoints
├── components/
│   ├── whatsapp/               # WhatsApp CRM UI components
│   ├── voice/                  # Voice campaign UI components
│   ├── dashboard/              # Dashboard charts + stats
│   └── shared/                 # Sidebar, notification bell
├── lib/
│   ├── supabase/               # Supabase client (browser + server)
│   ├── ultramsg.ts             # UltraMSG API wrapper
│   ├── retell.ts               # Retell AI API wrapper
│   ├── meta-api.ts             # Meta Graph API helper
│   └── jobs/                   # Re-engagement + voice campaign job logic
├── netlify/functions/          # Netlify Scheduled Functions
├── types/index.ts              # TypeScript types
├── supabase/migrations.sql     # Database schema
├── proxy.ts                    # Auth proxy (Next.js 16)
├── netlify.toml                # Netlify build + scheduled function config
└── .env.example                # Environment variable template
```

## Architecture & Key Conventions

- **Supabase Realtime** is used for live updates (new messages, call status, notifications) — no Socket.io needed
- **Bot toggle** per contact: when `bot_enabled = false`, no automated messages are sent; human takes over
- **Re-engagement logic**: runs every 30 min via Netlify Scheduled Function; sends messages to contacts whose `next_engagement_at` has passed and `bot_enabled = true`
- **Voice campaign runner**: runs every 1 min; dials pending leads within operating hours up to `max_concurrent_calls`
- **DNC list**: contacts matching entries in `do_not_contact` are skipped by both WhatsApp bot and voice dialer; opt-out keywords auto-add to DNC

## Notes for Claude

- Always run `npx tsc --noEmit` before committing
- Always run `npm run build` before pushing
- Keep commits focused and atomic
- The `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — only use in server-side API routes, never expose to client
- Webhook endpoints in `/api/webhooks/*` are intentionally unauthenticated (verified by signature/token)
- The `/api/scheduled/*` endpoints are protected by `CRON_SECRET` header
