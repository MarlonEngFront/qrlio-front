'use client'

import { BIOMETRIC_RANGES, isInRange, type BiometricKey } from '@/app/types/biometrics'

interface Props {
  field: BiometricKey
  value: number
  onChange: (value: number) => void
}

export default function BiometricField({ field, value, onChange }: Props) {
  const range = BIOMETRIC_RANGES[field]
  const inRange = isInRange(field, value)
  const display = range.decimals === 0 ? value.toFixed(0) : value.toFixed(range.decimals)

  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '0.7rem',
          fontWeight: 500,
          color: 'var(--text-muted)',
          marginBottom: 4,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {range.label}
        <span style={{ marginLeft: 4, color: 'var(--text-muted)', fontWeight: 400 }}>
          ({range.unit})
        </span>
      </label>
      <div style={{ position: 'relative' }}>
        <input
          className="input-field"
          type="number"
          value={display}
          step={range.decimals === 0 ? 1 : 0.01}
          onChange={(e) => {
            const v = parseFloat(e.target.value)
            if (!isNaN(v)) onChange(v)
          }}
          style={{
            borderColor: !inRange ? 'var(--danger)' : undefined,
            boxShadow: !inRange ? '0 0 0 2px var(--danger-glow)' : undefined,
          }}
        />
        {!inRange && (
          <span
            style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              fontSize: '0.7rem', color: 'var(--danger)', fontWeight: 600,
            }}
          >
            ![{range.min}–{range.max}]
          </span>
        )}
      </div>
    </div>
  )
}
