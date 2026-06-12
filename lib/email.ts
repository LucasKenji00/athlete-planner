// ============================================================
// EMAIL — plan delivery via Resend (replaces Apps Script/Gmail)
// Env vars:
//   RESEND_API_KEY  → from resend.com (free: 3k emails/month)
//   EMAIL_FROM      → e.g. 'Athlete Planner <plans@yourdomain.com>'
//                     (domain must be verified in Resend;
//                      use 'onboarding@resend.dev' while testing)
//   NUTRITION_PDF_URL (optional) → recipe guide download link
// ============================================================

import { Resend } from 'resend'
import type { GeneratedPlan } from '@/types'

const BRAND = '#CF6232'
const DARK = '#1A0805'

function fmtDate(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export function planEmailHtml(opts: {
  athleteName?: string
  plan: GeneratedPlan
  planUrl: string
  icsUrl: string
  nutritionUpsell?: boolean
}): { subject: string; html: string } {
  const { athleteName, plan, planUrl, icsUrl, nutritionUpsell } = opts
  const greeting = athleteName ? `Hi ${athleteName},` : 'Hi,'
  const subject = `Your ${plan.profile.sport} training plan is ready! 🏆`
  const nutritionPdf = process.env.NUTRITION_PDF_URL

  const nutritionSection = nutritionUpsell ? `
    <div style="background:#FAEEDA;border-radius:10px;padding:18px;margin:18px 0;">
      <p style="margin:0 0 8px;font-size:15px;color:#854F0B;font-weight:bold;">
        🍽️ Your Personalised Nutrition Plan is included
      </p>
      <p style="margin:0 0 12px;font-size:13px;color:#633806;line-height:1.5;">
        Carb, protein and hydration targets calculated for your weight and zones —
        including a full race-day fuelling timeline. Find it in the
        <strong>Nutrition section of your plan</strong>.
      </p>
      ${nutritionPdf ? `
      <a href="${nutritionPdf}"
         style="display:inline-block;background:#BA7517;color:#ffffff;padding:11px 22px;
                border-radius:8px;text-decoration:none;font-weight:bold;font-size:13px;">
        Download Recipe Guide (PDF) →
      </a>` : ''}
    </div>` : ''

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
    <div style="background:linear-gradient(135deg, ${BRAND} 0%, ${DARK} 100%);padding:32px 24px;border-radius:14px;text-align:center;margin-bottom:24px;">
      <p style="color:rgba(255,255,255,0.75);margin:0 0 6px;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Athlete Planner</p>
      <h1 style="color:#ffffff;margin:0;font-size:26px;line-height:1.25;">Your training plan is ready! 🏆</h1>
    </div>

    <p style="font-size:16px;color:#333;margin:0 0 8px;">${greeting}</p>
    <p style="font-size:15px;color:#333;line-height:1.6;margin:0 0 18px;">
      Your <strong>${plan.profile.event_name || plan.profile.sport}</strong> plan has been generated
      and personalised to your level, your zones and your race date.
    </p>

    <div style="background:#F8F9FA;border-radius:10px;padding:16px 18px;margin:0 0 22px;">
      <p style="margin:4px 0;font-size:14px;color:#333;">📅 <strong>Race:</strong> ${fmtDate(plan.profile.event_date)}</p>
      <p style="margin:4px 0;font-size:14px;color:#333;">🎯 <strong>Goal:</strong> ${plan.profile.goal_time || 'finish strong'}</p>
      <p style="margin:4px 0;font-size:14px;color:#333;">🗓️ <strong>Duration:</strong> ${plan.profile.weeks_total} weeks · ${plan.periodization?.length ?? 0} phases</p>
      <p style="margin:4px 0;font-size:14px;color:#333;">⏱️ <strong>Weekly volume:</strong> ${plan.profile.hours_per_week_avg}</p>
    </div>

    <div style="text-align:center;margin:26px 0;">
      <a href="${planUrl}"
         style="display:inline-block;background:${BRAND};color:#ffffff;padding:16px 36px;border-radius:10px;
                text-decoration:none;font-size:16px;font-weight:bold;">
        Open my training plan →
      </a>
      <p style="margin:14px 0 0;">
        <a href="${icsUrl}" style="color:${BRAND};font-size:13px;text-decoration:underline;">
          📆 Add all sessions to my calendar (.ics)
        </a>
      </p>
    </div>

    ${nutritionSection}

    <p style="font-size:13px;color:#666;line-height:1.7;margin:18px 0;">
      <strong>Getting started:</strong><br>
      1. Open your plan with the button above — it works on any device, save the link!<br>
      2. Start with <strong>Your Season at a Glance</strong> for the big picture<br>
      3. Tap any week to see the detailed sessions with your exact zones<br>
      4. Add the sessions to your calendar so you never miss a workout
    </p>

    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
    <p style="font-size:12px;color:#999;text-align:center;margin:0;">
      Happy training! 💪<br>
      <span style="color:#bbb;">This link is personal — anyone with it can view your plan.</span>
    </p>
  </div>`

  return { subject, html }
}

export async function sendPlanEmail(opts: {
  to: string
  athleteName?: string
  plan: GeneratedPlan
  planUrl: string
  icsUrl: string
  nutritionUpsell?: boolean
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('RESEND_API_KEY is not set')

  const resend = new Resend(apiKey)
  const { subject, html } = planEmailHtml(opts)

  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Athlete Planner <onboarding@resend.dev>',
    replyTo: process.env.EMAIL_REPLY_TO || undefined, // e.g. your Gmail — replies land there
    to: opts.to,
    subject,
    html,
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
}
