// ============================================================
// APPS SCRIPT v4 — Athlete Training Planner
// ============================================================
// Deploy: paste this file into the Google Apps Script editor
// at script.google.com and click Deploy > New Deployment (Web App)
// ============================================================

// ⚠️ SECURITY: never hardcode these — the repo is public.
// Set them in the Apps Script editor: Project Settings → Script Properties:
//   FOLDER_ID         → Drive folder id where plans are stored
//   SECRET            → must match APPS_SCRIPT_SECRET on Vercel (ROTATE the old leaked one!)
//   NUTRITION_PDF_URL → link to the nutrition guide PDF (re-upload — the old link was public)
const PROPS = PropertiesService.getScriptProperties()
const FOLDER_ID         = PROPS.getProperty('FOLDER_ID')
const SECRET            = PROPS.getProperty('SECRET')
const NUTRITION_PDF_URL = PROPS.getProperty('NUTRITION_PDF_URL')

const PHASE_COLORS = {
  'F1': '#E8F5E9',
  'F2': '#E3F2FD',
  'F3': '#FFF3E0',
  'F4': '#FCE4EC',
  'DESC.': '#F5F5F5',
  'FÉRIAS': '#F5F5F5',
  'Taper': '#EDE7F6',
  'PROVA': '#1D9E75',
}

const ZONE_COLORS = {
  'Z1': '#E8F5E9',
  'Z2': '#C8E6C9',
  'Z3': '#FFF9C4',
  'Z4': '#FFE0B2',
  'Z5': '#FFCDD2',
  '—':  '#FAFAFA',
}

// ============================================================
// ENTRY POINT
// ============================================================
function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)

    if (!SECRET || body.secret !== SECRET) {
      return jsonResponse({ success: false, error: 'Unauthorized' })
    }

    const { email, plan, nutrition_upsell, athlete_name, plan_start } = body

    if (!email || !plan || !plan.weeks) {
      return jsonResponse({ success: false, error: 'Incomplete data' })
    }

    const url = createPlanSpreadsheet(email, plan, nutrition_upsell, athlete_name, plan_start)

    return jsonResponse({ success: true, sheetsUrl: url })

  } catch (err) {
    console.error('Error in doPost:', err.message)
    return jsonResponse({ success: false, error: err.message })
  }
}


// ============================================================
// CALCULATE PLAN START DATE — weeks ALWAYS start on MONDAY
// (must stay consistent with lib/prompt.ts)
// Rules:
//   this_week  → Monday of the current week (week of purchase)
//   next_week  → next Monday from the purchase date
// ============================================================
function getPlanStartDate(planStart) {
  const now = new Date()
  const madridStr = Utilities.formatDate(now, 'Europe/Madrid', 'yyyy-MM-dd')
  const parts = madridStr.split('-')
  const year  = parseInt(parts[0])
  const month = parseInt(parts[1]) - 1
  const day   = parseInt(parts[2])

  const today = new Date(year, month, day)
  const dayOfWeek = today.getDay() // 0=Sun, 1=Mon, ..., 6=Sat

  const result = new Date(year, month, day)

  if (planStart === 'this_week') {
    // Go back to the Monday of this week (Sunday belongs to the week that started 6 days earlier)
    result.setDate(day + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek))
  } else {
    // next_week → next Monday
    const daysUntilNextMonday = dayOfWeek === 0 ? 1 : dayOfWeek === 1 ? 7 : 8 - dayOfWeek
    result.setDate(day + daysUntilNextMonday)
  }

  return result
}

function formatShortDate(date) {
  const d = date.getDate().toString().padStart(2, '0')
  const m = (date.getMonth() + 1).toString().padStart(2, '0')
  const y = date.getFullYear().toString().slice(-2)
  return `${d}/${m}/${y}`
}

function getWeekDates(startDate, weekNum) {
  const weekStart = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate() + (weekNum - 1) * 7
  )
  const weekEnd = new Date(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    weekStart.getDate() + 6
  )
  return `${formatShortDate(weekStart)}–${formatShortDate(weekEnd)}`
}


