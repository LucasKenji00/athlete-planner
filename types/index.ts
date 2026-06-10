// ============================================================
// TYPES — compartilhados em todo o projeto
// ============================================================

// O que o utilizador preenche no quiz
export type QuizData = {
  // Passo 1 — modalidade
  sport: 'Corrida' | 'Trail Running' | 'Ciclismo' | 'Gravel/MTB' | 'Natação' | 'Open Water Swimming' | 'Triathlon' | 'Duathlon' | 'Academia'
  secondary_sports?: string[]

  // Passo 2 — evento e meta
  event_date: string          // ISO: "2027-04-18"
  event_name?: string         // "Ironman Valencia 70.3"
  race_distance_km?: string   // "21.1 km", "42 km", "70.3 miles"
  goal_time?: string          // "4:50:00" ou "1:45:00"
  plan_start?: 'this_week' | 'next_week'

  // Passo 3 — nível e métrica real (opcional)
  level: 'Iniciante' | 'Intermediário' | 'Avançado'
  metric?: string             // "5:30 min/km" ou "220W" — se tiver dados reais

  // Passo 4 — disponibilidade
  days_per_week: 3 | 4 | 5 | 6 | 7

  // Passo 5 — perfil físico
  name: string
  weight_kg: number
  age?: number

  // Provas intermédias (opcional — Triathlon/Corrida)
  intermediate_races?: IntermediateRace[]

  // Injuries / limitations
  injuries?: string

  // Upsell
  nutrition_upsell?: boolean
}

export type IntermediateRace = {
  date: string       // "2027-02-14"
  name: string       // "Meia Maratona Barcelona"
  distance: string   // "21km"
  role: 'treino' | 'prova_a' | 'prova_b'
}

// O que a IA devolve — plano completo
export type GeneratedPlan = {
  profile: AthleteProfile
  zones: TrainingZones
  periodization: PeriodizationBlock[]
  weeks: TrainingWeek[]
  race_day_plan?: RaceDayPlan
  nutrition_plan?: NutritionPlan   // só se upsell=true
}

export type AthleteProfile = {
  name?: string
  sport: string
  event_name: string
  event_date: string
  goal_time: string
  level: string
  metric: string
  weeks_total: number
  hours_per_week_avg: string
  summary: string   // ex: "Triatleta de 25 anos, sub-5h em Valencia 70.3"
}

export type TrainingZones = {
  // Corrida / Triathlon run
  run?: { z1: string; z2: string; z3: string; z4: string; z5: string }
  // Ciclismo / Triathlon bike
  bike?: { z1: string; z2: string; z3: string; z4: string; z5: string }
  // Natação
  swim?: { z1: string; z2: string; z3: string; z4: string; z5: string }
  // Genérico (FC)
  hr?: { z1: string; z2: string; z3: string; z4: string; z5: string }
}

export type PeriodizationBlock = {
  phase: string          // "FASE 1 — Base Aeróbica"
  start_date: string
  end_date: string
  weeks: number
  focus: string
  volume_per_week: string
  intensity: string
}

export type TrainingWeek = {
  week_num: number
  dates: string          // "11/05–17/05/26"
  phase: string          // "F1", "DESC.", "FÉRIAS"
  focus: string          // "Adaptação + técnica natação"
  total_hours: string    // "~9–10h"
  is_recovery: boolean
  sessions: TrainingSession[]
}

export type TrainingSession = {
  day: string            // "Segunda", "Terça", ...
  sport: string          // "Corrida", "Bike indoor", "Academia — PULL"
  description: string    // Descrição completa como na tua planilha
  duration: string       // "~55–60 min"
  distance?: string      // "10–11km" (opcional — academia não tem)
  zone: string           // "Z2–Z3" ou "—"
  time_of_day?: string   // "07h00–08h00" (opcional)
  objective: string      // "Base corrida + ritmo"
}

export type RaceDayPlan = {
  wake_up: string
  breakfast: string
  segments: RaceDaySegment[]
  transitions: string[]
  mental_cues: string[]
}

export type RaceDaySegment = {
  segment: string        // "Natação 1.9km"
  target_time: string    // "~38–40min"
  pace_target: string    // "1:58/100m"
  nutrition: string      // "Gel + água em T1"
  notes: string
}

export type NutritionPlan = {
  pre_workout: NutritionTiming
  during: NutritionZone[]
  post_workout: NutritionTiming
  race_day: NutritionTiming[]
}

export type NutritionTiming = {
  timing: string
  carbs_g: number
  protein_g?: number
  hydration_ml?: number
  suggestions: string[]
}

export type NutritionZone = {
  zone: string
  carbs_per_hour: number
  hydration_per_hour: number
}

// Estado da sessão guardada no Supabase
export type QuizSession = QuizData & {
  id: string
  created_at: string
  status: 'pending' | 'paid' | 'generating' | 'completed' | 'error'
  email?: string
  stripe_session_id?: string
  sheets_url?: string
  generated_plan?: GeneratedPlan
}