'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

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

const CARD_WIDTH = 316

export function ReviewsCarousel() {
  const total = REVIEWS.length
  const [index, setIndex] = useState(0)
  const [transitioning, setTransitioning] = useState(true)
  const pausedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      if (!pausedRef.current) {
        setIndex(i => i + 1)
      }
    }, 3800)
  }, [])

  useEffect(() => {
    startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [startTimer])

  // Seamless infinite: when we hit the cloned end, snap back silently
  useEffect(() => {
    if (index === total) {
      const id = setTimeout(() => {
        setTransitioning(false)
        setIndex(0)
      }, 600)
      return () => clearTimeout(id)
    }
    if (index === -1) {
      const id = setTimeout(() => {
        setTransitioning(false)
        setIndex(total - 1)
      }, 600)
      return () => clearTimeout(id)
    }
  }, [index, total])

  useEffect(() => {
    if (!transitioning) {
      const id = setTimeout(() => setTransitioning(true), 20)
      return () => clearTimeout(id)
    }
  }, [transitioning])

  const go = (dir: 1 | -1) => {
    setTransitioning(true)
    setIndex(i => i + dir)
    startTimer()
  }

  const displayIndex = ((index % total) + total) % total

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
      <div style={{ overflow: 'hidden' }}>
        <div style={{
          display: 'flex',
          gap: 16,
          transition: transitioning ? 'transform 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
          transform: `translateX(calc(-${index * CARD_WIDTH}px - ${index * 16}px))`,
        }}>
          {/* Real cards + 1 clone at end for seamless loop */}
          {[...REVIEWS, REVIEWS[0]].map((r, i) => (
            <div key={i} style={{
              minWidth: 300, maxWidth: 300,
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, padding: '1.25rem',
              display: 'flex', flexDirection: 'column', gap: 10,
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', gap: 2 }}>
                {[1,2,3,4,5].map(s => <span key={s} style={{ color: '#CF6232', fontSize: 13 }}>★</span>)}
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, margin: 0 }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 'auto', paddingTop: 4 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                  background: `hsl(${r.name.charCodeAt(0) * 7 % 360}, 28%, 24%)`,
                  border: '1px solid rgba(255,255,255,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.65)',
                }}>
                  {r.name[0]}
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#fff', margin: 0 }}>{r.name}, {r.age}</p>
                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{r.sport}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Arrows + counter */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginTop: 20 }}>
        {arrowBtn(-1)}
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', minWidth: 40, textAlign: 'center' }}>
          {displayIndex + 1} / {total}
        </span>
        {arrowBtn(1)}
      </div>
    </div>
  )
}
