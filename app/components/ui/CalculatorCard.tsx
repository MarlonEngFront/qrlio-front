'use client'

import type { CalculatorCard as CalcCard } from '@/app/lib/calculator-types'

interface Props {
  calc: CalcCard
  selected: boolean
  onToggle: () => void
}

export default function CalculatorCard({ calc, selected, onToggle }: Props) {
  return (
    <div
      className="card"
      onClick={onToggle}
      style={{
        padding: '1.25rem',
        cursor: 'pointer',
        borderColor: selected ? 'var(--accent)' : undefined,
        boxShadow: selected ? '0 0 0 1px var(--accent), 0 4px 12px var(--accent-glow)' : undefined,
        transition: 'all 200ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        {/* Logo */}
        <div
          style={{
            width: 36, height: 36, borderRadius: 'var(--radius-sm)',
            background: calc.logoBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 700, color: '#fff',
            fontFamily: 'var(--font-mono)',
            flexShrink: 0,
          }}
        >
          {calc.logoText}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {calc.label}
            </span>
            <span className="data-value" style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              ~{calc.estimatedSeconds}s
            </span>
          </div>
          <p style={{ fontSize: '0.73rem', color: 'var(--text-secondary)', margin: '0.3rem 0', lineHeight: 1.5 }}>
            {calc.description}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {calc.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 7px',
                  borderRadius: 4,
                  background: 'var(--surface-raised)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                {tag}
              </span>
            ))}
            {calc.requiresCaptcha && (
              <span
                style={{
                  fontSize: '0.65rem', padding: '2px 7px', borderRadius: 4,
                  background: 'var(--warning-glow)',
                  color: 'var(--warning)',
                  border: '1px solid rgba(240, 160, 32, 0.2)',
                }}
              >
                reCAPTCHA
              </span>
            )}
            {calc.supportsToric && (
              <span
                style={{
                  fontSize: '0.65rem', padding: '2px 7px', borderRadius: 4,
                  background: 'var(--accent-glow)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(0, 230, 153, 0.2)',
                }}
              >
                Tórica
              </span>
            )}
          </div>
        </div>

        {/* Checkbox */}
        <div
          style={{
            width: 22, height: 22, borderRadius: 'var(--radius-sm)',
            border: `2px solid ${selected ? 'var(--accent)' : 'var(--border)'}`,
            background: selected ? 'var(--accent)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
            transition: 'all 150ms ease',
          }}
        >
          {selected && <span style={{ color: '#000', fontSize: '0.65rem', fontWeight: 700 }}>✓</span>}
        </div>
      </div>
    </div>
  )
}
