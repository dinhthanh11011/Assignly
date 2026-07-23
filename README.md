# Assignly — Shared Daily Task Manager

A fullstack PWA for planning, sharing and rotating daily tasks across a group.
Log in with Google, create groups, add recurring or one-off tasks, pre-assign or
randomly assign people, and get push reminders when a due task has nobody on it.

Built with **Next.js 16 (App Router)**, **PostgreSQL + Prisma**, **Auth.js (Google
OAuth)**, **Tailwind CSS v4** with a shadcn-style component set, **web-push**, and
an installable **service worker PWA**.

## Features

- 🔐 **Google sign-in** (Auth.js / NextAuth v5, JWT sessions)
- 👥 **Groups** — create, share via invite code/link, join, roles (owner/admin/member)
- 🔁 **Recurring & scheduled tasks** — daily/weekly/monthly (RRULE) or specific dates
- 🎯 **Flexible pre-assignment** — assign the whole task, or per weekday / date / week
  (most specific rule wins)
- 🎲 **Random assignment** — load-balanced across group members, per-task or per-day
- 🔔 **Reminders** — when a task's day arrives unassigned, every group member is
  notified (web-push + in-app) to assign it
- 📊 **Reports** — completion rate, status breakdown, per-member load (Recharts)
- 📱 **Installable PWA** with offline shell and web-push notifications
- 🎨 Vibrant, responsive UI with light/dark themes

## Getting started

### 1. Prerequisites
- Node 20+
- Docker (for local Postgres) or any Postgres instance

### 2. Install & configure
```bash
npm install
cp .env.example .env
```
Fill in `.env`:
- `AUTH_SECRET` — `openssl rand -base64 32`
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — from the
  [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
  Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
- VAPID keys — `npx web-push generate-vapid-keys` → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
  and `VAPID_PRIVATE_KEY`
- `CRON_SECRET` — any random string

### 3. Database
```bash
docker compose up -d        # starts Postgres on :5432
npm run db:migrate          # apply migrations + generate client
```

### 4. Run
```bash
npm run dev                 # http://localhost:3000
npm run cron:dev            # (optional, separate terminal) poll the reminder job locally
```

## How reminders run

The reminder logic lives in `src/lib/reminders.ts` and is exposed at
`GET/POST /api/cron/check-reminders` (protected by `CRON_SECRET` via a
`Bearer` header or `?secret=`).

- **Production (Vercel):** `vercel.json` registers a daily cron that calls the
  endpoint. Set `CRON_SECRET` in the project env and Vercel sends it automatically.
- **Local / self-hosted:** run `npm run cron:dev` (polls every minute) or wire the
  endpoint into any external scheduler / OS cron.

## Verifying the core logic

An end-to-end check of occurrence generation, pre-assignment rules, random
assignment, the reminder sweep, and reports (no browser/OAuth needed):

```bash
npx tsx --env-file=.env scripts/verify.ts
```

## Project structure

```
prisma/schema.prisma          Data model (Auth.js + groups/tasks/occurrences/rules/push)
src/lib/
  auth.ts                     Auth.js config
  db.ts                       Prisma singleton
  occurrences.ts              RRULE → TaskOccurrence generation + rule resolution
  assignment.ts               Load-balanced random assignment
  reminders.ts                Reminder sweep (unassigned-due → notify group)
  push.ts                     web-push (VAPID) + in-app notification helper
  queries.ts                  Read models (dashboard, group, task, report)
  actions.ts                  Server actions (mutations)
src/app/
  (app)/                      Authenticated shell: dashboard, groups, tasks, reports, settings
  signin/, join/[code]/       Public sign-in & invite landing
  api/auth, api/push, api/cron Route handlers
src/components/                UI primitives (ui/) + feature components
public/sw.js, manifest.webmanifest, icons/   PWA assets
```

## Data model highlights

Tasks are expanded into **`TaskOccurrence`** rows (one per due day, rolling 60-day
horizon) — the single source of truth that drives assignment, reminders, and
reports. `AssignmentRule`s (whole-task / weekday / date / week) are applied at
generation time, most-specific first.

## Deploy (Vercel)

1. Push to a Git repo and import into Vercel.
2. Add a Postgres database (Neon, Supabase, Vercel Postgres) and set `DATABASE_URL`.
3. Set all `.env` variables in the Vercel project (use the production app URL for
   `NEXT_PUBLIC_APP_URL` and the Google redirect URI).
4. `prisma migrate deploy` runs via the build; the daily cron is already configured
   in `vercel.json`.
```bash
# add to package.json "build" for Vercel if you want auto-migrations:
# "build": "prisma migrate deploy && next build"
```
