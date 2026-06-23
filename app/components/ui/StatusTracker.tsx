'use client'

import { useState, useEffect, useRef } from 'react'
import { pollExamStatus, type ExamStatus } from '@/app/lib/qrlio-client'

const STATUS_LABELS: Record<string, string> = {
  uploaded: 'Recebido',
  extracting: 'Extraindo dados...',
  consensus_checking: 'Comparando engines...',
  consensus_passed: 'Consenso aprovado',
  consensus_failed: 'Consenso divergente',
  validation_failed: 'Dados fora do padrão',
  calculating: 'Calculando LIO...',
  ready: 'Pronto — aguardando calculadoras',
  completed: 'Concluído',
  failed: 'Falhou',
}

const ENGINE_NAMES: Record<string, string> = {
  'gemini-flash': 'Gemini 2.5 Flash (visão, 5s)',
  'qwen-vl': 'Qwen VL 72B (visão, 8s)',
  'deepseek': 'DeepSeek V4 Flash (texto, 22s)',
  'mimo': 'Mimo V2 Omni (visão, 19s)',
}

interface Props {
  examId: string
  onComplete: (status: ExamStatus) => void
  onError: (err: Error) => void
}

export default function StatusTracker({ examId, onComplete, onError }: Props) {
  const [status, setStatus] = useState<ExamStatus | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [extractionTime, setExtractionTime] = useState<number | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const [showConsensusInfo, setShowConsensusInfo] = useState(false)

  useEffect(() => {
    const start = Date.now()
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 500)

    const stop = pollExamStatus(
      examId,
      (s) => {
        setStatus(s)
        // Captura o tempo de extração quando disponível
        if (s.extraction_duration_ms && !extractionTime) {
          setExtractionTime(s.extraction_duration_ms)
        }
      },
      (s) => {
        clearInterval(timerRef.current)
        if (s.extraction_duration_ms) setExtractionTime(s.extraction_duration_ms)
        onComplete(s)
      },
      (err) => {
        clearInterval(timerRef.current)
        onError(err)
      },
      1500,
      600_000, // 10 min timeout (ESCRS 2captcha é lento)
    )

    return () => {
      stop()
      clearInterval(timerRef.current)
    }
  }, [examId, onComplete, onError])

  const currentStatus = status?.status || 'uploaded'
  const label = STATUS_LABELS[currentStatus] || currentStatus
  const isActive = !['ready', 'completed', 'failed', 'consensus_failed', 'validation_failed'].includes(currentStatus)
  const dots = isActive ? '.'.repeat((elapsed % 3) + 1) : ''

  return (
    <div className="card" style={{ marginTop: '1.5rem', padding: '1.25rem 1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontSize: '1.5rem' }}>{isActive ? '🔍' : currentStatus === 'ready' ? '✅' : currentStatus === 'completed' ? '🎯' : '❌'}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: isActive ? 'var(--text-primary)' : 'var(--accent)' }}>
              {label}{dots}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{elapsed}s</span>
          </div>

          {/* Extraction time badge */}
          {extractionTime && (
            <div style={{ marginTop: 4, fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 600 }}>
              ⚡ Extração: {(extractionTime / 1000).toFixed(1)}s
            </div>
          )}
        </div>

        {isActive && (
          <div style={{ width: 20, height: 20, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        )}
      </div>

      {/* Engines used */}
      {status?.engine_1 && status?.engine_2 && (
        <div style={{ marginTop: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: '0.75rem' }}>
          <span style={{ color: 'var(--text-secondary)' }}>🤖 Engines: </span>
          <strong style={{ color: 'var(--accent)' }}>{ENGINE_NAMES[status.engine_1] || status.engine_1}</strong>
          <span style={{ color: 'var(--text-muted)' }}> + </span>
          <strong style={{ color: 'var(--accent)' }}>{ENGINE_NAMES[status.engine_2] || status.engine_2}</strong>
        </div>
      )}

      {/* Consensus score */}
      {status?.consensus_score !== null && status?.consensus_score !== undefined && (
        <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>🤝 Consenso:</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: status.consensus_passed ? 'var(--accent)' : 'var(--warning)' }}>
            {Math.round(status.consensus_score * 100)}%
          </span>
          <button
            onClick={() => setShowConsensusInfo(!showConsensusInfo)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 12, width: 18, height: 18, cursor: 'pointer', fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            title="Como funciona o consenso?"
          >?</button>
        </div>
      )}

      {/* Consensus explanation tooltip */}
      {showConsensusInfo && (
        <div style={{ marginTop: '0.5rem', padding: '0.75rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, fontSize: '0.72rem', color: '#0c4a6e', lineHeight: 1.5 }}>
          <strong>Como funciona o Consensus Engine?</strong><br />
          As <strong>2 melhores engines</strong> de IA extraem os dados em paralelo.
          Cada campo (K1, K2, Axial, ACD) é comparado com <strong>tolerâncias clínicas</strong>:<br />
          • K1/K2: ±0.05 D<br />
          • Axial: ±0.02 mm (mais restrito — impacto direto no cálculo LIO)<br />
          • ACD: ±0.05 mm<br />
          • Esfera/Cilindro: ±0.125 D<br />
          Se as engines concordam dentro da tolerância → <strong style={{ color: '#16a34a' }}>PASS</strong>.
          O score é a % de campos que passaram. Abaixo de 70% → revisão manual.
        </div>
      )}

      {/* Validation */}
      {status?.validation_passed === false && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>
          ⚠️ Validação fisiológica falhou — dados fora dos ranges clínicos
        </div>
      )}

      {/* Error */}
      {status?.error_message && (
        <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--danger)', padding: '0.5rem', background: 'var(--danger-glow)', borderRadius: 6 }}>
          {status.error_message}
        </div>
      )}
      <style jsx>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
