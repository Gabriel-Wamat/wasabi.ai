import { describe, expect, it } from 'vitest'
import { renderSlackDigest, DailyDigest } from './slack-digest'

describe('Slack digest renderer', () => {
  it('renders fallback text when a source has no lines', () => {
    const digest: DailyDigest = {
      date: new Date('2026-05-15T12:00:00.000Z'),
      userName: 'Tiago',
      sections: [
        {
          title: 'Documentos',
          status: 'yellow',
          lines: [],
          fallback: 'Sem documentos com vencimento ou fonte indisponivel.',
        },
      ],
    }

    const payload = renderSlackDigest(digest, 'America/Sao_Paulo')
    const section = payload.blocks.find(block =>
      block.type === 'section' && 'text' in block && block.text.text.includes('*Documentos*'),
    )

    expect(payload.text).toContain('Digest diario de Tiago')
    expect(section).toBeDefined()
    expect(JSON.stringify(section)).toContain('Sem documentos com vencimento ou fonte indisponivel.')
    expect(JSON.stringify(section)).toContain('Amarelo')
  })

  it('renders bullet lines for populated sources', () => {
    const digest: DailyDigest = {
      date: new Date('2026-05-15T12:00:00.000Z'),
      userName: 'Tiago',
      sections: [
        {
          title: 'Financeiro',
          status: 'green',
          lines: ['Saldo mensal: R$ 1.000,00', 'Receitas: R$ 2.000,00 | Despesas: R$ 1.000,00'],
        },
      ],
    }

    const payload = renderSlackDigest(digest, 'America/Sao_Paulo')

    expect(JSON.stringify(payload.blocks)).toContain('Verde')
    expect(JSON.stringify(payload.blocks)).toContain('• Saldo mensal: R$ 1.000,00')
  })
})
