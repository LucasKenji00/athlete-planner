'use client'

import { useEffect, useRef, useState } from 'react'

const REVIEWS = [
  {
    name: 'James Mitchell', age: 36, sport: 'Running',
    text: 'Ran 3:17 in London. Was pretty doubtful about AI plans if I\'m honest, but the structure was genuinely impressive. Taper felt perfect.',
    race: 'London Marathon',
  },
  {
    name: 'Carlos Martínez', age: 33, sport: 'Running',
    text: 'Bajé de 3:25 en Madrid. Nunca pensé que un plan de 20€ pudiera estar tan bien estructurado. Cada semana tenía sentido, sin sesiones de relleno.',
    race: 'Maratón de Madrid',
  },
  {
    name: 'Emma Thompson', age: 28, sport: 'Triathlon',
    text: 'Finished my first 70.3 in 5:08 — way ahead of goal. The zones were precise and the brick sessions from phase 2 made the run off the bike feel completely normal.',
    race: 'Ironman 70.3 Barcelona',
  },
  {
    name: 'Julien Moreau', age: 37, sport: 'Cycling',
    text: 'Mon FTP est passé de 205 à 252W en 16 semaines. Le plan était aussi structuré que celui d\'un vrai coach. Impressionnant pour ce prix.',
    race: null,
  },
  {
    name: 'Sarah O\'Brien', age: 31, sport: 'Running',
    text: 'Claude understood my profile better than I expected. The detail in each session blew me away — exact zones, warm-up sets, cool-down. Genuinely felt made for me.',
    race: null,
  },
  {
    name: 'María García', age: 29, sport: 'Triathlon',
    text: 'Terminé mi primer 70.3 en Valencia en 5:22. Las zonas eran perfectas y el taper llegó justo cuando lo necesitaba. Vale mucho más de lo que cuesta.',
    race: 'Ironman 70.3 Valencia',
  },
  {
    name: 'Tom Becker', age: 44, sport: 'Gym / Strength',
    text: 'Got my plan in under a minute. 12 weeks later — up 9kg on squat, 7kg on bench. Clean progression, no fluff.',
    race: null,
  },
  {
    name: 'Olivia Chen', age: 26, sport: 'Open Water',
    text: 'The technique drills in phase 1 were things I\'d never seen in generic plans. 10K OWS felt effortless. Easily worth 10x the price.',
    race: '10K OWS Cascais',
  },
  {
    name: 'David Hartmann', age: 41, sport: 'Cycling',
    text: 'FTP went from 210 to 249W in 16 weeks. Better structured than plans I\'ve paid €200 for. The indoor/outdoor mix was exactly right.',
    race: null,
  },
]

function Card({ r }: { r: (typeof REVIEWS)[number] }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 16, padding: '1.5rem',
      display: 'flex', flexDirection: 'column', gap: 12,
      minHeight: 220,
    }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1,2,3,4,5].map(s => <span key={s} style={{ color: '#CF6232', fontSize: 14 }}>★</span>)}
      </div>
      <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, margin: 0, flex: 1 }}>
        "{r.text}"
      </p>
      {r.race && (
        <span style={{
          alignSelf: 'flex-start', fontSize: 10, color: '#CF6232',
          background: 'rgba(207,98,50,0.1)', border: '1px solid rgba(207,98,50,0.2)',
          borderRadius: 5, padding: '2px 7px', fontWeight: 600,
        }}>
          {r.race}
        </span>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: `hsl(${r.name.charCodeAt(0) * 7 % 360}, 28%, 24%)`,
          border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.65)',
        }}>
          {r.name[0]}
        </div>
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0 }}>{r.name}, {r.age}</p>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{r.sport}</p>
        </div>
      </div>
    </div>
  )
}

export function ReviewsCarousel() {
  const total = REVIEWS.length
  const [index, setIndex] = useState(0)
  const [fading, setFading] = useState(false)
  const pausedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const prevIdx = ((index - 1) + total) % total
  const nextIdx = (index + 1) % total

  const fadeTo = (t: number) => {
    const target = ((t % total) + total) % total
    setFading(true)
    setTimeout(() => { setIndex(target); setFading(false) }, 220)
  }

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) {
        setIndex(curr => {
          const n = (curr + 1) % total
          setFading(true)
          setTimeout(() => { setIndex(n); setFading(false) }, 220)
          return curr
        })
      }
    }, 3800)
  }

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const go = (dir: 1 | -1) => {
    fadeTo(index + dir)
    startTimer()
  }

  const arrowBtn = (dir: 1 | -1) => (
    <button
      onClick={() => go(dir)}
      style={{
        width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.15)',
        background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.7)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flexShrink: 0, transition: 'background 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(207,98,50,0.25)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
    >
      {dir === -1 ? '←' : '→'}
    </button>
  )

  return (
    <div
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
      style={{ padding: '1rem 0' }}
    >
      {/* Clips the side peek cards */}
      <div style={{ overflow: 'hidden', maxWidth: 660, margin: '0 auto' }}>
        {/* Center card — peek cards overflow out from this */}
        <div style={{ maxWidth: 560, margin: '0 auto', position: 'relative' }}>

          {/* Left peek — prev card, blurred */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: 'calc(100% + 16px)',
            width: 560,
            filter: 'blur(4px)',
            opacity: 0.18,
            pointerEvents: 'none',
          }}>
            <Card r={REVIEWS[prevIdx]} />
          </div>

          {/* Center card — active */}
          <div style={{
            opacity: fading ? 0 : 1,
            transform: fading ? 'translateY(5px)' : 'translateY(0)',
            transition: 'opacity 0.22s ease, transform 0.22s ease',
          }}>
            <Card r={REVIEWS[index]} />
          </div>

          {/* Right peek — next card, blurred */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 'calc(100% + 16px)',
            width: 560,
            filter: 'blur(4px)',
            opacity: 0.18,
            pointerEvents: 'none',
          }}>
            <Card r={REVIEWS[nextIdx]} />
          </div>

        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 16 }}>
        {arrowBtn(-1)}
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', minWidth: 40, textAlign: 'center' }}>
          {index + 1} / {total}
        </span>
        {arrowBtn(1)}
      </div>
    </div>
  )
}
