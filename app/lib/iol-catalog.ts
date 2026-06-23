// ═══════════════════════════════════════════════════════════════════
// Catálogo de LIOs — classificação por fabricante, tipo e qualidade
// ═══════════════════════════════════════════════════════════════════

export type IOLType = 'monofocal' | 'toric' | 'multifocal' | 'multifocal-toric' | 'edof' | 'edof-toric'
export type IOLTier = 'premium' | 'intermediate' | 'standard'

export interface IOL {
  id: string
  manufacturer: string
  model: string
  type: IOLType
  tier: IOLTier
  aConstant: number
  haigisA0?: number
  haigisA1?: number
  haigisA2?: number
  manufacturerCode?: string
  material?: string
  description?: string
}

export const IOL_CATALOG: IOL[] = [
  // ── Alcon ──
  { id: 'sn60wf', manufacturer: 'Alcon', model: 'AcrySof SN60WF', type: 'monofocal', tier: 'standard', aConstant: 118.7, manufacturerCode: 'Alcon SN60WF', haigisA0: 1.050, haigisA1: 0.400, haigisA2: 0.100, material: 'Hidrofóbico', description: 'Monofocal asférica padrão' },
  { id: 'sn6atx', manufacturer: 'Alcon', model: 'AcrySof IQ Toric SN6ATx', type: 'toric', tier: 'standard', aConstant: 119.1, manufacturerCode: 'Alcon SN6ATx', material: 'Hidrofóbico', description: 'Tórica monofocal' },
  { id: 'sv25tx', manufacturer: 'Alcon', model: 'AcrySof IQ Vivity SV25Tx', type: 'edof-toric', tier: 'premium', aConstant: 119.3, manufacturerCode: 'Alcon SV25Tx', material: 'Hidrofóbico', description: 'EDOF tórica — qualidade premium' },
  { id: 'tfntx', manufacturer: 'Alcon', model: 'AcrySof IQ PanOptix TFNTx', type: 'multifocal-toric', tier: 'premium', aConstant: 119.1, manufacturerCode: 'Alcon TFNTx', material: 'Hidrofóbico', description: 'Multifocal tórica premium' },

  // ── Johnson & Johnson ──
  { id: 'zcb00', manufacturer: 'Johnson & Johnson', model: 'TECNIS 1-Piece ZCB00', type: 'monofocal', tier: 'standard', aConstant: 119.0, manufacturerCode: 'J&J ZCB00', material: 'Hidrofóbico', description: 'Monofocal asférica padrão' },
  { id: 'zcu', manufacturer: 'Johnson & Johnson', model: 'TECNIS Toric II ZCU', type: 'toric', tier: 'standard', aConstant: 119.0, manufacturerCode: 'J&J ZCU', material: 'Hidrofóbico', description: 'Tórica monofocal' },
  { id: 'diu', manufacturer: 'Johnson & Johnson', model: 'TECNIS Eyhance DIU', type: 'monofocal', tier: 'intermediate', aConstant: 119.1, manufacturerCode: 'J&J DIU', material: 'Hidrofóbico', description: 'Monofocal melhorada — visão intermediária' },
  { id: 'zku', manufacturer: 'Johnson & Johnson', model: 'TECNIS Multifocal ZKU', type: 'multifocal', tier: 'premium', aConstant: 119.2, manufacturerCode: 'J&J ZKU', material: 'Hidrofóbico', description: 'Multifocal +2.75 D' },
  { id: 'zlu', manufacturer: 'Johnson & Johnson', model: 'TECNIS Multifocal ZLU', type: 'multifocal', tier: 'premium', aConstant: 119.2, manufacturerCode: 'J&J ZLU', material: 'Hidrofóbico', description: 'Multifocal +3.25 D' },
  { id: 'dfw', manufacturer: 'Johnson & Johnson', model: 'TECNIS Synergy DFW', type: 'edof', tier: 'premium', aConstant: 119.3, manufacturerCode: 'J&J DFW', material: 'Hidrofóbico', description: 'EDOF premium — visão contínua' },
  { id: 'det', manufacturer: 'Johnson & Johnson', model: 'TECNIS PureSee DET', type: 'edof', tier: 'premium', aConstant: 119.4, manufacturerCode: 'J&J DET', material: 'Hidrofóbico', description: 'EDOF premium — visão pura' },

  // ── Bausch & Lomb ──
  { id: 'mx60', manufacturer: 'Bausch & Lomb', model: 'enVista MX60', type: 'monofocal', tier: 'standard', aConstant: 118.9, manufacturerCode: 'Bausch & Lomb MX60', material: 'Hidrofóbico', description: 'Monofocal asférica' },
  { id: 'mx60t', manufacturer: 'Bausch & Lomb', model: 'enVista Toric MX60T', type: 'toric', tier: 'standard', aConstant: 119.2, manufacturerCode: 'Bausch & Lomb MX60T', material: 'Hidrofóbico', description: 'Tórica monofocal' },

  // ── ZEISS ──
  { id: '409m', manufacturer: 'ZEISS', model: 'AT LISA tri 409M', type: 'multifocal', tier: 'premium', aConstant: 118.5, manufacturerCode: 'Zeiss 409M', material: 'Hidrofílico', description: 'Multifocal trifocal' },

  // ── HOYA ──
  { id: 'isert251', manufacturer: 'HOYA', model: 'iSert 251', type: 'monofocal', tier: 'standard', aConstant: 118.5, manufacturerCode: 'Hoya iSert 251', material: 'Hidrofóbico', description: 'Monofocal pré-carregada' },

  // ── Rayner ──
  { id: 'rayone-emv', manufacturer: 'Rayner', model: 'RayOne EMV', type: 'edof', tier: 'premium', aConstant: 118.3, manufacturerCode: 'Rayner RayOne EMV', material: 'Hidrofílico', description: 'EDOF não-difrativa' },
]

export function getManufacturers(): string[] {
  return [...new Set(IOL_CATALOG.map((l) => l.manufacturer))].sort()
}

export function getLensesByManufacturer(mfr: string): IOL[] {
  return IOL_CATALOG.filter((l) => l.manufacturer === mfr)
}

export const TIER_LABELS: Record<IOLTier, string[]> = {
  premium: ['🌟 Premium', 'Qualidade superior, maior custo'],
  intermediate: ['⭐ Intermediária', 'Bom equilíbrio custo/benefício'],
  standard: ['💡 Padrão', 'Menor custo, qualidade básica'],
}

export const TYPE_LABELS: Record<IOLType, string> = {
  'monofocal': 'Monofocal',
  'toric': 'Tórica',
  'multifocal': 'Multifocal',
  'multifocal-toric': 'Multifocal Tórica',
  'edof': 'EDOF',
  'edof-toric': 'EDOF Tórica',
}
