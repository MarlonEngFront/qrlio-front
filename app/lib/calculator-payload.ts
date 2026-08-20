import type { IOL } from '@/app/lib/iol-catalog'
import type { CalculatorId } from '@/app/lib/calculator-types'
import type { ParsedBiometry, SurgeryParams, BiometryMeta } from '@/app/stores/biometry-store'

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

/** Payload de POST /calculate/compare-lenses — usado tanto no cálculo em lote quanto no retry pontual. */
export function buildComparePayload(
  calcId: CalculatorId,
  calcLabel: string,
  lenses: IOL[],
  biometry: ParsedBiometry,
  surgeryParams: SurgeryParams,
  meta: BiometryMeta | null,
) {
  const steepFromFlat = (flat: number) => (flat + 90 > 180 ? flat - 90 : flat + 90)
  // Axis null = não extraído; não confundir com meridiano 0°
  const k1AxisOd = biometry.OD.K1Axis ?? biometry.OD.Axis ?? undefined
  const k2AxisOd = biometry.OD.K2Axis ?? (k1AxisOd != null ? steepFromFlat(k1AxisOd) : undefined)

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
    eyes: {
      OD: {
        biometry: { AL: biometry.OD.AL, ACD: biometry.OD.ACD, LT: biometry.OD.LT, WTW: biometry.OD.WTW, CCT: biometry.OD.CCT, method: 'custom_a' as const },
        keratometry: {
          selected: 'anterior' as const,
          K1: biometry.OD.K1,
          K2: biometry.OD.K2,
          K1Axis: k1AxisOd,
          K2Axis: k2AxisOd,
          Cyl: biometry.OD.Cyl,
          Axis: biometry.OD.Axis ?? undefined,
        },
        surgery: { SIA: surgeryParams.SIA, SIAAxis: surgeryParams.SIAAxis, refTarget: surgeryParams.OD.refTarget },
        calculatorPreferences: { seIOLPower: surgeryParams.OD.seIOLPower, kIndex: '1.3375' as const, cylinderConvention: 'plus' as const, includePCA: true },
      },
    },
  }
}

/** Acha a lente selecionada correspondente a um CalculatorResult, a partir do "Label — Modelo". */
export function findLensForResult(calculatorLabel: string, lenses: IOL[]): IOL | null {
  const lensLabel = calculatorLabel.split(' — ')[1]
  if (!lensLabel) return null
  return lenses.find((l) => lensLabel === l.model || lensLabel === `${l.manufacturer} ${l.model}`) ?? null
}
