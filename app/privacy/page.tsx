import Link from 'next/link'

const g = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  background: 'linear-gradient(160deg, #2D1005 0%, #0D0400 40%, #000000 100%)',
  color: '#fff',
  minHeight: '100vh',
}
const wrap = { maxWidth: 760, margin: '0 auto', padding: '4rem 1.5rem 5rem' }

export const metadata = { title: 'Privacy Policy — Athlete Planner' }

export default function PrivacyPage() {
  return (
    <div style={g}>
      <div style={wrap}>
        <Link href="/" style={{ fontSize: 13, color: '#CF6232', textDecoration: 'none', display: 'inline-block', marginBottom: 32 }}>
          ← Back to Athlete Planner
        </Link>
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 48 }}>
          Last updated: June 2026
        </p>

        <Section title="Who we are">
          <P>Athlete Planner operates the website athleteplanner.app and provides AI-generated personalised training plans. For any privacy-related questions, contact us at <a href="mailto:athleteplanner.app@gmail.com" style={{ color: '#CF6232' }}>athleteplanner.app@gmail.com</a>.</P>
        </Section>

        <Section title="Data we collect">
          <P>When you complete our quiz and purchase a plan, we collect:</P>
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: 'rgba(255,255,255,0.65)', fontSize: 15 }}>
            <li>First name</li>
            <li>Email address</li>
            <li>Sport(s) and fitness level</li>
            <li>Race / event date and goal time</li>
            <li>Training days per week</li>
            <li>Weight and age</li>
            <li>Injuries or limitations (optional)</li>
          </ul>
          <P>We also collect basic payment data processed by Stripe (we never store your card details).</P>
        </Section>

        <Section title="Purpose">
          <P>We use your data solely to generate and deliver your personalised training plan. We do not use it for marketing, advertising, or any purpose beyond providing the service you purchased.</P>
        </Section>

        <Section title="Third parties">
          <P>We share data with the following processors to deliver the service:</P>
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: 'rgba(255,255,255,0.65)', fontSize: 15 }}>
            <li><strong style={{ color: '#fff' }}>Stripe</strong> — payment processing</li>
            <li><strong style={{ color: '#fff' }}>Supabase</strong> — secure database storage</li>
            <li><strong style={{ color: '#fff' }}>Google</strong> — Apps Script execution and Google Sheets delivery</li>
            <li><strong style={{ color: '#fff' }}>Anthropic</strong> — AI plan generation via the Claude API</li>
          </ul>
          <P>We never sell your data to third parties.</P>
        </Section>

        <Section title="Data retention">
          <P>Your session data is retained for 12 months from the date of purchase, then permanently deleted. You can request early deletion at any time.</P>
        </Section>

        <Section title="Your rights (GDPR)">
          <P>If you are based in the EU or EEA, you have the right to:</P>
          <ul style={{ paddingLeft: 20, lineHeight: 2, color: 'rgba(255,255,255,0.65)', fontSize: 15 }}>
            <li>Access the personal data we hold about you</li>
            <li>Rectify inaccurate data</li>
            <li>Request deletion of your data</li>
            <li>Withdraw consent at any time</li>
          </ul>
          <P>To exercise any of these rights, email <a href="mailto:athleteplanner.app@gmail.com" style={{ color: '#CF6232' }}>athleteplanner.app@gmail.com</a>. We will respond within 30 days.</P>
        </Section>

        <Section title="Cookies">
          <P>We use essential cookies for payment processing (Stripe) and anonymous analytics (Vercel). See our <Link href="/cookies" style={{ color: '#CF6232' }}>Cookie Policy</Link> for details.</P>
        </Section>

        <Section title="Changes to this policy">
          <P>We may update this policy from time to time. The date at the top of this page will always reflect the most recent version.</P>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40, paddingBottom: 40, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#CF6232', marginBottom: 14, letterSpacing: '-0.3px' }}>{title}</h2>
      {children}
    </section>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.75, margin: '0 0 12px' }}>{children}</p>
}
