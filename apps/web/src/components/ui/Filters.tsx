'use client'
import { ReactNode } from 'react'

interface FilterOption {
  value: string
  label: string
}

interface FilterProps {
  label: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
  fullWidth?: boolean
}

export function Filter({ label, options, value, onChange, fullWidth = false }: FilterProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: fullWidth ? 1 : 'none' }}>
      <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '8px 12px',
          background: 'var(--s1)',
          border: '1px solid var(--bd)',
          borderRadius: '8px',
          color: 'var(--tx)',
          fontSize: '13px',
          cursor: 'pointer',
          outline: 'none',
          width: fullWidth ? '100%' : '180px',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => e.currentTarget.style.borderColor = '#7FB069'}
        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--bd)'}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

interface DateFilterProps {
  label: string
  value: string
  onChange: (value: string) => void
  fullWidth?: boolean
}

export function DateFilter({ label, value, onChange, fullWidth = false }: DateFilterProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: fullWidth ? 1 : 'none' }}>
      <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '8px 12px',
          background: 'var(--s1)',
          border: '1px solid var(--bd)',
          borderRadius: '8px',
          color: 'var(--tx)',
          fontSize: '13px',
          cursor: 'pointer',
          outline: 'none',
          width: fullWidth ? '100%' : '180px',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => e.currentTarget.style.borderColor = '#7FB069'}
        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--bd)'}
      />
    </div>
  )
}

interface SearchFilterProps {
  placeholder: string
  value: string
  onChange: (value: string) => void
  fullWidth?: boolean
}

export function SearchFilter({ placeholder, value, onChange, fullWidth = false }: SearchFilterProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: fullWidth ? 1 : 'none' }}>
      <label style={{ fontSize: '11px', fontWeight: 500, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Buscar
      </label>
      <div style={{ position: 'relative', width: fullWidth ? '100%' : '250px' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{
            padding: '8px 12px 8px 36px',
            background: 'var(--s1)',
            border: '1px solid var(--bd)',
            borderRadius: '8px',
            color: 'var(--tx)',
            fontSize: '13px',
            outline: 'none',
            width: '100%',
            transition: 'border-color 0.2s',
          }}
          onFocus={(e) => e.currentTarget.style.borderColor = '#7FB069'}
          onBlur={(e) => e.currentTarget.style.borderColor = 'var(--bd)'}
        />
        <svg
          style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '16px', height: '16px', color: 'var(--t3)' }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
    </div>
  )
}

interface FilterBarProps {
  children: ReactNode
  onClear?: () => void
}

export function FilterBar({ children, onClear }: FilterBarProps) {
  return (
    <div style={{
      background: 'var(--s1)',
      border: '1px solid var(--bd)',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '20px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '12px',
      alignItems: 'flex-end',
    }}>
      {children}
      {onClear && (
        <button
          onClick={onClear}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: '1px solid var(--bd)',
            borderRadius: '8px',
            color: 'var(--t2)',
            fontSize: '13px',
            cursor: 'pointer',
            fontWeight: 500,
            transition: 'all 0.2s',
            marginLeft: 'auto',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = '#ef4444'
            e.currentTarget.style.color = '#ef4444'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--bd)'
            e.currentTarget.style.color = 'var(--t2)'
          }}
        >
          Limpar Filtros
        </button>
      )}
    </div>
  )
}
