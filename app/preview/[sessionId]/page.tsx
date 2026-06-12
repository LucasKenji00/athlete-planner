'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import type { TrainingZones, TrainingWeek, PeriodizationBlock, NutritionPlan } from '@/types'

type PlanSummary = {
  sport: string
  event_name: string
  weeks_total: number
  hours_per_week: string
  phases: number
  zones: TrainingZones
  first_week?: TrainingWeek
  first_weeks?: TrainingWeek[]
  periodization?: PeriodizationBlock[]
  nutrition_plan?: NutritionPlan | null
  sheetsUrl?: string
}

const DEMO: PlanSummary = {
  sport: 'Triathlon', event_name: 'Ironman 70.3 Cascais',
  weeks_total: 24, hours_per_week: '~10–12h', phases: 4,
  sheetsUrl: '#',
  zones: {
    run:  { z1: '6:30–7:00/km', z2: '5:45–6:15/km', z3: '5:10–5:40/km', z4: '4:40–5:05/km', z5: '<4:40/km' },
    bike: { z1: '<150W', z2: '150–185W', z3: '185–220W', z4: '220–255W', z5: '>255W' },
    swim: { z1: '2:10+/100m', z2: '1:58–2:08/100m', z3: '1:48–1:58/100m', z4: '1:38–1:48/100m', z5: '<1:38/100m' },
    hr:   { z1: '<130bpm', z2: '130–142bpm', z3: '142–155bpm', z4: '155–168bpm', z5: '>168bpm' },
  },
  periodization: [
    { phase: 'Phase 1 — Aerobic Base', start_date: '08/06/26', end_date: '19/07/26', weeks: 6, focus: 'Aerobic base + swim technique', volume_per_week: '~9–10h', intensity: 'Low' },
    { phase: 'Phase 2 — Build', start_date: '20/07/26', end_date: '30/08/26', weeks: 6, focus: 'FTP + threshold running', volume_per_week: '~11–12h', intensity: 'Medium' },
    { phase: 'Phase 3 — Peak', start_date: '31/08/26', end_date: '20/09/26', weeks: 3, focus: 'Race-specific intensity', volume_per_week: '~12–13h', intensity: 'High' },
    { phase: 'Taper', start_date: '21/09/26', end_date: '04/10/26', weeks: 2, focus: 'Freshness + activation', volume_per_week: '~6–7h', intensity: 'Low' },
  ],
  first_weeks: [{
    week_num: 1, dates: '08/06–14/06/26', phase: 'F1', focus: 'Base Aerobic + Swim Technique',
    total_hours: '~9–10h', is_recovery: false,
    sessions: [
      { day: 'Monday',    sport: 'Swimming',      description: 'Warm-up 400m Z1 · 6×100m drill (catch-up, fingertip drag) · 4×200m Z2 · Cool-down 200m easy', duration: '~60min', distance: '3km',  zone: 'Z1–Z2', objective: 'Technique + aerobic base' },
      { day: 'Tuesday',   sport: 'Run',           description: 'Easy run Z2 · 10min warm-up · 40min Z2 continuous · 10min cool-down', duration: '~60min', distance: '9–10km', zone: 'Z2', objective: 'Aerobic base' },
      { day: 'Wednesday', sport: 'Bike (indoor)', description: 'Warm-up 15min Z1 · 3×15min Z2 w/ 5min Z1 recovery · Cool-down 10min', duration: '~75min', distance: undefined, zone: 'Z1–Z2', objective: 'FTP foundation' },
      { day: 'Friday',    sport: 'Swimming',      description: 'Warm-up 300m · 10×100m Z3 with 20s rest · Cool-down 200m', duration: '~50min', distance: '2.3km', zone: 'Z2–Z3', objective: 'Aerobic speed' },
      { day: 'Saturday',  sport: 'Long Bike',     description: 'Z2 endurance ride. Progressive: 30min Z1 build, 2h30 Z2, 20min cool-down. Stay seated, cadence 85–90rpm', duration: '~3h20', distance: '90–100km', zone: 'Z2', objective: 'Endurance base' },
      { day: 'Sunday',    sport: 'Run (long)',    description: 'Easy long run Z1–Z2 · 10min Z1 warm-up · 75min Z2 · 10min Z1 cool-down', duration: '~95min', distance: '14–15km', zone: 'Z1–Z2', objective: 'Aerobic endurance' },
    ],
  }],
}

const ZONE_COLORS: Record<string, string> = {
  z1: '#4ade80', z2: '#86efac', z3: '#fbbf24', z4: '#f97316', z5: '#ef4444',
}

const PHASE_BAR_COLORS = ['#4ade80', '#60a5fa', '#fbbf24', '#f97316', '#a78bfa', '#f472b6']

const SPORT_ICONS: Record<string, string> = {
  Running: '🏃', 'Trail Running': '🏔️', Cycling: '🚴', 'Gravel/MTB': '🚵',
  Swimming: '🏊', 'Open Water Swimming': '🌊', Triathlon: '🏅', Duathlon: '⚡', Gym: '💪',
}

