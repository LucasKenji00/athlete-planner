export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  if (process.env.TEST_MODE !== 'true') {
    return NextResponse.json({ error: 'Only available in TEST_MODE' }, { status: 403 })
  }

  const email = req.nextUrl.searchParams.get('email')
  const nutrition = req.nextUrl.searchParams.get('nutrition') === 'true'
  if (!email) {
    return NextResponse.json({ error: 'email query param required' }, { status: 400 })
  }

  const demoPlan = {
    profile: {
      sport: 'Triathlon', event_name: 'Ironman 70.3 Cascais',
      event_date: '2026-10-04', goal_time: '5:00:00',
      level: 'Intermediário', metric: 'FTP 220W / 5:15 min/km',
      weeks_total: 24, hours_per_week_avg: '~10–12h',
      summary: 'Triatleta intermédio, meta sub-5h em Cascais 70.3',
    },
    zones: {
      run:  { z1: '6:30–7:00/km', z2: '5:45–6:15/km', z3: '5:10–5:40/km', z4: '4:40–5:05/km', z5: '<4:40/km' },
      bike: { z1: '<150W', z2: '150–185W', z3: '185–220W', z4: '220–255W', z5: '>255W' },
      swim: { z1: '2:10+/100m', z2: '1:58–2:08/100m', z3: '1:48–1:58/100m', z4: '1:38–1:48/100m', z5: '<1:38/100m' },
      hr:   { z1: '<130bpm', z2: '130–142bpm', z3: '142–155bpm', z4: '155–168bpm', z5: '>168bpm' },
    },
    periodization: [
      { phase: 'FASE 1 — Base Aeróbica', start_date: '2026-06-08', end_date: '2026-07-19', weeks: 6, focus: 'Aerobic base + swim technique', volume_per_week: '~9–10h', intensity: 'Low' },
      { phase: 'FASE 2 — Build', start_date: '2026-07-20', end_date: '2026-08-30', weeks: 6, focus: 'FTP + threshold running', volume_per_week: '~11–12h', intensity: 'Medium' },
      { phase: 'FASE 3 — Peak', start_date: '2026-08-31', end_date: '2026-09-20', weeks: 3, focus: 'Race-specific intensity', volume_per_week: '~12–13h', intensity: 'High' },
      { phase: 'TAPER', start_date: '2026-09-21', end_date: '2026-10-04', weeks: 2, focus: 'Freshness + activation', volume_per_week: '~6–7h', intensity: 'Low' },
    ],
    weeks: [
      {
        week_num: 1, dates: '08/06–14/06/26', phase: 'F1', focus: 'Base Aerobic + Swim Technique',
        total_hours: '~9–10h', is_recovery: false,
        sessions: [
          { day: 'Monday',    sport: 'Swimming',      description: 'Warm-up 400m Z1 · 6×100m drill · 4×200m Z2 · Cool-down 200m', duration: '~60min', distance: '3km',     zone: 'Z1–Z2', objective: 'Technique + aerobic base' },
          { day: 'Tuesday',   sport: 'Run',           description: 'Easy run Z2 · 10min warm-up · 40min Z2 continuous · 10min cool-down', duration: '~60min', distance: '9–10km', zone: 'Z2', objective: 'Aerobic base' },
          { day: 'Wednesday', sport: 'Bike (indoor)', description: 'Warm-up 15min Z1 · 3×15min Z2 w/ 5min Z1 recovery · Cool-down 10min', duration: '~75min', distance: undefined, zone: 'Z1–Z2', objective: 'FTP foundation' },
          { day: 'Friday',    sport: 'Swimming',      description: 'Warm-up 300m · 10×100m Z3 with 20s rest · Cool-down 200m', duration: '~50min', distance: '2.3km',  zone: 'Z2–Z3', objective: 'Aerobic speed' },
          { day: 'Saturday',  sport: 'Long Bike',     description: 'Z2 endurance ride · 30min Z1 build · 2h30 Z2 · 20min cool-down', duration: '~3h20',  distance: '90km',    zone: 'Z2', objective: 'Endurance base' },
          { day: 'Sunday',    sport: 'Run (long)',    description: 'Easy long run Z1–Z2 · 10min Z1 · 75min Z2 · 10min cool-down',  duration: '~95min', distance: '14km',    zone: 'Z1–Z2', objective: 'Aerobic endurance' },
        ],
      },
    ],
  }

  try {
    const response = await fetch(process.env.APPS_SCRIPT_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret:           process.env.APPS_SCRIPT_SECRET!,
        session_id:       'test-' + Date.now(),
        email,
        nutrition_upsell: nutrition,
        plan:             demoPlan,
      }),
    })

    const result = await response.json()

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Apps Script failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, sheetsUrl: result.sheetsUrl })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