// ============================================================
// MAIN FUNCTION
// ============================================================
function createPlanSpreadsheet(email, plan, nutritionUpsell, athleteName, planStart) {
  const folder = DriveApp.getFolderById(FOLDER_ID)
  const planStartDate = getPlanStartDate(planStart)

  // Inject real dates into each week
  plan.weeks = plan.weeks.map(week => ({
    ...week,
    dates: getWeekDates(planStartDate, week.week_num)
  }))

  // Update dates in periodization blocks
  if (plan.periodization && plan.periodization.length > 0) {
    plan.periodization = plan.periodization.map((block, i) => {
      const weeksBeforeThisBlock = plan.periodization
        .slice(0, i)
        .reduce((sum, b) => sum + b.weeks, 0)

      const blockStartWeek = weeksBeforeThisBlock + 1
      const blockEndWeek   = weeksBeforeThisBlock + block.weeks

      const blockStart = new Date(
        planStartDate.getFullYear(),
        planStartDate.getMonth(),
        planStartDate.getDate() + (blockStartWeek - 1) * 7
      )
      const blockEnd = new Date(
        planStartDate.getFullYear(),
        planStartDate.getMonth(),
        planStartDate.getDate() + blockEndWeek * 7 - 1
      )

      return {
        ...block,
        start_date: formatShortDate(blockStart),
        end_date:   formatShortDate(blockEnd),
      }
    })
  }

  const namePrefix = athleteName ? `${athleteName} — ` : ''
  const sheetName = `${namePrefix}${plan.profile.sport} Training Plan`
  const ss = SpreadsheetApp.create(sheetName)

  const file = DriveApp.getFileById(ss.getId())
  folder.addFile(file)
  DriveApp.getRootFolder().removeFile(file)

  createDashboardTab(ss, plan, planStartDate, athleteName, planStart)
  createPeriodizationTab(ss, plan)
  createWeeklyPlanTab(ss, plan)
  createWeeklyLogTab(ss, plan)
  createStrengthTab(ss, plan)
  if (plan.race_day_plan) createRaceDayTab(ss, plan)
  if (plan.nutrition_plan) createNutritionTab(ss, plan)

  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Página1')
  if (defaultSheet) ss.deleteSheet(defaultSheet)

  ss.setActiveSheet(ss.getSheetByName('Dashboard'))

  DriveApp.getFileById(ss.getId()).setSharing(
    DriveApp.Access.ANYONE_WITH_LINK,
    DriveApp.Permission.VIEW
  )
  ss.addViewer(email)

  sendDeliveryEmail(email, plan, ss.getUrl(), nutritionUpsell, athleteName)

  SpreadsheetApp.flush()
  console.log('Spreadsheet created:', ss.getUrl())
  return ss.getUrl()
}


