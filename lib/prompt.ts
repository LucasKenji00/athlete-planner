// ============================================================
// PROMPT — the most important asset of the product
// This is where the coaching knowledge lives.
//
// v2 — chunked generation:
//   1. buildSkeletonPrompt()  → profile, zones, periodization,
//      strength program, race-day plan, (nutrition plan)
//   2. buildWeeksChunkPrompt() → detailed weeks, generated in
//      parallel chunks so long plans never hit token limits
// ============================================================

import type { QuizData } from '@/types'
import { differenceInCalendarWeeks, format, parseISO } from 'date-fns'

// ------------------------------------------------------------
// Limits
// ------------------------------------------------------------
export const MAX_WEEKS = 52
export const WEEKS_PER_CHUNK = 8

// ------------------------------------------------------------
// Internal benchmarks per sport × level
// Used when the athlete has no real metric
// ------------------------------------------------------------
const BENCHMARKS: Record<string, Record<string, { metric: string; vol: string; hours: string }>> = {
  Running: {
    Beginner:     { metric: '7:00 min/km', vol: '20–25 km/week', hours: '~5–7h' },
    Intermediate: { metric: '5:30 min/km', vol: '35–45 km/week', hours: '~7–9h' },
    Advanced:     { metric: '4:30 min/km', vol: '55–70 km/week', hours: '~9–12h' },
  },
  'Trail Running': {
    Beginner:     { metric: '7:30 min/km trail', vol: '25–30 km/week', hours: '~6–8h' },
    Intermediate: { metric: '6:00 min/km trail', vol: '40–55 km/week', hours: '~8–11h' },
    Advanced:     { metric: '5:00 min/km trail', vol: '65–80 km/week', hours: '~11–15h' },
  },
  Cycling: {
    Beginner:     { metric: 'FTP ~150W (2.1 W/kg)', vol: '4–6h/week',   hours: '~5–7h' },
    Intermediate: { metric: 'FTP ~220W (3.1 W/kg)', vol: '7–9h/week',   hours: '~8–10h' },
    Advanced:     { metric: 'FTP ~300W (4.3 W/kg)', vol: '10–14h/week', hours: '~11–14h' },
  },
  'Gravel/MTB': {
    Beginner:     { metric: 'FTP ~140W (2.0 W/kg)', vol: '4–6h/week',   hours: '~5–7h' },
    Intermediate: { metric: 'FTP ~210W (3.0 W/kg)', vol: '7–10h/week',  hours: '~8–11h' },
    Advanced:     { metric: 'FTP ~280W (4.0 W/kg)', vol: '11–15h/week', hours: '~11–15h' },
  },
  Swimming: {
    Beginner:     { metric: '2:30 min/100m', vol: '3–5 km/week',   hours: '~3–5h' },
    Intermediate: { metric: '1:50 min/100m', vol: '8–12 km/week',  hours: '~5–8h' },
    Advanced:     { metric: '1:20 min/100m', vol: '15–20 km/week', hours: '~8–12h' },
  },
  'Open Water Swimming': {
    Beginner:     { metric: '2:45 min/100m OWS', vol: '4–6 km/week',   hours: '~3–5h' },
    Intermediate: { metric: '2:00 min/100m OWS', vol: '9–13 km/week',  hours: '~5–8h' },
    Advanced:     { metric: '1:30 min/100m OWS', vol: '16–22 km/week', hours: '~8–12h' },
  },
  Triathlon: {
    Beginner:     { metric: 'FTP ~150W / Run pace ~6:30/km / Swim ~2:30/100m', vol: 'Multi', hours: '~8–10h' },
    Intermediate: { metric: 'FTP ~220W / Run pace ~5:15/km / Swim ~1:55/100m', vol: 'Multi', hours: '~10–13h' },
    Advanced:     { metric: 'FTP ~300W / Run pace ~4:15/km / Swim ~1:25/100m', vol: 'Multi', hours: '~13–17h' },
  },
  Duathlon: {
    Beginner:     { metric: 'Run pace ~6:00/km / FTP ~145W', vol: 'Multi', hours: '~6–8h' },
    Intermediate: { metric: 'Run pace ~5:00/km / FTP ~215W', vol: 'Multi', hours: '~9–12h' },
    Advanced:     { metric: 'Run pace ~4:00/km / FTP ~285W', vol: 'Multi', hours: '~12–16h' },
  },
  Gym: {
    Beginner:     { metric: 'Est. 60% 1RM', vol: '3 sessions/week', hours: '~3–4h' },
    Intermediate: { metric: '70–75% 1RM',   vol: '4 sessions/week', hours: '~4–5h' },
    Advanced:     { metric: '80–85% 1RM',   vol: '5 sessions/week', hours: '~5–7h' },
  },
}

