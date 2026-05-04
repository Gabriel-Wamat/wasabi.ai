interface StatCardProps {
  label:    string
  value:    string | number
  sub?:     string
  color?:   string
}

export function StatCard({ label, value, sub, color }: StatCardProps) {
  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 10, padding: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 600, color: color ?? 'var(--tx)' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 10, padding: 16, ...style }}>
      {children}
    </div>
  )
}