function summaryFromPlan(p: { profile: { sport: string; event_name: string; weeks_total: number; hours_per_week_avg: string }; periodization?: PeriodizationBlock[]; zones: TrainingZones; weeks?: TrainingWeek[]; nutrition_plan?: NutritionPlan }): PlanSummary {
  return {
    sport:          p.profile.sport,
    event_name:     p.profile.event_name,
    weeks_total:    p.profile.weeks_total,
    hours_per_week: p.profile.hours_per_week_avg,
    phases:         p.periodization?.length ?? 0,
    zones:          p.zones,
    periodization:  p.periodization,
    first_weeks:    p.weeks?.slice(0, 3),
    first_week:     p.weeks?.[0],
    nutrition_plan: p.nutrition_plan ?? null,
  }
}

export default function PreviewPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const sessionId = params.sessionId as string
  const [plan, setPlan] = useState<PlanSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({ 1: true })

  // ── Load the plan (sessionStorage → Supabase fallback) ──
  useEffect(() => {
    if (searchParams.get('demo') === '1') {
      setPlan(DEMO)
      setLoading(false)
      return
    }

    const stored = sessionStorage.getItem(`plan_${sessionId}`)
    if (stored) {
      const data = JSON.parse(stored)
      setPlan(data)
      setLoading(false)
      return
    }

    fetch(`/api/session/${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.generated_plan) {
          setPlan(summaryFromPlan(data.generated_plan))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [sessionId, searchParams])

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '1.5rem',
  }

  const pageBg = 'linear-gradient(135deg, #CF6232 0%, #1A0805 45%, #000000 100%)'

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: pageBg, color: 'rgba(255,255,255,0.5)', fontFamily: 'system-ui, sans-serif', fontSize: 15,
      }}>
        Loading your plan...
      </div>
    )
  }

  if (!plan) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: pageBg, fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ ...card, maxWidth: 400, textAlign: 'center' }}>
          <p style={{ color: '#fff', fontSize: 16, margin: '0 0 8px' }}>Plan not found</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>Session ID: {sessionId}</p>
        </div>
      </div>
    )
  }

  const { zones } = plan
  const weeks = plan.first_weeks ?? (plan.first_week ? [plan.first_week] : [])
  const zoneBlocks: { label: string; data: Record<string, string> | undefined }[] = [
    { label: 'Running pace', data: zones.run },
    { label: 'Bike power',   data: zones.bike },
    { label: 'Swim pace',    data: zones.swim },
    { label: 'Heart rate',   data: zones.hr },
  ]
  const totalPhaseWeeks = plan.periodization?.reduce((s, b) => s + (b.weeks || 0), 0) || 1

  return (
    <div style={{
      minHeight: '100vh', padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: pageBg, overflowX: 'hidden',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
            background: 'rgba(207,98,50,0.2)', border: '1px solid rgba(207,98,50,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Image src="/claude-logo.png" alt="Athlete Planner" width={22} height={22} style={{ objectFit: 'contain' }} />
          </div>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500 }}>Athlete Planner</span>
        </div>

        {/* Hero */}
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>
            {SPORT_ICONS[plan.sport] ?? '🏆'}
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#fff', margin: '0 0 8px', letterSpacing: '-0.3px' }}>
            Your plan is ready!
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', margin: '0 0 24px', lineHeight: 1.5 }}>
            {plan.event_name || plan.sport} · {plan.weeks_total} weeks · {plan.hours_per_week}/week avg
          </p>
          <a href={`/plan/${sessionId}`} style={{
            display: 'inline-block', padding: '14px 32px',
            background: '#CF6232', color: '#fff', textDecoration: 'none',
            borderRadius: 12, fontSize: 15, fontWeight: 700, letterSpacing: '0.2px',
          }}>
            Open My Full Plan →
          </a>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '12px 0 0' }}>
            📧 We've also emailed you this link — save it!
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { label: 'Total weeks', value: plan.weeks_total },
            { label: 'Training phases', value: plan.phases },
            { label: 'Avg per week', value: plan.hours_per_week },
          ].map(stat => (
            <div key={stat.label} style={{ ...card, textAlign: 'center', padding: '1rem' }}>
              <p style={{ fontSize: 22, fontWeight: 700, color: '#CF6232', margin: '0 0 4px' }}>{stat.value}</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Periodization timeline */}
        {plan.periodization && plan.periodization.length > 0 && (
          <div style={card}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 16px' }}>
              Your Season at a Glance
            </h2>
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderRadius: 8, overflow: 'hidden' }}>
              {plan.periodization.map((block, i) => (
                <div key={i} style={{
                  flex: Math.max(block.weeks, 1) / totalPhaseWeeks,
                  height: 8, background: PHASE_BAR_COLORS[i % PHASE_BAR_COLORS.length],
                  opacity: 0.85, minWidth: 8,
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {plan.periodization.map((block, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: 3, flexShrink: 0, marginTop: 4,
                    background: PHASE_BAR_COLORS[i % PHASE_BAR_COLORS.length],
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>
                      {block.phase} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>· {block.weeks} weeks</span>
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '2px 0 0' }}>
                      {block.focus} · {block.volume_per_week}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Training zones */}
        {zoneBlocks.some(b => b.data) && (
          <div style={card}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 16px' }}>
              Your Training Zones
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {zoneBlocks.filter(b => b.data).map(b => (
                <div key={b.label}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {b.label}
                  </p>
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as const, marginLeft: -4, marginRight: -4, paddingLeft: 4, paddingRight: 4 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(72px, 1fr))', gap: 6, minWidth: 360 }}>
                      {(['z1', 'z2', 'z3', 'z4', 'z5'] as const).map(z => (
                        <div key={z} style={{
                          background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 6px',
                          textAlign: 'center', borderTop: `2px solid ${ZONE_COLORS[z]}`,
                        }}>
                          <p style={{ fontSize: 10, color: ZONE_COLORS[z], fontWeight: 700, margin: '0 0 4px', textTransform: 'uppercase' }}>{z}</p>
                          <p style={{ fontSize: 11, color: '#fff', margin: 0, lineHeight: 1.3, wordBreak: 'break-word' }}>{b.data![z]}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* First weeks preview */}
        {weeks.length > 0 && (
          <div style={card}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
              Your First {weeks.length > 1 ? `${weeks.length} Weeks` : 'Week'}
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 16px' }}>
              The full {plan.weeks_total}-week plan lives in your spreadsheet.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {weeks.map(week => {
                const open = !!openWeeks[week.week_num]
                return (
                  <div key={week.week_num} style={{
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden',
                  }}>
                    <button
                      onClick={() => setOpenWeeks(o => ({ ...o, [week.week_num]: !o[week.week_num] }))}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.04)',
                        border: 'none', cursor: 'pointer', textAlign: 'left',
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>
                          Week {week.week_num} <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>· {week.dates}</span>
                        </p>
                        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '2px 0 0' }}>
                          {week.focus} · {week.total_hours}{week.is_recovery ? ' · Recovery week' : ''}
                        </p>
                      </div>
                      <span style={{ color: '#CF6232', fontSize: 13, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
                    </button>
                    {open && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 10px 12px' }}>
                        {week.sessions.map((session, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'flex-start', gap: 12,
                            background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px',
                          }}>
                            <div style={{
                              width: 40, flexShrink: 0, paddingTop: 2,
                              fontSize: 11, fontWeight: 700, color: '#CF6232', textTransform: 'uppercase',
                            }}>
                              {session.day.slice(0, 3)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: '0 0 2px' }}>
                                {session.sport}
                              </p>
                              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.4 }}>
                                {session.description}
                              </p>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 2px' }}>{session.duration}</p>
                              <p style={{ fontSize: 11, color: '#CF6232', margin: 0 }}>{session.zone}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Nutrition plan (upsell buyers) */}
        {plan.nutrition_plan && (
          <div style={{ ...card, border: '1px solid rgba(207,98,50,0.35)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
              🍽️ Your Personalised Nutrition Plan
            </h2>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 16px' }}>
              Tailored to your weight, zones and race. Recipe guide arriving by email.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, color: '#CF6232', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Pre-workout</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>
                  {plan.nutrition_plan.pre_workout.timing} · {plan.nutrition_plan.pre_workout.carbs_g}g carbs
                  {plan.nutrition_plan.pre_workout.protein_g ? ` · ${plan.nutrition_plan.pre_workout.protein_g}g protein` : ''}
                </p>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, color: '#CF6232', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Post-workout</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.5 }}>
                  {plan.nutrition_plan.post_workout.timing} · {plan.nutrition_plan.post_workout.carbs_g}g carbs
                  {plan.nutrition_plan.post_workout.protein_g ? ` · ${plan.nutrition_plan.post_workout.protein_g}g protein` : ''}
                </p>
              </div>
            </div>
            {plan.nutrition_plan.during?.length > 0 && (
              <div style={{ marginTop: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px' }}>
                <p style={{ fontSize: 11, color: '#CF6232', fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>During training</p>
                {plan.nutrition_plan.during.map((d, i) => (
                  <p key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px', lineHeight: 1.5 }}>
                    {d.zone}: {d.carbs_per_hour}g carbs/h · {d.hydration_per_hour}ml/h
                  </p>
                ))}
              </div>
            )}
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '12px 0 0' }}>
              The full breakdown — including your race-day fuelling timeline — is in your spreadsheet.
            </p>
          </div>
        )}

        {/* Footer CTA */}
        <a href={`/plan/${sessionId}`} style={{
          display: 'block', padding: '15px', textAlign: 'center',
          background: '#CF6232', color: '#fff', textDecoration: 'none',
          borderRadius: 14, fontSize: 15, fontWeight: 700,
        }}>
          Open My Full Plan →
        </a>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
          Generated by Athlete Planner · Powered by AI
        </p>

      </div>
    </div>
  )
}
