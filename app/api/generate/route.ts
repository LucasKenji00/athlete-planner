export const dynamic = 'force-dynamic'
export const maxDuration = 300

import { NextRequest } from 'next/server'
import { after } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { jsonrepair } from 'jsonrepair'
import {
  buildSkeletonPrompt,
  buildWeeksChunkPrompt,
  getPlanMeta,
  WEEKS_PER_CHUNK,
} from '@/lib/prompt'
import type { QuizSession, GeneratedPlan, TrainingWeek } from '@/types'
import { sendPlanEmail } from '@/lib/email'

const MODEL = 'claude-haiku-4-5-20251001'

const JSON_SYSTEM = `You are an assistant that ALWAYS responds with pure valid JSON.
Never include text before or after the JSON.
Never use markdown code blocks.
Only the raw JSON object, starting with { and ending with }.`

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------
function safeJsonParse<T>(raw: string): T {
  const cleaned = raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
  try {
    return JSON.parse(cleaned) as T
  } catch {
    // jsonrepair fixes truncation, trailing commas, unescaped chars, etc.
    return JSON.parse(jsonrepair(cleaned)) as T
  }
}

type ClaudeResult = { text: string; stopReason: string | null }

async function callClaude(
  anthropic: Anthropic,
  prompt: string,
  maxTokens: number,
  onDelta?: (totalText: string) => void
): Promise<ClaudeResult> {
  let text = ''
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: maxTokens,
    system: JSON_SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  })
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      text += event.delta.text
      onDelta?.(text)
    }
  }
  const final = await stream.finalMessage()
  return { text, stopReason: final.stop_reason }
}

/** Call Claude expecting JSON; retry once on parse failure or truncation. */
async function callClaudeJson<T>(
  anthropic: Anthropic,
  prompt: string,
  maxTokens: number,
  label: string,
  onDelta?: (totalText: string) => void
): Promise<T> {
  let lastRaw = ''
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { text, stopReason } = await callClaude(anthropic, prompt, maxTokens, onDelta)
    lastRaw = text
    if (stopReason === 'max_tokens') {
      console.error(`[generate] ${label}: hit max_tokens (attempt ${attempt})`)
      // jsonrepair can often close a truncated object — try before retrying
      try { return safeJsonParse<T>(text) } catch { continue }
    }
    try {
      return safeJsonParse<T>(text)
    } catch (err) {
      console.error(`[generate] ${label}: JSON parse failed (attempt ${attempt})`, err)
      console.error(`[generate] ${label}: first 500 chars:`, text.slice(0, 500))
    }
  }
  const error = new Error(`${label}: failed to produce valid JSON after 2 attempts`)
  ;(error as Error & { raw?: string }).raw = lastRaw
  throw error
}

async function fetchSession(supabase: SupabaseClient, sessionId: string) {
  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('*')
    .eq('id', sessionId)
    .single<QuizSession>()
  return error ? null : data
}

