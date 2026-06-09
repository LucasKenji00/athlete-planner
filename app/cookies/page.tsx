import Link from 'next/link'

const g = {
  fontFamily: 'system-ui, -apple-system, sans-serif',
  background: 'linear-gradient(160deg, #2D1005 0%, #0D0400 40%, #000000 100%)',
  color: '#fff',
  minHeight: '100vh',
}
const wrap = { maxWidth: 760, margin: '0 auto', padding: '4rem 1.5rem 5rem' }

export const metadata = { title: 'Cookie Policy — Athlete Planner' }

export default function CookiesPage() {
  return (
    <div style={g}>
      <div style={wrap}>
        <Link href="/" style={{ fontSize: 13, color: '#CF6232', textDecoration: 'none', display: 'inline-block', marginBottom: 32 }}>
          ← Back to Athlete Planner
        </Link>
        <h1 style={{ fontSize: 'clamp(26px, 5vw, 38px)', fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 }}>
          Cookie Policy
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 48 }}>
          Last updated: June 2026
        </p>

        <Section title="What are cookies?">
          <P>Cookies are small text files stored on your device when you visit a website. They help the site function correctly and, in some cases, collect anonymous usage data.</P>
        </Section>

        <Section title="Essential cookies">
          <P>These cookies are necessary for the website to function and cannot be disabled.</P>
          <CookieTable rows={[
            { name: 'Stripe', purpose: 'Payment processing and fraud prevention. Set by Stripe when you proceed to checkout.', type: 'Essential' },
            { name: 'Session', purpose: 'Maintains your quiz session as you move through the steps. Deleted when you close the browser.', type: 'Essential' },
          ]} />
        </Section>

        <Section title="Analytics cookies">
          <P>We use Vercel Analytics to understand how visitors use the site. All data is anonymous — no personal information is collected or linked to you.</P>
          <CookieTable rows={[
            { name: 'Vercel Analytics', purpose: 'Anonymous page view and performance data. No personal information is stored.', type: 'Analytics' },
          ]} />
          <P>If you choose "Essential only" in our cookie banner, analytics cookies are not activated.</P>
        </Section>

        <Section title="No advertising or tracking cookies">
          <P>We do not use advertising cookies, retargeting pixels, or any third-party tracking technologies. Your visit is not used to build advertising profiles or shared with ad networks.</P>
        </Section>

        <Section title="How to manage cookies">
          <P>You can control and delete cookies through your browser settings. Here are links to instructions for the most common browsers:</P>
          <ul style={{ paddingLeft: 20, lineHeight: 2.2, color: 'rgba(255,255,255,0.65)', fontSize: 15 }}>
            <li>Chrome: Settings → Privacy and security → Cookies and other site data</li>
            <li>Safari: Settings → Safari → Privacy & Security</li>
            <li>Firefox: Settings → Privacy & Security → Cookies and Site Data</li>
            <li>Edge: Settings → Cookies and site permissions</li>
          </ul>
          <P>Please note that disabling essential cookies may prevent the checkout process from working correctly.</P>
        </Section>

        <Section title="Your consent">
          <P>When you first visit Athlete Planner, a banner allows you to choose between accepting all cookies or essential cookies only. Your choice is stored in your browser's localStorage and the banner will not appear again.</P>
          <P>You can change your preference at any time by clearing your browser's localStorage for this site.</P>
        </Section>

        <Section title="Contact">
          <P>For questions about our use of cookies, contact <a href="mailto:athleteplanner.app@gmail.com" style={{ color: '#CF6232' }}>athleteplanner.app@gmail.com</a>.</P>
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

function CookieTable({ rows }: { rows: { name: string; purpose: string; type: string }[] }) {
  return (
    <div style={{ borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
        <thead>
          <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
            {['Cookie', 'Purpose', 'Type'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 600, verticalAlign: 'top', whiteSpace: 'nowrap' }}>{r.name}</td>
              <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.55 }}>{r.purpose}</td>
              <td style={{ padding: '12px 14px', color: '#CF6232', fontWeight: 600, verticalAlign: 'top', whiteSpace: 'nowrap' }}>{r.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
