'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/app/components/AppShell'
import { useBiometryStore } from '@/app/stores/biometry-store'
import type { EyeData } from '@/app/types/biometrics'
import {
  CALCULATOR_AL_RANGE,
  getCalculatorBiometryIssues,
  isAlReadyForCalc,
} from '@/app/lib/biometry-payload'

const EYE_COLORS = { OD: '#f29121', OE: '#71ba66' }

const FIELDS: Array<{ key: keyof EyeData; label: string; unit: string; range: [number, number]; decimals: number }> = [
  { key: 'K1', label: 'K1 (Ceratometria plana)', unit: 'D', range: [36, 52], decimals: 2 },
  { key: 'K2', label: 'K2 (Ceratometria curva)', unit: 'D', range: [36, 52], decimals: 2 },
  { key: 'AL', label: 'AL (Comprimento axial)', unit: 'mm', range: [18, 34], decimals: 2 },
  { key: 'ACD', label: 'ACD (Profundidade câmara)', unit: 'mm', range: [1.5, 5], decimals: 2 },
  { key: 'LT', label: 'LT (Espessura cristalino)', unit: 'mm', range: [2, 7], decimals: 2 },
  { key: 'WTW', label: 'WTW (Branco a branco)', unit: 'mm', range: [10, 14], decimals: 2 },
  { key: 'CCT', label: 'CCT (Paquimetria)', unit: 'µm', range: [400, 700], decimals: 0 },
  { key: 'Cyl', label: 'Cilindro', unit: 'D', range: [0, 10], decimals: 2 },
  { key: 'Axis', label: 'Eixo', unit: '°', range: [0, 180], decimals: 0 },
]

function fieldStatus(v: number | undefined, range: [number, number]): 'ok' | 'warn' | 'neutral' {
  if (v == null || !Number.isFinite(v) || v === 0) return 'neutral'
  return v >= range[0] && v <= range[1] ? 'ok' : 'warn'
}

