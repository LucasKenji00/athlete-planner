// ============================================================
// PROMPT — o ativo mais importante do produto
// É aqui que vive o teu conhecimento de coaching
// ============================================================

import type { QuizData } from '@/types'
import { differenceInWeeks, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Benchmarks internos por modalidade × nível
// Usados quando o atleta não tem métrica real
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
    Beginner:     { metric: 'FTP ~150W / Pace run ~6:30/km / Swim ~2:30/100m', vol: 'Multi', hours: '~8–10h' },
    Intermediate: { metric: 'FTP ~220W / Pace run ~5:15/km / Swim ~1:55/100m', vol: 'Multi', hours: '~10–13h' },
    Advanced:     { metric: 'FTP ~300W / Pace run ~4:15/km / Swim ~1:25/100m', vol: 'Multi', hours: '~13–17h' },
  },
  Duathlon: {
    Beginner:     { metric: 'Pace run ~6:00/km / FTP ~145W', vol: 'Multi', hours: '~6–8h' },
    Intermediate: { metric: 'Pace run ~5:00/km / FTP ~215W', vol: 'Multi', hours: '~9–12h' },
    Advanced:     { metric: 'Pace run ~4:00/km / FTP ~285W', vol: 'Multi', hours: '~12–16h' },
  },
  Gym: {
    Beginner:     { metric: 'Est. 60% 1RM', vol: '3 sessions/week', hours: '~3–4h' },
    Intermediate: { metric: '70–75% 1RM',   vol: '4 sessions/week', hours: '~4–5h' },
    Advanced:     { metric: '80–85% 1RM',   vol: '5 sessions/week', hours: '~5–7h' },
  },
}

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

