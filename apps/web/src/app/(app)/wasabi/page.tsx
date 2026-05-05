'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/Header'
import { ConversationList } from '@/components/chat/ConversationList'
import { MessageBubble } from '@/components/chat/MessageBubble'
import { ChatInput } from '@/components/chat/ChatInput'
import { SuggestedQuestions } from '@/components/chat/SuggestedQuestions'
import { useChatStream } from '@/hooks/useChatStream'
import { api } from '@/lib/api/client'
import { ChatConversation, ChatMessage } from '@/types'

interface ApiResponse<T> {
  data: T
}

const welcomeCopy = 'Como posso ajudar hoje?'

export default function WasabiPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingConversations, setLoadingConversations] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { send, streaming, streamingText, setStreamingText } = useChatStream()

  const activeConversation = useMemo(
    () => conversations.find(c => c.id === activeId) ?? null,
    [conversations, activeId],
  )
  const showCenteredComposer = !loadingMessages && messages.length === 0 && !streaming

  const loadConversations = async () => {
    setLoadingConversations(true)
    try {
      const res = await api.get<ApiResponse<ChatConversation[]>>('/chat/conversations')
      setConversations(res.data)
      if (!activeId && res.data.length > 0) setActiveId(res.data[0].id)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoadingConversations(false)
    }
  }

  const loadMessages = async (conversationId: string) => {
    setLoadingMessages(true)
    setError(null)
    try {
      const res = await api.get<ApiResponse<ChatMessage[]>>(`/chat/conversations/${conversationId}/messages`)
      setMessages(res.data)
      setStreamingText('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoadingMessages(false)
    }
  }

  useEffect(() => {
    loadConversations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeId) loadMessages(activeId)
    else setMessages([])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  useEffect(() => {
    const refresh = () => {
      loadConversations()
      if (activeId) loadMessages(activeId)
    }
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, streamingText, loadingMessages])

  const createConversation = async (): Promise<string | null> => {
    try {
      const res = await api.post<ApiResponse<ChatConversation>>('/chat/conversations', {})
      setConversations(prev => [res.data, ...prev])
      setActiveId(res.data.id)
      setMessages([])
      setStreamingText('')
      return res.data.id
    } catch (err) {
      setError((err as Error).message)
      return null
    }
  }

  const deleteConversation = async (id: string) => {
    try {
      await api.delete(`/chat/conversations/${id}`)
      setConversations(prev => prev.filter(c => c.id !== id))
      if (id === activeId) {
        const next = conversations.find(c => c.id !== id)
        setActiveId(next?.id ?? null)
        setMessages([])
      }
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const renameConversation = async (id: string, title: string) => {
    try {
      const res = await api.patch<ApiResponse<ChatConversation>>(`/chat/conversations/${id}`, { title })
      setConversations(prev => prev.map(c => c.id === id ? res.data : c))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const sendMessage = async (content: string) => {
    setError(null)
    const conversationId = activeId ?? await createConversation()
    if (!conversationId) return

    const optimisticUser: ChatMessage = {
      id: `tmp-user-${Date.now()}`,
      role: 'USER',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimisticUser])

    await send({
      conversationId,
      content,
      onTitle: title => {
        setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, title } : c))
      },
      onDone: info => {
        const assistant: ChatMessage = {
          id: info.messageId,
          role: 'ASSISTANT',
          content: info.fullText,
          createdAt: new Date().toISOString(),
        }
        setMessages(prev => [...prev, assistant])
        setStreamingText('')
        loadConversations()
      },
      onError: message => {
        setError(message)
        setStreamingText('')
      },
    })
  }

  return (
    <>
      <Header title="Ask Wasabi" />
      <main className="wasabi-page">
        <section className="wasabi-shell">
          <ConversationList
            conversations={conversations}
            activeId={activeId}
            loading={loadingConversations}
            onNew={createConversation}
            onSelect={setActiveId}
            onRename={renameConversation}
            onDelete={deleteConversation}
          />

          <section className="wasabi-chat-panel">
            <div className="wasabi-chat-top">
              <div>
                <div className="wasabi-title">Wasabi AI</div>
                <div className="wasabi-subtitle">
                  {activeConversation?.title && activeConversation.title !== 'Nova conversa'
                    ? activeConversation.title
                    : 'Converse com seus dados em linguagem natural.'}
                </div>
              </div>
              <div className="wasabi-readonly">Somente leitura</div>
            </div>

            <div ref={scrollRef} className="wasabi-messages">
              {loadingMessages && (
                <div className="wasabi-loading">
                  <span />
                  <span />
                  <span />
                </div>
              )}

              {showCenteredComposer && (
                <div className="wasabi-empty">
                  <div className="wasabi-mark">W</div>
                  <h1>{welcomeCopy}</h1>
                  <p>Pergunte sobre gastos, documentos, metas, projetos ou movimentações recentes.</p>
                  <div className="wasabi-empty-composer">
                    <ChatInput variant="centered" disabled={streaming} onSend={sendMessage} />
                  </div>
                  <SuggestedQuestions onPick={sendMessage} />
                </div>
              )}

              {messages.map(message => (
                <MessageBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={message.createdAt}
                />
              ))}

              {streaming && (
                <MessageBubble
                  role="ASSISTANT"
                  content={streamingText}
                  streaming
                />
              )}
            </div>

            {error && (
              <div className="wasabi-error">
                <span>{error}</span>
                <button type="button" onClick={() => router.push('/settings')}>
                  Configurar IA
                </button>
              </div>
            )}

            {!showCenteredComposer && (
              <div className="wasabi-input-wrap">
                {streaming && <div className="wasabi-typing">Wasabi está digitando...</div>}
                <ChatInput disabled={streaming} onSend={sendMessage} />
              </div>
            )}
          </section>
        </section>
      </main>

      <style jsx global>{`
        .wasabi-page {
          padding: 16px 16px 24px 0;
          min-height: calc(100vh - 80px);
        }
        .wasabi-shell {
          min-height: calc(100vh - 112px);
          display: grid;
          grid-template-columns: minmax(220px, 276px) minmax(0, 1fr);
          border: 1px solid var(--bd);
          border-radius: 14px;
          overflow: hidden;
          background: rgba(20, 20, 20, .9);
          box-shadow: 0 18px 44px rgba(0,0,0,.18);
        }
        .wasabi-conversations {
          border-right: 1px solid var(--bd);
          background: rgba(16,16,16,.72);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          min-width: 0;
        }
        .wasabi-new-chat {
          height: 46px;
          border: 0;
          border-radius: 10px;
          background: var(--gr);
          color: #03110a;
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 14px;
        }
        .wasabi-list-scroll {
          min-height: 0;
          overflow: auto;
          display: grid;
          align-content: start;
          gap: 16px;
        }
        .wasabi-group {
          display: grid;
          gap: 5px;
        }
        .wasabi-group-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: .08em;
          color: var(--t3);
          font-weight: 700;
          padding: 0 4px 4px;
        }
        .wasabi-conversation-row {
          min-height: 38px;
          border-radius: 8px;
          color: var(--t2);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 0 6px 0 10px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background .16s ease, color .16s ease;
        }
        .wasabi-conversation-row span {
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .wasabi-conversation-actions {
          display: flex;
          align-items: center;
          gap: 2px;
          opacity: 0;
          transition: opacity .15s ease;
        }
        .wasabi-conversation-row button {
          width: 24px;
          height: 24px;
          border: 0;
          border-radius: 7px;
          background: transparent;
          color: var(--t3);
          display: grid;
          place-items: center;
          transition: opacity .15s ease, background .15s ease, color .15s ease;
        }
        .wasabi-conversation-edit {
          width: 100%;
          min-width: 0;
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(17,199,111,.25);
          border-radius: 7px;
          color: var(--tx);
          font: inherit;
          outline: none;
          padding: 6px 8px;
        }
        .wasabi-conversation-row:hover,
        .wasabi-conversation-row.active {
          color: var(--tx);
          background: var(--s2);
        }
        .wasabi-conversation-row.active {
          color: var(--gr);
          background: var(--gd);
        }
        .wasabi-conversation-row:hover .wasabi-conversation-actions {
          opacity: 1;
        }
        .wasabi-conversation-row button:hover {
          background: rgba(255,71,87,.12);
          color: var(--rd);
        }
        .wasabi-list-placeholder {
          color: var(--t2);
          font-size: 12px;
          line-height: 1.45;
          padding: 4px;
        }
        .wasabi-empty-list {
          display: grid;
          gap: 8px;
        }
        .wasabi-empty-list span,
        .wasabi-loading span {
          display: block;
          height: 34px;
          border-radius: 8px;
          background: linear-gradient(90deg, var(--s2), var(--s3), var(--s2));
          opacity: .75;
        }
        .wasabi-chat-panel {
          min-width: 0;
          display: grid;
          grid-template-rows: auto minmax(0, 1fr) auto auto;
          min-height: calc(100vh - 112px);
        }
        .wasabi-chat-top {
          min-height: 64px;
          border-bottom: 1px solid var(--bd);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 18px;
          background: rgba(20,20,20,.7);
        }
        .wasabi-title {
          font-size: 16px;
          line-height: 1.1;
          font-weight: 800;
        }
        .wasabi-subtitle {
          margin-top: 4px;
          font-size: 11px;
          color: var(--t2);
        }
        .wasabi-readonly {
          font-size: 11px;
          font-weight: 700;
          color: var(--gr);
          background: var(--gd);
          border: 1px solid rgba(17,199,111,.2);
          border-radius: 999px;
          padding: 7px 10px;
          white-space: nowrap;
        }
        .wasabi-messages {
          min-height: 0;
          overflow: auto;
          padding: 22px;
        }
        .wasabi-loading {
          max-width: 520px;
          display: grid;
          gap: 10px;
        }
        .wasabi-empty {
          max-width: 760px;
          margin: clamp(40px, 8vh, 86px) auto 0;
          display: grid;
          gap: 13px;
          justify-items: stretch;
        }
        .wasabi-mark {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: var(--gd);
          color: var(--gr);
          border: 1px solid rgba(17,199,111,.22);
          font-size: 18px;
          font-weight: 800;
        }
        .wasabi-empty h1 {
          max-width: 520px;
          font-size: clamp(23px, 2.2vw, 28px);
          line-height: 1.12;
          letter-spacing: 0;
          font-weight: 800;
        }
        .wasabi-empty p {
          color: var(--t2);
          font-size: 13px;
          line-height: 1.5;
          max-width: 560px;
          margin-bottom: 2px;
        }
        .wasabi-empty-composer {
          width: min(760px, 100%);
          margin: 6px 0 4px;
        }
        .wasabi-error {
          margin: 0 18px 10px;
          border: 1px solid rgba(255,71,87,.25);
          background: rgba(255,71,87,.08);
          color: var(--rd);
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .wasabi-error button {
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.06);
          color: var(--tx);
          border-radius: 8px;
          height: 30px;
          padding: 0 10px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
        }
        .wasabi-input-wrap {
          border-top: 1px solid var(--bd);
          padding: 12px 18px 16px;
          background: linear-gradient(180deg, rgba(20,20,20,.62), rgba(20,20,20,.92));
        }
        .wasabi-typing {
          color: var(--t2);
          font-size: 11px;
          margin-bottom: 8px;
        }
        @media (max-width: 900px) {
          .wasabi-shell {
            grid-template-columns: 1fr;
          }
          .wasabi-conversations {
            border-right: 0;
            border-bottom: 1px solid var(--bd);
            max-height: 210px;
          }
          .wasabi-chat-panel {
            min-height: 640px;
          }
        }
      `}</style>
    </>
  )
}
