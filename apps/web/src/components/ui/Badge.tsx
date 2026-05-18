type Variant = 'green' | 'yellow' | 'red' | 'blue' | 'gray'

export function Badge({ variant = 'gray', children, dot = true }: { variant?: string; children: React.ReactNode; dot?: boolean }) {
  return (
    <span className={`badge ${variant}`}>
      {dot && <span className="dot" />}
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
