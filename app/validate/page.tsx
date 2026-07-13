'use client'

import { useEffect, useState, type ReactNode } from 'react'
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

const FIELDS: Array<{
  key: keyof EyeData
  label: string
  shortLabel: string
  unit: string
  range: [number, number]
  decimals: number
}> = [
  { key: 'K1', label: 'K1 (Ceratometria plana)', shortLabel: 'K1', unit: 'D', range: [36, 52], decimals: 2 },
  { key: 'K2', label: 'K2 (Ceratometria curva)', shortLabel: 'K2', unit: 'D', range: [36, 52], decimals: 2 },
  { key: 'AL', label: 'AL (Comprimento axial)', shortLabel: 'AL', unit: 'mm', range: [18, 34], decimals: 2 },
  { key: 'ACD', label: 'ACD (Profundidade câmara)', shortLabel: 'ACD', unit: 'mm', range: [1.5, 5], decimals: 2 },
  { key: 'LT', label: 'LT (Espessura cristalino)', shortLabel: 'LT', unit: 'mm', range: [2, 7], decimals: 2 },
  { key: 'WTW', label: 'WTW (Branco a branco)', shortLabel: 'WTW', unit: 'mm', range: [10, 14], decimals: 2 },
  { key: 'CCT', label: 'CCT (Paquimetria)', shortLabel: 'CCT', unit: 'µm', range: [400, 700], decimals: 0 },
  { key: 'Cyl', label: 'Cilindro', shortLabel: 'Cyl', unit: 'D', range: [0, 10], decimals: 2 },
  { key: 'Axis', label: 'Eixo', shortLabel: 'Eixo', unit: '°', range: [0, 180], decimals: 0 },
]

function fieldStatus(v: number | undefined, range: [number, number]): 'ok' | 'warn' | 'neutral' {
  if (v == null || !Number.isFinite(v) || v === 0) return 'neutral'
  return v >= range[0] && v <= range[1] ? 'ok' : 'warn'
}

function isEyeEmpty(eye: EyeData): boolean {
  return (!eye.AL || eye.AL === 0) && (!eye.K1 || eye.K1 === 0)
}

function formatGender(g: string | null | undefined): string | null {
  if (!g) return null
  if (g === 'female') return 'Feminino'
  if (g === 'male') return 'Masculino'
  return g
}

function formatDob(dob: string | null | undefined): string | null {
  if (!dob) return null
  const m = dob.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  return dob
}

function formatExamDate(raw: string | null | undefined): string | null {
  if (!raw) return null
  // 2020-07-20T15:58:00 → 20/07/2020 15:58
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/)
  if (iso) {
    const date = `${iso[3]}/${iso[2]}/${iso[1]}`
    return iso[4] != null ? `${date} ${iso[4]}:${iso[5]}` : date
  }
  return raw
}

