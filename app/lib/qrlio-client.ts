// ═══════════════════════════════════════════════════════════════════
// QRLIO Worker Client — comunicação com o worker Node.js
// ═══════════════════════════════════════════════════════════════════

const WORKER_URL = process.env.NEXT_PUBLIC_QRLIO_WORKER_URL || 'http://localhost:3000'

export interface UploadResponse {
  exam_id: string
  status: string
  file_hash: string
  cached?: boolean
}

export interface EyeFields {
  k1: number | null
  k2: number | null
  axial: number | null
  acd: number | null
  sphere: number | null
  cylinder: number | null
  axis: number | null
}

export interface ExamStatus {
  id: string
  file_hash: string
  status: string
  od: EyeFields | null
  oe: EyeFields | null
  consensus_passed: boolean | null
  validation_passed: boolean | null
  consensus_score: number | null
  engine_1: string | null
  engine_2: string | null
  extraction_duration_ms: number | null
  error_message: string | null
  created_at: string
  updated_at: string
  results: CalculatorOutput[]
}

export interface CalculatorOutput {
  calculator: string
  status: 'completed' | 'failed'
  output_fields: Record<string, unknown> | null
  duration_ms: number
}

// Envia arquivo de exame pro worker
export async function uploadExam(file: File): Promise<UploadResponse> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${WORKER_URL}/upload`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }

  return res.json()
}

// Consulta status de um exame
export async function getExamStatus(examId: string): Promise<ExamStatus> {
  const res = await fetch(`${WORKER_URL}/status/${examId}`)

  if (!res.ok) {
    throw new Error(`Exam not found: ${examId}`)
  }

  return res.json()
}

// Polling até exame completar
export function pollExamStatus(
  examId: string,
  onUpdate: (status: ExamStatus) => void,
  onComplete: (status: ExamStatus) => void,
  onError: (err: Error) => void,
  intervalMs = 1500,
  timeoutMs = 120_000,
) {
  const start = Date.now()
  let timer: ReturnType<typeof setInterval>

  const stop = () => clearInterval(timer)

  const check = async () => {
    try {
      const status = await getExamStatus(examId)
      onUpdate(status)

      // Estados terminais: completed, failed, consensus_failed, validation_failed
      const terminalStatuses = ['completed', 'failed', 'consensus_failed', 'validation_failed'];
      if (terminalStatuses.includes(status.status)) {
        stop()
        onComplete(status)
        return
      }

      if (Date.now() - start > timeoutMs) {
        stop()
        onError(new Error('Timeout: exame demorou mais de 2 minutos'))
      }
    } catch (err) {
      stop()
      onError(err instanceof Error ? err : new Error('Polling failed'))
    }
  }

  // Primeira checagem imediata
  check()
  timer = setInterval(check, intervalMs)

  return stop
}
