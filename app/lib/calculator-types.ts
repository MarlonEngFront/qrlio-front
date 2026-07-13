// ═══════════════════════════════════════════════════════════════════
// Catálogo de calculadoras suportadas pelo QRLIO
// ═══════════════════════════════════════════════════════════════════

export type CalculatorId =
  | 'escrs'
  | 'tecnis-toric'
  | 'apacrs-true-k-toric'
  | 'apacrs-toric'
  | 'brascrs-multiformula'
  | 'brascrs-double-k'

export interface CalculatorCard {
  id: CalculatorId
  label: string
  org: string
  description: string
  estimatedSeconds: number
  supportsToric: boolean
  requiresCaptcha: boolean
  tags: string[]
  logoText: string
  logoBg: string
  /** Se definido, esta calculadora só calcula lentes deste fabricante (nome exatamente como em IOL.manufacturer). */
  restrictedToManufacturer?: string
}

export const CALCULATORS: CalculatorCard[] = [
  {
    id: 'escrs',
    label: 'ESCRS IOL Calculator',
    org: 'ESCRS',
    description: '6 fórmulas: Cooke K6, EVO, Hill-RBF, Hoffer QST, Kane, Pearl DGS. 2captcha.',
    estimatedSeconds: 180,
    supportsToric: false,
    requiresCaptcha: true,
    tags: ['6 fórmulas', 'Blazor', 'reCAPTCHA'],
    logoText: 'ESC',
    logoBg: '#1a56db',
  },
  {
    id: 'tecnis-toric',
    label: 'TECNIS Toric Calculator',
    org: 'Johnson & Johnson',
    description: 'Calculadora oficial J&J. Cobre lentes tóricas, multifocais, EDOF e Eyhance.',
    estimatedSeconds: 12,
    supportsToric: true,
    requiresCaptcha: false,
    tags: ['Tórica', 'Multifocal', 'EDOF', 'Eyhance'],
    logoText: 'J&J',
    logoBg: '#dc2626',
    restrictedToManufacturer: 'Johnson and Johnson Vision',
  },
  {
    id: 'apacrs-true-k-toric',
    label: 'Barrett True-K Toric',
    org: 'APACRS',
    description: 'Calculadora tórica pós-LASIK. Método True K para córneas operadas.',
    estimatedSeconds: 20,
    supportsToric: true,
    requiresCaptcha: false,
    tags: ['Pós-LASIK', 'Tórica', 'True K'],
    logoText: 'APC',
    logoBg: '#0f766e',
  },
  {
    id: 'apacrs-toric',
    label: 'Barrett Toric V2.0',
    org: 'APACRS',
    description: 'Calculadora tórica multi-fabricante. Barrett Toric V2.0.',
    estimatedSeconds: 60,
    supportsToric: true,
    requiresCaptcha: false,
    tags: ['Tórica', 'Barrett', 'Multi-fabricante'],
    logoText: 'APC',
    logoBg: '#0f766e',
  },
  {
    id: 'brascrs-multiformula',
    label: 'BRASCRS Multifórmula',
    org: 'BRASCRS',
    description: 'SRK/T, Holladay 1, Hoffer Q, Haigis. API direta, sem headless.',
    estimatedSeconds: 3,
    supportsToric: false,
    requiresCaptcha: false,
    tags: ['API direta', '4 fórmulas', 'Rápida'],
    logoText: 'BRA',
    logoBg: '#7c3aed',
  },
  {
    id: 'brascrs-double-k',
    label: 'Double-K (BRASCRS)',
    org: 'BRASCRS',
    description: 'Método Double-K para córneas pós-cirurgia refrativa. API direta.',
    estimatedSeconds: 3,
    supportsToric: false,
    requiresCaptcha: false,
    tags: ['API direta', 'Double-K', 'Pós-refrativa'],
    logoText: 'BRA',
    logoBg: '#7c3aed',
  },
]
