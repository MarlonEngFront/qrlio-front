'use client'

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { EyeData } from '@/app/types/biometrics'
import type { IOL } from '@/app/lib/iol-catalog'

// ═══════════════════════════════════════════════════════════════════
// Store Zustand — estado completo do fluxo QRLIO
// ═══════════════════════════════════════════════════════════════════

export interface ParsedBiometry {
  OD: EyeData
  OE: EyeData
}

export interface BiometryMeta {
  examId: string
  fileHash: string
  filename: string
  fileSize: number
  fileType: string
  uploadedAt: string
  status: string
  consensusScore?: number
  extractionDurationMs?: number
  engine1?: string
  engine2?: string
  patient?: {
    id?: string | null
    name: string | null
    dob: string | null
    age: number | null
    gender: string | null
    examDate?: string | null
    operator?: string | null
  } | null
  device?: {
    type: string | null
    label: string | null
  } | null
}

export interface SurgeryParams {
  SIA: number
  SIAAxis: number
  OD: { seIOLPower: number; refTarget: number }
  OE: { seIOLPower: number; refTarget: number }
}

export interface CalculatorResult {
  calculatorId: string
  calculatorLabel: string
  status: 'completed' | 'failed' | 'partial'
  results: Array<{
    eye: 'OD' | 'OE'
    iolPower?: number
    predictedRefraction?: number
    toricModel?: string
    toricAxis?: number
    residualAstigmatism?: number
    screenshotDataUrl?: string
    warnings?: string[]
    raw?: Record<string, unknown>
  }>
  durationMs?: number
  error?: string
}

const DEFAULT_SURGERY: SurgeryParams = {
  SIA: 0.5,
  SIAAxis: 135,
  OD: { seIOLPower: 21.0, refTarget: -0.25 },
  OE: { seIOLPower: 21.0, refTarget: -0.25 },
}

const DEFAULT_PRESETS: Record<string, SurgeryParams> = {
  'Padrão': { ...DEFAULT_SURGERY },
}

interface BiometryStore {
  biometry: ParsedBiometry | null
  originalBiometry: ParsedBiometry | null
  meta: BiometryMeta | null
  selectedIOL: IOL | null
  selectedLenses: IOL[]
  surgeryParams: SurgeryParams
  originalSurgeryParams: SurgeryParams
  calculationResults: CalculatorResult[]
  fileDataUrl: string | null
  surgicalPresets: Record<string, SurgeryParams>
  activeSurgicalPreset: string
  hasHydrated: boolean

  setHasHydrated: (v: boolean) => void
  setBiometry: (b: ParsedBiometry, meta: BiometryMeta) => void
  clearAll: () => void
  setSelectedIOL: (iol: IOL | null) => void
  setSelectedLenses: (lenses: IOL[]) => void
  setSurgeryParams: (p: Partial<SurgeryParams>) => void
  setCalculationResults: (r: CalculatorResult[]) => void
  updateODField: (field: keyof EyeData, value: number) => void
  updateOEField: (field: keyof EyeData, value: number) => void
  setFileDataUrl: (url: string | null) => void
  setSurgicalPreset: (name: string, params: SurgeryParams) => void
  deleteSurgicalPreset: (name: string) => void
  selectSurgicalPreset: (name: string) => void
}

export const useBiometryStore = create<BiometryStore>()(
  persist(
    (set) => ({
      biometry: null,
      originalBiometry: null,
      meta: null,
      selectedIOL: null,
      selectedLenses: [],
      surgeryParams: DEFAULT_SURGERY,
      originalSurgeryParams: DEFAULT_SURGERY,
      calculationResults: [],
      fileDataUrl: null,
      surgicalPresets: DEFAULT_PRESETS,
      activeSurgicalPreset: 'Padrão',
      hasHydrated: false,

      setHasHydrated: (v) => set({ hasHydrated: v }),

      setBiometry: (biometry, meta) =>
        set({
          biometry,
          originalBiometry: structuredClone(biometry),
          meta,
        }),

      clearAll: () =>
        set({
          biometry: null, originalBiometry: null, meta: null,
          selectedIOL: null, selectedLenses: [],
          surgeryParams: DEFAULT_SURGERY, originalSurgeryParams: DEFAULT_SURGERY,
          calculationResults: [], fileDataUrl: null,
        }),

      setSelectedIOL: (selectedIOL) => set({ selectedIOL }),

      setSelectedLenses: (selectedLenses) => set({ selectedLenses }),

      setSurgeryParams: (params) =>
        set((s) => ({ surgeryParams: { ...s.surgeryParams, ...params } })),

      setCalculationResults: (calculationResults) => set({ calculationResults }),

      updateODField: (field, value) =>
        set((s) => ({
          biometry: s.biometry
            ? { ...s.biometry, OD: { ...s.biometry.OD, [field]: value } }
            : null,
        })),

      updateOEField: (field, value) =>
        set((s) => ({
          biometry: s.biometry
            ? { ...s.biometry, OE: { ...s.biometry.OE, [field]: value } }
            : null,
        })),

      setFileDataUrl: (url) => set({ fileDataUrl: url }),

      setSurgicalPreset: (name, params) =>
        set((s) => ({
          surgicalPresets: { ...s.surgicalPresets, [name]: params },
          activeSurgicalPreset: name,
        })),

      deleteSurgicalPreset: (name) =>
        set((s) => {
          const next = { ...s.surgicalPresets }
          delete next[name]
          if (Object.keys(next).length === 0) next['Padrão'] = DEFAULT_SURGERY
          const nextActive = s.activeSurgicalPreset === name ? Object.keys(next)[0] : s.activeSurgicalPreset
          return { surgicalPresets: next, activeSurgicalPreset: nextActive }
        }),

      selectSurgicalPreset: (name) =>
        set((s) => {
          const preset = s.surgicalPresets[name]
          if (!preset) return {}
          return { activeSurgicalPreset: name, surgeryParams: preset }
        }),
    }),
    {
      name: 'qrlio-biometry-v2',
      storage: typeof window !== 'undefined' ? createJSONStorage(() => localStorage) : undefined,
      partialize: (state) => ({
        biometry: state.biometry,
        originalBiometry: state.originalBiometry,
        meta: state.meta,
        selectedIOL: state.selectedIOL,
        selectedLenses: state.selectedLenses,
        surgeryParams: state.surgeryParams,
        originalSurgeryParams: state.originalSurgeryParams,
        surgicalPresets: state.surgicalPresets,
        activeSurgicalPreset: state.activeSurgicalPreset,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true)
      },
    },
  ),
)