// ============================================================
// TAB 1 — Dashboard
// ============================================================
function createDashboardTab(ss, plan, planStartDate, athleteName, planStart) {
  const sheet = ss.getSheetByName('Dashboard') || ss.insertSheet('Dashboard')
  sheet.setName('Dashboard')
  sheet.setTabColor('#1D9E75')

  sheet.setColumnWidth(1, 220)
  sheet.setColumnWidth(2, 180)
  sheet.setColumnWidth(3, 180)
  sheet.setColumnWidth(4, 180)
  sheet.setColumnWidth(5, 180)
  sheet.setColumnWidth(6, 180)

  let row = 1

  const titleRange = sheet.getRange(row, 1, 1, 6)
  titleRange.merge()
  const titleText = athleteName
    ? `${athleteName.toUpperCase()} — ${plan.profile.sport.toUpperCase()} TRAINING PLAN`
    : `TRAINING PLAN — ${plan.profile.sport.toUpperCase()}`
  titleRange.setValue(titleText)
    .setBackground('#1D9E75').setFontColor('#FFFFFF')
    .setFontSize(16).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle')
  sheet.setRowHeight(row, 50)
  row++

  sheet.getRange(row, 1, 1, 6).merge()
    .setValue(`${plan.profile.event_name} · ${formatDate(plan.profile.event_date)} · Goal: ${plan.profile.goal_time}`)
    .setBackground('#0F6E56').setFontColor('#E1F5EE')
    .setFontSize(12).setHorizontalAlignment('center')
  sheet.setRowHeight(row, 32)
  row += 2

  sheet.getRange(row, 1, 1, 2).merge()
    .setValue('Plan starts on:')
    .setFontWeight('bold').setFontSize(11).setBackground('#F8F9FA')
  sheet.getRange(row, 3, 1, 3).merge()
    .setValue(`Sunday ${formatShortDate(planStartDate)}`)
    .setFontSize(11).setFontColor('#1D9E75').setFontWeight('bold')
  row += 2

  const metrics = [
    ['Athlete', athleteName || '—'],
    ['Race', plan.profile.event_name],
    ['Date', formatDate(plan.profile.event_date)],
    ['Goal', plan.profile.goal_time],
    ['Level', plan.profile.level],
    ['Metric', plan.profile.metric],
    ['Weeks', `${plan.profile.weeks_total} weeks`],
    ['Volume', `${plan.profile.hours_per_week_avg}/week`],
  ]

  metrics.forEach((metric, i) => {
    const col = (i % 2) * 2 + 1
    if (i % 2 === 0 && i > 0) row++
    sheet.getRange(row, col).setValue(metric[0])
      .setFontWeight('bold').setFontSize(11).setBackground('#F8F9FA')
    sheet.getRange(row, col + 1).setValue(metric[1]).setFontSize(11)
  })
  row += 2

  writeSectionHeader(sheet, row, 6, 'SEASON PERIODIZATION')
  row++
  writeTableHeader(sheet, row, 1, ['Phase', 'Period', 'Weeks', 'Focus', 'Volume/week', 'Intensity'])
  row++

  plan.periodization.forEach(phase => {
    const bgColor = PHASE_COLORS[phase.phase.split(' ')[0]] || '#FFFFFF'
    sheet.getRange(row, 1, 1, 6).setValues([[
      phase.phase,
      `${phase.start_date} → ${phase.end_date}`,
      phase.weeks,
      phase.focus,
      phase.volume_per_week,
      phase.intensity,
    ]]).setBackground(bgColor).setFontSize(10)
    row++
  })
  row += 2

  const zones = plan.zones
  if (zones) {
    writeSectionHeader(sheet, row, 6, 'TRAINING ZONES', '#185FA5')
    row++

    const zoneLabels = ['Z1 — Recovery', 'Z2 — Aerobic base', 'Z3 — Tempo', 'Z4 — Threshold', 'Z5 — VO2Max']
    const zoneColors = ['#E8F5E9', '#C8E6C9', '#FFF9C4', '#FFE0B2', '#FFCDD2']

    const modalityMap = []
    if (zones.run)  modalityMap.push({ key: 'run',  label: 'Running (min/km)' })
    if (zones.bike) modalityMap.push({ key: 'bike', label: 'Bike (watts)' })
    if (zones.swim) modalityMap.push({ key: 'swim', label: 'Swimming (min/100m)' })
    if (zones.hr)   modalityMap.push({ key: 'hr',   label: 'HR (% HRmax)' })

    writeTableHeader(sheet, row, 1, ['Zone', ...modalityMap.map(m => m.label)])
    row++

    const zoneKeys = ['z1', 'z2', 'z3', 'z4', 'z5']
    zoneKeys.forEach((zKey, i) => {
      const rowData = [zoneLabels[i]]
      modalityMap.forEach(m => rowData.push(zones[m.key]?.[zKey] || '—'))
      sheet.getRange(row, 1, 1, rowData.length)
        .setValues([rowData]).setBackground(zoneColors[i]).setFontSize(10)
      row++
    })
  }

  sheet.setFrozenRows(2)
}


// ============================================================
// TAB 2 — Season Plan
// ============================================================
function createPeriodizationTab(ss, plan) {
  const sheet = ss.insertSheet('Season Plan')
  sheet.setTabColor('#854F0B')

  sheet.setColumnWidth(1, 60)
  sheet.setColumnWidth(2, 180)
  sheet.setColumnWidth(3, 120)
  sheet.setColumnWidth(4, 280)
  sheet.setColumnWidth(5, 100)

  let row = 1
  writeSectionHeader(sheet, row, 5, 'FULL SEASON CALENDAR', '#854F0B')
  row++
  writeTableHeader(sheet, row, 1, ['Week', 'Dates', 'Phase', 'Focus', '~h/week'])
  row++

  plan.weeks.forEach(week => {
    const bgColor = week.is_recovery ? '#F5F5F5' : (PHASE_COLORS[week.phase] || '#FFFFFF')
    const isFinal = week.phase === 'RACE' || week.phase === 'PROVA'
    sheet.getRange(row, 1, 1, 5)
      .setValues([[`W${week.week_num}`, week.dates, week.phase, week.focus, week.total_hours]])
      .setBackground(isFinal ? '#1D9E75' : bgColor)
      .setFontColor(isFinal ? '#FFFFFF' : '#000000')
      .setFontSize(10).setFontWeight(isFinal ? 'bold' : 'normal')
    row++
  })

  sheet.setFrozenRows(2)
}


