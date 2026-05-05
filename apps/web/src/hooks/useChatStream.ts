'use client'
import { useCallback, useRef, useState } from 'react'

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api'

interface SendOpts {
  conversationId: string
  content:        string
  onDelta?:       (text: string) => void
  onTitle?:       (title: string) => void
  onDone?:        (info: { messageId: string; tokensUsed: number; fullText: string }) => void
  onError?:       (message: string) => void
}

/**
 * Hook que envia mensagem para o backend (SSE) e expõe estado de streaming.
 * O backend escolhe e injeta o contexto — o frontend só envia content.
 */
export function useChatStream() {
  const [streaming,     setStreaming]     = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const send = useCallback(async (opts: SendOpts) => {
    if (streaming) return
    setStreaming(true)
    setStreamingText('')

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('ph_access') : null
      const res = await fetch(`${BASE}/chat/conversations/${opts.conversationId}/messages`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ content: opts.content }),
      })

      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => null)
        throw new Error(errBody?.error?.message ?? `Erro HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''

        for (const block of events) {
          if (!block.trim() || block.startsWith(':')) continue
          let event = 'message'
          let data  = ''
          for (const line of block.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim()
            else if (line.startsWith('data:')) data += line.slice(5).trim()
          }
          if (!data) continue

          let parsed: any
          try { parsed = JSON.parse(data) } catch { continue }

          if (event === 'delta' && typeof parsed.text === 'string') {
            fullText += parsed.text
            setStreamingText(prev => prev + parsed.text)
            opts.onDelta?.(parsed.text)
          } else if (event === 'title' && typeof parsed.title === 'string') {
            opts.onTitle?.(parsed.title)
          } else if (event === 'done') {
            opts.onDone?.({ messageId: parsed.messageId, tokensUsed: parsed.tokensUsed, fullText })
          } else if (event === 'error') {
            opts.onError?.(parsed.message ?? 'Erro desconhecido')
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        opts.onError?.((err as Error).message ?? 'Erro de rede')
      }
    } finally {
      setStreaming(false)
      abortRef.current = null
    }
  }, [streaming])

  const abort = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  return { send, abort, streaming, streamingText, setStreamingText }
}
