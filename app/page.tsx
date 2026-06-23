'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/app/components/AppShell'
import FileDropZone from '@/app/components/ui/FileDropZone'
import StatusTracker from '@/app/components/ui/StatusTracker'
import { uploadExam, type ExamStatus } from '@/app/lib/qrlio-client'
import { useBiometryStore, type ParsedBiometry, type BiometryMeta } from '@/app/stores/biometry-store'
import type { EyeData } from '@/app/types/biometrics'

export default function UploadPage() {
  const router = useRouter()
  const setBiometry = useBiometryStore((s) => s.setBiometry)
  const setFileDataUrl = useBiometryStore((s) => s.setFileDataUrl)
  const clearAll = useBiometryStore((s) => s.clearAll)

  const [phase, setPhase] = useState<'idle' | 'uploading' | 'processing'>('idle')
  const [examId, setExamId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [filename, setFilename] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    setError(null)
    setFilename(file.name)
    setPhase('uploading')

    try {
      // Clear previous data
      clearAll()

      // Read file as data URL for document preview on validate page
      const reader = new FileReader()
      reader.onload = (e) => {
        if (e.target?.result) setFileDataUrl(e.target.result as string)
      }
      reader.readAsDataURL(file)

      // Upload para o worker QRLIO
      const upload = await uploadExam(file)
      setExamId(upload.exam_id)

      // Se já em cache e completo (legado) ou ready, vai direto pra validação
      if (upload.cached) {
        const { getExamStatus } = await import('@/app/lib/qrlio-client')
        const status = await getExamStatus(upload.exam_id)
        if (status.status === 'completed' || status.status === 'ready') {
          handleCompleted(status, file.name, file.size, file.type)
          return
        }
      }

      setPhase('processing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no upload')
      setPhase('idle')
    }
  }, [clearAll, router])

  const handleCompleted = useCallback((status: ExamStatus, name: string, fileSize: number, fileType: string) => {
    // Converte EyeFields do worker → EyeData da store
    const toEye = (e: { k1: number | null; k2: number | null; axial: number | null; acd: number | null;
                         sphere: number | null; cylinder: number | null; axis: number | null } | null): EyeData => ({
      K1: e?.k1 ?? 0,
      K2: e?.k2 ?? 0,
      AL: e?.axial ?? 0,
      ACD: e?.acd ?? 0,
      Cyl: e?.cylinder ?? 0,
      Axis: e?.axis ?? 0,
      LT: 4.5,
      WTW: 12.0,
      CCT: 540,
      SIA: 0.5,
      SIAAxis: 135,
      refTarget: -0.25,
    })

    const biometry: ParsedBiometry = {
      OD: toEye(status.od),
      OE: toEye(status.oe),
    }

    const meta: BiometryMeta = {
      examId: status.id,
      fileHash: status.file_hash,
      filename: name,
      fileSize,
      fileType,
      uploadedAt: new Date().toISOString(),
      status: status.status,
      consensusScore: status.consensus_score ?? undefined,
    }

    // Não mapeia resultados automáticos — o wizard de calculadoras fará isso sob demanda
    setBiometry(biometry, meta)
    router.push('/validate')
  }, [setBiometry, router])

  const handleProcessingComplete = useCallback((status: ExamStatus) => {
    handleCompleted(status, filename || 'unknown', 0, 'unknown')
  }, [handleCompleted, filename])

  const handleReset = () => {
    setPhase('idle')
    setExamId(null)
    setError(null)
    setFilename(null)
  }

  return (
    <AppShell>
      {/* ── Hero sutil ── */}
      <div style={{ marginBottom: '2rem' }}>
        <h1
          style={{
            fontSize: '1.5rem', fontWeight: 700,
            color: 'var(--text-primary)',
            letterSpacing: '-0.02em',
            margin: '0 0 0.35rem',
          }}
        >
          Extração de biometria ocular
        </h1>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
          Pipeline inteligente com <strong style={{ color: 'var(--accent)', fontWeight: 500 }}>Gemini 2.0 Flash</strong> +{' '}
          <strong style={{ color: 'var(--accent)', fontWeight: 500 }}>Claude Haiku</strong> em paralelo.
          Consensus Engine com tolerâncias clínicas. Suporte a 6 calculadoras LIO.
        </p>
      </div>

      {/* ── Upload zone ── */}
      {phase === 'idle' && (
        <FileDropZone onFile={handleFile} />
      )}

      {/* ── Upload progress ── */}
      {phase === 'uploading' && filename && (
        <div className="card" style={{ padding: '1.25rem 1.5rem', textAlign: 'center' }}>
          <div
            style={{
              width: 40, height: 40, margin: '0 auto 0.75rem',
              border: '2px solid var(--border)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }}
          />
          <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0 }}>
            Enviando {filename}...
          </p>
          <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── Processing tracker ── */}
      {phase === 'processing' && examId && (
        <StatusTracker
          examId={examId}
          onComplete={handleProcessingComplete}
          onError={(err) => {
            setError(err.message)
            setPhase('idle')
          }}
        />
      )}

      {/* ── Error ── */}
      {error && (
        <div
          className="card"
          style={{
            marginTop: '1rem', padding: '1rem 1.25rem',
            borderColor: 'var(--danger)',
            background: 'var(--danger-glow)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--danger)' }}>{error}</span>
            <button className="btn-ghost" onClick={handleReset} style={{ fontSize: '0.75rem' }}>
              Tentar novamente
            </button>
          </div>
        </div>
      )}
    </AppShell>
  )
}
