interface StatCardProps {
  label:    string
  value:    string | number
  sub?:     string
  color?:   string
  trend?:   string
  trendUp?: boolean
  icon?:    string
}

export function StatCard({ label, value, sub, color, trend, trendUp }: StatCardProps) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={color ? { color } : undefined}>{value}</div>
      {(sub || trend) && (
        <div className="stat-sub">
          {trend && (
            <span className={`stat-trend ${trendUp ? 'up' : 'down'}`}>
              {trendUp ? '↑' : '↓'} {trend}
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </div>
  )
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className="card" style={style}>
      {children}
    </div>
  )
}