export default function ValidatePage() {
  const router = useRouter()
  const biometry = useBiometryStore((s) => s.biometry)
  const originalBiometry = useBiometryStore((s) => s.originalBiometry)
  const meta = useBiometryStore((s) => s.meta)
  const fileDataUrl = useBiometryStore((s) => s.fileDataUrl)
  const updateOD = useBiometryStore((s) => s.updateODField)
  const updateOE = useBiometryStore((s) => s.updateOEField)
  const [activeEye, setActiveEye] = useState<'OD' | 'OE'>('OD')
  const [showOriginal, setShowOriginal] = useState(false)

  useEffect(() => {
    if (!biometry) router.push('/')
  }, [biometry, router])

  if (!biometry) return null

  const eye = biometry[activeEye]
  const origEye = originalBiometry?.[activeEye]
  const updateFn = activeEye === 'OD' ? updateOD : updateOE
  const oeIsEmpty = activeEye === 'OE' && (!eye.AL || eye.AL === 0) && (!eye.K1 || eye.K1 === 0)
  const odIsEmpty = activeEye === 'OD' && (!eye.AL || eye.AL === 0) && (!eye.K1 || eye.K1 === 0)
  const odIssues = getCalculatorBiometryIssues(biometry, ['OD'])
  const canProceed = odIssues.length === 0
  const odAlMissing = !isAlReadyForCalc(biometry.OD)

  return (
    <AppShell>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
          Validar dados extraídos
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
          {meta?.filename || 'Exame'} — Compare o documento original com os campos extraídos
          {meta?.consensusScore ? ` • Consenso: ${Math.round(meta.consensusScore * 100)}%` : ''}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: fileDataUrl ? '1fr 1fr' : '1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
        {/* ── Left: Document preview ── */}
        {fileDataUrl && (
          <div className="card" style={{ padding: '0.75rem', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                📄 Documento original
              </span>
              <button
                className="btn-ghost"
                onClick={() => setShowOriginal(!showOriginal)}
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
              >
                {showOriginal ? 'Voltar' : 'Original não editado'}
              </button>
            </div>
            {fileDataUrl.startsWith('data:image/') || fileDataUrl.startsWith('data:application/pdf') ? (
              <iframe
                src={fileDataUrl}
                style={{ width: '100%', height: 'calc(100vh - 250px)', minHeight: 600, border: '1px solid var(--border)', borderRadius: 8 }}
                title="Documento original"
              />
            ) : (
              <div style={{ width: '100%', height: 400, background: 'var(--bg-secondary)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                Pré-visualização não disponível para este formato
              </div>
            )}
          </div>
        )}

        {/* ── Right: Extracted fields ── */}
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          {/* Eye toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {(['OD', 'OE'] as const).map((e) => (
              <button
                key={e}
                className={activeEye === e ? 'btn-primary' : 'btn-ghost'}
                onClick={() => setActiveEye(e)}
                style={{
                  minWidth: 100, fontSize: '0.8rem', padding: '0.4rem 1rem',
                  fontWeight: activeEye === e ? 600 : 400,
                  background: activeEye === e ? EYE_COLORS[e] : undefined,
                  borderColor: activeEye === e ? EYE_COLORS[e] : undefined,
                }}
              >
                {e === 'OD' ? '👁️ OD Direito' : '👁️ OE Esquerdo'}
              </button>
            ))}
            {activeEye === 'OE' && oeIsEmpty && (
              <button className="btn-ghost" onClick={() => {
                // Copia OD → OE
                const od = biometry.OD
                updateOE('K1', od.K1)
                updateOE('K2', od.K2)
                updateOE('AL', od.AL)
                updateOE('ACD', od.ACD)
                updateOE('LT', od.LT)
                updateOE('WTW', od.WTW)
                updateOE('CCT', od.CCT ?? 540)
                updateOE('Cyl', od.Cyl ?? 0)
                updateOE('Axis', od.Axis ?? 0)
              }} style={{ fontSize: '0.7rem', padding: '0.3rem 0.6rem' }}>
                📋 Copiar OD → OE (bilateral)
              </button>
            )}
          </div>

          {/* Empty eye warning */}
          {activeEye === 'OE' && oeIsEmpty && (
            <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, fontSize: '0.72rem', color: '#92400e' }}>
              ⚠️ A extração não detectou dados do olho esquerdo neste exame. Preencha manualmente ou use "Copiar OD → OE" se for bilateral com valores similares.
            </div>
          )}
          {activeEye === 'OD' && odIsEmpty && (
            <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: '#fef3c7', border: '1px solid #fbbf24', borderRadius: 8, fontSize: '0.72rem', color: '#92400e' }}>
              ⚠️ Nenhum dado extraído para o olho direito. Verifique o documento.
            </div>
          )}
          {odAlMissing && (
            <div style={{ marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--danger-glow)', border: '1px solid var(--danger)', borderRadius: 8, fontSize: '0.72rem', color: 'var(--danger)' }}>
              AL do OD obrigatório para calcular (mín. {CALCULATOR_AL_RANGE.min} mm, máx. {CALCULATOR_AL_RANGE.max} mm).
              Valor atual: {Number.isFinite(biometry.OD.AL) ? `${biometry.OD.AL} mm` : 'ausente'}.
              Preencha antes de prosseguir.
            </div>
          )}

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {FIELDS.map(({ key, label, unit, range, decimals }) => {
              const val = showOriginal ? (origEye?.[key] ?? eye[key]) : eye[key]
              const origVal = origEye?.[key]
              const isEdited = !showOriginal && origVal != null && origVal !== val
              const status = fieldStatus(val ?? undefined, range)

              return (
                <div key={key} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.35rem 0.5rem',
                  borderRadius: 6,
                  background: isEdited ? 'var(--warning-glow)' : status === 'warn' ? 'var(--danger-glow)' : 'transparent',
                }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 600, width: 14, textAlign: 'center',
                    color: status === 'ok' ? 'var(--accent)' : status === 'warn' ? 'var(--danger)' : 'var(--text-muted)',
                  }}>
                    {status === 'ok' ? '✓' : status === 'warn' ? '!' : '·'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', minWidth: 160 }}>{label}</span>
                  <input
                    className="input-field"
                    type="number"
                    value={val ?? ''}
                    onChange={(e) => updateFn(key, parseFloat(e.target.value) || 0)}
                    step={decimals === 0 ? 1 : 0.01}
                    style={{ width: 80, fontSize: '0.8rem', textAlign: 'right' }}
                  />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', minWidth: 30 }}>{unit}</span>
                  {isEdited && (
                    <span style={{ fontSize: '0.65rem', color: 'var(--warning)' }} title={`Original: ${origVal?.toFixed(decimals)}`}>
                      editado
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="btn-ghost" onClick={() => router.push('/')}>← Voltar</button>
        <button
          className="btn-primary"
          disabled={!canProceed}
          onClick={() => router.push('/calculators')}
          title={canProceed ? undefined : odIssues.map((i) => i.message).join(' · ')}
          style={{ opacity: canProceed ? 1 : 0.4 }}
        >
          Prosseguir → Lentes e Calculadoras
        </button>
      </div>
      {!canProceed && (
        <p style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--danger)', textAlign: 'right' }}>
          {odIssues.map((i) => i.message).join(' · ')}
        </p>
      )}
    </AppShell>
  )
}