function formatDuration(ms: number | undefined): string | null {
  if (ms == null || !Number.isFinite(ms) || ms <= 0) return null
  const sec = Math.round(ms / 1000)
  return sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${sec % 60}s`
}

function engineLabel(id: string | undefined): string | null {
  if (!id) return null
  const map: Record<string, string> = {
    'gemini-flash': 'Gemini Flash',
    'qwen-vl': 'Qwen VL',
    deepseek: 'DeepSeek',
    mimo: 'Mimo Omni',
    'nidek-parser': 'Nidek Parser',
    'iolmaster-parser': 'IOLMaster Parser',
  }
  return map[id] || id
}

function EyeColumn({
  eyeKey,
  eye,
  origEye,
  showOriginal,
  onUpdate,
  emptyWarning,
  headerExtra,
}: {
  eyeKey: 'OD' | 'OE'
  eye: EyeData
  origEye: EyeData | undefined
  showOriginal: boolean
  onUpdate: (key: keyof EyeData, value: number) => void
  emptyWarning?: string
  headerExtra?: ReactNode
}) {
  const title = eyeKey === 'OD' ? 'OD Direito' : 'OE Esquerdo'
  const color = EYE_COLORS[eyeKey]

  return (
    <div style={{
      flex: 1,
      minWidth: 0,
      padding: '0.75rem',
      borderRadius: 10,
      border: `1.5px solid ${color}55`,
      background: 'var(--bg-secondary)',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: '0.75rem',
        flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: '0.8rem',
          fontWeight: 700,
          color,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <span aria-hidden>👁️</span> {title}
        </span>
        {headerExtra}
      </div>

      {emptyWarning && (
        <div style={{
          marginBottom: '0.65rem',
          padding: '0.45rem 0.6rem',
          background: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: 8,
          fontSize: '0.68rem',
          color: '#92400e',
          lineHeight: 1.4,
        }}>
          {emptyWarning}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {FIELDS.map(({ key, label, shortLabel, unit, range, decimals }) => {
          const val = showOriginal ? (origEye?.[key] ?? eye[key]) : eye[key]
          const origVal = origEye?.[key]
          const isEdited = !showOriginal && origVal != null && origVal !== val
          const status = fieldStatus(val ?? undefined, range)

          return (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '0.3rem 0.4rem',
                borderRadius: 6,
                background: isEdited ? 'var(--warning-glow)' : status === 'warn' ? 'var(--danger-glow)' : 'transparent',
              }}
            >
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 600,
                width: 12,
                textAlign: 'center',
                color: status === 'ok' ? 'var(--accent)' : status === 'warn' ? 'var(--danger)' : 'var(--text-muted)',
              }}>
                {status === 'ok' ? '✓' : status === 'warn' ? '!' : '·'}
              </span>
              <span
                title={label}
                style={{ fontSize: '0.72rem', color: 'var(--text-primary)', minWidth: 36, fontWeight: 600 }}
              >
                {shortLabel}
              </span>
              <input
                className="input-field"
                type="number"
                value={val ?? ''}
                onChange={(e) => onUpdate(key, parseFloat(e.target.value) || 0)}
                step={decimals === 0 ? 1 : 0.01}
                disabled={showOriginal}
                style={{ width: 72, fontSize: '0.78rem', textAlign: 'right', flex: 1, minWidth: 56 }}
              />
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', minWidth: 22 }}>{unit}</span>
              {isEdited && (
                <span
                  style={{ fontSize: '0.6rem', color: 'var(--warning)' }}
                  title={`Original: ${origVal?.toFixed(decimals)}`}
                >
                  edit
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ValidatePage() {
  const router = useRouter()
  const biometry = useBiometryStore((s) => s.biometry)
  const originalBiometry = useBiometryStore((s) => s.originalBiometry)
  const meta = useBiometryStore((s) => s.meta)
  const fileDataUrl = useBiometryStore((s) => s.fileDataUrl)
  const updateOD = useBiometryStore((s) => s.updateODField)
  const updateOE = useBiometryStore((s) => s.updateOEField)
  const [showOriginal, setShowOriginal] = useState(false)

  useEffect(() => {
    if (!biometry) router.push('/')
  }, [biometry, router])

  if (!biometry) return null

  const odIsEmpty = isEyeEmpty(biometry.OD)
  const oeIsEmpty = isEyeEmpty(biometry.OE)
  const odIssues = getCalculatorBiometryIssues(biometry, ['OD'])
  const canProceed = odIssues.length === 0
  const odAlMissing = !isAlReadyForCalc(biometry.OD)

  const copyOdToOe = () => {
    const od = biometry.OD
    updateOE('K1', od.K1)
    updateOE('K2', od.K2)
    updateOE('AL', od.AL)
    updateOE('ACD', od.ACD)
    updateOE('LT', od.LT)
    updateOE('WTW', od.WTW)
    updateOE('CCT', od.CCT ?? 540)
    updateOE('Cyl', od.Cyl ?? 0)
    // Axis null = não extraído; não gravar 0 (indistinguível de meridiano 0° real)
    if (od.Axis != null) updateOE('Axis', od.Axis)
    if (od.K1Axis != null) updateOE('K1Axis', od.K1Axis)
    if (od.K2Axis != null) updateOE('K2Axis', od.K2Axis)
  }

  return (
    <AppShell>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
          Validar dados extraídos
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
          {meta?.filename || 'Exame'} — Compare o documento original com os campos extraídos
        </p>
      </div>

      {/* ── Exam header: patient + device + extraction meta ── */}
      <div className="card" style={{
        padding: '0.85rem 1.1rem',
        marginBottom: '1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
      }}>
        {(meta?.patient?.name || meta?.patient?.dob || meta?.patient?.gender || meta?.patient?.age != null || meta?.patient?.id) ? (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: 1.45 }}>
            <strong style={{ fontWeight: 700 }}>
              {meta.patient?.name || 'Paciente não identificado'}
            </strong>
            {[
              meta.patient?.id ? `ID ${meta.patient.id}` : null,
              formatGender(meta.patient?.gender),
              formatDob(meta.patient?.dob) ? `nasc. ${formatDob(meta.patient?.dob)}` : null,
              meta.patient?.age != null ? `${meta.patient.age}a` : null,
            ].filter(Boolean).length > 0 && (
              <span style={{ color: 'var(--text-secondary)', marginLeft: 8 }}>
                · {[
                  meta.patient?.id ? `ID ${meta.patient.id}` : null,
                  formatGender(meta.patient?.gender),
                  formatDob(meta.patient?.dob) ? `nasc. ${formatDob(meta.patient?.dob)}` : null,
                  meta.patient?.age != null ? `${meta.patient.age}a` : null,
                ].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Dados do paciente não encontrados no exame
          </div>
        )}

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem 1rem',
          fontSize: '0.75rem',
          color: 'var(--text-secondary)',
        }}>
          {(meta?.device?.label || meta?.device?.type) && (
            <span>
              <strong style={{ color: 'var(--text-primary)' }}>Aparelho:</strong>{' '}
              {meta.device?.label || meta.device?.type}
            </span>
          )}
          {formatExamDate(meta?.patient?.examDate) && (
            <span>
              <strong style={{ color: 'var(--text-primary)' }}>Data do exame:</strong>{' '}
              {formatExamDate(meta?.patient?.examDate)}
            </span>
          )}
          {meta?.patient?.operator && (
            <span>
              <strong style={{ color: 'var(--text-primary)' }}>Operador:</strong>{' '}
              {meta.patient.operator}
            </span>
          )}
          {formatDuration(meta?.extractionDurationMs) && (
            <span>
              <strong style={{ color: 'var(--text-primary)' }}>Extração:</strong>{' '}
              {formatDuration(meta?.extractionDurationMs)}
            </span>
          )}
          {meta?.consensusScore != null && (
            <span>
              <strong style={{ color: 'var(--text-primary)' }}>Consenso:</strong>{' '}
              <span style={{ color: oeIsEmpty ? 'var(--warning)' : undefined }}>
                {oeIsEmpty
                  ? `${Math.min(50, Math.round(meta.consensusScore * 100))}% (só OD — OE ausente)`
                  : `${Math.round(meta.consensusScore * 100)}%`}
              </span>
            </span>
          )}
          {(meta?.engine1 || meta?.engine2) && (
            <span>
              <strong style={{ color: 'var(--text-primary)' }}>Engines:</strong>{' '}
              {[engineLabel(meta.engine1), engineLabel(meta.engine2)].filter(Boolean).join(' + ')}
            </span>
          )}
        </div>
      </div>

      <div style={{
        display: 'grid',
        // Preview dominante (~65%) — OD/OE em colunas na faixa direita (~35%)
        gridTemplateColumns: fileDataUrl
          ? 'minmax(520px, 1.85fr) minmax(360px, 1fr)'
          : '1fr',
        gap: '1.25rem',
        marginBottom: '1.5rem',
        alignItems: 'start',
      }}>
        {/* ── Left: Document preview ── */}
        {fileDataUrl && (
          <div className="card" style={{ padding: '0.75rem', overflow: 'hidden', minWidth: 0 }}>
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
                src={
                  fileDataUrl.startsWith('data:application/pdf')
                    ? `${fileDataUrl}#zoom=100`
                    : fileDataUrl
                }
                style={{
                  width: '100%',
                  height: 'calc(100vh - 220px)',
                  minHeight: 720,
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  display: 'block',
                }}
                title="Documento original"
              />
            ) : (
              <div style={{
                width: '100%',
                height: 400,
                background: 'var(--bg-secondary)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.8rem',
              }}>
                Pré-visualização não disponível para este formato
              </div>
            )}
          </div>
        )}

        {/* ── Right: both eyes ── */}
        <div className="card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            marginBottom: '0.85rem',
            flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Biometria OD + OE
            </span>
            {!fileDataUrl && (
              <button
                className="btn-ghost"
                onClick={() => setShowOriginal(!showOriginal)}
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
              >
                {showOriginal ? 'Voltar' : 'Original não editado'}
              </button>
            )}
          </div>

          {odAlMissing && (
            <div style={{
              marginBottom: '0.75rem',
              padding: '0.5rem 0.75rem',
              background: 'var(--danger-glow)',
              border: '1px solid var(--danger)',
              borderRadius: 8,
              fontSize: '0.72rem',
              color: 'var(--danger)',
            }}>
              AL do OD obrigatório para calcular (mín. {CALCULATOR_AL_RANGE.min} mm, máx. {CALCULATOR_AL_RANGE.max} mm).
              Valor atual: {Number.isFinite(biometry.OD.AL) ? `${biometry.OD.AL} mm` : 'ausente'}.
              Preencha antes de prosseguir.
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '0.75rem',
          }}>
            <EyeColumn
              eyeKey="OD"
              eye={biometry.OD}
              origEye={originalBiometry?.OD}
              showOriginal={showOriginal}
              onUpdate={updateOD}
              emptyWarning={odIsEmpty ? '⚠️ Nenhum dado extraído para o olho direito. Verifique o documento.' : undefined}
            />
            <EyeColumn
              eyeKey="OE"
              eye={biometry.OE}
              origEye={originalBiometry?.OE}
              showOriginal={showOriginal}
              onUpdate={updateOE}
              emptyWarning={oeIsEmpty
                ? '⚠️ Extração sem dados do OE. Preencha manualmente ou copie OD → OE se bilateral.'
                : undefined}
              headerExtra={oeIsEmpty ? (
                <button
                  className="btn-ghost"
                  onClick={copyOdToOe}
                  style={{ fontSize: '0.65rem', padding: '0.2rem 0.5rem' }}
                >
                  📋 Copiar OD → OE
                </button>
              ) : undefined}
            />
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
