'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

const STEPS = [
  { label: 'Upload',    path: '/',            idx: 0 },
  { label: 'Validar',   path: '/validate',    idx: 1 },
  { label: 'Calcular',  path: '/calculators', idx: 2 },
  { label: 'Resultado', path: '/results',     idx: 3 },
]

function currentStepIndex(pathname: string) {
  if (pathname.startsWith('/results')) return 3
  if (pathname.startsWith('/calculators')) return 2
  if (pathname.startsWith('/validate')) return 1
  return 0
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const stepIdx = currentStepIndex(pathname)

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* ── Top bar ── */}
      <header
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
            {/* Logo */}
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div
                style={{
                  width: 28, height: 28,
                  background: 'var(--accent)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#000', fontWeight: 700, fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                λ
              </div>
              <div>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.95rem', letterSpacing: '-0.01em' }}>
                  QRLIO
                </span>
                <span style={{ color: 'var(--accent)', fontSize: '0.65rem', display: 'block', lineHeight: 1, marginTop: 1, fontWeight: 500 }}>
                  BIOMETRY ENGINE
                </span>
              </div>
            </Link>

            {/* Badge live */}
            <div
              className="glow-pulse"
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '3px 10px',
                borderRadius: 20,
                background: 'var(--accent-glow)',
                border: '1px solid rgba(0,230,153,0.2)',
                fontSize: '0.7rem',
                fontWeight: 500,
                color: 'var(--accent)',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
              6 calculadoras ativas
            </div>
          </div>
        </div>

        {/* ── Progress bar (2px) ── */}
        <div className="progress-bar" style={{ borderRadius: 0 }}>
          <div
            className="progress-bar-fill"
            style={{ width: `${(stepIdx / (STEPS.length - 1)) * 100}%`, borderRadius: 0 }}
          />
        </div>

        {/* ── Step labels mínimos ── */}
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            {STEPS.map((step) => {
              const done = step.idx < stepIdx
              const active = step.idx === stepIdx
              return (
                <div
                  key={step.path}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    opacity: active || done ? 1 : 0.3,
                    transition: 'opacity 200ms ease',
                  }}
                >
                  <span
                    style={{
                      width: 18, height: 18, borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.6rem', fontWeight: 700,
                      background: done ? 'var(--accent)' : active ? 'var(--accent)' : 'transparent',
                      border: active && !done ? '2px solid var(--accent)' : 'none',
                      color: done || active ? '#000' : 'var(--text-muted)',
                    }}
                  >
                    {done ? '✓' : step.idx + 1}
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: active ? 600 : 400,
                      color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                  >
                    {step.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main style={{ flex: 1, maxWidth: 1120, margin: '0 auto', width: '100%', padding: '2rem 1.5rem' }}>
        {children}
      </main>
    </div>
  )
}