// ============================================================
// TAB 3 — Weekly Plan
// ============================================================
function createWeeklyPlanTab(ss, plan) {
  const sheet = ss.insertSheet('Weekly Plan')
  sheet.setTabColor('#0F6E56')

  sheet.setColumnWidth(1, 60)
  sheet.setColumnWidth(2, 120)
  sheet.setColumnWidth(3, 90)
  sheet.setColumnWidth(4, 140)
  sheet.setColumnWidth(5, 400)
  sheet.setColumnWidth(6, 100)
  sheet.setColumnWidth(7, 100)
  sheet.setColumnWidth(8, 80)
  sheet.setColumnWidth(9, 100)
  sheet.setColumnWidth(10, 250)

  let row = 1
  writeSectionHeader(sheet, row, 10, 'COMPLETE WEEKLY PLAN — DETAILED SESSIONS', '#0F6E56')
  row++
  writeTableHeader(sheet, row, 1, ['Week', 'Phase', 'Day', 'Sport', 'Description', 'Duration', 'Distance', 'Zone', 'Time', 'Objective'])
  row++
  sheet.setFrozenRows(2)

  plan.weeks.forEach(week => {
    const weekHeaderRange = sheet.getRange(row, 1, 1, 10)
    weekHeaderRange.merge()
    weekHeaderRange.setValue(
      `WEEK ${week.week_num} · ${week.dates} · ${week.phase} · ${week.focus} · ${week.total_hours}${week.is_recovery ? ' ■ RECOVERY WEEK' : ''}`
    )
    const weekBg = week.is_recovery ? '#EEEEEE' : (PHASE_COLORS[week.phase] || '#F5F5F5')
    weekHeaderRange.setBackground(weekBg).setFontWeight('bold').setFontSize(10).setVerticalAlignment('middle')
    sheet.setRowHeight(row, 28)
    row++

    week.sessions.forEach(session => {
      sheet.getRange(row, 1, 1, 10).setValues([[
        `W${week.week_num}`, week.phase, session.day, session.sport,
        session.description, session.duration, session.distance || '—',
        session.zone, session.time_of_day || '—', session.objective,
      ]]).setFontSize(10).setVerticalAlignment('top').setWrap(true)
      sheet.getRange(row, 8).setBackground(getZoneColor(session.zone))
      sheet.getRange(row, 5).setWrap(true)
      sheet.setRowHeight(row, 60)
      row++
    })
    row++
  })
}


// ============================================================
// TAB 4 — Weekly Log
// ============================================================
function createWeeklyLogTab(ss, plan) {
  const sheet = ss.insertSheet('Weekly Log')
  sheet.setTabColor('#534AB7')

  sheet.setColumnWidth(1, 100)
  sheet.setColumnWidth(2, 60)
  sheet.setColumnWidth(3, 120)
  sheet.setColumnWidth(4, 80)
  sheet.setColumnWidth(5, 100)
  sheet.setColumnWidth(6, 120)
  sheet.setColumnWidth(7, 80)
  sheet.setColumnWidth(8, 80)
  sheet.setColumnWidth(9, 60)
  sheet.setColumnWidth(10, 250)

  let row = 1
  writeSectionHeader(sheet, row, 10, 'TRAINING LOG — WHAT ACTUALLY HAPPENED', '#534AB7')
  row++
  writeTableHeader(sheet, row, 1, ['Date', 'Week', 'Sport', 'Duration (real)', 'Distance (real)', 'Pace/Watts (real)', 'Target zone', 'Completed?', 'RPE (1-10)', 'Notes'])
  row++
  sheet.setFrozenRows(2)

  plan.weeks.forEach(week => {
    week.sessions.forEach(session => {
      sheet.getRange(row, 1, 1, 10).setValues([[
        '', `W${week.week_num}`, session.sport, '', '', '', session.zone, '', '', ''
      ]]).setFontSize(10)
      row++
    })
  })
}