// ------------------------------------------------------------
// Date helpers — weeks ALWAYS start on Monday
// (must stay consistent with scripts/apps-script.gs)
// ------------------------------------------------------------
function nextMonday(from: Date): Date {
  const d = new Date(from)
  const day = d.getDay() // 0=Sun, 1=Mon, ...
  const daysUntilMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day
  d.setDate(d.getDate() + daysUntilMonday)
  d.setHours(0, 0, 0, 0)
  return d
}

function thisMonday(from: Date): Date {
  const d = new Date(from)
  const day = d.getDay()
  const daysBack = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + daysBack)
  d.setHours(0, 0, 0, 0)
  return d
}

function shortDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${dd}/${mm}/${yy}`
}

// ------------------------------------------------------------
// Plan metadata — computed deterministically in TS so every
// chunk (generated in parallel) agrees on dates, recovery
// weeks and taper placement.
// ------------------------------------------------------------
export type PlanMeta = {
  weeksTotal: number
  planStartDate: Date
  planStartFormatted: string
  eventDateFormatted: string
  refMetric: string
  refHours: string
  /** week numbers that MUST be recovery/deload weeks */
  recoveryWeeks: number[]
  /** week numbers that form the final taper */
  taperWeeks: number[]
  /** "Week N: dd/mm–dd/mm/yy" for every week */
  weekDates: { week: number; dates: string }[]
}

export function getPlanMeta(quiz: QuizData): PlanMeta {
  const eventDate = parseISO(quiz.event_date)
  const today = new Date()
  const planStartDate = quiz.plan_start === 'this_week' ? thisMonday(today) : nextMonday(today)

  const rawWeeks = differenceInCalendarWeeks(eventDate, planStartDate, { weekStartsOn: 1 })
  const weeksTotal = Math.min(MAX_WEEKS, Math.max(4, rawWeeks))

  const benchmark = BENCHMARKS[quiz.sport]?.[quiz.level]
  const refMetric = quiz.metric?.trim() || benchmark?.metric || 'not provided'
  const refHours = benchmark?.hours || '~8–10h'

  // Taper: last 2 weeks (3 for plans of 24+ weeks)
  const taperLen = weeksTotal >= 24 ? 3 : 2
  const taperWeeks = Array.from({ length: taperLen }, (_, i) => weeksTotal - taperLen + 1 + i)

  // Recovery: every 4th week, excluding taper and the final pre-taper week
  const recoveryWeeks: number[] = []
  for (let w = 4; w <= weeksTotal - taperLen - 1; w += 4) recoveryWeeks.push(w)

  const weekDates = Array.from({ length: weeksTotal }, (_, i) => {
    const start = new Date(planStartDate)
    start.setDate(start.getDate() + i * 7)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)
    return { week: i + 1, dates: `${shortDate(start)}–${shortDate(end)}` }
  })

  return {
    weeksTotal,
    planStartDate,
    planStartFormatted: format(planStartDate, 'dd MMMM yyyy'),
    eventDateFormatted: format(eventDate, 'dd MMMM yyyy'),
    refMetric,
    refHours,
    recoveryWeeks,
    taperWeeks,
    weekDates,
  }
}

// ------------------------------------------------------------
// Shared blocks
// ------------------------------------------------------------
function athleteProfileBlock(quiz: QuizData, meta: PlanMeta): string {
  const secondary = quiz.secondary_sports?.length
    ? `\nSECONDARY SPORTS (complement the plan): ${quiz.secondary_sports.join(', ')}`
    : ''
  const injuries = quiz.injuries && quiz.injuries !== 'none'
    ? `\nINJURIES / LIMITATIONS: ${quiz.injuries} — reduce load and avoid exercises that aggravate this condition.`
    : ''
  const races = quiz.intermediate_races?.length
    ? `\nINTERMEDIATE RACE CALENDAR:\n${quiz.intermediate_races
        .map(r => `- ${r.date}: ${r.name} (${r.distance}) — role: ${r.role}`)
        .join('\n')}`
    : ''

  return `ATHLETE PROFILE:
- Name: ${quiz.name}
- Sport: ${quiz.sport}
- Main event: ${quiz.event_name || quiz.sport}${quiz.race_distance_km ? ` (${quiz.race_distance_km})` : ''} — ${meta.eventDateFormatted}
- Goal: ${quiz.goal_time || 'finish the race'}
- Plan start date: ${meta.planStartFormatted} (a Monday — every training week runs Monday→Sunday)
- Declared level: ${quiz.level}
- Reference metric: ${meta.refMetric}
- Available training days per week: ${quiz.days_per_week}
- Weight: ${quiz.weight_kg} kg${quiz.age ? `\n- Age: ${quiz.age} years (adjust recovery needs and intensity distribution accordingly${quiz.age >= 45 ? ' — masters athlete: prioritise recovery, limit consecutive hard days' : ''})` : ''}
- Weeks until the event: ${meta.weeksTotal}
- Expected average volume: ${meta.refHours}/week${secondary}${injuries}${races}`
}

function zoneFormulasBlock(): string {
  return `ZONE CALCULATION — use these exact formulas on the athlete's reference metric (or the benchmark if no real metric):
- BIKE (from FTP): Z1 <55% FTP · Z2 56–75% · Z3 76–90% · Z4 91–105% · Z5 >106%. Express each zone in watts. If weight is known, also keep W/kg in mind for realism.
- RUN (from threshold pace): Z1 = threshold +60–90s/km · Z2 = +30–60s/km · Z3 = +10–30s/km · Z4 = threshold ±10s/km · Z5 = faster than threshold −10s/km. Express as min/km ranges.
- SWIM (from CSS / 100m pace): Z1 = CSS +15–25s/100m · Z2 = +8–15s · Z3 = +3–8s · Z4 = CSS ±3s · Z5 = faster than CSS −3s. Express as min/100m ranges.
- HEART RATE: Z1 <68% HRmax · Z2 68–78% · Z3 78–85% · Z4 85–92% · Z5 >92%. If age is known estimate HRmax = 208 − 0.7×age and express zones in bpm; otherwise express as %HRmax.`
}

function sportSpecificBlock(quiz: QuizData): string {
  const blocks: Record<string, string> = {
    Triathlon: `- 3 disciplines (swim/bike/run) distributed across ${quiz.days_per_week} days
- Include brick sessions (bike + run) from Phase 2 onwards
- Strength gym 2×/week in Phases 1–2, maintenance 1×/week in later phases
- Focus on the weakest discipline in early phases
- Long ride Saturday + long run Sunday pattern where possible`,
    Duathlon: `- Run and bike distributed across ${quiz.days_per_week} days, with run slightly prioritised (two run segments on race day)
