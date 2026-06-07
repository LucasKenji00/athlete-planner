export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { QuizData } from '@/types'

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const body: QuizData & { email: string; secondary_sports?: string[]; injuries?: string } = await req.json()

  const { data, error } = await supabase
    .from('quiz_sessions')
    .insert({
      name:                body.name,
      sport:               body.sport,
      event_date:          body.event_date,
      event_name:          body.event_name,
      goal_time:           body.goal_time,
      level:               body.level,
      metric:              body.metric,
      days_per_week:       body.days_per_week,
      weight_kg:           body.weight_kg,
      age:                 body.age,
      intermediate_races:  body.intermediate_races ?? null,
      nutrition_upsell:    body.nutrition_upsell ?? false,
      secondary_sports:    body.secondary_sports ?? [],
      injuries:            body.injuries ?? null,
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
