'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import type { QuizData } from '@/types'

type Sport = QuizData['sport']
type Level = QuizData['level']

const SPORTS: { value: Sport; label: string; subtitle: string }[] = [
  { value: 'Corrida',             label: 'Running',         subtitle: '5K, 10K, Half Marathon, Marathon' },
  { value: 'Trail Running',       label: 'Trail Running',   subtitle: '10K Trail, Ultra, Skyrace' },
  { value: 'Ciclismo',            label: 'Cycling (Road)',  subtitle: 'Gran Fondo, Stage Race, Century Ride' },
  { value: 'Gravel/MTB',          label: 'Gravel / MTB',   subtitle: 'Gravel Race, XCO, Marathon MTB' },
  { value: 'Natação',             label: 'Swimming',        subtitle: 'Pool 1.5K, 3.8K, Competition' },
  { value: 'Open Water Swimming', label: 'Open Water',      subtitle: '3K, 5K, 10K OWS' },
  { value: 'Triathlon',           label: 'Triathlon',       subtitle: 'Sprint, Olympic, 70.3, Ironman' },
  { value: 'Duathlon',            label: 'Duathlon',        subtitle: 'Run-Bike-Run, Sprint, Standard' },
  { value: 'Academia',            label: 'Gym / Strength',  subtitle: 'Hypertrophy, Strength, Powerlifting' },
]

const LEVELS: { value: Level; label: string; desc: string }[] = [
  { value: 'Iniciante',     label: 'Beginner',     desc: 'Less than 1 year of practice' },
  { value: 'Intermediário', label: 'Intermediate', desc: '1–3 years of regular training' },
  { value: 'Avançado',      label: 'Advanced',     desc: '3+ years, competing regularly' },
]

const INJURIES = [
  { value: 'none',      label: "None — I'm fully healthy" },
  { value: 'knee',      label: 'Knee issues' },
  { value: 'back',      label: 'Back pain' },
  { value: 'returning', label: 'Recent injury — returning to training' },
  { value: 'other',     label: 'Other' },
]

const METRIC_HINTS: Partial<Record<Sport, string>> = {
  Corrida:               'e.g. 5:30 min/km',
  'Trail Running':       'e.g. 6:00 min/km trail',
  Ciclismo:              'e.g. 220W FTP',
  'Gravel/MTB':          'e.g. 210W FTP',
  Natação:               'e.g. 1:50 min/100m',
  'Open Water Swimming': 'e.g. 2:00 min/100m OWS',
  Triathlon:             'e.g. 220W FTP / 5:15 min/km',
  Duathlon:              'e.g. 5:00 min/km / 210W FTP',
  Academia:              'e.g. 80kg squat 1RM',
}

const TITLES = [
  'What sport do you train?',
  'Tell us about your goal',
  "What's your fitness level?",
  'How many days can you train?',
  'Almost done',
]

const SUBTITLES = [
  'You can select more than one sport.',
  'The AI uses your race date to build a real periodization plan.',
  'Be honest — the plan is only as good as the data you give.',
  'Sessions will be distributed across the week intelligently.',
  'Fill in your profile and get the plan delivered to your email.',
]

const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

const s = {
  input: {
    width: '100%', background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10,
    padding: '12px 14px', color: '#fff', fontSize: 15,
    outline: 'none', boxSizing: 'border-box',
  } as React.CSSProperties,
  label: {
    fontSize: 13, color: 'rgba(255,255,255,0.6)',
    marginBottom: 6, display: 'block',
  } as React.CSSProperties,
}

type FormData = Partial<QuizData> & { name?: string; email?: string; injuries?: string; secondary_sports?: string[] }