- Include run-bike-run brick sessions from Phase 2 onwards
- Practise the bike→run transition weekly in the final build phase
- Strength 2×/week in Phases 1–2, maintenance later`,
    Running: `- Intensity distribution: ~80% Z1–Z2, ~15% Z3–Z4, ~5% Z5 (80/20 principle)
- Weekly long run (Z2, progressively longer; cap single-week jumps at ~10%)
- One quality interval session per week from Phase 2 onwards
- Functional strength 2×/week in Phases 1–2
- Include strides (4–6×20s) at the end of one easy run per week`,
    'Trail Running': `- Same 80/20 intensity distribution as road running
- Weekly long run on trails with cumulative elevation gain that progresses toward the race profile
- Include hill repeats (uphill strength + downhill technique) from Phase 2
- Strength 2×/week with emphasis on eccentric quad work and ankle stability
- One session per week practising hiking/poles if the race involves steep gradients`,
    Cycling: `- Mix indoor sessions (structured intervals) and outdoor (long endurance volume)
- Focus on FTP development in Phases 2–3, VO2max touches in the final build
- Cycling-specific strength (lower body) 2×/week in Phases 1–2
- Long ride progresses toward race distance/duration; include race-pace efforts inside long rides in the final phase`,
    'Gravel/MTB': `- Mix road/trainer intervals with off-road skill rides every week
- Include sustained tempo/sweet-spot work (gravel races are long sustained efforts) plus repeated 1–3min surges (technical sections, punchy climbs)
- Handling/skills focus: cornering, descending, riding loose surfaces — at least one technical ride weekly
- Strength 2×/week including core and upper-body stability for rough terrain
- Practise race-day fuelling on long rides from mid-plan onwards`,
    Swimming: `- Technique before volume: first weeks emphasise stroke mechanics
- Include specific drill sets (catch-up, fingertip drag, sculling; tools: pull buoy, kickboard, paddles) in early phases
- Speed work (sprints, descending sets) from Phase 2 onwards
- Structure sessions as warm-up / drill set / main set / cool-down with exact metres and rest intervals
- Dryland strength 2×/week (shoulder stability, lats, core)`,
    'Open Water Swimming': `- Pool sessions build fitness; add open-water specificity (sighting every 6–8 strokes, drafting, deep-water starts, wetsuit familiarity) at least once per week from mid-plan
- Continuous swims without wall push-offs to simulate open water
- Practise race-pace surges (start simulation: 50–100m hard then settle)
- Include cold-water adaptation notes if the race is early/late season
- Dryland strength 2×/week (shoulders, core)`,
    Gym: `- Push/Pull/Legs or Upper/Lower split based on ${quiz.days_per_week} days
- Progression: hypertrophy → strength → peaking blocks
- Include compound AND isolation exercises with exact sets, reps, %1RM or RPE, and rest periods
- Apply progressive overload week to week; deload weeks reduce volume ~40% keeping intensity moderate`,
  }
  return blocks[quiz.sport] || `- Apply the principles of progressive overload, specificity and recovery appropriate to ${quiz.sport}`
}

function qualityRulesBlock(quiz: QuizData, meta: PlanMeta): string {
  return `QUALITY RULES — MANDATORY:

1. DETAILED, REALISTIC SESSIONS
   - Every session must include: warm-up, main set, cool-down
   - Include sets, reps, distances, zones, cadence — never vague
   - Good example: "WU 10min Z1 · 4×8min Z3 w/ 3min Z1 jog · CD 10min"
   - Bad example: "Moderate run" (too generic)
   - Include a suggested time of day when it makes sense (morning/evening)
   - Include a one-line objective for each session

2. LOGICAL PROGRESSION
   - Volume increases 5–8% per week during loading phases
   - Intensity rises gradually within each block
   - NEVER increase volume AND intensity in the same week

3. SPORT-SPECIFIC REQUIREMENTS FOR ${quiz.sport.toUpperCase()}:
   ${sportSpecificBlock(quiz)}

