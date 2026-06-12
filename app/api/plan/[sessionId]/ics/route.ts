export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildPlanIcs } from '@/lib/ics'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('quiz_sessions')
    .select('status, generated_plan, plan_start')
    .eq('id', sessionId)
    .single()

  if (error || !data || data.status !== 'completed' || !data.generated_plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
  }

  const ics = buildPlanIcs(data.generated_plan, data.plan_start, sessionId)
  const sport = (data.generated_plan.profile?.sport || 'training').toLowerCase().replace(/[^a-z0-9]+/g, '-')

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${sport}-training-plan.ics"`,
      'Cache-Control': 'no-cache',
    },
  })
}
