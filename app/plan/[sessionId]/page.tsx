'use client'

// ============================================================
// /plan/[sessionId] — THE deliverable.
// Permanent link the athlete receives by email.
// Renders the entire generated plan from Supabase.
// ============================================================

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import type { GeneratedPlan, TrainingWeek } from '@/types'

const BRAND = '#CF6232'
const PAGE_BG = 'linear-gradient(135deg, #CF6232 0%, #1A0805 45%, #000000 100%)'

const ZONE_COLORS: Record<string, string> = {
  z1: '#4ade80', z2: '#86efac', z3: '#fbbf24', z4: '#f97316', z5: '#ef4444',
}
const PHASE_BAR_COLORS = ['#4ade80', '#60a5fa', '#fbbf24', '#f97316', '#a78bfa', '#f472b6']
const SPORT_ICONS: Record<string, string> = {
  Running: '🏃', 'Trail Running': '🏔️', Cycling: '🚴', 'Gravel/MTB': '🚵',
  Swimming: '🏊', 'Open Water Swimming': '🌊', Triathlon: '🏅', Duathlon: '⚡', Gym: '💪',
}

const card: React.CSSProperties = {
  background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '1.5rem',
}

function zoneChipColor(zone?: string): string {
  if (!zone) return 'rgba(255,255,255,0.5)'
  if (zone.includes('Z5')) return ZONE_COLORS.z5
  if (zone.includes('Z4')) return ZONE_COLORS.z4
  if (zone.includes('Z3')) return ZONE_COLORS.z3
  return BRAND
}