4. AVAILABLE DAYS: ${quiz.days_per_week} days/week — distribute sessions intelligently:
   - Recovery between high-intensity days; never stack hard days back-to-back
   - The day before the long session = rest or easy recovery

5. FIXED CALENDAR CONSTRAINTS (already decided — do not change them):
   - Recovery/deload weeks (volume −30 to −40%): weeks ${meta.recoveryWeeks.join(', ') || 'none'}
   - Taper weeks (final freshness, volume drops progressively, keep short intensity touches): weeks ${meta.taperWeeks.join(', ')}
   - The event is at the end of week ${meta.weeksTotal}`
}

// ------------------------------------------------------------
// PROMPT 1 — Skeleton (profile, zones, periodization,
// strength, race-day plan, optional nutrition plan)
// ------------------------------------------------------------
export function buildSkeletonPrompt(quiz: QuizData): string {
  const meta = getPlanMeta(quiz)

  const nutritionField = quiz.nutrition_upsell
    ? `,
  "nutrition_plan": {
    "pre_workout": { "timing": string, "carbs_g": number, "protein_g": number, "hydration_ml": number, "suggestions": string[] },
    "during": [{ "zone": string, "carbs_per_hour": number, "hydration_per_hour": number }],
    "post_workout": { "timing": string, "carbs_g": number, "protein_g": number, "hydration_ml": number, "suggestions": string[] },
    "race_day": [{ "timing": string, "carbs_g": number, "protein_g": number, "hydration_ml": number, "suggestions": string[] }]
  }`
    : ''

  const nutritionInstr = quiz.nutrition_upsell
    ? `\nNUTRITION PLAN: personalise carbohydrate and hydration targets to the athlete's weight (${quiz.weight_kg}kg), sport and zones. Race-day timeline must cover from wake-up through each race segment.`
    : ''

  return `Generate everything in ENGLISH.

You are an elite endurance and strength coach with 20 years of experience creating periodized, realistic training plans.

${athleteProfileBlock(quiz, meta)}

${zoneFormulasBlock()}

TASK — generate the plan FOUNDATION (not the weekly sessions yet):

1. PERIODIZATION: split the ${meta.weeksTotal} weeks into realistic blocks (Base / Build / Peak / Taper, adapted to plan length). The taper occupies weeks ${meta.taperWeeks.join(', ')}. If intermediate races exist, plan around them. The sum of "weeks" across blocks MUST equal ${meta.weeksTotal}.

2. ZONES: calculate precise zones from the reference metric using the formulas above. Only include the zone tables relevant to ${quiz.sport} (always include "hr").

3. PERSONALISED STRENGTH PROGRAM: 2–3 sessions tailored to ${quiz.sport} at ${quiz.level} level${quiz.injuries && quiz.injuries !== 'none' ? `, avoiding anything that aggravates: ${quiz.injuries}` : ''}. ph1 = foundation, ph2 = development, ph3 = maintenance.

4. RACE DAY PLAN: wake-up time relative to start, breakfast, per-segment targets (pace/power, nutrition, key notes), transition checklists if multisport, and 3–4 mental cues.${nutritionInstr}

OUTPUT FORMAT:
Respond with ONLY valid JSON. No text before or after. No markdown. No \`\`\`.
Exactly this structure:

{
  "profile": {
    "name": string, "sport": string, "event_name": string, "event_date": string,
    "goal_time": string, "level": string, "metric": string,
    "weeks_total": ${meta.weeksTotal}, "hours_per_week_avg": string, "summary": string
  },
  "zones": {
    "run": { "z1": string, "z2": string, "z3": string, "z4": string, "z5": string },
    "bike": { "z1": string, "z2": string, "z3": string, "z4": string, "z5": string },
    "swim": { "z1": string, "z2": string, "z3": string, "z4": string, "z5": string },
    "hr": { "z1": string, "z2": string, "z3": string, "z4": string, "z5": string }
  },
  "periodization": [
    { "phase": string, "start_date": string, "end_date": string, "weeks": number, "focus": string, "volume_per_week": string, "intensity": string }
  ],
  "strength_program": [
    { "session_name": string, "day_suggestion": string, "exercises": [
      { "name": string, "primary_muscle": string, "secondary_muscle": string, "sport_reason": string, "ph1": string, "ph2": string, "ph3": string }
    ]}
  ],
  "race_day_plan": {
    "wake_up": string, "breakfast": string,
    "segments": [{ "segment": string, "target_time": string, "pace_target": string, "nutrition": string, "notes": string }],
    "transitions": string[], "mental_cues": string[]
  }${nutritionField}
}

Omit zone tables that don't apply to ${quiz.sport} (e.g. no "swim" for a pure runner), but ALWAYS include "hr".`
}

