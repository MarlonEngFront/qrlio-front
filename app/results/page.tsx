'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/app/components/AppShell'
import { useBiometryStore } from '@/app/stores/biometry-store'

export default function ResultsPage() {
  const router = useRouter()
  const biometry = useBiometryStore((s) => s.biometry)
  const meta = useBiometryStore((s) => s.meta)
  const results = useBiometryStore((s) => s.calculationResults)
  const selectedLenses = useBiometryStore((s) => s.selectedLenses)

  useEffect(() => {
    if (!biometry) router.push('/')
  }, [biometry, router])

  if (!biometry) return null

  return (
    <AppShell>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
          Resultados do cálculo
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
          {meta?.filename || 'Exame'} — {results.length > 0
            ? `${results.length} resultados (${selectedLenses.length} lente(s) × ${new Set(results.map(r => r.calculatorId)).size} calc(s))`
            : 'Nenhum cálculo executado ainda'}
        </p>
      </div>

      {/* Biometria resumo */}
      <div className="card" style={{ padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
        {(['OD', 'OE'] as const).map((eye) => {
          const e = biometry[eye]
          return (
            <div key={eye}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {eye === 'OD' ? '👁️ OD' : '👁️ OE'}
              </span>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: 4 }}>
                K1: {e.K1.toFixed(2)}D / K2: {e.K2.toFixed(2)}D
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>
                AL: {e.AL.toFixed(2)}mm / ACD: {e.ACD.toFixed(2)}mm
              </div>
            </div>
          )
        })}
      </div>

      {/* Results */}
      {results.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {results.map((r, i) => (
            <div key={r.calculatorId + i} className="card" style={{ padding: '1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{r.calculatorLabel}</span>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginLeft: 8 }}>{r.calculatorId}</span>
                </div>
                <span style={{
                  fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                  background: r.status === 'completed' ? 'var(--accent-glow)' : 'var(--danger-glow)',
                  color: r.status === 'completed' ? 'var(--accent)' : 'var(--danger)',
                }}>
                  {r.status === 'completed' ? '✓ Completo' : r.status === 'partial' ? '⚠ Parcial' : '✗ Falhou'}
                  {r.durationMs ? ` ${(r.durationMs / 1000).toFixed(1)}s` : ''}
                </span>
              </div>

              {r.error && (
                <div style={{ fontSize: '0.75rem', color: 'var(--danger)', padding: '0.5rem', background: 'var(--danger-glow)', borderRadius: 6, marginBottom: '0.5rem' }}>
                  {r.error}
                </div>
              )}

              {r.results.map((eyeResult, j) => (
                <div key={eyeResult.eye + j} style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.5rem',
                  padding: '0.5rem 0', borderTop: j > 0 ? '1px solid var(--border)' : undefined,
                }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    {eyeResult.eye === 'OD' ? 'Olho Direito' : 'Olho Esquerdo'}
                  </span>
                  {eyeResult.iolPower !== undefined && (
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>LIO</span>
                      <span style={{ display: 'block', fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 600 }}>
                        {eyeResult.iolPower.toFixed(1)} D
                      </span>
                    </div>
                  )}
                  {eyeResult.predictedRefraction !== undefined && (
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Ref. Prevista</span>
                      <span style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {eyeResult.predictedRefraction.toFixed(2)} D
                      </span>
                    </div>
                  )}
                  {eyeResult.toricModel && (
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Modelo Tórico</span>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }}>
                        {eyeResult.toricModel} @ {eyeResult.toricAxis}°
                      </span>
                    </div>
                  )}
                  {eyeResult.residualAstigmatism !== undefined && (
                    <div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Cil. Residual</span>
                      <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                        {eyeResult.residualAstigmatism.toFixed(2)} D
                      </span>
                    </div>
                  )}
                  {eyeResult.screenshotDataUrl && (
                    <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Screenshot do resultado</span>
                      <img src={eyeResult.screenshotDataUrl} alt="Resultado" style={{ maxWidth: '100%', borderRadius: 8, border: '1px solid var(--border)', marginTop: 4 }} />
                    </div>
                  )}
                  {eyeResult.raw && (eyeResult.raw as any).multiFormulaResults && (
                    <div style={{ gridColumn: '1 / -1', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Multi-fórmula:</span>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: 4 }}>
                        {((eyeResult.raw as any).multiFormulaResults as Array<{ formula: string; iolPower: number }>).map((f: any, k: number) => (
                          <span key={k} style={{ fontSize: '0.7rem', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 4 }}>
                            {f.formula.replace('®', '')}: <strong style={{ color: 'var(--accent)' }}>{f.iolPower.toFixed(1)}D</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1rem' }}>
            Nenhum resultado de cálculo disponível.
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>
            Selecione lentes e calculadoras e clique em Calcular.
          </p>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <button className="btn-ghost" onClick={() => router.push('/calculators')}>← Ajustar cálculo</button>
        <button className="btn-ghost" onClick={() => router.push('/')}>Novo exame</button>
      </div>
    </AppShell>
  )
}
