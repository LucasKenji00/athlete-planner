// ============================================================
// ICS — "Add to Calendar" generator
// Converts the generated plan into an iCalendar file so every
// session lands on the athlete's Google/Apple calendar.
// Weeks are Monday-based (consistent with lib/prompt.ts).
// ============================================================

import type { GeneratedPlan } from '@/types'

const DAY_OFFSET: Record<string, number> = {
  monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
  friday: 4, saturday: 5, sunday: 6,
  // tolerate PT just in case
  'segunda-feira': 0, segunda: 0, 'terça-feira': 1, terca: 1, 'terça': 1,
  'quarta-feira': 2, quarta: 2, 'quinta-feira': 3, quinta: 3,
  'sexta-feira': 4, sexta: 4, 'sábado': 5, sabado: 5, domingo: 6,
}

const SPORT_EMOJI: Record<string, string> = {
  running: '🏃', 'trail running': '🏔️', cycling: '🚴', bike: '🚴',
  'gravel/mtb': '🚵', swimming: '🏊', 'open water swimming': '🌊',
  triathlon: '🏅', duathlon: '⚡', gym: '💪', strength: '💪',
}

/** "this_week" / "next_week" → the plan's Monday start date (same logic as prompt.ts) */
export function planStartMonday(planStart: string | undefined, from = new Date()): Date {
  const d = new Date(from)
  d.setHours(0, 0, 0, 0)
  const day = d.getDay() // 0=Sun
  if (planStart === 'this_week') {
    d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  } else {
    d.setDate(d.getDate() + (day === 0 ? 1 : day === 1 ? 7 : 8 - day))
  }
  return d
}

/** "~60min" | "50 min" | "~3h20" | "1h" → minutes (default 60) */
function parseDurationMinutes(duration?: string): number {
  if (!duration) return 60
  const s = duration.toLowerCase()
  const h = s.match(/(\d+(?:[.,]\d+)?)\s*h/)
  const m = s.match(/(\d+)\s*m/) || (h ? s.match(/h\s*(\d+)/) : null)
  let total = 0
  if (h) total += Math.round(parseFloat(h[1].replace(',', '.')) * 60)
  if (m) total += parseInt(m[1])
  if (!h && !m) {
    const onlyNum = s.match(/(\d+)/)
    if (onlyNum) total = parseInt(onlyNum[1])
  }
  return total > 0 && total < 12 * 60 ? total : 60
}

/** "18:45" | "18h45" | "07h00–08h00" → {h, m} or null */
function parseStartTime(timeOfDay?: string): { h: number; m: number } | null {
  if (!timeOfDay) return null
  const m = timeOfDay.match(/(\d{1,2})[:h](\d{2})/)
  if (!m) {
    const word = timeOfDay.toLowerCase()
    if (word.includes('morning') || word.includes('manhã')) return { h: 7, m: 0 }
    if (word.includes('lunch')) return { h: 12, m: 30 }
    if (word.includes('evening') || word.includes('afternoon') || word.includes('tarde') || word.includes('noite')) return { h: 18, m: 30 }
    return null
  }
  const h = parseInt(m[1]); const min = parseInt(m[2])
  if (h > 23 || min > 59) return null
  return { h, m: min }
}

const pad = (n: number) => String(n).padStart(2, '0')
const fmtDate = (d: Date) => `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`
const fmtDateTime = (d: Date) =>
  `${fmtDate(d)}T${pad(d.getHours())}${pad(d.getMinutes())}00`

/** Escape per RFC 5545 */
function esc(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Fold lines at 75 octets (approx by chars — fine for our content) */
function fold(line: string): string {
  if (line.length <= 73) return line
  const parts: string[] = []
  let rest = line
  parts.push(rest.slice(0, 73)); rest = rest.slice(73)
  while (rest.length > 0) { parts.push(' ' + rest.slice(0, 72)); rest = rest.slice(72) }
  return parts.join('\r\n')
}

export function buildPlanIcs(
  plan: GeneratedPlan,
  planStart: string | undefined,
  sessionId: string
): string {
  const start = planStartMonday(planStart)
  const stamp = fmtDateTime(new Date()) + 'Z'
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Athlete Planner//Training Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    fold(`X-WR-CALNAME:${esc(`${plan.profile.sport} — ${plan.profile.event_name || 'Training Plan'}`)}`),
  ]

  for (const week of plan.weeks ?? []) {
    for (let i = 0; i < (week.sessions ?? []).length; i++) {
      const s = week.sessions[i]
      const offset = DAY_OFFSET[(s.day || '').trim().toLowerCase()]
      if (offset === undefined) continue

      const date = new Date(start)
      date.setDate(date.getDate() + (week.week_num - 1) * 7 + offset)

      const emoji = SPORT_EMOJI[(s.sport || '').toLowerCase()] ?? '🏋️'
      const summary = `${emoji} ${s.sport}${s.zone && s.zone !== '—' ? ` · ${s.zone}` : ''}${week.is_recovery ? ' (recovery wk)' : ''}`
      const descParts = [
        s.description,
        s.objective ? `Objective: ${s.objective}` : '',
        s.distance ? `Distance: ${s.distance}` : '',
        `Week ${week.week_num} · ${week.phase} · ${week.focus}`,
      ].filter(Boolean)

      const startTime = parseStartTime(s.time_of_day)
      const uid = `ap-${sessionId}-w${week.week_num}-s${i}@athleteplanner`

      lines.push('BEGIN:VEVENT')
      lines.push(fold(`UID:${uid}`))
      lines.push(`DTSTAMP:${stamp}`)
      if (startTime) {
        const dtStart = new Date(date); dtStart.setHours(startTime.h, startTime.m, 0, 0)
        const dtEnd = new Date(dtStart); dtEnd.setMinutes(dtEnd.getMinutes() + parseDurationMinutes(s.duration))
        lines.push(`DTSTART:${fmtDateTime(dtStart)}`)
        lines.push(`DTEND:${fmtDateTime(dtEnd)}`)
      } else {
        const next = new Date(date); next.setDate(next.getDate() + 1)
        lines.push(`DTSTART;VALUE=DATE:${fmtDate(date)}`)
        lines.push(`DTEND;VALUE=DATE:${fmtDate(next)}`)
      }
      lines.push(fold(`SUMMARY:${esc(summary)}`))
      lines.push(fold(`DESCRIPTION:${esc(descParts.join('\n'))}`))
      lines.push('END:VEVENT')
    }
  }

  // Race day 🏁
  if (plan.profile.event_date) {
    const race = new Date(plan.profile.event_date)
    if (!isNaN(race.getTime())) {
      const next = new Date(race); next.setDate(next.getDate() + 1)
      lines.push('BEGIN:VEVENT')
      lines.push(fold(`UID:ap-${sessionId}-race@athleteplanner`))
      lines.push(`DTSTAMP:${stamp}`)
      lines.push(`DTSTART;VALUE=DATE:${fmtDate(race)}`)
      lines.push(`DTEND;VALUE=DATE:${fmtDate(next)}`)
      lines.push(fold(`SUMMARY:${esc(`🏁 RACE DAY — ${plan.profile.event_name || plan.profile.sport}`)}`))
      lines.push(fold(`DESCRIPTION:${esc(`Goal: ${plan.profile.goal_time || 'finish strong'}. You trained ${plan.profile.weeks_total} weeks for this. Go get it!`)}`))
      lines.push('END:VEVENT')
    }
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}
