export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { QuizData } from '@/types'

const SPORTS = ['Running', 'Trail Running', 'Cycling', 'Gravel/MTB', 'Swimming', 'Open Water Swimming', 'Triathlon', 'Duathlon', 'Gym']
const LEVELS = ['Beginner', 'Intermediate', 'Advanced']
const isValidEmail = (v: unknown): v is string =>
  typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let body: QuizData & { email: string; secondary_sports?: string[]; injuries?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // ── Server-side validation (never trust the client) ──
  if (!isValidEmail(body.email)) {
    return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
  }
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0 || body.name.length > 100) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!SPORTS.includes(body.sport)) {
    return NextResponse.json({ error: 'Invalid sport' }, { status: 400 })
  }
  if (!LEVELS.includes(body.level)) {
    return NextResponse.json({ error: 'Invalid level' }, { status: 400 })
  }
  if (![3, 4, 5, 6, 7].includes(Number(body.days_per_week))) {
    return NextResponse.json({ error: 'Invalid days per week' }, { status: 400 })
  }
  const weight = Number(body.weight_kg)
  if (!Number.isFinite(weight) || weight < 25 || weight > 300) {
    return NextResponse.json({ error: 'Invalid weight' }, { status: 400 })
  }
  // Event must be in the future (and not absurdly far out)
  const eventDate = new Date(body.event_date)
  const now = new Date()
  if (isNaN(eventDate.getTime()) || eventDate <= now) {
    return NextResponse.json({ error: 'Event date must be in the future' }, { status: 400 })
  }
  const twoYears = new Date(now); twoYears.setFullYear(twoYears.getFullYear() + 2)
  if (eventDate > twoYears) {
    return NextResponse.json({ error: 'Event date must be within the next 2 years' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('quiz_sessions')
    .insert({
      name:                body.name.trim(),
      sport:               body.sport,
      event_date:          body.event_date,
      event_name:          body.event_name,
      goal_time:           body.goal_time,
      level:               body.level,
      metric:              body.metric,
      days_per_week:       body.days_per_week,
      weight_kg:           weight,
      age:                 body.age,
      intermediate_races:  body.intermediate_races ?? null,
      nutrition_upsell:    body.nutrition_upsell ?? false,
      secondary_sports:    body.secondary_sports ?? [],
      injuries:            body.injuries ?? null,
      race_distance_km:    body.race_distance_km ?? null,
      plan_start:          body.plan_start ?? 'next_week',
      email:               body.email,
      status:              'pending',
    })
    .select('id')
    .single()

  if (error || !data) {
    console.error('Supabase insert error:', error)
    return NextResponse.json({ error: 'Failed to save session' }, { status: 500 })
  }

  return NextResponse.json({ sessionId: data.id })
}
