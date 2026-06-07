'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Image from 'next/image'

const STEPS = [
  { id: 1, label: 'Analysing your profile...' },
  { id: 2, label: 'Calculating your training zones...' },
  { id: 3, label: 'Building your season periodization...' },
  { id: 4, label: 'Writing sessions week by week...' },
  { id: 5, label: 'Creating your spreadsheet...' },
]

type ProgressEvent = {
  step: number
  message: string
  tokens?: number
}

export default function LoadingPage() {
  const router = useRouter()
  const params = useParams()
  const sessionId = params.sessionId as string

  const [currentStep, setCurrentStep] = useState(1)
  const [currentMessage, setCurrentMessage] = useState(STEPS[0].label)
  const [weeksGenerated, setWeeksGenerated] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [dots, setDots] = useState('')
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 400)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!sessionId) return

    const es = new EventSource(`/api/generate?sessionId=${sessionId}`)
    eventSourceRef.current = es

    es.addEventListener('progress', (e: MessageEvent) => {
      const data: ProgressEvent = JSON.parse(e.data)
      setCurrentStep(data.step)
      setCurrentMessage(data.message)
      const match = data.message.match(/\((\d+) weeks/)
      if (match) setWeeksGenerated(parseInt(match[1]))
    })

    es.addEventListener('complete', (e: MessageEvent) => {
      const data = JSON.parse(e.data)
      es.close()
      sessionStorage.setItem(`plan_${sessionId}`, JSON.stringify(data.planSummary))
      setTimeout(() => router.push(`/preview/${sessionId}`), 1200)
    })

    es.addEventListener('error', (e: MessageEvent) => {
      try { const data = JSON.parse(e.data); setError(data.message) }
      catch { setError('An unexpected error occurred. Your payment is safe — contact support.') }
      es.close()
    })

    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) return
      setError('Connection lost. Reload the page to continue.')
      es.close()
    }

    return () => es.close()
  }, [sessionId, router])

  const progressPercent = Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100)

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
        background: 'linear-gradient(135deg, #CF6232 0%, #1A0805 45%, #000000 100%)',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 20,
          padding: '2.5rem',
        }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#fff', margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, margin: 0 }}>
            {error}
          </p>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            Session ID: <code style={{ fontFamily: 'monospace' }}>{sessionId}</code>
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: '#CF6232',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </div>
    )
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
      <div style={{
        maxWidth: 520,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        background: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24,
        padding: '2.5rem',
      }}>

        {/* Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(207,98,50,0.2)',
            border: '1.5px solid rgba(207,98,50,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <Image
              src="/claude-logo.png"
              alt="Claude"
              width={44}
              height={44}
              style={{ objectFit: 'contain' }}
            />
          </div>
          <div>
            <h1 style={{
              fontSize: 22,
              fontWeight: 700,
              color: '#fff',
              margin: '0 0 6px',
              letterSpacing: '-0.3px',
            }}>
              AI is building your training plan
            </h1>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', margin: 0, lineHeight: 1.5 }}>
              A fully personalised plan, built just for you.
              This takes around 30–60 seconds.
            </p>
          </div>
        </div>

        {/* Mensagem atual */}
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 14,
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          minHeight: 68,
        }}>
          <div style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'rgba(207,98,50,0.25)',
            border: '1px solid rgba(207,98,50,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#CF6232' }}>{currentStep}</span>
          </div>
          <div>
            <p style={{
              fontSize: 14,
              fontWeight: 500,
              color: '#fff',
              margin: '0 0 2px',
            }}>
              {currentMessage}{dots}
            </p>
            {weeksGenerated > 0 && (
              <p style={{ fontSize: 12, color: '#CF6232', margin: 0 }}>
                {weeksGenerated} weeks written
              </p>
            )}
          </div>
        </div>

        {/* Barra de progresso */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
              Step {currentStep} of {STEPS.length}
            </span>
            <span style={{ fontSize: 12, color: '#CF6232', fontWeight: 600 }}>
              {progressPercent}%
            </span>
          </div>
          <div style={{
            height: 5,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 99,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: 'linear-gradient(90deg, #CF6232, #FF8C5A)',
              borderRadius: 99,
              transition: 'width 0.8s ease',
            }} />
          </div>
        </div>

        {/* Lista de passos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STEPS.map(step => {
            const done = step.id < currentStep
            const active = step.id === currentStep
            return (
              <div key={step.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                opacity: step.id > currentStep ? 0.3 : 1,
                transition: 'opacity 0.4s',
              }}>
                <div style={{
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                  background: done ? '#CF6232' : active ? 'rgba(207,98,50,0.2)' : 'rgba(255,255,255,0.06)',
                  color: done ? '#fff' : active ? '#CF6232' : 'rgba(255,255,255,0.3)',
                  border: active ? '1.5px solid #CF6232' : '1.5px solid transparent',
                  transition: 'all 0.4s',
                }}>
                  {done ? '✓' : step.id}
                </div>
                <span style={{
                  fontSize: 13,
                  color: done ? '#CF6232' : active ? '#fff' : 'rgba(255,255,255,0.35)',
                  fontWeight: active ? 500 : 400,
                  transition: 'all 0.4s',
                }}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Nota de segurança */}
        <p style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.3)',
          textAlign: 'center',
          margin: 0,
          lineHeight: 1.5,
        }}>
          Your payment is confirmed. Even if you close this window,
          your plan will be sent to your email once it's ready.
        </p>

      </div>
    </div>
  )
}
