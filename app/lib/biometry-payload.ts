import type { EyeData } from '@/app/types/biometrics'

/** Ranges aligned with worker Zod (`eyeBiometrySchema` / `keratometrySchema`). */
export const CALCULATOR_AL_RANGE = { min: 15, max: 40 } as const

export interface BiometryPayloadIssue {
  eye: 'OD' | 'OE'
  field: string
  message: string
}

type EyesBiometry = { OD: EyeData; OE: EyeData }

/** Issues that would make POST /calculate/compare-lenses fail Zod validation. */
export function getCalculatorBiometryIssues(
  biometry: EyesBiometry,
  eyes: Array<'OD' | 'OE'> = ['OD'],
): BiometryPayloadIssue[] {
  const issues: BiometryPayloadIssue[] = []

  for (const eye of eyes) {
    const data = biometry[eye]
    const al = data.AL
    if (!Number.isFinite(al) || al < CALCULATOR_AL_RANGE.min || al > CALCULATOR_AL_RANGE.max) {
      const shown = Number.isFinite(al) ? String(al) : 'ausente'
      issues.push({
        eye,
        field: 'AL',
        message:
          al === 0 || !Number.isFinite(al)
            ? `${eye}: comprimento axial (AL) ausente ou zerado — preencha em Validar (mín. ${CALCULATOR_AL_RANGE.min} mm)`
            : `${eye}: AL=${shown} mm fora do range permitido (${CALCULATOR_AL_RANGE.min}–${CALCULATOR_AL_RANGE.max} mm)`,
      })
    }

    if (!Number.isFinite(data.K1) || data.K1 < 20 || data.K1 > 70) {
      issues.push({
        eye,
        field: 'K1',
        message: `${eye}: K1 inválido — preencha em Validar (20–70 D)`,
      })
    }
    if (!Number.isFinite(data.K2) || data.K2 < 20 || data.K2 > 70) {
      issues.push({
        eye,
        field: 'K2',
        message: `${eye}: K2 inválido — preencha em Validar (20–70 D)`,
      })
    }
  }

  return issues
}

export function formatBiometryPayloadError(issues: BiometryPayloadIssue[]): string {
  if (issues.length === 0) return ''
  return `Biometria inválida — cálculo bloqueado:\n${issues.map((i) => `• ${i.message}`).join('\n')}`
}

/** Humanize Zod-style validation details from worker 400 responses. */
export function formatWorkerValidationError(details: unknown): string | null {
  if (!Array.isArray(details) || details.length === 0) return null
  const lines = details.map((d) => {
    if (!d || typeof d !== 'object') return String(d)
    const item = d as { path?: unknown[]; message?: string; code?: string; minimum?: number }
    const path = Array.isArray(item.path) ? item.path.join('.') : 'campo'
    if (path.endsWith('.AL') || path.includes('.biometry.AL')) {
      return `• ${path}: comprimento axial abaixo do mínimo (${item.minimum ?? 15} mm). Volte em Validar e corrija o AL.`
    }
    return `• ${path}: ${item.message ?? item.code ?? 'inválido'}`
  })
  return `Validação do worker rejeitou o payload:\n${lines.join('\n')}`
}

export function isAlReadyForCalc(eye: EyeData): boolean {
  return Number.isFinite(eye.AL) && eye.AL >= CALCULATOR_AL_RANGE.min && eye.AL <= CALCULATOR_AL_RANGE.max
}
