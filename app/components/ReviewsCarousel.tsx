'use client'

import { useEffect, useRef, useState } from 'react'

const REVIEWS = [
  {
    name: 'James Mitchell', age: 36, sport: 'Running',
    text: 'Sub-3h20 at London Marathon. I was sceptical about AI coaching but this completely changed my mind. Every session made sense and the taper was spot on.',
    race: 'London Marathon',
  },
  {
    name: 'Carlos Martínez', age: 33, sport: 'Running',
    text: 'Sub 3:25 en el Maratón de Madrid. El plan de Claude fue increíble, cada sesión tenía sentido. Nunca había entrenado con tanta estructura por tan poco dinero.',
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
    text: 'Terminé mi primer Ironman 70.3 en Valencia. Las zonas de entrenamiento eran perfectas y el taper llegó en el momento justo. Lo recomiendo a todos los atletas.',
    race: 'Ironman 70.3 Valencia',
  },
  {
    name: 'Tom Becker', age: 44, sport: 'Gym / Strength',
    text: 'Got my strength plan in under a minute. 12 weeks later, up 9kg on squat, 7kg on bench. Clean progression week by week. No fluff.',
    race: null,
  },
  {
    name: 'Olivia Chen', age: 26, sport: 'Open Water',
    text: 'The technique drills in phase 1 were things I\'d never seen in generic plans. 10K OWS felt effortless. Easily worth 10x the price.',
    race: '10K OWS Cascais',
  },
  {
    name: 'David Hartmann', age: 41, sport: 'Cycling',
    text: 'FTP went from 210 to 249W in 16 weeks. The structure with indoor intervals and long outdoor rides is really well thought out. Better than plans I\'ve paid €200 for.',
    race: null,
  },
]

export function ReviewsCarousel() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const trackRef = useRef<HTMLDivElement>(null)

  const total = REVIEWS.length

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => {
      setIndex(i => (i + 1) % total)
    }, 3800)
    return () => clearInterval(id)
  }, [paused, total])

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ overflow: 'hidden', position: 'relative', padding: '2rem 0' }}
    >
      <div
        ref={trackRef}
        style={{
          display: 'flex',
          gap: 16,
          transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          transform: `translateX(calc(-${index * 316}px))`,
          willChange: 'transform',
        }}
      >
        {/* Duplicate for seamless feel */}
        {[...REVIEWS, ...REVIEWS].map((r, i) => (
          <div key={i} style={{
            minWidth: 300, maxWidth: 300,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: 16, padding: '1.25rem',
            display: 'flex', flexDirection: 'column', gap: 10,
            flexShrink: 0,
          }}>
            {/* Stars */}
            <div style={{ display: 'flex', gap: 2 }}>
              {[1,2,3,4,5].map(s => (
                <span key={s} style={{ color: '#CF6232', fontSize: 13 }}>★</span>
              ))}
            </div>
            {/* Text */}
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.72)', lineHeight: 1.65, margin: 0 }}>
              "{r.text}"
            </p>
            {/* Race badge */}
            {r.race && (
              <span style={{
                alignSelf: 'flex-start', fontSize: 10, color: '#CF6232',
                background: 'rgba(207,98,50,0.1)', border: '1px solid rgba(207,98,50,0.2)',
                borderRadius: 5, padding: '2px 7px', fontWeight: 600,
              }}>
                {r.race}
              </span>
            )}
            {/* Author */}
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

      {/* Dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
        {REVIEWS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            style={{
              width: i === index ? 20 : 6, height: 6,
              borderRadius: 99, border: 'none', cursor: 'pointer',
              background: i === index ? '#CF6232' : 'rgba(255,255,255,0.15)',
              transition: 'all 0.3s', padding: 0,
            }}
          />
        ))}
      </div>
    </div>
  )
}