// ============================================================
// TAB 5 — Strength Training (generated by AI)
// ============================================================
function createStrengthTab(ss, plan) {
  if (!plan.strength_program || plan.strength_program.length === 0) return
  if (plan.profile.sport === 'Gym' || plan.profile.sport === 'Academia') return

  const sheet = ss.insertSheet('Strength Training')
  sheet.setTabColor('#993C1D')

  sheet.setColumnWidth(1, 220)
  sheet.setColumnWidth(2, 160)
  sheet.setColumnWidth(3, 160)
  sheet.setColumnWidth(4, 280)
  sheet.setColumnWidth(5, 80)
  sheet.setColumnWidth(6, 80)
  sheet.setColumnWidth(7, 80)

  let row = 1
  writeSectionHeader(sheet, row, 7, 'PERSONALISED STRENGTH PROGRAM', '#993C1D')
  row += 2

  plan.strength_program.forEach(session => {
    sheet.getRange(row, 1, 1, 7).merge()
      .setValue(`${session.session_name}${session.day_suggestion ? ' — ' + session.day_suggestion : ''}`)
      .setBackground('#FAECE7').setFontWeight('bold').setFontSize(12)
    sheet.setRowHeight(row, 30)
    row++

    writeTableHeader(sheet, row, 1, ['Exercise', 'Primary muscle', 'Secondary', 'Why for your sport', 'Ph.1', 'Ph.2', 'Ph.3'])
    row++

    session.exercises.forEach(ex => {
      sheet.getRange(row, 1, 1, 7).setValues([[
        ex.name, ex.primary_muscle, ex.secondary_muscle,
        ex.sport_reason, ex.ph1, ex.ph2, ex.ph3
      ]]).setFontSize(10)
      row++
    })
    row++
  })
}


// ============================================================
// TAB 6 — Race Day Plan (optional)
// ============================================================
function createRaceDayTab(ss, plan) {
  const rd = plan.race_day_plan
  if (!rd) return
  const sheet = ss.insertSheet('Race Day')
  sheet.setTabColor('#7E57C2')
  sheet.setColumnWidth(1, 180)
  sheet.setColumnWidth(2, 140)
  sheet.setColumnWidth(3, 160)
  sheet.setColumnWidth(4, 260)
  sheet.setColumnWidth(5, 320)

  let row = 1
  writeSectionHeader(sheet, row, 5, '🏁 RACE DAY PLAN', '#7E57C2'); row++

  sheet.getRange(row, 1).setValue('Wake up').setFontWeight('bold')
  sheet.getRange(row, 2, 1, 4).merge().setValue(rd.wake_up || '')
  row++
  sheet.getRange(row, 1).setValue('Breakfast').setFontWeight('bold')
  sheet.getRange(row, 2, 1, 4).merge().setValue(rd.breakfast || '').setWrap(true)
  row += 2

  if (rd.segments && rd.segments.length) {
    writeTableHeader(sheet, row, 1, ['Segment', 'Target time', 'Pace / power', 'Nutrition', 'Notes']); row++
    rd.segments.forEach(function(seg) {
      sheet.getRange(row, 1).setValue(seg.segment || '').setFontWeight('bold')
      sheet.getRange(row, 2).setValue(seg.target_time || '')
      sheet.getRange(row, 3).setValue(seg.pace_target || '')
      sheet.getRange(row, 4).setValue(seg.nutrition || '').setWrap(true)
      sheet.getRange(row, 5).setValue(seg.notes || '').setWrap(true)
      row++
    })
    row++
  }

  if (rd.transitions && rd.transitions.length) {
    writeSectionHeader(sheet, row, 5, 'Transitions checklist', '#9575CD'); row++
    rd.transitions.forEach(function(t) {
      sheet.getRange(row, 1, 1, 5).merge().setValue('☐ ' + t).setWrap(true)
      row++
    })
    row++
  }

  if (rd.mental_cues && rd.mental_cues.length) {
    writeSectionHeader(sheet, row, 5, 'Mental cues', '#9575CD'); row++
    rd.mental_cues.forEach(function(c) {
      sheet.getRange(row, 1, 1, 5).merge().setValue('💭 ' + c).setWrap(true)
      row++
    })
  }
}


