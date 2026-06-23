'use client'

import { useState, useRef, useCallback, type DragEvent } from 'react'

interface FileDropZoneProps {
  onFile: (file: File) => void
  disabled?: boolean
}

export default function FileDropZone({ onFile, disabled }: FileDropZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setDragOver(e.type === 'dragover' || e.type === 'dragenter')
  }, [disabled])

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
    if (disabled) return
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }, [disabled, onFile])

  const handleClick = () => {
    if (!disabled) inputRef.current?.click()
  }

  const handleChange = () => {
    const file = inputRef.current?.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      className={`drop-zone${dragOver ? ' drag-over' : ''}`}
      style={{
        padding: '3.5rem 2rem',
        textAlign: 'center',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onDragOver={handleDrag}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/tiff"
        style={{ display: 'none' }}
        onChange={handleChange}
      />

      {/* Ícone */}
      <div
        style={{
          width: 56, height: 56, margin: '0 auto 1.25rem',
          borderRadius: 'var(--radius)',
          background: dragOver ? 'var(--accent-glow-strong)' : 'var(--surface-raised)',
          border: `2px solid ${dragOver ? 'var(--accent)' : 'var(--border)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem',
          transition: 'all 200ms ease',
        }}
      >
        📤
      </div>

      <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 0.35rem' }}>
        {dragOver ? 'Solte o arquivo aqui' : 'Arraste o exame ou clique'}
      </p>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
        PDF, JPG ou PNG da biometria — IOLMaster, Lenstar, Pentacam, Nidek
      </p>
      <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
        Máx. 10 MB — Extração paralela Gemini + Claude
      </p>
    </div>
  )
}
