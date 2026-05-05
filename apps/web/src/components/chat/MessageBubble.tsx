'use client'
import { ChatRole } from '@/types'

interface MessageBubbleProps {
  role:    ChatRole
  content: string
  /** Indica que esta mensagem ainda está sendo gerada (mostra cursor pulsante). */
  streaming?: boolean
  timestamp?: string
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

/**
 * Render simples de markdown leve: parágrafos, **bold**, *italic*, `code`,
 * listas com "-" ou "•". Mantém leve para combinar com a estética minimalista.
 */
function renderContent(text: string) {
  const lines = text.split('\n')
  const elements: JSX.Element[] = []
  let listBuffer: string[] = []

  const flushList = (key: number) => {
    if (!listBuffer.length) return
    elements.push(
      <ul key={`l-${key}`} style={{ paddingLeft: 20, margin: '4px 0', display: 'grid', gap: 2 }}>
        {listBuffer.map((it, i) => (
          <li key={i} style={{ fontSize: 13, lineHeight: 1.55, color: 'inherit' }}>
            <span dangerouslySetInnerHTML={{ __html: inline(it) }} />
          </li>
        ))}
      </ul>
    )
    listBuffer = []
  }

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trimEnd()
    const listMatch = line.match(/^\s*[-•]\s+(.*)$/)
    if (listMatch) {
      listBuffer.push(listMatch[1])
      return
    }
    flushList(idx)
    if (!line.trim()) {
      elements.push(<div key={`s-${idx}`} style={{ height: 6 }} />)
    } else {
      elements.push(
        <p key={idx} style={{ fontSize: 13, lineHeight: 1.55, margin: 0 }}>
          <span dangerouslySetInnerHTML={{ __html: inline(line) }} />
        </p>
      )
    }
  })
  flushList(lines.length)
  return elements
}

function escape(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]!))
}

function inline(text: string): string {
  let html = escape(text)
  html = html.replace(/`([^`]+)`/g, '<code style="background:rgba(255,255,255,.06);padding:1px 5px;border-radius:4px;font-family:ui-monospace,Menlo,monospace;font-size:12px">$1</code>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  return html
}

export function MessageBubble({ role, content, streaming, timestamp }: MessageBubbleProps) {
  const isUser = role === 'USER'

  return (
    <div style={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      marginBottom: 12,
      gap: 10,
      alignItems: 'flex-start',
    }}>
      {!isUser && (
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'var(--gd)',
          color: 'var(--gr)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, flexShrink: 0,
          border: '1px solid var(--bd)',
        }}>W</div>
      )}

      <div style={{
        maxWidth: '78%',
        background: isUser ? 'var(--gd)' : 'var(--s2)',
        border: '1px solid var(--bd)',
        borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
        padding: '10px 14px',
        color: isUser ? 'var(--gr)' : 'var(--tx)',
      }}>
        <div style={{ display: 'grid', gap: 2 }}>
          {renderContent(content || (streaming ? '' : ' '))}
          {streaming && (
            <span style={{
              display: 'inline-block',
              width: 6, height: 14,
              background: 'var(--gr)',
              marginLeft: 2,
              verticalAlign: 'middle',
              animation: 'wasabi-blink 1s steps(2) infinite',
            }} />
          )}
        </div>
        {timestamp && !streaming && (
          <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 4, textAlign: isUser ? 'right' : 'left' }}>
            {formatTime(timestamp)}
          </div>
        )}
      </div>

      <style>{`
        @keyframes wasabi-blink { 50% { opacity: 0; } }
      `}</style>
    </div>
  )
}