// ============================================================
// TAB 7 — Nutrition Plan (upsell only)
// ============================================================
function createNutritionTab(ss, plan) {
  const np = plan.nutrition_plan
  if (!np) return
  const sheet = ss.insertSheet('Nutrition')
  sheet.setTabColor('#BA7517')
  sheet.setColumnWidth(1, 170)
  sheet.setColumnWidth(2, 120)
  sheet.setColumnWidth(3, 120)
  sheet.setColumnWidth(4, 130)
  sheet.setColumnWidth(5, 420)

  let row = 1
  writeSectionHeader(sheet, row, 5, '🍽️ PERSONALISED NUTRITION PLAN', '#BA7517'); row++
  row++

  function writeTiming(title, t) {
    if (!t) return
    writeSectionHeader(sheet, row, 5, title, '#D4A04C'); row++
    writeTableHeader(sheet, row, 1, ['Timing', 'Carbs (g)', 'Protein (g)', 'Hydration (ml)', 'Suggestions']); row++
    sheet.getRange(row, 1).setValue(t.timing || '')
    sheet.getRange(row, 2).setValue(t.carbs_g != null ? t.carbs_g : '')
    sheet.getRange(row, 3).setValue(t.protein_g != null ? t.protein_g : '')
    sheet.getRange(row, 4).setValue(t.hydration_ml != null ? t.hydration_ml : '')
    sheet.getRange(row, 5).setValue((t.suggestions || []).join(' · ')).setWrap(true)
    row += 2
  }

  writeTiming('Pre-workout', np.pre_workout)

  if (np.during && np.during.length) {
    writeSectionHeader(sheet, row, 5, 'During training (by zone)', '#D4A04C'); row++
    writeTableHeader(sheet, row, 1, ['Zone', 'Carbs/hour (g)', 'Hydration/hour (ml)', '', '']); row++
    np.during.forEach(function(d) {
      sheet.getRange(row, 1).setValue(d.zone || '')
      sheet.getRange(row, 2).setValue(d.carbs_per_hour != null ? d.carbs_per_hour : '')
      sheet.getRange(row, 3).setValue(d.hydration_per_hour != null ? d.hydration_per_hour : '')
      row++
    })
    row++
  }

  writeTiming('Post-workout', np.post_workout)

  if (np.race_day && np.race_day.length) {
    writeSectionHeader(sheet, row, 5, 'Race day fuelling timeline', '#D4A04C'); row++
    writeTableHeader(sheet, row, 1, ['Timing', 'Carbs (g)', 'Protein (g)', 'Hydration (ml)', 'Suggestions']); row++
    np.race_day.forEach(function(t) {
      sheet.getRange(row, 1).setValue(t.timing || '')
      sheet.getRange(row, 2).setValue(t.carbs_g != null ? t.carbs_g : '')
      sheet.getRange(row, 3).setValue(t.protein_g != null ? t.protein_g : '')
      sheet.getRange(row, 4).setValue(t.hydration_ml != null ? t.hydration_ml : '')
      sheet.getRange(row, 5).setValue((t.suggestions || []).join(' · ')).setWrap(true)
      row++
    })
  }
}


// ============================================================
// HELPERS
// ============================================================

function writeSectionHeader(sheet, row, colSpan, title, bgColor) {
  bgColor = bgColor || '#1D9E75'
  sheet.getRange(row, 1, 1, colSpan).merge()
    .setValue(title)
    .setBackground(bgColor).setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center').setVerticalAlignment('middle')
  sheet.setRowHeight(row, 36)
}

function writeTableHeader(sheet, row, startCol, headers) {
  headers.forEach(function(h, i) {
    sheet.getRange(row, startCol + i)
      .setValue(h)
      .setBackground('#37474F').setFontColor('#FFFFFF')
      .setFontWeight('bold').setFontSize(10)
      .setHorizontalAlignment('center')
  })
  sheet.setRowHeight(row, 28)
}