export function buildPrompt(quiz: QuizData): string {
  const eventDate = parseISO(quiz.event_date)
  const today = new Date()
  const weeksTotal = Math.max(4, differenceInWeeks(eventDate, today))
  const eventDateFormatted = format(eventDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  const planStartDate = quiz.plan_start === 'this_week' ? thisMonday(today) : nextMonday(today)
  const planStartFormatted = format(planStartDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })

  const benchmark = BENCHMARKS[quiz.sport]?.[quiz.level]
  const refMetric = quiz.metric?.trim() || benchmark?.metric || 'não informado'
  const refHours  = benchmark?.hours  || '~8–10h'

  const secondarySportsSection = quiz.secondary_sports?.length
    ? `\nSECONDARY SPORTS (complement the plan): ${quiz.secondary_sports.join(', ')}\n`
    : ''

  const injuriesSection = quiz.injuries && quiz.injuries !== 'none'
    ? `\nINJURIES / LIMITATIONS: ${quiz.injuries} — adjust load and avoid exercises that aggravate this condition.\n`
    : ''

  const racesSection = quiz.intermediate_races?.length
    ? `\nCALENDÁRIO DE PROVAS INTERMÉDIAS:\n${quiz.intermediate_races.map(r =>
        `- ${r.date}: ${r.name} (${r.distance}) — papel: ${r.role}`
      ).join('\n')}\n`
    : ''

  const nutritionSection = quiz.nutrition_upsell
    ? `\nIncluir também o campo "nutrition_plan" no JSON com:\n- pre_workout: timing, carbs_g, protein_g, hydration_ml, suggestions[]\n- during: array de zonas com carbs_per_hour e hydration_per_hour\n- post_workout: igual ao pre_workout\n- race_day: array de timings para cada segmento da prova\n`
    : ''

  // -----------------------------------------------------------------
  // O prompt propriamente dito
  // -----------------------------------------------------------------
  return `IMPORTANT: Generate the entire plan in English. All session descriptions, phase names, focus text, zone labels, objectives, periodization names — everything must be in English.

You are an elite athletics and triathlon coach with 20 years of experience.
Your specialty is creating periodized, detailed and realistic training plans,
adapted to each athlete's exact profile — technical level, availability, performance
data and race calendar.

PERFIL DO ATLETA:
- Nome: ${quiz.name}
- Modalidade: ${quiz.sport}
- Prova principal: ${quiz.event_name || quiz.sport}${quiz.race_distance_km ? ` (${quiz.race_distance_km})` : ''} — ${eventDateFormatted}
- Meta: ${quiz.goal_time || 'completar a prova'}
- Data de início do plano: ${planStartFormatted}
- Nível declarado: ${quiz.level}
- Métrica de referência: ${refMetric}
- Dias de treino disponíveis por semana: ${quiz.days_per_week}
- Peso: ${quiz.weight_kg} kg${quiz.age ? `\n- Idade: ${quiz.age} anos` : ''}
- Semanas até a prova: ${weeksTotal}
- Volume médio esperado: ${refHours}/semana
${secondarySportsSection}${injuriesSection}${racesSection}
INSTRUÇÕES DE QUALIDADE — OBRIGATÓRIAS:

1. PERIODICIDADE REAL
   - Distribui as semanas em blocos de periodização realistas para ${weeksTotal} semanas
   - Inclui semanas de descarga a cada 3–4 semanas (volume -30 a 40%)
   - O taper final deve ocupar as últimas 2–4 semanas antes da prova
   - Se houver provas intermédias, ajusta o treino antes/depois delas

2. SESSÕES DETALHADAS E REALISTAS
   - Cada sessão deve ter descrição completa: aquecimento, parte principal, desaquecimento
   - Inclui séries, repetições, distâncias, zonas, cadência — não deixa vago
   - Exemplo bom: "Aq. 10min Z1 · 4×8min Z3 c/ 3min trote Z1 · Desaq. 10min"
   - Exemplo mau: "Treino de corrida moderado" (genérico demais)
   - Inclui horário sugerido quando faz sentido (manhã/tarde)
   - Inclui objetivo de cada sessão (1 linha)

3. ZONAS DE TREINO PRECISAS
   - Calcula zonas baseadas na métrica real (ou benchmark se não tiver)
   - Para corrida: pace min/km por zona (Z1 a Z5)
   - Para bike: watts e % FTP por zona
   - Para natação: pace min/100m por zona
   - Para FC: % FCmax por zona

4. PROGRESSÃO LÓGICA
   - Volume aumenta 5–8% por semana nas fases de carga
   - Intensidade aumenta gradualmente dentro de cada bloco
   - Nunca aumenta volume E intensidade na mesma semana

5. ESPECIFICIDADE POR MODALIDADE
   ${quiz.sport === 'Triathlon' ? `
   - 3 disciplines (swim/bike/run) distributed across ${quiz.days_per_week} days
   - Include brick sessions (bike + run) from Phase 2 onwards
   - Strength gym 2×/week in Phases 1–2, maintenance in Phases 3–4
   - Focus on weakest discipline in early phases` : ''}
   ${quiz.sport === 'Running' ? `
   - Distribution: ~80% Z2, ~15% Z3-Z4, ~5% Z5 (80/20 principle)
   - Include weekly long run (Z2 pace, increasing distance)
   - Interval session once per week from Phase 2 onwards
   - Functional strength 2×/week in Phases 1–2` : ''}
   ${quiz.sport === 'Cycling' ? `
   - Include indoor sessions (intervals) and outdoor (long volume)
   - Focus on FTP in Phases 2–3, VO2max in Phase 4
   - Cycling-specific strength (lower body) 2×/week in Phases 1–2` : ''}
   ${quiz.sport === 'Swimming' ? `
   - Technical progression before volume: first weeks focus on stroke mechanics
   - Include specific drills (buoy, kickboard, paddles) in early phases
   - Speed sessions (sprints) from Phase 2 onwards` : ''}
   ${quiz.sport === 'Gym' ? `
   - Push/Pull/Legs or Upper/Lower structure based on ${quiz.days_per_week} days
   - Progression: hypertrophy → strength → peaking
   - Include compound AND isolation exercises with sets, reps, rest periods` : ''}

6. DIAS DISPONÍVEIS: ${quiz.days_per_week} dias/semana
   - Distribui as sessões de forma inteligente (recuperação entre intensidades)
   - Não sobrecarrega dias consecutivos com alta intensidade
   - Sexta ou dia antes do treino longo = descanso ou recovery

7. PERSONALISED STRENGTH PROGRAM
   - Generate a strength_program array with 2-3 sessions tailored specifically for ${quiz.sport} at ${quiz.level} level
   - Choose exercises based on the specific demands of ${quiz.sport}
   - If injuries/limitations exist (${quiz.injuries || 'none'}), avoid exercises that aggravate them
   - Distribute across available days (${quiz.days_per_week} days/week)
   - Include progression across phases (ph1 = foundation, ph2 = development, ph3 = maintenance)
   - For endurance sports: focus on injury prevention and sport-specific strength
   - For gym/strength sports: full hypertrophy and strength progression
${nutritionSection}
FORMATO DE OUTPUT:
Responde APENAS com JSON válido. Sem texto antes ou depois. Sem markdown.
Sem \`\`\`json. Apenas o objeto JSON puro.

O JSON deve seguir EXATAMENTE esta estrutura:

{
  "profile": {
    "name": string,
    "sport": string,
    "event_name": string,
    "event_date": string,
    "goal_time": string,
    "level": string,
    "metric": string,
    "weeks_total": number,
    "hours_per_week_avg": string,
    "summary": string
  },
  "zones": {
    "run": { "z1": string, "z2": string, "z3": string, "z4": string, "z5": string },
    "bike": { "z1": string, "z2": string, "z3": string, "z4": string, "z5": string },
    "swim": { "z1": string, "z2": string, "z3": string, "z4": string, "z5": string },
    "hr": { "z1": string, "z2": string, "z3": string, "z4": string, "z5": string }
  },
  "periodization": [
    {
      "phase": string,
      "start_date": string,
      "end_date": string,
      "weeks": number,
      "focus": string,
      "volume_per_week": string,
      "intensity": string
    }
  ],
  "weeks": [
    {
      "week_num": number,
      "dates": string,
      "phase": string,
      "focus": string,
      "total_hours": string,
      "is_recovery": boolean,
      "sessions": [
        {
          "day": string,
          "sport": string,
          "description": string,
          "duration": string,
          "distance": string,
          "zone": string,
          "time_of_day": string,
          "objective": string
        }
      ]
    }
  ],
  "strength_program": [
    {
      "session_name": string,
      "day_suggestion": string,
      "exercises": [
        {
          "name": string,
          "primary_muscle": string,
          "secondary_muscle": string,
          "sport_reason": string,
          "ph1": string,
          "ph2": string,
          "ph3": string
        }
      ]
    }
  ]${quiz.nutrition_upsell ? `,
  "nutrition_plan": {
    "pre_workout": { "timing": string, "carbs_g": number, "protein_g": number, "hydration_ml": number, "suggestions": string[] },
    "during": [{ "zone": string, "carbs_per_hour": number, "hydration_per_hour": number }],
    "post_workout": { "timing": string, "carbs_g": number, "protein_g": number, "hydration_ml": number, "suggestions": string[] },
    "race_day": [{ "timing": string, "carbs_g": number, "protein_g": number, "hydration_ml": number, "suggestions": string[] }]
  }` : ''}
}

Gera o plano COMPLETO para todas as ${weeksTotal} semanas.
Cada semana com todas as sessões dos ${quiz.days_per_week} dias de treino.
Qualidade de coach profissional — não cortes detalhes.`
}