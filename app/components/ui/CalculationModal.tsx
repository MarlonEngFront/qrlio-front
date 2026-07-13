'use client'

import { useEffect, useState, useRef } from 'react'
import { CALCULATORS, type CalculatorId } from '@/app/lib/calculator-types'
import { TIER_LABELS, type IOL, type IOLTier } from '@/app/lib/iol-catalog'

export interface CalcProgress {
  lensId: string
  lensLabel: string
  calculatorId: CalculatorId
  status: 'pending' | 'running' | 'completed' | 'failed'
  durationMs?: number
  error?: string
}

interface Props {
  lenses: IOL[]
  calculatorIds: CalculatorId[]
  progress: CalcProgress[]
  elapsed: number // seconds
  onClose: () => void
}

const CALC_LABELS: Record<string, string> = {
  'escrs': 'ESCRS',
  'tecnis-toric': 'TECNIS Toric',
  'apacrs-toric': 'APACRS Toric',
  'apacrs-true-k-toric': 'APACRS True-K',
  'brascrs-multiformula': 'BRASCRS Multi',
  'brascrs-double-k': 'BRASCRS Double-K',
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}min ${s}s`
}

export default function CalculationModal({ lenses, calculatorIds, progress, elapsed, onClose }: Props) {
  const [showResults, setShowResults] = useState(false)
  const pulseRef = useRef<HTMLDivElement>(null)

  const totalOps = lenses.length * calculatorIds.length
  const completed = progress.filter(p => p.status === 'completed' || p.status === 'failed').length
  const failed = progress.filter(p => p.status === 'failed').length
  const allDone = completed === totalOps

  // Auto-show results after a brief delay when all done
  useEffect(() => {
    if (allDone && !showResults) {
      const t = setTimeout(() => setShowResults(true), 600)
      return () => clearTimeout(t)
    }
  }, [allDone, showResults])

  // Group progress by lens
  const lensProgress = lenses.map(lens => {
    const items = progress.filter(p => p.lensId === lens.id)
    const done = items.filter(p => p.status === 'completed').length
    const fail = items.filter(p => p.status === 'failed').length
    return { lens, items, done, fail, total: items.length }
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      animation: 'fadeIn 0.2s ease',
    }}>
      <div className="card" style={{
        width: '90vw', maxWidth: 520, maxHeight: '85vh',
        overflow: 'auto',
        padding: '1.5rem',
        animation: 'slideUp 0.3s ease',
        background: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          {!allDone ? (
            <>
              <div ref={pulseRef} style={{
                width: 56, height: 56, margin: '0 auto 0.75rem',
                borderRadius: '50%',
                background: 'var(--accent-glow)',
                border: '3px solid var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: 'pulse 1.5s ease-in-out infinite',
              }}>
                <span style={{ fontSize: '1.5rem' }}>🔬</span>
              </div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
                Calculando LIOs
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                {completed} de {totalOps} concluídos • {formatTime(elapsed)}
              </p>
            </>
          ) : (
            <>
              <div style={{
                width: 56, height: 56, margin: '0 auto 0.75rem',
                borderRadius: '50%',
                background: failed > 0 ? 'var(--warning-glow)' : 'var(--accent-glow)',
                border: `3px solid ${failed > 0 ? 'var(--warning)' : 'var(--accent)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '1.5rem' }}>{failed > 0 ? '⚠️' : '✅'}</span>
              </div>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
                {failed > 0 ? 'Cálculos concluídos com ressalvas' : 'Todos os cálculos concluídos!'}
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                {completed - failed}/{totalOps} OK {failed > 0 ? `• ${failed} falha(s)` : ''} • {formatTime(elapsed)}
              </p>
            </>
          )}
        </div>

        {/* ── Progress bar ── */}
        <div style={{
          height: 4, borderRadius: 2, background: 'var(--bg-secondary)',
          marginBottom: '1rem', overflow: 'hidden',
        }}>
          <div style={{
            height: '100%', borderRadius: 2,
            background: allDone && failed > 0 ? 'var(--warning)' : 'var(--accent)',
            width: `${totalOps > 0 ? (completed / totalOps) * 100 : 0}%`,
            transition: 'width 0.4s ease',
          }} />
        </div>

        {/* ── Lenses × Calculators ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          {lensProgress.map(({ lens, items, done, fail, total }) => {
            const lensDone = done + fail === total
            const tierColor = lens.tier === 'premium' ? '#fbbf24' : lens.tier === 'intermediate' ? '#818cf8' : '#94a3b8'
            return (
              <div key={lens.id} style={{
                padding: '0.6rem 0.75rem',
                borderRadius: 10,
                background: lensDone
                  ? (fail > 0 ? 'var(--warning-glow)' : 'var(--accent-glow)')
                  : 'var(--bg-secondary)',
                border: `1px solid ${lensDone ? (fail > 0 ? 'var(--warning)' : 'var(--accent)') : 'var(--border)'}`,
                transition: 'all 0.3s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                    <span style={{
                      fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, flexShrink: 0,
                      background: lens.tier === 'premium' ? '#fef3c7' : lens.tier === 'intermediate' ? '#e0e7ff' : '#f1f5f9',
                      color: lens.tier === 'premium' ? '#92400e' : lens.tier === 'intermediate' ? '#3730a3' : '#475569',
                    }}>
                      {TIER_LABELS[lens.tier as IOLTier][0].split(' ')[1]}
                    </span>
                    <strong style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)',
                      lineHeight: 1.3,
                    }}>
                      {lens.manufacturer} {lens.model}
                    </strong>
                  </div>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600, flexShrink: 0, marginLeft: 8,
                    color: lensDone ? (fail > 0 ? 'var(--warning)' : 'var(--accent)') : 'var(--accent)',
                  }}>
                    {lensDone ? `${done}/${total} OK` : `${done}/${total}`}
                  </span>
                </div>
                {/* Calculator badges */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {items.map(item => {
                    const isRunning = item.status === 'running'
                    const isDone = item.status === 'completed'
                    const isFailed = item.status === 'failed'
                    return (
                      <span key={item.calculatorId} style={{
                        fontSize: '0.65rem', padding: '2px 8px', borderRadius: 12,
                        background: isRunning
                          ? 'var(--accent-glow)'
                          : isDone
                            ? 'var(--accent-glow)'
                            : isFailed
                              ? 'var(--danger-glow)'
                              : 'var(--bg-secondary)',
                        color: isRunning
                          ? 'var(--accent)'
                          : isDone
                            ? 'var(--accent)'
                            : isFailed
                              ? 'var(--danger)'
                              : 'var(--text-muted)',
                        border: `1px solid ${isRunning ? 'var(--accent)' : isDone ? 'var(--accent)' : isFailed ? 'var(--danger)' : 'var(--border)'}`,
                        display: 'inline-flex', alignItems: 'center', gap: 3,
                        animation: isRunning ? 'pulse 1.5s ease-in-out infinite' : undefined,
                      }}>
                        {isRunning && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />}
                        {isDone && '✓ '}
                        {isFailed && '✗ '}
                        {CALC_LABELS[item.calculatorId] || item.calculatorId}
                        {item.durationMs && isDone && (
                          <span style={{ opacity: 0.7, fontSize: '0.6rem' }}>{(item.durationMs / 1000).toFixed(1)}s</span>
                        )}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Action ── */}
        {allDone ? (
          <button
            className="btn-primary"
            onClick={onClose}
            style={{ width: '100%', fontSize: '0.85rem', padding: '0.75rem' }}
          >
            Ver resultados →
          </button>
        ) : (
          <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
            Executando {totalOps} cálculos em paralelo...
          </p>
        )}

        <style jsx>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.05); opacity: 0.8; }
          }
        `}</style>
      </div>
    </div>
  )
}
