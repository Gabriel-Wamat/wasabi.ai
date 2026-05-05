'use client'

interface SuggestedQuestionsProps {
  onPick: (question: string) => void
}

const SUGGESTIONS: { icon: string; label: string; question: string }[] = [
  { icon: '💸', label: 'Quanto gastei este mês?',         question: 'Quanto gastei este mês e em quais categorias?' },
  { icon: '📄', label: 'Documentos próximos do vencimento', question: 'Quais documentos meus estão próximos do vencimento?' },
  { icon: '🎯', label: 'Como estão minhas metas?',         question: 'Como estão minhas metas financeiras?' },
  { icon: '📊', label: 'Estou no azul ou no vermelho?',    question: 'Estou no azul ou no vermelho? Resuma minha situação financeira do mês.' },
  { icon: '🚀', label: 'Resumo dos projetos ativos',       question: 'Resuma meus projetos ativos e o progresso de cada um.' },
  { icon: '💡', label: 'Onde posso economizar?',           question: 'Olhando meus gastos, onde posso economizar? Sugira ações.' },
]

export function SuggestedQuestions({ onPick }: SuggestedQuestionsProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
      {SUGGESTIONS.map(s => (
        <button
          key={s.label}
          type="button"
          onClick={() => onPick(s.question)}
          style={{
            background: 'var(--s2)',
            border: '1px solid var(--bd)',
            borderRadius: 10,
            padding: '12px 14px',
            color: 'var(--tx)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            transition: 'all .15s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--gr)'
            e.currentTarget.style.background  = 'var(--gd)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--bd)'
            e.currentTarget.style.background  = 'var(--s2)'
          }}
        >
          <span style={{ fontSize: 16 }}>{s.icon}</span>
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  )
}
