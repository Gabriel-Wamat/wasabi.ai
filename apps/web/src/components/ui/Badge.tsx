import { clsx } from 'clsx'

type Variant = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

const styles: Record<Variant, { background: string; color: string }> = {
  green:  { background: '#0a2318', color: '#11C76F' },
  yellow: { background: '#2a1e00', color: '#FFC107' },
  red:    { background: '#2a0808', color: '#FF4757' },
  blue:   { background: '#071828', color: '#4A90D9' },
  gray:   { background: '#222',    color: '#888' },
}

export function Badge({ variant, children }: { variant: Variant; children: React.ReactNode }) {
  const s = styles[variant]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
      borderRadius: 6, fontSize: 10, fontWeight: 600, letterSpacing: '.03em',
      ...s,
    }}>
      {children}
    </span>
  )
}

export function statusBadge(status: string) {
  const map: Record<string, { variant: Variant; label: string }> = {
    VALID:          { variant: 'green',  label: 'Válido' },
    EXPIRING_SOON:  { variant: 'yellow', label: 'Vencendo' },
    EXPIRED:        { variant: 'red',    label: 'Vencido' },
    NO_EXPIRY:      { variant: 'gray',   label: 'Sem validade' },
    ACTIVE:         { variant: 'green',  label: 'Ativo' },
    PAUSED:         { variant: 'yellow', label: 'Pausado' },
    COMPLETED:      { variant: 'blue',   label: 'Concluído' },
    ARCHIVED:       { variant: 'gray',   label: 'Arquivado' },
    PERSONAL:       { variant: 'gray',   label: 'Pessoal' },
    WORK:           { variant: 'blue',   label: 'Trabalho' },
  }
  const { variant, label } = map[status] ?? { variant: 'gray' as Variant, label: status }
  return <Badge variant={variant}>{label}</Badge>
}
