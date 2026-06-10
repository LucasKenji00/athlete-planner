export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { buildPrompt } from '@/lib/prompt'
import type { QuizSession, GeneratedPlan } from '@/types'


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
      const send = (event: string, data: object | string) => {
        const payload = typeof data === 'string' ? data : JSON.stringify(data)
        controller.enqueue(
          new TextEncoder().encode(`event: ${event}\ndata: ${payload}\n\n`)
        )
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      try {
        send('progress', { step: 1, message: 'Analysing your profile...' })

        const { data: session, error } = await supabase
          .from('quiz_sessions')
          .select('*')
          .eq('id', sessionId)
          .single<QuizSession>()

        if (error || !session) {
          send('error', { message: 'Session not found. Please try again.' })
          controller.close()
          return
        }

        if (session.status !== 'paid' && session.status !== 'generating') {
          send('error', { message: 'Payment not yet confirmed.' })
          controller.close()
          return
        }

        await supabase
          .from('quiz_sessions')
          .update({ status: 'generating' })
          .eq('id', sessionId)

        // TEST MODE — bypasses Claude and Apps Script
        if (process.env.TEST_MODE === 'true') {
          send('progress', { step: 2, message: 'Calculating your training zones...' })
          await new Promise(r => setTimeout(r, 600))
          send('progress', { step: 3, message: 'Building your season periodization...' })
          await new Promise(r => setTimeout(r, 600))
          send('progress', { step: 4, message: 'Writing sessions week by week... (12 weeks done)' })
          await new Promise(r => setTimeout(r, 600))
          send('progress', { step: 5, message: 'Finalising your plan...' })
          await new Promise(r => setTimeout(r, 400))

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

          controller.close()
          return
        }

        send('progress', { step: 2, message: 'Calculating your training zones...' })

        const prompt = buildPrompt(session)

        send('progress', { step: 3, message: 'Building your season periodization...' })

        let fullJson = ''

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
        const claudeStream = anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 16000,
          system: `You are an assistant that ALWAYS responds with pure valid JSON.
Never include text before or after the JSON.
Never use markdown code blocks.
Only the raw JSON object, starting with { and ending with }.`,
          messages: [{ role: 'user', content: prompt }],
        })

        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            fullJson += event.delta.text

            if (fullJson.length % 500 < event.delta.text.length + 10) {
              const weeksFound = (fullJson.match(/"week_num"/g) || []).length
              send('progress', {
                step: 4,
                message: `Writing sessions week by week... (${weeksFound} weeks done)`,
                tokens: fullJson.length,
              })
            }
          }

          if (event.type === 'message_stop') {
            send('progress', { step: 5, message: 'Finalising your plan...' })
          }
        }

        let plan: GeneratedPlan
        try {
          const cleaned = fullJson.trim().replace(/^```json\n?/, '').replace(/\n?```$/, '')
          plan = JSON.parse(cleaned)
        } catch (parseError) {
          console.error('JSON parse error:', parseError)
          console.error('First 500 chars:', fullJson.slice(0, 500))
          send('error', { message: 'Internal error processing your plan. Our team has been notified.' })
          controller.close()
          return
        }

        if (!plan.weeks || plan.weeks.length === 0) {
          send('error', { message: 'The generated plan is incomplete. Please try again.' })
          controller.close()
          return
        }

        await supabase
          .from('quiz_sessions')
          .update({ generated_plan: plan })
          .eq('id', sessionId)

        send('progress', { step: 5, message: 'Creating your Google Sheets spreadsheet...' })

        // Keep SSE alive while Apps Script runs (can take 30-60s)
        const heartbeat = setInterval(() => {
          try { send('progress', { step: 5, message: 'Creating your Google Sheets spreadsheet...' }) }
          catch { /* connection already closed */ }
        }, 10000)

        let sheetsUrl: string
        try {
          sheetsUrl = await writeToSheets(sessionId, session.email!, plan, (session as any).name, session.nutrition_upsell, session.plan_start)
        } finally {
          clearInterval(heartbeat)
        }

        await supabase
          .from('quiz_sessions')
          .update({ status: 'completed', sheets_url: sheetsUrl })
          .eq('id', sessionId)

        send('complete', {
          sheetsUrl,
          planSummary: {
            sport:         plan.profile.sport,
            event_name:    plan.profile.event_name,
            weeks_total:   plan.profile.weeks_total,
            hours_per_week: plan.profile.hours_per_week_avg,
            phases:        plan.periodization.length,
            zones:         plan.zones,
            first_week:    plan.weeks[0],
          },
        })

        controller.close()

      } catch (err) {
        console.error('Error in /api/generate:', err)

        await supabase
          .from('quiz_sessions')
          .update({ status: 'error' })
          .eq('id', sessionId)

        send('error', {
          message: 'An unexpected error occurred. Contact support — your payment is safe.',
        })
        controller.close()
      }
    },
  })

  return new Response(stream, { headers })
}

async function writeToSheets(
  sessionId: string,
  email: string,
  plan: GeneratedPlan,
  athleteName?: string,
  nutritionUpsell?: boolean,
  planStart?: string
): Promise<string> {
  const response = await fetch(process.env.APPS_SCRIPT_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      secret:           process.env.APPS_SCRIPT_SECRET!,
      session_id:       sessionId,
      email,
      athlete_name:     athleteName || plan.profile.name || '',
      nutrition_upsell: nutritionUpsell ?? false,
      plan_start:       planStart ?? 'next_week',
      plan,
    }),
  })

  if (!response.ok) throw new Error(`Apps Script returned ${response.status}`)

  const result = await response.json()
  if (!result.success) throw new Error(result.error || 'Apps Script failed')

  return result.sheetsUrl
}