function buildPlanSummary(plan: GeneratedPlan, sheetsUrl: string | null) {
  return {
    sheetsUrl,
    planSummary: {
      sport:          plan.profile.sport,
      event_name:     plan.profile.event_name,
      weeks_total:    plan.profile.weeks_total,
      hours_per_week: plan.profile.hours_per_week_avg,
      phases:         plan.periodization.length,
      zones:          plan.zones,
      periodization:  plan.periodization,
      first_weeks:    plan.weeks.slice(0, 3),
      first_week:     plan.weeks[0], // backwards compat
      nutrition_plan: plan.nutrition_plan ?? null,
    },
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

type Skeleton = Omit<GeneratedPlan, 'weeks'>
type WeeksChunk = { weeks: TrainingWeek[] }

// ------------------------------------------------------------
// Route
// ------------------------------------------------------------
export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get('sessionId')

  if (!sessionId) {
    return new Response('sessionId is required', { status: 400 })
  }

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  }

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false
      const send = (event: string, data: object | string) => {
        if (closed) return
        const payload = typeof data === 'string' ? data : JSON.stringify(data)
        try {
          controller.enqueue(new TextEncoder().encode(`event: ${event}\ndata: ${payload}\n\n`))
        } catch { closed = true }
      }
      const close = () => { if (!closed) { closed = true; try { controller.close() } catch { /* already closed */ } } }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      try {
        send('progress', { step: 1, message: 'Analysing your profile...' })

        let session = await fetchSession(supabase, sessionId)
        if (!session) {
          send('error', { message: 'Session not found. Please try again.' })
          close()
          return
        }

        // ── Already done? Send the stored plan, never an error ──
        if (session.status === 'completed' && session.generated_plan) {
          send('complete', buildPlanSummary(session.generated_plan, session.sheets_url ?? null))
          close()
          return
        }

        // ── Payment race: Stripe redirect can beat the webhook.
        //    Poll up to ~40s while status is 'pending'. ──
        if (session.status === 'pending') {
          send('progress', { step: 1, message: 'Confirming your payment...' })
          for (let i = 0; i < 10 && session.status === 'pending'; i++) {
            await sleep(4000)
            session = await fetchSession(supabase, sessionId)
            if (!session) break
          }
          if (!session || session.status === 'pending') {
            send('error', {
              message: "We couldn't confirm your payment yet. If you completed checkout, wait a minute and refresh this page — your payment is safe.",
            })
            close()
            return
          }
        }

        // ── Another instance already generating? Attach instead of duplicating. ──
        if (session.status === 'generating') {
          send('progress', { step: 2, message: 'Your plan is being generated...' })
          for (let i = 0; i < 60; i++) {
            await sleep(5000)
            const s = await fetchSession(supabase, sessionId)
            if (s?.status === 'completed' && s.generated_plan) {
              send('complete', buildPlanSummary(s.generated_plan, s.sheets_url ?? null))
              close()
              return
            }
            if (s?.status === 'error') break
            send('progress', { step: 4, message: 'Writing sessions week by week...' })
          }
          send('error', { message: 'Generation is taking longer than expected. Please refresh this page — your payment is safe.' })
          close()
          return
        }

        if (session.status === 'error') {
          // Allow retry after a previous failure
          await supabase.from('quiz_sessions').update({ status: 'paid' }).eq('id', sessionId)
          session.status = 'paid'
        }

        if (session.status !== 'paid') {
          send('error', { message: 'Payment not yet confirmed.' })
          close()
          return
        }

        // ── Atomic claim: only ONE request transitions paid → generating ──
        const { data: claimed } = await supabase
          .from('quiz_sessions')
          .update({ status: 'generating' })
          .eq('id', sessionId)
          .eq('status', 'paid')
          .select('id')
        if (!claimed || claimed.length === 0) {
          // Someone else claimed it between our read and write — attach by polling
          for (let i = 0; i < 60; i++) {
            await sleep(5000)
            const s = await fetchSession(supabase, sessionId)
            if (s?.status === 'completed' && s.generated_plan) {
              send('complete', buildPlanSummary(s.generated_plan, s.sheets_url ?? null))
              close()
              return
            }
            send('progress', { step: 4, message: 'Writing sessions week by week...' })
          }
          send('error', { message: 'Generation is taking longer than expected. Please refresh this page.' })
          close()
          return
        }

        // ── TEST MODE — bypasses Claude and Apps Script ──
        if (process.env.TEST_MODE === 'true') {
          send('progress', { step: 2, message: 'Calculating your training zones...' })
          await sleep(600)
          send('progress', { step: 3, message: 'Building your season periodization...' })
          await sleep(600)
          send('progress', { step: 4, message: 'Writing sessions week by week... (12 weeks done)' })
          await sleep(600)
          send('progress', { step: 5, message: 'Finalising your plan...' })
          await sleep(400)

          await supabase
            .from('quiz_sessions')
            .update({ status: 'completed', sheets_url: null })
            .eq('id', sessionId)

          send('complete', {
            sheetsUrl: null,
            planSummary: {
              sport: session.sport,
              event_name: session.event_name || session.sport,
              weeks_total: 12,
              hours_per_week: '~8–10h',
              phases: 3,
              zones: {
                run:  { z1: '6:30–7:00/km', z2: '5:45–6:15/km', z3: '5:10–5:40/km', z4: '4:40–5:05/km', z5: '<4:40/km' },
                bike: { z1: '<150W', z2: '150–185W', z3: '185–220W', z4: '220–255W', z5: '>255W' },
                swim: { z1: '2:10+/100m', z2: '1:58–2:08/100m', z3: '1:48–1:58/100m', z4: '1:38–1:48/100m', z5: '<1:38/100m' },
                hr:   { z1: '<130bpm', z2: '130–142bpm', z3: '142–155bpm', z4: '155–168bpm', z5: '>168bpm' },
              },
              first_week: {
                week_num: 1, dates: '08/06–14/06/26', phase: 'F1', focus: 'Base Aerobic',
                total_hours: '~9h', is_recovery: false,
                sessions: [
                  { day: 'Monday', sport: 'Run', description: 'Easy Z2 run · 10min warm-up · 40min Z2 · 10min cool-down', duration: '~60min', distance: '9km', zone: 'Z2', objective: 'Aerobic base' },
                  { day: 'Wednesday', sport: 'Bike', description: 'Warm-up 15min Z1 · 3×15min Z2 · Cool-down 10min', duration: '~75min', distance: undefined, zone: 'Z1–Z2', objective: 'FTP foundation' },
                  { day: 'Saturday', sport: 'Long Run', description: 'Long easy run Z1–Z2 · 10min Z1 · 75min Z2 · 10min cool-down', duration: '~95min', distance: '14km', zone: 'Z1–Z2', objective: 'Aerobic endurance' },
                ],
              },
            },
          })
          close()
          return
        }

        // ── Real generation ──
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
        const meta = getPlanMeta(session)

        // Step 1: skeleton (zones, periodization, strength, race day, nutrition)
        send('progress', { step: 2, message: 'Calculating your training zones...' })
        const skeleton = await callClaudeJson<Skeleton>(
          anthropic,
          buildSkeletonPrompt(session),
          6000,
          'skeleton',
          text => {
            if (text.length % 800 < 80) {
              send('progress', { step: 3, message: 'Building your season periodization...' })
            }
          }
        )

        // Step 2: weeks, in parallel chunks
        const chunks: { from: number; to: number }[] = []
        for (let w = 1; w <= meta.weeksTotal; w += WEEKS_PER_CHUNK) {
          chunks.push({ from: w, to: Math.min(w + WEEKS_PER_CHUNK - 1, meta.weeksTotal) })
        }

        send('progress', { step: 4, message: `Writing sessions week by week... (0/${meta.weeksTotal} weeks)` })

        let weeksDone = 0
        const chunkResults = await Promise.all(
          chunks.map(async chunk => {
            const result = await callClaudeJson<WeeksChunk>(
              anthropic,
              buildWeeksChunkPrompt(
                session!,
                meta,
                { zones: skeleton.zones, periodization: skeleton.periodization },
                chunk.from,
                chunk.to
              ),
              8000,
              `weeks ${chunk.from}-${chunk.to}`
            )
            weeksDone += result.weeks?.length ?? 0
            send('progress', {
              step: 4,
              message: `Writing sessions week by week... (${Math.min(weeksDone, meta.weeksTotal)}/${meta.weeksTotal} weeks)`,
            })
            return result.weeks ?? []
          })
        )

        const weeks = chunkResults
          .flat()
          .filter(w => w && typeof w.week_num === 'number')
          .sort((a, b) => a.week_num - b.week_num)

        // Validate coverage
        const weekNums = new Set(weeks.map(w => w.week_num))
        const missing: number[] = []
        for (let w = 1; w <= meta.weeksTotal; w++) if (!weekNums.has(w)) missing.push(w)
        if (weeks.length === 0 || missing.length > meta.weeksTotal * 0.1) {
          throw new Error(`Plan incomplete — missing weeks: ${missing.join(', ')}`)
        }

        const plan: GeneratedPlan = { ...skeleton, weeks }

        send('progress', { step: 5, message: 'Finalising your plan...' })

        // Plan is ready → user can see the preview NOW.
        await supabase
          .from('quiz_sessions')
          .update({ status: 'completed', generated_plan: plan })
          .eq('id', sessionId)

        send('complete', buildPlanSummary(plan, null))
        close()

        // ── Delivery email goes out in the BACKGROUND via Resend ──
        // The plan itself is already live at /plan/{sessionId}.
        const email = session.email!
        const name = session.name
        const nutritionUpsell = session.nutrition_upsell
        const origin = req.nextUrl.origin
        after(async () => {
          try {
            await sendPlanEmail({
              to: email,
              athleteName: name,
              plan,
              planUrl: `${origin}/plan/${sessionId}`,
              icsUrl: `${origin}/api/plan/${sessionId}/ics`,
              nutritionUpsell,
            })
          } catch (err) {
            console.error('[generate] Delivery email failed:', err)
            // Plan stays 'completed' — the user already has the preview
            // and the plan page link; only the email needs re-sending.
          }
        })
      } catch (err) {
        console.error('Error in /api/generate:', err)
        const raw = (err as Error & { raw?: string }).raw
        if (raw) console.error('[generate] Raw model output (first 2000 chars):', raw.slice(0, 2000))

        await supabase
          .from('quiz_sessions')
          .update({ status: 'error' })
          .eq('id', sessionId)

        send('error', {
          message: 'An unexpected error occurred while generating your plan. Please refresh this page to retry — your payment is safe.',
        })
        close()
      }
    },
  })

  return new Response(stream, { headers })
}

