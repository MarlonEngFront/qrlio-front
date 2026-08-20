import type { IOL } from '@/app/lib/iol-catalog'
import type { CalculatorId } from '@/app/lib/calculator-types'
import type { EyeData } from '@/app/types/biometrics'
import type { ParsedBiometry, SurgeryParams, BiometryMeta } from '@/app/stores/biometry-store'
import { isEyeEmpty } from '@/app/lib/biometry-payload'

export function toIolFamily(lens: IOL) {
  return {
    id: lens.id,
    brand: lens.manufacturer,
    family: lens.model,
    a_constant: lens.aConstant,
    toric_available: lens.type.includes('toric'),
    code: lens.manufacturerCode || lens.model,
    haigisA0: lens.haigisA0,
    haigisA1: lens.haigisA1,
    haigisA2: lens.haigisA2,
  }
}

function buildEyePayload(eye: EyeData, eyeSurgery: SurgeryParams['OD'], sia: { SIA: number; SIAAxis: number }) {
  const steepFromFlat = (flat: number) => (flat + 90 > 180 ? flat - 90 : flat + 90)
  // Axis null = não extraído; não confundir com meridiano 0°
  const k1Axis = eye.K1Axis ?? eye.Axis ?? undefined
  const k2Axis = eye.K2Axis ?? (k1Axis != null ? steepFromFlat(k1Axis) : undefined)

  return {
    biometry: { AL: eye.AL, ACD: eye.ACD, LT: eye.LT, WTW: eye.WTW, CCT: eye.CCT, method: 'custom_a' as const },
    keratometry: {
      selected: 'anterior' as const,
      K1: eye.K1,
      K2: eye.K2,
      K1Axis: k1Axis,
      K2Axis: k2Axis,
      Cyl: eye.Cyl,
      Axis: eye.Axis ?? undefined,
    },
    surgery: { SIA: sia.SIA, SIAAxis: sia.SIAAxis, refTarget: eyeSurgery.refTarget },
    calculatorPreferences: { seIOLPower: eyeSurgery.seIOLPower, kIndex: '1.3375' as const, cylinderConvention: 'plus' as const, includePCA: true },
  }
}

/**
 * Payload de POST /calculate/compare-lenses — usado tanto no cálculo em lote quanto no retry pontual.
 * Inclui OE automaticamente quando o olho tem dado real (isEyeEmpty), não só OD — o worker já
 * processa `eyes` genericamente, o gap era só aqui.
 */
export function buildComparePayload(
  calcId: CalculatorId,
  calcLabel: string,
  lenses: IOL[],
  biometry: ParsedBiometry,
  surgeryParams: SurgeryParams,
  meta: BiometryMeta | null,
) {
  const sia = { SIA: surgeryParams.SIA, SIAAxis: surgeryParams.SIAAxis }
  const eyes: Partial<Record<'OD' | 'OE', ReturnType<typeof buildEyePayload>>> = {
    OD: buildEyePayload(biometry.OD, surgeryParams.OD, sia),
  }
  if (!isEyeEmpty(biometry.OE)) {
    eyes.OE = buildEyePayload(biometry.OE, surgeryParams.OE, sia)
  }

  return {
    requestId: `qrlio-front-${Date.now()}-${calcId}`,
    source: { app: 'qrlio-front', version: '0.1.0', environment: 'local' as const },
    patient: {
      examId: meta?.examId,
      patientId: meta?.patient?.id ?? undefined,
      examTypeName: meta?.patient?.name ?? undefined,
      isDemoData: false,
    },
    calculator: { id: calcId, label: calcLabel },
    lenses: lenses.map(toIolFamily),
    eyes,
  }
}

/** Acha a lente selecionada correspondente a um CalculatorResult, a partir do "Label — Modelo". */
export function findLensForResult(calculatorLabel: string, lenses: IOL[]): IOL | null {
  const lensLabel = calculatorLabel.split(' — ')[1]
  if (!lensLabel) return null
  return lenses.find((l) => lensLabel === l.model || lensLabel === `${l.manufacturer} ${l.model}`) ?? null
}