// ------------------------------------------------------------
// PROMPT 2 — One chunk of detailed weeks
// ------------------------------------------------------------
export function buildWeeksChunkPrompt(
  quiz: QuizData,
  meta: PlanMeta,
  skeleton: { zones: unknown; periodization: unknown },
  fromWeek: number,
  toWeek: number
): string {
  const chunkDates = meta.weekDates
    .filter(w => w.week >= fromWeek && w.week <= toWeek)
    .map(w => {
      const tags = [
        meta.recoveryWeeks.includes(w.week) ? 'RECOVERY WEEK' : '',
        meta.taperWeeks.includes(w.week) ? 'TAPER' : '',
        w.week === meta.weeksTotal ? 'RACE WEEK — event at the end of this week' : '',
      ].filter(Boolean).join(', ')
      return `- Week ${w.week}: ${w.dates}${tags ? ` (${tags})` : ''}`
    })
    .join('\n')

  return `Generate everything in ENGLISH.

You are an elite endurance and strength coach. You are writing weeks ${fromWeek}–${toWeek} of a ${meta.weeksTotal}-week plan. Other weeks are being written separately — follow the fixed calendar and periodization below so everything stays coherent.

${athleteProfileBlock(quiz, meta)}

ALREADY-DEFINED TRAINING ZONES (use these exact values in sessions):
${JSON.stringify(skeleton.zones)}

ALREADY-DEFINED PERIODIZATION (assign each week the correct phase):
${JSON.stringify(skeleton.periodization)}

WEEKS TO GENERATE (with fixed dates and constraints):
${chunkDates}

${qualityRulesBlock(quiz, meta)}

6. WEEKLY VOLUME ANCHORING (so parallel chunks stay coherent):
   - Derive each week's volume from the periodization block it belongs to and its position within the block (early weeks of a block lighter, later weeks heavier, +5–8%/week)
   - Recovery weeks: −30 to −40% volume vs the previous loading week
   - Taper: progressive reduction reaching ~50% of peak volume in race week, keeping short Z3–Z4 touches for freshness

OUTPUT FORMAT:
Respond with ONLY valid JSON. No text before or after. No markdown. No \`\`\`.
Exactly this structure:

{
  "weeks": [
    {
      "week_num": number,
      "dates": string,
      "phase": string,
      "focus": string,
      "total_hours": string,
      "is_recovery": boolean,
      "sessions": [
        { "day": string, "sport": string, "description": string, "duration": string, "distance": string, "zone": string, "time_of_day": string, "objective": string }
      ]
    }
  ]
}

Generate ALL weeks from ${fromWeek} to ${toWeek}, each with sessions for the athlete's ${quiz.days_per_week} training days. Use the exact "dates" strings provided above. Professional-coach quality — do not cut detail.`
}

// ------------------------------------------------------------
// Legacy single-shot prompt (kept for reference/tests)
// ------------------------------------------------------------
export function buildPrompt(quiz: QuizData): string {
  return buildSkeletonPrompt(quiz)
}
