'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export function CookieBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem('cookie_consent')) setShow(true)
  }, [])

  const accept = (type: 'all' | 'essential') => {
    localStorage.setItem('cookie_consent', type)
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 999,
      background: 'rgba(15,5,2,0.97)', backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(207,98,50,0.25)',
      padding: '1rem 1.5rem',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      flexWrap: 'wrap', gap: 12,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', margin: 0, flex: '1 1 280px', lineHeight: 1.5 }}>
        We use cookies for payments and anonymous analytics. See our{' '}
        <Link href="/cookies" style={{ color: '#CF6232', textDecoration: 'underline' }}>Cookie Policy</Link>.
      </p>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={() => accept('essential')} style={{
          padding: '8px 16px', background: 'transparent',
          border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8,
          color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer', fontWeight: 500,
        }}>
          Essential only
        </button>
        <button onClick={() => accept('all')} style={{
          padding: '8px 16px', background: '#CF6232',
          border: 'none', borderRadius: 8,
          color: '#fff', fontSize: 13, cursor: 'pointer', fontWeight: 600,
        }}>
          Accept all
        </button>
      </div>
    </div>
  )
}
