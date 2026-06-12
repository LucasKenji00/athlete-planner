# Athlete Planner — v2: Web Delivery (Goodbye Apps Script) 🎉

## What changed — the new flow
**Before:** payment → generate → Apps Script creates Google Sheet (slow, fragile) → Gmail sends email
**Now:** payment → generate → plan lives at **`/plan/{sessionId}`** → **Resend** emails the link + calendar file

Apps Script, Google Drive, Script Properties and Gmail are OUT of the critical path.
One system (Next.js + Vercel + Supabase), one deploy, one place for logs.

## New files
| File | Purpose |
|---|---|
| `app/plan/[sessionId]/page.tsx` | **The deliverable.** Permanent plan page: hero with days-to-race countdown, season timeline, zones, ALL weeks (accordion), strength program, race day plan, nutrition (upsell), "Add to calendar" button |
| `lib/ics.ts` | iCalendar generator — every session becomes a calendar event on the right date (timed if the session has a time, all-day otherwise) + a 🏁 race-day event |
| `app/api/plan/[sessionId]/ics/route.ts` | Downloads the .ics file |
| `lib/email.ts` | Resend delivery + branded HTML template (your colors, plan link, calendar link, nutrition section for upsell buyers) |

## Modified files
| File | Change |
|---|---|
| `app/api/generate/route.ts` | Background job now sends the Resend email instead of calling Apps Script. `writeToSheets` removed entirely |
| `app/preview/[sessionId]/page.tsx` | Sheets spinner/polling removed — direct "Open My Full Plan →" button to `/plan/{id}` |
| `app/api/session/[sessionId]/route.ts` | Stops exposing the user's email; exposes `plan_start` (needed by the calendar) |
| `package.json` | + `resend` |

## Setup — Resend (10 minutes, once)
1. Create a free account at **resend.com** (3,000 emails/month free)
2. **API Keys → Create API Key** → copy it
3. Vercel → Environment Variables → add:
   - `RESEND_API_KEY` = the key
   - `EMAIL_FROM` = `Athlete Planner <onboarding@resend.dev>` ← works immediately (you can't send FROM a @gmail.com address — SPF/DKIM can't be verified for Google's domain)
   - `EMAIL_REPLY_TO` = `athleteplanner.app@gmail.com` ← when customers hit Reply, it lands in your Gmail
4. **Later, when you buy a domain** (~€10/year, e.g. athleteplanner.app): Resend → **Domains → Add Domain** → add the DNS records (SPF + DKIM) → change `EMAIL_FROM` to `Athlete Planner <plans@yourdomain.com>`. Big deliverability + trust upgrade, worth doing before scaling ads.
5. Redeploy on Vercel

## Test without paying again
Your real purchase is already `completed` in Supabase. After deploying:
- Open `https://your-domain/plan/<sessionId-of-your-purchase>` → full plan should render
- Click "Add all sessions to my calendar" → .ics downloads → open it → sessions on the right days (Mondays start)
- For the email: easiest is one more test purchase + refund, OR temporarily hit the generate endpoint logic — ask Claude to write a tiny `/api/admin/resend-email` route if you want re-send capability (recommended for support anyway)

## Cleanup (after confirming everything works)
- Delete Vercel env vars: `APPS_SCRIPT_URL`, `APPS_SCRIPT_SECRET`
- Archive the Apps Script project (or keep it dormant — it's no longer called)
- `git rm scripts/apps-script.gs` if you want the repo clean (optional)
- The `sheets_url` column in Supabase becomes unused (harmless to keep)

## Ideas for v2.1 (later)
- PDF export button on the plan page (`@react-pdf/renderer`)
- "Mark session as done" checkboxes on the plan page (replaces the Sheets Weekly Log)
- Resend webhook to track email opens