export default function QuizPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [visible, setVisible] = useState(true)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormData>({})
  const [selectedSports, setSelectedSports] = useState<Sport[]>([])
  const [selectedInjury, setSelectedInjury] = useState('')
  const [otherInjury, setOtherInjury] = useState('')

  const set = <K extends keyof FormData>(key: K, val: FormData[K]) =>
    setForm(p => ({ ...p, [key]: val }))

  const [processing, setProcessing] = useState(false)
  const [processingMsg, setProcessingMsg] = useState('')

  const PROCESSING_MSGS = [
    'AI is saving your answer...',
    'Analysing your profile...',
    'Personalising your plan...',
    'Processing your data...',
  ]

  const goTo = (n: number) => {
    setProcessingMsg(PROCESSING_MSGS[Math.floor(Math.random() * PROCESSING_MSGS.length)])
    setProcessing(true)
    const delay = 600 + Math.random() * 700
    setTimeout(() => {
      setProcessing(false)
      setVisible(false)
      setTimeout(() => { setStep(n); setVisible(true) }, 180)
    }, delay)
  }

  const toggleSport = (sport: Sport) => {
    setSelectedSports(prev => {
      const next = prev.includes(sport) ? prev.filter(s => s !== sport) : [...prev, sport]
      if (next.length === 1) {
        setForm(f => ({ ...f, sport: next[0], secondary_sports: [] }))
      } else if (next.length === 0) {
        setForm(f => ({ ...f, sport: undefined, secondary_sports: [] }))
      } else if (!next.includes(form.sport as Sport)) {
        setForm(f => ({ ...f, sport: undefined }))
      }
      return next
    })
  }

  const setPrimary = (sport: Sport) => {
    setForm(f => ({ ...f, sport, secondary_sports: selectedSports.filter(s => s !== sport) }))
  }

  const canNext = (): boolean => {
    if (step === 1) return selectedSports.length > 0 && (selectedSports.length === 1 || !!form.sport)
    if (step === 2) return !!(form.event_date && (form.sport === 'Academia' || form.race_distance_km?.trim()))
    if (step === 3) return !!form.level
    if (step === 4) return !!form.days_per_week
    if (step === 5) return !!(form.name?.trim() && form.weight_kg && form.email && isValidEmail(form.email))
    return false
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const payload = {
        ...form,
        injuries: selectedInjury === 'other' ? (otherInjury || 'Other limitation') : selectedInjury || undefined,
      }
      const quizRes = await fetch('/api/quiz', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const { sessionId } = await quizRes.json()
      router.push(`/upsell/${sessionId}`)
    } catch {
      setLoading(false)
    }
  }

  const sel = (active: boolean): React.CSSProperties => ({
    background: active ? 'rgba(207,98,50,0.25)' : 'rgba(255,255,255,0.05)',
    border: `1.5px solid ${active ? '#CF6232' : 'rgba(255,255,255,0.1)'}`,
    borderRadius: 12, cursor: 'pointer', color: '#fff', transition: 'all 0.2s',
  })

  const progress = Math.round(((step - 1) / 4) * 100)

  return (
    <div className="quiz-outer" style={{
      minHeight: '100vh', display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '2rem', paddingTop: 'max(2rem, env(safe-area-inset-top, 2rem))',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #CF6232 0%, #1A0805 45%, #000000 100%)',
    }}>
      <style>{`
        @media (min-width: 641px) { .quiz-outer { align-items: center !important; } }
        @media (max-width: 640px) {
          .quiz-outer { padding: 1rem !important; padding-top: 1.25rem !important; }
          .quiz-card  { padding: 1.25rem !important; }
          .level-btn  { flex-direction: column !important; align-items: flex-start !important; gap: 3px !important; }
          .sport-subtitle { display: none; }
          .sport-btn { padding: 10px 12px !important; }
        }
      `}</style>
      <div style={{ maxWidth: 520, width: '100%', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', overflow: 'hidden',
              background: 'rgba(207,98,50,0.2)', border: '1px solid rgba(207,98,50,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Image src="/claude-logo.png" alt="Claude" width={22} height={22} style={{ objectFit: 'contain' }} />
            </div>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: 500 }}>Athlete Planner</span>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
            Step {step} of 5 · {progress}%
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ height: 3, background: 'rgba(255,255,255,0.1)', borderRadius: 99 }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: 'linear-gradient(90deg, #CF6232, #FF8C5A)',
            borderRadius: 99, transition: 'width 0.4s ease',
          }} />
        </div>

        {/* Card with fade transition */}
        <div className="quiz-card" style={{
          background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '2rem',
          opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.18s ease, transform 0.18s ease',
        }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 6px', letterSpacing: '-0.3px' }}>
            {TITLES[step - 1]}
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: '0 0 24px' }}>
            {SUBTITLES[step - 1]}
          </p>

          {/* ── Step 1 — Sport (multi-select) ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {SPORTS.map(sp => {
                  const active = selectedSports.includes(sp.value)
                  return (
                    <button key={sp.value} onClick={() => toggleSport(sp.value)} className="sport-btn" style={{
                      ...sel(active), padding: '12px 14px', textAlign: 'left',
                      display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
                    }}>
                      <div>
                        <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 2px', color: '#fff' }}>{sp.label}</p>
                        <p className="sport-subtitle" style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: 0 }}>{sp.subtitle}</p>
                      </div>
                      {active && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#CF6232', flexShrink: 0, marginTop: 4 }} />}
                    </button>
                  )
                })}
              </div>
              {selectedSports.length > 1 && (
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14 }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: '0 0 10px' }}>
                    What is your primary sport for this plan?
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedSports.map(sp => {
                      const meta = SPORTS.find(s => s.value === sp)!
                      return (
                        <button key={sp} onClick={() => setPrimary(sp)} style={{
                          ...sel(form.sport === sp), padding: '10px 14px',
                          display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500,
                        }}>
                          {meta.label}
                          {form.sport === sp && <span style={{ marginLeft: 'auto', color: '#CF6232', fontSize: 12 }}>Primary ✓</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Step 2 — Event ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={s.label}>Race / event name (optional)</label>
                <input style={s.input} placeholder="e.g. Paris Marathon, Ironman 70.3"
                  value={form.event_name ?? ''} onChange={e => set('event_name', e.target.value)} />
              </div>
              {form.sport !== 'Academia' && (
                <div>
                  <label style={s.label}>Race distance *</label>
                  <input style={s.input} placeholder="e.g. 21.1 km, 42 km, 70.3 miles"
                    value={form.race_distance_km ?? ''} onChange={e => set('race_distance_km', e.target.value)} />
                </div>
              )}
              <div>
                <label style={s.label}>Race date *</label>
                <input type="date" style={s.input} value={form.event_date ?? ''}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => set('event_date', e.target.value)} />
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '6px 0 0' }}>
                  Don't have a race yet? Pick a target date anyway — the AI will build around it.
                </p>
              </div>
              {form.sport !== 'Academia' && (
                <div>
                  <label style={s.label}>Goal time for {SPORTS.find(sp => sp.value === form.sport)?.label ?? 'your primary sport'} (optional)</label>
                  <input style={s.input} placeholder="e.g. 3:30:00"
                    value={form.goal_time ?? ''} onChange={e => set('goal_time', e.target.value)} />
                </div>
              )}
              <div>
                <label style={{ ...s.label, marginBottom: 10 }}>When do you want to start training?</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['next_week', 'this_week'] as const).map(opt => (
                    <button key={opt} onClick={() => set('plan_start', opt)} style={{
                      ...sel((form.plan_start ?? 'next_week') === opt),
                      flex: 1, padding: '12px 10px', fontSize: 14, fontWeight: 500,
                    }}>
                      {opt === 'next_week' ? 'Next week' : 'This week'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3 — Level + injuries ── */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {LEVELS.map(l => (
                  <button key={l.value} onClick={() => set('level', l.value)} className="level-btn" style={{
                    ...sel(form.level === l.value), display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', padding: '14px 16px', textAlign: 'left',
                  }}>
                    <span style={{ fontSize: 15, fontWeight: 500 }}>{l.label}</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{l.desc}</span>
                  </button>
                ))}
              </div>
              <div>
                <label style={{ ...s.label, marginBottom: 10 }}>Any injuries or limitations? (optional)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {INJURIES.map(inj => (
                    <button key={inj.value} onClick={() => setSelectedInjury(inj.value)} style={{
                      ...sel(selectedInjury === inj.value), padding: '10px 14px',
                      fontSize: 14, textAlign: 'left',
                    }}>
                      {inj.label}
                    </button>
                  ))}
                </div>
                {selectedInjury === 'other' && (
                  <input style={{ ...s.input, marginTop: 8 }}
                    placeholder="Describe your limitation..."
                    value={otherInjury} onChange={e => setOtherInjury(e.target.value)} />
                )}
              </div>
            </div>
          )}

          {/* ── Step 4 — Days ── */}
          {step === 4 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {([3, 4, 5, 6, 7] as Array<QuizData['days_per_week']>).map(d => (
                <button key={d} onClick={() => set('days_per_week', d)} style={{
                  ...sel(form.days_per_week === d), flex: '1 1 calc(20% - 8px)',
                  padding: '18px 8px', fontSize: 22, fontWeight: 700,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}>
                  {d}
                  <span style={{ fontSize: 10, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>days/wk</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Step 5 — Profile + email ── */}
          {step === 5 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={s.label}>Your first name *</label>
                <input style={s.input} placeholder="e.g. James"
                  value={form.name ?? ''} onChange={e => set('name', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={s.label}>Weight (kg) *</label>
                  <input type="number" style={s.input} placeholder="e.g. 72"
                    value={form.weight_kg ?? ''}
                    onChange={e => set('weight_kg', e.target.value ? parseFloat(e.target.value) : undefined)} />
                </div>
                <div>
                  <label style={s.label}>Age (optional)</label>
                  <input type="number" style={s.input} placeholder="e.g. 30"
                    value={form.age ?? ''}
                    onChange={e => set('age', e.target.value ? parseInt(e.target.value) : undefined)} />
                </div>
              </div>
              <div>
                <label style={s.label}>Email address *</label>
                <input type="email" style={{
                  ...s.input,
                  borderColor: form.email && !isValidEmail(form.email) ? '#e05252' : 'rgba(255,255,255,0.15)',
                }} placeholder="your@email.com"
                  value={form.email ?? ''} onChange={e => set('email', e.target.value)} />
                {form.email && !isValidEmail(form.email) && (
                  <p style={{ fontSize: 12, color: '#e05252', margin: '6px 0 0' }}>Please enter a valid email address.</p>
                )}
                {(!form.email || isValidEmail(form.email)) && (
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: '6px 0 0' }}>
                    Your Google Sheets plan will be delivered here.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', gap: 10 }}>
          {step > 1 && (
            <button onClick={() => goTo(step - 1)} style={{
              padding: '13px 20px', background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
              color: 'rgba(255,255,255,0.7)', fontSize: 14, cursor: 'pointer', fontWeight: 500,
            }}>
              Back
            </button>
          )}
          <button
            onClick={step < 5 ? () => goTo(step + 1) : handleSubmit}
            disabled={!canNext() || loading || processing}
            style={{
              flex: 1, padding: '13px 20px', border: 'none', borderRadius: 10,
              color: '#fff', fontSize: 15, fontWeight: 600,
              background: canNext() && !loading && !processing ? '#CF6232' : 'rgba(207,98,50,0.3)',
              cursor: canNext() && !loading && !processing ? 'pointer' : 'not-allowed',
              transition: 'background 0.2s',
            }}
          >
            {processing ? processingMsg : loading ? 'Saving...' : step < 5 ? 'Continue →' : 'Build My Plan →'}
          </button>
        </div>

      </div>
    </div>
  )
}
