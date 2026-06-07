import Image from 'next/image'
import Link from 'next/link'
import { CountdownTimer } from './components/CountdownTimer'
import { ReviewsCarousel } from './components/ReviewsCarousel'

const SPORTS = [
  'Running', 'Trail Running', 'Road Cycling', 'Gravel / MTB',
  'Swimming', 'Open Water', 'Triathlon', 'Duathlon', 'Gym / Strength',
]

const FEATURES = [
  { label: 'Full season periodization',    desc: '4 training phases — base, build, peak, taper — structured around your exact race date.' },
  { label: 'Training zones for your data', desc: 'Pace, watts, and heart rate zones calculated from your real performance level.' },
  { label: 'Sessions written in detail',   desc: 'Every session: warm-up, main set, cool-down, duration, zone, and objective.' },
  { label: 'Recovery weeks built in',      desc: 'Automatic deload every 3–4 weeks to prevent overtraining and maximise adaptation.' },
  { label: 'Google Sheets delivery',        desc: 'Your plan arrives as a clean, formatted spreadsheet — ready to use on any device.' },
  { label: 'Optional nutrition guide',     desc: 'Pre/post workout nutrition, hydration zones, and a full race-day fuelling protocol.' },
]

const g: React.CSSProperties = {
  fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
  background: 'linear-gradient(160deg, #2D1005 0%, #0D0400 40%, #000000 100%)',
  color: '#fff',
  minHeight: '100vh',
}

const wrap: React.CSSProperties = { maxWidth: 860, margin: '0 auto', paddingLeft: '1.5rem', paddingRight: '1.5rem' }
const line: React.CSSProperties = { borderTop: '1px solid rgba(255,255,255,0.07)' }

