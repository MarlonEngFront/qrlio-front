'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import AppShell from '@/app/components/AppShell'
import CalculatorCard from '@/app/components/ui/CalculatorCard'
import CalculationModal, { type CalcProgress } from '@/app/components/ui/CalculationModal'
import { CALCULATORS, type CalculatorId } from '@/app/lib/calculator-types'
import { IOL_CATALOG, getManufacturers, getLensesByManufacturer, TIER_LABELS, TYPE_LABELS, type IOL, type IOLTier } from '@/app/lib/iol-catalog'
import {
  formatBiometryPayloadError,
  formatWorkerValidationError,
  getCalculatorBiometryIssues,
} from '@/app/lib/biometry-payload'
import { useBiometryStore, type SurgeryParams, type CalculatorResult } from '@/app/stores/biometry-store'

const WORKER_URL = process.env.NEXT_PUBLIC_QRLIO_WORKER_URL || 'http://localhost:3000'

export default function CalculatorsPage() {
  const router = useRouter()
  const hasHydrated = useBiometryStore((s) => s.hasHydrated)
  const biometry = useBiometryStore((s) => s.biometry)
  const meta = useBiometryStore((s) => s.meta)
  const surgeryParams = useBiometryStore((s) => s.surgeryParams)
  const setSurgeryParams = useBiometryStore((s) => s.setSurgeryParams)
  const selectedLenses = useBiometryStore((s) => s.selectedLenses)
  const setSelectedLenses = useBiometryStore((s) => s.setSelectedLenses)
  const setCalculationResults = useBiometryStore((s) => s.setCalculationResults)
  const surgicalPresets = useBiometryStore((s) => s.surgicalPresets)
  const activePreset = useBiometryStore((s) => s.activeSurgicalPreset)
  const setPreset = useBiometryStore((s) => s.setSurgicalPreset)
  const deletePreset = useBiometryStore((s) => s.deleteSurgicalPreset)
  const selectPreset = useBiometryStore((s) => s.selectSurgicalPreset)

  const [activeMfr, setActiveMfr] = useState('')
  const [selectedCalcs, setSelectedCalcs] = useState<Set<CalculatorId>>(
    new Set(['escrs', 'tecnis-toric', 'brascrs-multiformula']),
  )
  const [calculating, setCalculating] = useState(false)
  const [calcError, setCalcError] = useState<string | null>(null)
  const [showSavePreset, setShowSavePreset] = useState(false)
  const [presetName, setPresetName] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [calcProgress, setCalcProgress] = useState<CalcProgress[]>([])
  const [calcElapsed, setCalcElapsed] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const allResultsRef = useRef<CalculatorResult[]>([])

  useEffect(() => {
    if (hasHydrated && !biometry) router.push('/')
  }, [hasHydrated, biometry, router])

  const manufacturers = getManufacturers()
  const lensesForMfr = activeMfr ? getLensesByManufacturer(activeMfr) : []

  const toggleLens = (lens: IOL) => {
    const idx = selectedLenses.findIndex((l) => l.id === lens.id)
    if (idx >= 0) setSelectedLenses(selectedLenses.filter((_, i) => i !== idx))
    else if (selectedLenses.length < 3) setSelectedLenses([...selectedLenses, lens])
  }

  const toggleCalc = (id: CalculatorId) => {
    const next = new Set(selectedCalcs)
    if (next.has(id)) next.delete(id); else next.add(id)
    setSelectedCalcs(next)
  }

  const updateEyeParam = (eye: 'OD' | 'OE', field: 'seIOLPower' | 'refTarget', value: number) => {
    setSurgeryParams({ [eye]: { ...surgeryParams[eye], [field]: value } })
  }

  const biometryIssues = biometry ? getCalculatorBiometryIssues(biometry, ['OD']) : []
  const biometryBlocked = biometryIssues.length > 0

  const handleCalculate = useCallback(async () => {
    if (!biometry || selectedLenses.length === 0 || selectedCalcs.size === 0) return

    const issues = getCalculatorBiometryIssues(biometry, ['OD'])
    if (issues.length > 0) {
      setCalcError(formatBiometryPayloadError(issues))
      return
    }

    setCalculating(true)
    setCalcError(null)
    setShowModal(true)
    setCalcElapsed(0)

    // Start elapsed timer
    const calcStart = Date.now()
    timerRef.current = setInterval(() => {
      setCalcElapsed(Math.floor((Date.now() - calcStart) / 1000))
    }, 200)

    // Uma chamada por calculadora selecionada, cada uma comparando TODAS as lentes
    // selecionadas em paralelo (POST /calculate/compare-lenses — mesmo browser
    // compartilhado, cada resultado e uma automacao real no site oficial, com
    // screenshot de prova; sem atalho matematico). Como cada calculadora ja e uma
    // chamada HTTP separada disparada em paralelo, uma calculadora lenta (ESCRS,
    // Barrett V2.0) naturalmente nao bloqueia o feedback das outras.
    const calcIds = [...selectedCalcs]
    const toIolFamily = (lens: IOL) => ({
      id: lens.id,
      brand: lens.manufacturer,
      family: lens.model,
      a_constant: lens.aConstant,
      toric_available: lens.type.includes('toric'),
      code: lens.manufacturerCode || lens.model,
      haigisA0: lens.haigisA0,
      haigisA1: lens.haigisA1,
      haigisA2: lens.haigisA2,
    })

    // Initialize progress: all pending (um item por lente × calculadora)
    const initial: CalcProgress[] = selectedLenses.flatMap((lens) =>
      calcIds.map((calcId) => ({
        lensId: lens.id,
        lensLabel: `${lens.manufacturer} ${lens.model}`,
        calculatorId: calcId,
        status: 'pending' as const,
      }))
    )
    setCalcProgress(initial)

    const allResults: CalculatorResult[] = []

    // Update one progress item
    const updateProgress = (lensId: string, calcId: CalculatorId, update: Partial<CalcProgress>) => {
      setCalcProgress(prev => prev.map(p =>
        p.lensId === lensId && p.calculatorId === calcId ? { ...p, ...update } : p
      ))
    }

    const promises = calcIds.map(async (calcId) => {
      const calcMeta = CALCULATORS.find(c => c.id === calcId)
      for (const lens of selectedLenses) updateProgress(lens.id, calcId, { status: 'running' })

      const opStart = Date.now()
      try {
        const payload = {
          requestId: `qrlio-front-${Date.now()}-${calcId}`,
          source: { app: 'qrlio-front', version: '0.1.0', environment: 'local' as const },
          patient: { examId: meta?.examId, isDemoData: false },
          calculator: { id: calcId, label: calcMeta?.label || calcId },
          lenses: selectedLenses.map(toIolFamily),
          eyes: {
            OD: {
              biometry: { AL: biometry.OD.AL, ACD: biometry.OD.ACD, LT: biometry.OD.LT, WTW: biometry.OD.WTW, CCT: biometry.OD.CCT, method: 'custom_a' as const },
              keratometry: { selected: 'anterior' as const, K1: biometry.OD.K1, K2: biometry.OD.K2, K1Axis: biometry.OD.K1Axis ?? 0, K2Axis: biometry.OD.K2Axis ?? 90, Cyl: biometry.OD.Cyl, Axis: biometry.OD.Axis },
              surgery: { SIA: surgeryParams.SIA, SIAAxis: surgeryParams.SIAAxis, refTarget: surgeryParams.OD.refTarget },
              calculatorPreferences: { seIOLPower: surgeryParams.OD.seIOLPower, kIndex: '1.3375' as const, cylinderConvention: 'plus' as const, includePCA: true },
            },
          },
        }

        const res = await fetch(`${WORKER_URL}/calculate/compare-lenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          const validationMsg = formatWorkerValidationError(data?.details)
          throw new Error(validationMsg || data?.error || `HTTP ${res.status}`)
        }
        const durationMs = Date.now() - opStart

        for (const lens of selectedLenses) {
          const lensResult = data.results?.[lens.id]
          allResults.push({
            calculatorId: calcId,
            calculatorLabel: `${calcMeta?.label || calcId} — ${lens.model}`,
            status: lensResult?.status ?? 'failed',
            results: lensResult?.results || [],
            durationMs,
            error: lensResult?.status === 'failed' ? lensResult?.audit?.notes?.join('; ') : undefined,
          })
          updateProgress(lens.id, calcId, { status: lensResult?.status === 'failed' ? 'failed' : 'completed', durationMs })
        }
      } catch (err: any) {
        const msg = err.message || 'Falha no cálculo'
        setCalcError(msg)
        for (const lens of selectedLenses) {
          allResults.push({
            calculatorId: calcId,
            calculatorLabel: `${calcMeta?.label || calcId} — ${lens.model}`,
            status: 'failed',
            results: [],
            error: msg,
          })
          updateProgress(lens.id, calcId, { status: 'failed', error: msg })
        }
      }
    })

    await Promise.all(promises)

    // Done — store results
    clearInterval(timerRef.current)
    setCalculationResults(allResults)
    allResultsRef.current = allResults
    // Modal stays open showing completion; user clicks "Ver resultados"
  }, [biometry, selectedLenses, selectedCalcs, surgeryParams, meta, WORKER_URL, setCalculationResults])

  const handleModalClose = useCallback(() => {
    setShowModal(false)
    setCalculating(false)
    router.push('/results')
  }, [router])

  if (!biometry) return null

  return (
    <AppShell>
      <div style={{ marginBottom: '1.25rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
          Selecionar lentes e calculadoras
        </h1>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
          Até 3 lentes × {CALCULATORS.length} calculadoras — {selectedLenses.length} lente(s) selecionada(s)
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* ── 1. Lens Selection ── */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
            1. Lentes para calcular
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
            Selecione o fabricante → escolha de <strong>1 a 3 LIOs</strong>
          </p>

          {/* Tier explanation */}
          <div style={{ display: 'flex', gap: 8, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            {(['premium', 'intermediate', 'standard'] as IOLTier[]).map((tier) => (
              <div key={tier} style={{
                flex: '1 1 180px',
                padding: '0.5rem 0.6rem',
                borderRadius: 8,
                background: tier === 'premium' ? '#fef3c7' : tier === 'intermediate' ? '#e0e7ff' : '#f1f5f9',
                border: `1px solid ${tier === 'premium' ? '#fbbf24' : tier === 'intermediate' ? '#818cf8' : '#cbd5e1'}`,
                fontSize: '0.7rem',
                lineHeight: 1.4,
              }}>
                <div style={{ fontWeight: 700, color: tier === 'premium' ? '#92400e' : tier === 'intermediate' ? '#3730a3' : '#475569', marginBottom: 2 }}>
                  {TIER_LABELS[tier][0]}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>{TIER_LABELS[tier][1]}</div>
              </div>
            ))}
          </div>

          {/* Selected chips */}
          {selectedLenses.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '0.75rem' }}>
              {selectedLenses.map((lens, i) => (
                <span key={lens.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: 'var(--accent-glow)', border: '1px solid var(--accent)',
                  borderRadius: 20, padding: '0.25rem 0.75rem', fontSize: '0.75rem',
                }}>
                  <strong style={{ color: 'var(--accent)' }}>{i + 1}</strong>
                  <span style={{ color: 'var(--text-primary)' }}>{lens.manufacturer} {lens.model}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>A={lens.aConstant}</span>
                  <button onClick={() => toggleLens(lens)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.9rem', padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
          )}

          {/* Manufacturer pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '0.75rem' }}>
            {manufacturers.map((mfr) => (
              <button
                key={mfr}
                onClick={() => setActiveMfr(mfr === activeMfr ? '' : mfr)}
                style={{
                  padding: '0.3rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 500,
                  border: '1px solid', cursor: 'pointer', transition: 'all 0.15s',
                  background: activeMfr === mfr ? 'var(--accent)' : 'transparent',
                  color: activeMfr === mfr ? '#fff' : 'var(--text-primary)',
                  borderColor: activeMfr === mfr ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {mfr}
              </button>
            ))}
          </div>

          {/* IOL grid */}
          {activeMfr && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 }}>
              {lensesForMfr.map((lens) => {
                const isSelected = selectedLenses.some((l) => l.id === lens.id)
                const disabled = !isSelected && selectedLenses.length >= 3
                return (
                  <button
                    key={lens.id}
                    onClick={() => toggleLens(lens)}
                    disabled={disabled}
                    style={{
                      textAlign: 'left', padding: '0.6rem 0.75rem', borderRadius: 10, border: '1.5px solid',
                      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
                      background: isSelected ? 'var(--accent-glow)' : 'var(--card-bg)',
                      borderColor: isSelected ? 'var(--accent)' : 'var(--border)',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                        background: lens.tier === 'premium' ? '#fef3c7' : lens.tier === 'intermediate' ? '#e0e7ff' : '#f1f5f9',
                        color: lens.tier === 'premium' ? '#92400e' : lens.tier === 'intermediate' ? '#3730a3' : '#475569',
                      }}>
                        {TIER_LABELS[lens.tier as IOLTier][0]}
                      </span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>{TYPE_LABELS[lens.type]}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{lens.model}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      A={lens.aConstant} {lens.material ? `• ${lens.material}` : ''}
                    </div>
                    {isSelected && <div style={{ fontSize: '0.7rem', color: 'var(--accent)', fontWeight: 600, marginTop: 2 }}>✓ Selecionada</div>}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── 2. Surgery Parameters ── */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.25rem' }}>
            2. Parâmetros cirúrgicos
          </h3>

          {/* Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Presets:</span>
            {Object.keys(surgicalPresets).map((name) => (
              <button
                key={name}
                onClick={() => selectPreset(name)}
                style={{
                  padding: '0.2rem 0.6rem', borderRadius: 14, fontSize: '0.7rem', border: '1px solid',
                  cursor: 'pointer',
                  background: activePreset === name ? 'var(--accent)' : 'transparent',
                  color: activePreset === name ? '#fff' : 'var(--text-primary)',
                  borderColor: activePreset === name ? 'var(--accent)' : 'var(--border)',
                }}
              >
                {name}
                {Object.keys(surgicalPresets).length > 1 && (
                  <span onClick={(e) => { e.stopPropagation(); deletePreset(name) }}
                    style={{ marginLeft: 6, cursor: 'pointer', opacity: 0.6 }}>×</span>
                )}
              </button>
            ))}
            {!showSavePreset && (
              <button className="btn-ghost" onClick={() => { setShowSavePreset(true); setPresetName('') }}
                style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>+ Salvar</button>
            )}
            {showSavePreset && (
              <span style={{ display: 'flex', gap: 4 }}>
                <input className="input-field" placeholder="Nome do preset" value={presetName}
                  onChange={(e) => setPresetName(e.target.value)} style={{ width: 120, fontSize: '0.7rem', padding: '0.2rem 0.4rem' }} />
                <button className="btn-primary" onClick={() => { if (presetName) { setPreset(presetName, surgeryParams); setShowSavePreset(false) } }}
                  style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}>OK</button>
              </span>
            )}
          </div>

          {/* Surgery fields */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>SIA (D)</label>
              <input className="input-field" type="number" value={surgeryParams.SIA} step={0.01}
                onChange={(e) => setSurgeryParams({ SIA: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', fontSize: '0.8rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Eixo Incisão (°)</label>
              <input className="input-field" type="number" value={surgeryParams.SIAAxis} step={1}
                onChange={(e) => setSurgeryParams({ SIAAxis: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', fontSize: '0.8rem' }} />
            </div>
            {(['OD', 'OE'] as const).map((eye) => (
              <div key={eye} style={{ gridColumn: 'span 2', display: 'flex', gap: '0.75rem', padding: '0.5rem', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                <strong style={{ fontSize: '0.75rem', minWidth: 30, color: 'var(--text-primary)', alignSelf: 'center' }}>
                  {eye === 'OD' ? '👁️ OD' : '👁️ OE'}
                </strong>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>SE IOL Power (D)</label>
                  <input className="input-field" type="number" value={surgeryParams[eye].seIOLPower} step={0.5}
                    onChange={(e) => updateEyeParam(eye, 'seIOLPower', parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', fontSize: '0.8rem' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Ref. Alvo (D)</label>
                  <input className="input-field" type="number" value={surgeryParams[eye].refTarget} step={0.25}
                    onChange={(e) => updateEyeParam(eye, 'refTarget', parseFloat(e.target.value) || 0)}
                    style={{ width: '100%', fontSize: '0.8rem' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. Calculator Selection ── */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              3. Calculadoras ({selectedCalcs.size}/{CALCULATORS.length})
            </h3>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn-ghost"
                onClick={() => setSelectedCalcs(new Set(CALCULATORS.map(c => c.id)))}
                style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
              >
                Selecionar todas
              </button>
              <button
                className="btn-ghost"
                onClick={() => setSelectedCalcs(new Set())}
                style={{ fontSize: '0.7rem', padding: '0.25rem 0.6rem' }}
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Time estimate warning */}
          {selectedCalcs.size > 0 && (
            <div style={{
              marginBottom: '0.75rem', padding: '0.5rem 0.75rem',
              background: selectedCalcs.size >= 4 ? '#fef3c7' : '#f0f9ff',
              border: `1px solid ${selectedCalcs.size >= 4 ? '#fbbf24' : '#bae6fd'}`,
              borderRadius: 8, fontSize: '0.72rem', lineHeight: 1.5,
              color: selectedCalcs.size >= 4 ? '#92400e' : '#0c4a6e',
            }}>
              {selectedCalcs.size <= 2 ? (
                <span>⚡ <strong>{selectedCalcs.size} calculadora(s)</strong> — resultado rápido, ~10-15s por lente</span>
              ) : selectedCalcs.size <= 4 ? (
                <span>⏱️ <strong>{selectedCalcs.size} calculadoras</strong> — execução paralela, ~20-40s por lente</span>
              ) : (
                <span>🐢 <strong>{selectedCalcs.size} calculadoras</strong> — quanto mais calculadoras, mais demorado. Paralelo, ~40-90s por lente. <strong>Recomendado: 3-4 para boa cobertura.</strong></span>
              )}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {CALCULATORS.map((calc) => {
              const incompatibleLenses = calc.restrictedToManufacturer
                ? selectedLenses.filter((l) => l.manufacturer !== calc.restrictedToManufacturer)
                : []
              const incompatibleWarning = incompatibleLenses.length
                ? `${calc.restrictedToManufacturer} apenas — não vai calcular para: ${incompatibleLenses.map((l) => l.model).join(', ')}`
                : undefined
              return (
                <CalculatorCard
                  key={calc.id}
                  calc={calc}
                  selected={selectedCalcs.has(calc.id)}
                  onToggle={() => toggleCalc(calc.id)}
                  incompatibleWarning={incompatibleWarning}
                />
              )
            })}
          </div>
        </div>
      </div>

      {/* Biometry / calc errors */}
      {(biometryBlocked || calcError) && (
        <div style={{
          marginTop: '1rem', padding: '0.75rem',
          background: 'var(--danger-glow)', border: '1px solid var(--danger)',
          borderRadius: 8, fontSize: '0.8rem', color: 'var(--danger)',
          whiteSpace: 'pre-line',
        }}>
          {calcError || formatBiometryPayloadError(biometryIssues)}
          {biometryBlocked && (
            <div style={{ marginTop: 8 }}>
              <button className="btn-ghost" onClick={() => router.push('/validate')}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', borderColor: 'var(--danger)', color: 'var(--danger)' }}>
                ← Corrigir em Validar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: '1.5rem' }}>
        <button className="btn-ghost" onClick={() => router.push('/validate')}>← Ajustar dados</button>
        <button className="btn-primary"
          disabled={selectedLenses.length === 0 || selectedCalcs.size === 0 || calculating || biometryBlocked}
          onClick={handleCalculate}
          style={{
            opacity: (selectedLenses.length === 0 || selectedCalcs.size === 0 || biometryBlocked) ? 0.4 : 1,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2,
          }}
          title={biometryBlocked ? formatBiometryPayloadError(biometryIssues) : undefined}
        >
          <span style={{ fontSize: '0.85rem' }}>
            {calculating ? '⏳ Calculando...' : `Calcular ${selectedLenses.length} lente(s) × ${selectedCalcs.size} calc(s)`}
          </span>
          {!calculating && selectedLenses.length > 0 && selectedCalcs.size > 0 && (
            <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>
              Est. ~{selectedCalcs.size >= 4 ? '40-90s' : selectedCalcs.size >= 3 ? '20-40s' : '10-15s'} por lente • {selectedLenses.length * selectedCalcs.size} cálculos em paralelo
            </span>
          )}
        </button>
      </div>

      {/* ── Calculation Progress Modal ── */}
      {showModal && (
        <CalculationModal
          lenses={selectedLenses}
          calculatorIds={[...selectedCalcs]}
          progress={calcProgress}
          elapsed={calcElapsed}
          onClose={handleModalClose}
        />
      )}
    </AppShell>
  )
}
