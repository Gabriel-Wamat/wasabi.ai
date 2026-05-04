interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  size?:    'sm' | 'md'
}

const variants = {
  primary:   { background: 'var(--gr)',  color: '#000', border: 'none' },
  secondary: { background: 'var(--s2)', color: 'var(--tx)', border: '1px solid var(--bd)' },
  danger:    { background: 'var(--rd)', color: '#fff', border: 'none' },
}

const sizes = {
  sm: { padding: '3px 8px',  fontSize: 11 },
  md: { padding: '6px 14px', fontSize: 12 },
}

export function Button({ variant = 'secondary', size = 'md', style, children, ...props }: ButtonProps) {
  return (
    <button
      style={{
        borderRadius: 8, fontWeight: 500, cursor: 'pointer',
        ...variants[variant],
        ...sizes[size],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  )
}
