# Athlete Planner — Fix Pack (11 Jun 2026)

## Files changed
| File | What changed |
|---|---|
| `lib/prompt.ts` | Rewritten: chunked generation (skeleton + week chunks), 100% English, exact zone formulas, sport-specific blocks for ALL 9 sports, race_day_plan, deterministic recovery/taper weeks, Monday-based dates, 52-week cap |
| `app/api/generate/route.ts` | Rewritten: `maxDuration=300`, payment-race polling (no more "Payment not confirmed" after paying), atomic paid→generating claim (no duplicate generations), revisit after completion returns the plan instead of an error, parallel chunk generation (~3-4× faster, no more truncated JSON on long plans), `stop_reason` check + `jsonrepair` + 1 retry per call, raw output logged on failure, honest error copy, **Sheets + email now run in background after the user already sees the preview** |
| `app/api/quiz/route.ts` | Server-side validation: email format, name, sport/level whitelist, days, weight range, event date must be future & ≤2 years |
| `app/api/checkout/route.ts` | Pre-fills `customer_email` in Stripe, `client_reference_id`, blocks checkout for already-paid sessions |
| `app/preview/[sessionId]/page.tsx` | Polls for `sheets_url` (spinner → button when ready), shows first 3 weeks (accordion), periodization timeline, personalised nutrition section for upsell buyers |
| `app/loading/[sessionId]/page.tsx` | Fallback poll now stores the richer plan summary |
| `scripts/apps-script.gs` | Monday-based weeks (was Sunday — dates were off by 1 day vs the prompt), secrets moved to **Script Properties**, new **Race Day** tab, new **Nutrition** tab (upsell buyers finally see their personalised plan), personal email removed |
| `package.json` | + `jsonrepair` |
| `.gitignore` | + `.claude-flow/`, `*.bak` |

## Deploy checklist — DO THESE IN ORDER
1. `npm install` (new dependency: jsonrepair)
2. **ROTATE the Apps Script secret** — the old one (`secret-app-script-...2026`) is public on GitHub. Generate a new random string.
3. In script.google.com → Project Settings → **Script Properties**, add:
   - `SECRET` = the new secret
   - `FOLDER_ID` = your Drive folder id
   - `NUTRITION_PDF_URL` = **re-upload the nutrition PDF as a NEW file** (the old link is public in the repo — anyone can download your paid product) and paste the new link
4. Paste the new `apps-script.gs` into the editor and **Deploy → New deployment** (the URL may change → update `APPS_SCRIPT_URL` on Vercel if so)
5. On Vercel, update `APPS_SCRIPT_SECRET` to the new secret
6. `git rm -r --cached .claude-flow` then commit (removes local session files from the repo)
7. Deploy and run one full test purchase (Stripe test mode) — verify: preview appears right after generation, Sheets button appears ~30-60s later, email arrives, dates start on a Monday
8. **Strongly consider making the repo private** — it's a commercial product

## Still open (your decisions, not code)
- **Claude logo**: using Anthropic's logo as your product mark likely violates brand guidelines — check anthropic.com brand policy; "Powered by Claude" text is the safe form
- **"Added by 68% of athletes" + "€29+" strikethrough** on the upsell page: under EU/Spanish law these must be TRUE (Omnibus Directive — reference price = lowest of last 30 days). Same for countdown scarcity. Fineable if invented.
- Optional: add a Supabase `last_error text` column and write raw model output there instead of only console (easy debugging win)
- Optional: rate limiting on /api/quiz (Vercel Firewall or Upstash) if spam appears