export default function LandingPage() {
  return (
    <div style={{ ...g, paddingTop: 40 }}>

      {/* Announcement bar — fixed top */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 40,
        background: '#CF6232',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
          Launch offer — price goes up in
        </span>
        <span style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>
          <CountdownTimer />
        </span>
      </div>

      {/* Nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '1.25rem 2rem',
        position: 'sticky', top: 40,
        background: 'rgba(35,10,3,0.95)', backdropFilter: 'blur(20px)', zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', overflow: 'hidden',
            background: 'rgba(207,98,50,0.15)', border: '1px solid rgba(207,98,50,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Image src="/claude-logo.png" alt="Logo" width={18} height={18} style={{ objectFit: 'contain' }} />
          </div>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Athlete Planner</span>
        </div>
        <Link href="/quiz" style={{
          padding: '9px 20px', background: '#CF6232', color: '#fff',
          borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none',
        }}>
          Build my plan
        </Link>
      </nav>

      {/* Hero */}
      <div style={{ ...wrap, paddingTop: '7rem', paddingBottom: '5rem', textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', overflow: 'hidden',
            background: 'rgba(207,98,50,0.15)', border: '1.5px solid rgba(207,98,50,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Image src="/claude-logo.png" alt="Claude AI" width={50} height={50} style={{ objectFit: 'contain' }} />
          </div>
        </div>
        <p style={{
          fontSize: 12, color: 'rgba(207,98,50,0.9)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 28,
        }}>
          Powered by Claude AI — the world's most capable AI
        </p>
        <h1 style={{
          fontSize: 'clamp(34px, 6vw, 58px)', fontWeight: 800, lineHeight: 1.08,
          letterSpacing: '-2px', margin: '0 0 24px',
        }}>
          Your professional training plan,<br />
          <span style={{ color: '#CF6232' }}>built by AI in 60 seconds.</span>
        </h1>
        <p style={{
          fontSize: 17, color: 'rgba(255,255,255,0.5)', lineHeight: 1.75,
          maxWidth: 520, margin: '0 auto 16px',
        }}>
          The same quality as a coaching assessment —
          periodized, detailed, and tailored to your race.
          Without the €200–500 price tag.
        </p>

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 36 }}>
          <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', fontWeight: 500 }}>€29.99</span>
          <span style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: '-1px' }}>€14.97</span>
          <span style={{
            fontSize: 12, background: 'rgba(207,98,50,0.2)', border: '1px solid rgba(207,98,50,0.4)',
            color: '#CF6232', borderRadius: 6, padding: '4px 10px', fontWeight: 700, letterSpacing: '0.5px',
          }}>
            LAUNCH OFFER
          </span>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <Link href="/quiz" style={{
            padding: '15px 40px', background: '#CF6232', color: '#fff',
            borderRadius: 10, fontSize: 16, fontWeight: 700, textDecoration: 'none',
          }}>
            Build my plan
          </Link>
          <a href="#features" style={{
            padding: '15px 28px', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.65)', borderRadius: 10, fontSize: 15,
            fontWeight: 500, textDecoration: 'none',
          }}>
            What's included
          </a>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8, padding: '8px 16px', marginTop: 4,
        }}>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>Offer ends in</span>
          <span style={{ color: '#CF6232' }}><CountdownTimer size="md" /></span>
        </div>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', margin: '12px 0 0' }}>
          One-time payment · No subscription · Delivered to your email
        </p>
      </div>

      {/* Claude AI callout */}
      <div style={{ ...line, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ ...wrap, paddingTop: '3rem', paddingBottom: '3rem' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
            background: 'rgba(207,98,50,0.06)', border: '1px solid rgba(207,98,50,0.15)',
            borderRadius: 16, padding: '1.75rem 2rem',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(207,98,50,0.15)', border: '1px solid rgba(207,98,50,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
            }}>
              <Image src="/claude-logo.png" alt="Claude AI" width={32} height={32} style={{ objectFit: 'contain' }} />
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <p style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 5px' }}>
                Built by Claude — Anthropic's most advanced AI
              </p>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.65 }}>
                Claude reads your athlete profile with the depth of an experienced coach —
                your race distance, fitness level, available days, performance metrics —
                and generates a plan that actually makes sense, week by week.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sports */}
      <div style={{ ...line, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ ...wrap, paddingTop: '2.5rem', paddingBottom: '2.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 16 }}>
            Supported sports
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            {SPORTS.map(s => (
              <span key={s} style={{
                padding: '7px 16px', background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 99,
                fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: 500,
              }}>
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Reviews carousel */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '2.5rem 0' }}>
        <div style={{ ...wrap, marginBottom: 8 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0, textAlign: 'center' }}>
            What athletes say
          </p>
        </div>
        <ReviewsCarousel />
      </div>

      {/* How it works */}
      <div id="features" style={{ ...wrap, paddingTop: '5rem', paddingBottom: '5rem' }}>
        <p style={{ fontSize: 12, color: '#CF6232', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 12 }}>How it works</p>
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 40px', lineHeight: 1.15 }}>
          From quiz to plan in 3 steps
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 2 }}>
          {[
            { n: '01', title: 'Your profile',  desc: 'Tell us your sport, race date, fitness level, weekly availability, and weight. Takes 5 minutes.' },
            { n: '02', title: 'One payment',   desc: 'Pay once. €14.97. No subscription, no monthly fees, no upsells after checkout.' },
            { n: '03', title: 'Your plan',     desc: 'Claude generates your full plan and delivers it as a Google Sheets file straight to your inbox.' },
          ].map((step, i, arr) => (
            <div key={step.n} style={{
              padding: '2rem',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRight: i < arr.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.07)',
              borderRadius: i === 0 ? '12px 0 0 12px' : i === arr.length - 1 ? '0 12px 12px 0' : '0',
            }}>
              <p style={{ fontSize: 34, fontWeight: 900, color: '#CF6232', margin: '0 0 20px', letterSpacing: '-1px', lineHeight: 1 }}>{step.n}</p>
              <p style={{ fontSize: 17, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>{step.title}</p>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.65 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ ...wrap, paddingBottom: '5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: '#CF6232', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0 }}>What's included</p>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(207,98,50,0.1)', border: '1px solid rgba(207,98,50,0.2)',
            borderRadius: 7, padding: '6px 12px',
          }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>€14.97 offer ends in</span>
            <span style={{ color: '#CF6232' }}><CountdownTimer size="sm" /></span>
          </div>
        </div>
        <h2 style={{ fontSize: 'clamp(26px, 4vw, 36px)', fontWeight: 800, letterSpacing: '-0.8px', margin: '0 0 40px', lineHeight: 1.15 }}>
          Everything a coach builds —<br />without the monthly retainer
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10 }}>
          {FEATURES.map(f => (
            <div key={f.label} style={{
              padding: '1.5rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#CF6232', marginBottom: 14 }} />
              <p style={{ fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 6px' }}>{f.label}</p>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing CTA */}
      <div style={{ ...wrap, paddingBottom: '5rem' }}>
        <div style={{
          border: '1px solid rgba(207,98,50,0.2)', borderRadius: 20,
          padding: 'clamp(2rem, 5vw, 4rem)', textAlign: 'center',
          background: 'radial-gradient(ellipse at top, rgba(207,98,50,0.1) 0%, transparent 70%)',
        }}>
          <p style={{ fontSize: 12, color: '#CF6232', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: 20 }}>
            Launch offer
          </p>
          <h2 style={{ fontSize: 'clamp(26px, 5vw, 42px)', fontWeight: 800, letterSpacing: '-1.2px', margin: '0 0 24px', lineHeight: 1.1 }}>
            Get your plan today
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20, color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through', fontWeight: 500 }}>€29.99</span>
            <span style={{ fontSize: 48, fontWeight: 900, color: '#fff', letterSpacing: '-2px', lineHeight: 1 }}>€14.97</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '0 0 32px' }}>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>This price ends in</span>
            <span style={{
              background: '#CF6232', borderRadius: 8, padding: '6px 14px',
              fontSize: 20, fontWeight: 900, color: '#fff',
            }}>
              <CountdownTimer size="lg" />
            </span>
          </div>
          <Link href="/quiz" style={{
            display: 'inline-block', padding: '16px 48px',
            background: '#CF6232', color: '#fff', textDecoration: 'none',
            borderRadius: 12, fontSize: 17, fontWeight: 700,
          }}>
            Build my plan — €14.97
          </Link>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', marginTop: 16 }}>
            5-minute quiz · One-time payment · Money-back guarantee
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ ...line, padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%', overflow: 'hidden',
            background: 'rgba(207,98,50,0.15)', border: '1px solid rgba(207,98,50,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Image src="/claude-logo.png" alt="Logo" width={16} height={16} style={{ objectFit: 'contain' }} />
          </div>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>Athlete Planner</span>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>Powered by Claude AI · Built for serious athletes</p>
      </footer>

    </div>
  )
}