function getZoneColor(zone) {
  if (!zone || zone === '—') return '#FAFAFA'
  if (zone.includes('Z5')) return ZONE_COLORS['Z5']
  if (zone.includes('Z4')) return ZONE_COLORS['Z4']
  if (zone.includes('Z3')) return ZONE_COLORS['Z3']
  if (zone.includes('Z2')) return ZONE_COLORS['Z2']
  if (zone.includes('Z1')) return ZONE_COLORS['Z1']
  return '#FAFAFA'
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON)
}


// ============================================================
// DELIVERY EMAIL
// ============================================================
function sendDeliveryEmail(email, plan, sheetsUrl, nutritionUpsell, athleteName) {
  const subject = `Your ${plan.profile.sport} training plan is ready!`
  const greeting = athleteName ? `Hi ${athleteName},` : 'Hi,'

  const nutritionSection = nutritionUpsell ? `
    <div style="background:#FAEEDA;border-radius:8px;padding:16px;margin:16px 0;">
      <p style="margin:0 0 12px;font-size:14px;color:#854F0B;font-weight:bold;">
        Your Nutrition Guide is included &#127869;
      </p>
      <p style="margin:0 0 12px;font-size:13px;color:#633806;">
        32 meal recipes for every moment of your training day — pre-workout, post-workout, race day and more.
      </p>
      <a href="${NUTRITION_PDF_URL}"
         style="display:inline-block;background:#BA7517;color:white;padding:12px 24px;
                border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;">
        Download Nutrition Guide (PDF) &rarr;
      </a>
    </div>` : ''

  const htmlBody = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="background:#1D9E75;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
        <h1 style="color:white;margin:0;font-size:24px;">Your training plan is ready! &#127942;</h1>
      </div>
      <p style="font-size:16px;color:#333;">${greeting}</p>
      <p style="font-size:16px;color:#333;">
        Your <strong>${plan.profile.event_name}</strong> plan has been created and personalised just for you.
      </p>
      <div style="background:#F8F9FA;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:4px 0;font-size:14px;">&#128197; <strong>Race:</strong> ${formatDate(plan.profile.event_date)}</p>
        <p style="margin:4px 0;font-size:14px;">&#127919; <strong>Goal:</strong> ${plan.profile.goal_time}</p>
        <p style="margin:4px 0;font-size:14px;">&#128197; <strong>Duration:</strong> ${plan.profile.weeks_total} weeks</p>
        <p style="margin:4px 0;font-size:14px;">&#9200; <strong>Weekly volume:</strong> ${plan.profile.hours_per_week_avg}</p>
      </div>
      <div style="text-align:center;margin:24px 0;">
        <a href="${sheetsUrl}"
           style="background:#1D9E75;color:white;padding:16px 32px;border-radius:8px;
                  text-decoration:none;font-size:16px;font-weight:bold;">
          Open my training plan &rarr;
        </a>
      </div>
      ${nutritionSection}
      <p style="font-size:13px;color:#666;">
        <strong>Getting started:</strong><br>
        1. Click the button above<br>
        2. Go to <strong>File &rarr; Make a copy</strong> to get your own editable version<br>
        3. Start with the <strong>Dashboard</strong> tab for an overview<br>
        4. Use the <strong>Weekly Log</strong> tab to track your sessions
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
      <p style="font-size:12px;color:#999;text-align:center;">Happy training! &#128170;</p>
    </div>
  `
  GmailApp.sendEmail(email, subject, '', { htmlBody })
  console.log('Email sent to:', email)
}


// ============================================================
// TEST FUNCTION — run this from the Apps Script editor
// ============================================================
function testWithFakePlan() {
  const fakePlan = {
    profile: {
      sport: 'Running',
      event_name: 'Barcelona Half Marathon',
      event_date: '2027-02-14',
      goal_time: '1:45:00',
      level: 'Intermediate',
      metric: '5:30 min/km',
      weeks_total: 4,
      hours_per_week_avg: '~7-9h',
      summary: 'Intermediate runner, sub-1:45 goal at Barcelona Half Marathon',
    },
    zones: {
      run: { z1: '>6:30/km', z2: '5:50-6:30/km', z3: '5:10-5:50/km', z4: '4:45-5:10/km', z5: '<4:45/km' },
      hr:  { z1: '<65%', z2: '65-75%', z3: '75-82%', z4: '82-89%', z5: '>89%' },
    },
    periodization: [
      { phase: 'Phase 1 — Base', weeks: 2, focus: 'Aerobic base', volume_per_week: '35-40km', intensity: 'Z1-Z2' },
      { phase: 'Phase 2 — Build', weeks: 2, focus: 'Volume + thresholds', volume_per_week: '45-55km', intensity: 'Z2-Z3' },
    ],
    weeks: [
      {
        week_num: 1, phase: 'P1', focus: 'Adaptation', total_hours: '~7h', is_recovery: false,
        sessions: [
          { day: 'Tuesday',  sport: 'Running',  description: 'Warm-up 10min Z1 · 30min Z2 · Cool-down 10min', duration: '50 min', distance: '8km',  zone: 'Z2', time_of_day: '18:45', objective: 'Aerobic base' },
          { day: 'Thursday', sport: 'Running',  description: 'Warm-up 10min · 4x8min Z3 · Cool-down 10min',   duration: '60 min', distance: '10km', zone: 'Z3', time_of_day: '18:45', objective: 'Threshold' },
          { day: 'Saturday', sport: 'Long run', description: 'Long run Z2 conversational',                     duration: '80 min', distance: '14km', zone: 'Z2', time_of_day: '08:00', objective: 'Endurance' },
        ],
      },
      {
        week_num: 2, phase: 'P1', focus: 'Progressive load', total_hours: '~7.5h', is_recovery: false,
        sessions: [
          { day: 'Tuesday',  sport: 'Running',  description: 'Warm-up 10min Z1 · 35min Z2 · Cool-down 10min', duration: '55 min', distance: '9km',  zone: 'Z2', time_of_day: '18:45', objective: 'Base progression' },
          { day: 'Thursday', sport: 'Running',  description: 'Warm-up 10min · 5x8min Z3 · Cool-down 10min',   duration: '65 min', distance: '11km', zone: 'Z3', time_of_day: '18:45', objective: 'Threshold' },
          { day: 'Saturday', sport: 'Long run', description: 'Long run Z2 conversational',                     duration: '90 min', distance: '16km', zone: 'Z2', time_of_day: '08:00', objective: 'Endurance' },
        ],
      },
    ],
    strength_program: [
      {
        session_name: 'Pull Session — Upper Body',
        day_suggestion: 'Monday',
        exercises: [
          { name: 'Pull-up',           primary_muscle: 'Latissimus dorsi', secondary_muscle: 'Biceps',       sport_reason: 'Upper body strength',   ph1: '3x6',   ph2: '3x8',   ph3: '2x8' },
          { name: 'Bent-over row',     primary_muscle: 'Rhomboids',        secondary_muscle: 'Rear deltoid', sport_reason: 'Posture',               ph1: '3x10',  ph2: '4x8',   ph3: '2x10' },
          { name: 'Hollow body hold',  primary_muscle: 'Core',             secondary_muscle: 'Hip flexors',  sport_reason: 'Running stability',     ph1: '3x20s', ph2: '3x30s', ph3: '2x30s' },
        ],
      },
      {
        session_name: 'Lower Body Session',
        day_suggestion: 'Wednesday',
        exercises: [
          { name: 'Romanian deadlift',    primary_muscle: 'Hamstrings',     secondary_muscle: 'Glutes',  sport_reason: 'Posterior chain',         ph1: '3x10', ph2: '4x8',  ph3: '2x10' },
          { name: 'Single-leg calf raise', primary_muscle: 'Gastrocnemius', secondary_muscle: 'Soleus',  sport_reason: 'Shin splint prevention', ph1: '3x12', ph2: '3x15', ph3: '2x12' },
          { name: 'Reverse lunge',        primary_muscle: 'Quads',          secondary_muscle: 'Glutes',  sport_reason: 'Running stride',          ph1: '3x10', ph2: '3x12', ph3: '2x10' },
        ],
      },
    ],
  }

  // Change 'this_week' to 'next_week' to test the other option
  const url = createPlanSpreadsheet('your-test-email@example.com', fakePlan, false, 'James', 'this_week')
  console.log('Plan created successfully:', url)
}
