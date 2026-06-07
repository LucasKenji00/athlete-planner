'use client'

import { useEffect, useState } from 'react'

export function CountdownTimer({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const [display, setDisplay] = useState('30:00')
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const KEY = 'ap_offer_30min_v1'
    let end = parseInt(localStorage.getItem(KEY) ?? '0')
    if (!end || end < Date.now()) {
      end = Date.now() + 30 * 60 * 1000
      localStorage.setItem(KEY, String(end))
    }
    const tick = () => {
      const diff = Math.max(0, end - Date.now())
      if (diff === 0) { setExpired(true); setDisplay('00:00'); return }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setDisplay(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const sizes = { sm: 14, md: 16, lg: 22 }

  return (
    <span style={{
      fontSize: sizes[size],
      fontWeight: 800,
      letterSpacing: '1px',
      fontVariantNumeric: 'tabular-nums',
      color: expired ? 'rgba(255,255,255,0.4)' : 'inherit',
    }}>
      {display}
    </span>
  )
}