export default function PlanPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const [plan, setPlan] = useState<GeneratedPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [openWeeks, setOpenWeeks] = useState<Record<number, boolean>>({ 1: true })
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [daysToRace, setDaysToRace] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/session/${sessionId}`)
      .then(r => r.json())
      .then(data => {
        if (data.generated_plan) {
          setPlan(data.generated_plan)
          const eventDate = data.generated_plan.profile?.event_date
          if (eventDate) {
            const days = Math.ceil((new Date(eventDate).getTime() - Date.now()) / 86400000)
            setDaysToRace(days >= 0 ? days : null)
          }
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: PAGE_BG, color: 'rgba(255,255,255,0.5)', fontFamily: 'system-ui, sans-serif', fontSize: 15 }}>
        Loading your plan...
      </div>
    )
  }

  if (!plan) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: PAGE_BG, fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ ...card, maxWidth: 400, textAlign: 'center' }}>
          <p style={{ color: '#fff', fontSize: 16, margin: '0 0 8px' }}>Plan not found</p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>
            Check the link in your email, or contact support.
          </p>
        </div>
      </div>
    )
  }

  const totalPhaseWeeks = plan.periodization?.reduce((s, b) => s + (b.weeks || 0), 0) || 1
  const zoneBlocks: { label: string; data: Record<string, string> | undefined }[] = [
    { label: 'Running pace', data: plan.zones?.run },
    { label: 'Bike power',   data: plan.zones?.bike },
    { label: 'Swim pace',    data: plan.zones?.swim },
    { label: 'Heart rate',   data: plan.zones?.hr },
  ]
  const toggleSection = (key: string) =>
    setOpenSections(s => ({ ...s, [key]: !s[key] }))

  const sectionHeader = (key: string, title: string, subtitle?: string) => (
    <button
      onClick={() => toggleSection(key)}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
      }}
    >
      <div>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>{title}</h2>
        {subtitle && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>{subtitle}</p>}
      </div>
      <span style={{ color: BRAND, fontSize: 13 }}>{openSections[key] ? '▲' : '▼'}</span>
    </button>
  )

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 1.25rem', fontFamily: 'system-ui, -apple-system, sans-serif', background: PAGE_BG, overflowX: 'hidden' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 600 }}>Athlete Planner</span>
          {daysToRace !== null && (
            <span style={{ color: BRAND, fontSize: 13, fontWeight: 700 }}>
              🏁 {daysToRace} days to race
            </span>
          )}
        </div>

        {/* Hero */}
        <div style={{ ...card, textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>{SPORT_ICONS[plan.profile.sport] ?? '🏆'}</div>
          <h1 style={{ fontSize: 23, fontWeight: 700, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
            {plan.profile.event_name || plan.profile.sport}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: '0 0 18px' }}>
            {plan.profile.weeks_total} weeks · {plan.profile.hours_per_week_avg}/week · Goal: {plan.profile.goal_time || 'finish strong'}
          </p>
          {plan.profile.summary && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '0 0 18px', lineHeight: 1.5 }}>
              {plan.profile.summary}
            </p>
          )}
          <a
            href={`/api/plan/${sessionId}/ics`}
            style={{
              display: 'inline-block', padding: '12px 24px',
              background: 'rgba(255,255,255,0.08)', color: '#fff', textDecoration: 'none',
              borderRadius: 10, fontSize: 14, fontWeight: 600,
              border: `1px solid ${BRAND}`,
            }}
          >
            📆 Add all sessions to my calendar
          </a>
        </div>

        {/* Season timeline */}
        {(plan.periodization?.length ?? 0) > 0 && (
          <div style={card}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 16px' }}>Your Season at a Glance</h2>
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderRadius: 8, overflow: 'hidden' }}>
              {plan.periodization.map((block, i) => (
                <div key={i} style={{
                  flex: Math.max(block.weeks, 1) / totalPhaseWeeks, height: 8,
                  background: PHASE_BAR_COLORS[i % PHASE_BAR_COLORS.length], opacity: 0.85, minWidth: 8,
                }} />
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {plan.periodization.map((block, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, flexShrink: 0, marginTop: 4, background: PHASE_BAR_COLORS[i % PHASE_BAR_COLORS.length] }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>
                      {block.phase} <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}>· {block.weeks} weeks · {block.start_date} → {block.end_date}</span>
                    </p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '2px 0 0' }}>
                      {block.focus} · {block.volume_per_week} · {block.intensity}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Zones */}
        {zoneBlocks.some(b => b.data) && (
          <div style={card}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 16px' }}>Your Training Zones</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {zoneBlocks.filter(b => b.data).map(b => (
                <div key={b.label}>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{b.label}</p>
                  <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' as const, margin: '0 -4px', padding: '0 4px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(72px, 1fr))', gap: 6, minWidth: 360 }}>
                      {(['z1', 'z2', 'z3', 'z4', 'z5'] as const).map(z => (
                        <div key={z} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: '8px 6px', textAlign: 'center', borderTop: `2px solid ${ZONE_COLORS[z]}` }}>
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

        {/* ALL weeks */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
            Week-by-Week Plan
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: '0 0 16px' }}>
            All {plan.weeks.length} weeks. Tap a week to see your sessions.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {plan.weeks.map((week: TrainingWeek) => {
              const open = !!openWeeks[week.week_num]
              return (
                <div key={week.week_num} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, overflow: 'hidden' }}>
                  <button
                    onClick={() => setOpenWeeks(o => ({ ...o, [week.week_num]: !o[week.week_num] }))}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 12, padding: '12px 14px',
                      background: week.is_recovery ? 'rgba(74,222,128,0.07)' : 'rgba(255,255,255,0.04)',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#fff', margin: 0 }}>
                        Week {week.week_num}
                        <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}> · {week.dates} · {week.phase}</span>
                        {week.is_recovery && <span style={{ color: ZONE_COLORS.z1, fontWeight: 600 }}> · Recovery</span>}
                      </p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '2px 0 0' }}>
                        {week.focus} · {week.total_hours}
                      </p>
                    </div>
                    <span style={{ color: BRAND, fontSize: 13, flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
                  </button>
                  {open && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 10px 12px' }}>
                      {week.sessions.map((session, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px' }}>
                          <div style={{ width: 40, flexShrink: 0, paddingTop: 2, fontSize: 11, fontWeight: 700, color: BRAND, textTransform: 'uppercase' }}>
                            {session.day.slice(0, 3)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: 14, fontWeight: 500, color: '#fff', margin: '0 0 2px' }}>
                              {session.sport}
                              {session.time_of_day && <span style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 400, fontSize: 12 }}> · {session.time_of_day}</span>}
                            </p>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.45 }}>{session.description}</p>
                            {session.objective && (
                              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: '4px 0 0' }}>🎯 {session.objective}</p>
                            )}
                          </div>
                          <div style={{ textAlign: 'right', flexShrink: 0 }}>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 2px' }}>{session.duration}</p>
                            {session.distance && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: '0 0 2px' }}>{session.distance}</p>}
                            <p style={{ fontSize: 11, color: zoneChipColor(session.zone), margin: 0, fontWeight: 600 }}>{session.zone}</p>
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

        {/* Strength program */}
        {(plan.strength_program?.length ?? 0) > 0 && (
          <div style={card}>
            {sectionHeader('strength', '💪 Strength Program', `${plan.strength_program!.length} sessions · Ph.1 foundation → Ph.2 development → Ph.3 maintenance`)}
            {openSections.strength && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 16 }}>
                {plan.strength_program!.map((sess, i) => (
                  <div key={i}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
                      {sess.session_name}
                      {sess.day_suggestion && <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 400 }}> · {sess.day_suggestion}</span>}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {sess.exercises.map((ex, j) => (
                        <div key={j} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>{ex.name}</p>
                            <p style={{ fontSize: 12, color: BRAND, margin: 0, fontWeight: 600 }}>
                              {ex.ph1} → {ex.ph2} → {ex.ph3}
                            </p>
                          </div>
                          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', lineHeight: 1.4 }}>
                            {ex.primary_muscle}{ex.secondary_muscle ? ` + ${ex.secondary_muscle}` : ''} · {ex.sport_reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Race day plan */}
        {plan.race_day_plan && (
          <div style={card}>
            {sectionHeader('raceday', '🏁 Race Day Plan', 'Your minute-by-minute strategy')}
            {openSections.raceday && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
                    <p style={{ fontSize: 11, color: BRAND, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 4px' }}>Wake up</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{plan.race_day_plan.wake_up}</p>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 12px' }}>
                    <p style={{ fontSize: 11, color: BRAND, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 4px' }}>Breakfast</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0 }}>{plan.race_day_plan.breakfast}</p>
                  </div>
                </div>
                {plan.race_day_plan.segments?.map((seg, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#fff', margin: 0 }}>{seg.segment}</p>
                      <p style={{ fontSize: 12, color: BRAND, fontWeight: 600, margin: 0 }}>{seg.target_time} · {seg.pace_target}</p>
                    </div>
                    {seg.nutrition && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: '6px 0 0' }}>🍽️ {seg.nutrition}</p>}
                    {seg.notes && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0' }}>{seg.notes}</p>}
                  </div>
                ))}
                {(plan.race_day_plan.mental_cues?.length ?? 0) > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ fontSize: 11, color: BRAND, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Mental cues</p>
                    {plan.race_day_plan.mental_cues!.map((c, i) => (
                      <p key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 4px', lineHeight: 1.5 }}>💭 {c}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Nutrition (upsell) */}
        {plan.nutrition_plan && (
          <div style={{ ...card, border: '1px solid rgba(207,98,50,0.35)' }}>
            {sectionHeader('nutrition', '🍽️ Personalised Nutrition Plan', 'Calculated for your weight, zones and race')}
            {openSections.nutrition && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {([
                    ['Pre-workout', plan.nutrition_plan.pre_workout],
                    ['Post-workout', plan.nutrition_plan.post_workout],
                  ] as const).map(([label, t]) => t && (
                    <div key={label} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px' }}>
                      <p style={{ fontSize: 11, color: BRAND, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>{label}</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px', lineHeight: 1.5 }}>
                        {t.timing} · {t.carbs_g}g carbs{t.protein_g ? ` · ${t.protein_g}g protein` : ''} · {t.hydration_ml}ml
                      </p>
                      {(t.suggestions?.length ?? 0) > 0 && (
                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: 1.5 }}>
                          {t.suggestions!.join(' · ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                {(plan.nutrition_plan.during?.length ?? 0) > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ fontSize: 11, color: BRAND, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>During training</p>
                    {plan.nutrition_plan.during!.map((d, i) => (
                      <p key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '0 0 4px' }}>
                        {d.zone}: {d.carbs_per_hour}g carbs/h · {d.hydration_per_hour}ml/h
                      </p>
                    ))}
                  </div>
                )}
                {(plan.nutrition_plan.race_day?.length ?? 0) > 0 && (
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '12px 14px' }}>
                    <p style={{ fontSize: 11, color: BRAND, fontWeight: 700, textTransform: 'uppercase', margin: '0 0 6px' }}>Race day fuelling</p>
                    {plan.nutrition_plan.race_day!.map((t, i) => (
                      <p key={i} style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: '0 0 6px', lineHeight: 1.5 }}>
                        <strong style={{ color: '#fff' }}>{t.timing}</strong> — {t.carbs_g}g carbs · {t.hydration_ml}ml
                        {(t.suggestions?.length ?? 0) > 0 ? ` · ${t.suggestions![0]}` : ''}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: '8px 0 0' }}>
          Generated by Athlete Planner · Save this link — it&apos;s your plan, always up here.
        </p>
      </div>
    </div>
  )
}
