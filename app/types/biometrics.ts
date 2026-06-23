// ═══════════════════════════════════════════════════════════════════
// Tipos e ranges de biometria oftalmológica
// Reaproveitado de voiston-calculator-hub + ranges QRLIO
// ═══════════════════════════════════════════════════════════════════

export interface EyeData {
  AL: number
  K1: number
  K2: number
  K1Axis?: number
  K2Axis?: number
  TK1?: number
  TK2?: number
  Cyl: number
  Axis: number
  ACD: number
  LT: number
  WTW: number
  CCT: number
  SIA: number
  SIAAxis: number
  refTarget: number
}

export const BIOMETRIC_RANGES = {
  AL:        { min: 20.0, max: 30.0, unit: 'mm',  label: 'Comprimento Axial',     decimals: 2 },
  K1:        { min: 37.0, max: 52.0, unit: 'D',   label: 'K1 (Ceratometria plana)', decimals: 2 },
  K2:        { min: 37.0, max: 52.0, unit: 'D',   label: 'K2 (Ceratometria curva)', decimals: 2 },
  TK1:       { min: 37.0, max: 52.0, unit: 'D',   label: 'TK1 (Total)',            decimals: 2 },
  TK2:       { min: 37.0, max: 52.0, unit: 'D',   label: 'TK2 (Total)',            decimals: 2 },
  Cyl:       { min: 0.0,  max: 10.0, unit: 'D',   label: 'Astigmatismo (Cyl)',     decimals: 2 },
  Axis:      { min: 0,    max: 180,  unit: '°',   label: 'Eixo do Astigmatismo',   decimals: 0 },
  ACD:       { min: 2.0,  max: 4.5,  unit: 'mm',  label: 'Prof. Câmara Anterior',  decimals: 2 },
  LT:        { min: 2.0,  max: 6.0,  unit: 'mm',  label: 'Espessura do Cristalino', decimals: 2 },
  WTW:       { min: 10.0, max: 14.0, unit: 'mm',  label: 'White-to-White',         decimals: 1 },
  CCT:       { min: 400,  max: 700,  unit: 'µm',  label: 'Espessura Corneal',      decimals: 0 },
  SIA:       { min: 0.0,  max: 2.0,  unit: 'D',   label: 'SIA (Magnitude)',        decimals: 2 },
  SIAAxis:   { min: 0,    max: 180,  unit: '°',   label: 'SIA (Eixo)',             decimals: 0 },
  refTarget: { min: -3.0, max: 1.0,  unit: 'D',   label: 'Refração Alvo',          decimals: 2 },
} as const

export type BiometricKey = keyof typeof BIOMETRIC_RANGES

export function isInRange(key: BiometricKey, value: number): boolean {
  const range = BIOMETRIC_RANGES[key]
  return value >= range.min && value <= range.max
}

export function getRange(key: BiometricKey) {
  return BIOMETRIC_RANGES[key]
}
