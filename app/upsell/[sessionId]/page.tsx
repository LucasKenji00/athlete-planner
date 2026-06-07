'use client'

import { useParams } from 'next/navigation'
import Image from 'next/image'
import { useState } from 'react'

const BULLETS = [
  '32 meal recipes organised by moment of day',
  'Breakfast, pre/post-workout, lunch, snacks, dinner, evening snack',
  'Macros for every recipe (carbs, protein, fat, calories)',
  'Complete race day fuelling protocol',
  'Delivered as a beautiful PDF to your email',
]

export default function UpsellPage() {
  const params = useParams()
  const sessionId = params.sessionId as string
  const [loading, setLoading] = useState<'nutrition' | 'basic' | null>(null)

  const goToCheckout = async (nutritionUpsell: boolean) => {
    setLoading(nutritionUpsell ? 'nutrition' : 'basic')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, nutrition_upsell: nutritionUpsell }),
      })
      const { url } = await res.json()
      window.location.href = url
    } catch {
      setLoading(null)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      background: 'linear-gradient(135deg, #CF6232 0%, #1A0805 45%, #000000 100%)',
    }}>
      <div style={{ maxWidth: 520, width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Header */}
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

        {/* Label */}
        <p style={{
          fontSize: 12, fontWeight: 700, color: 'rgba(207,98,50,0.9)',
          textTransform: 'uppercase', letterSpacing: '1.5px', margin: 0,
        }}>
          Your plan is ready to be generated
        </p>

        {/* Title */}
        <div>
          <h1 style={{
            fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 800, color: '#fff',
            letterSpacing: '-0.5px', margin: '0 0 8px', lineHeight: 1.15,
          }}>
            One last thing before we build your plan
          </h1>
        </div>

        {/* Featured card */}
        <div style={{
          background: 'rgba(207,98,50,0.08)',
          border: '1.5px solid rgba(207,98,50,0.45)',
          borderRadius: 20,
          padding: '1.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}>
          {/* Card headline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: '#fff', margin: 0 }}>
              Add a Personalized Nutrition Guide
            </h2>
          </div>

          {/* Price breakdown */}
          <div style={{
            background: 'rgba(0,0,0,0.25)', borderRadius: 12, padding: '14px 16px',
            display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>Training plan</span>
              <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>€19.99</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#CF6232', fontWeight: 600 }}>+ Nutrition guide</span>
              <span style={{ fontSize: 14, color: '#CF6232', fontWeight: 700 }}>only +€6</span>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, color: '#fff', fontWeight: 700 }}>Total</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textDecoration: 'line-through' }}>€35+</span>
                <span style={{ fontSize: 18, color: '#fff', fontWeight: 800 }}>€25.99</span>
              </div>
            </div>
          </div>

          {/* Bullets */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {BULLETS.map(b => (
              <div key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                  background: 'rgba(207,98,50,0.2)', border: '1px solid rgba(207,98,50,0.4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: '#CF6232', fontWeight: 700, marginTop: 1,
                }}>
                  ✓
                </span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}>{b}</span>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <p style={{
            fontSize: 13, color: 'rgba(255,255,255,0.5)',
            margin: 0, fontStyle: 'italic',
          }}>
            Added by 68% of athletes
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => goToCheckout(true)}
            disabled={loading !== null}
            style={{
              width: '100%', padding: '15px 20px',
              background: loading === 'nutrition' ? 'rgba(207,98,50,0.5)' : '#CF6232',
              color: '#fff', border: 'none', borderRadius: 12,
              fontSize: 16, fontWeight: 700, cursor: loading !== null ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading === 'nutrition' ? 'Redirecting...' : 'Yes, add nutrition guide — €25.99'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>or</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
          </div>

          <button
            onClick={() => goToCheckout(false)}
            disabled={loading !== null}
            style={{
              width: '100%', padding: '14px 20px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.6)', borderRadius: 12,
              fontSize: 15, fontWeight: 500, cursor: loading !== null ? 'not-allowed' : 'pointer',
              transition: 'border-color 0.2s',
            }}
          >
            {loading === 'basic' ? 'Redirecting...' : 'No thanks, just my training plan — €19.99'}
          </button>
        </div>

        <p style={{
          fontSize: 12, color: 'rgba(255,255,255,0.3)',
          textAlign: 'center', margin: 0, lineHeight: 1.6,
        }}>
          Both options include your full personalised training plan delivered to Google Sheets
        </p>

      </div>
    </div>
  )
}
