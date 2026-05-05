'use client'
import { useState } from 'react'
import { ChatConversation } from '@/types'

interface ConversationListProps {
  conversations: ChatConversation[]
  activeId:      string | null
  loading?:      boolean
  onNew:         () => void
  onSelect:      (id: string) => void
  onRename:      (id: string, title: string) => void
  onDelete:      (id: string) => void
}

function groupLabel(dateIso: string): string {
  const date = new Date(dateIso)
  const now = new Date()
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const diffDays = Math.round((startToday - startDate) / 86400000)
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Ontem'
  if (diffDays < 7) return 'Esta semana'
  return 'Mais antigas'
}

export function ConversationList({
  conversations,
  activeId,
  loading,
  onNew,
  onSelect,
  onRename,
  onDelete,
}: ConversationListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draftTitle, setDraftTitle] = useState('')
  const groups = conversations.reduce<Record<string, ChatConversation[]>>((acc, item) => {
    const label = groupLabel(item.updatedAt || item.createdAt)
    acc[label] = acc[label] ?? []
    acc[label].push(item)
    return acc
  }, {})

  const orderedGroups = ['Hoje', 'Ontem', 'Esta semana', 'Mais antigas'].filter(g => groups[g]?.length)

  return (
    <aside className="wasabi-conversations">
      <button type="button" className="wasabi-new-chat" onClick={onNew}>
        <span>Novo chat</span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      <div className="wasabi-list-scroll">
        {loading && (
          <div className="wasabi-empty-list">
            <span />
            <span />
            <span />
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="wasabi-list-placeholder">
            Suas conversas vão aparecer aqui.
          </div>
        )}

        {orderedGroups.map(group => (
          <div key={group} className="wasabi-group">
            <div className="wasabi-group-label">{group}</div>
            {groups[group].map(item => {
              const active = item.id === activeId
              const editing = item.id === editingId
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className={`wasabi-conversation-row${active ? ' active' : ''}`}
                  onClick={() => onSelect(item.id)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') onSelect(item.id)
                  }}
                >
                  {editing ? (
                    <input
                      autoFocus
                      value={draftTitle}
                      className="wasabi-conversation-edit"
                      onClick={e => e.stopPropagation()}
                      onChange={e => setDraftTitle(e.target.value)}
                      onBlur={() => {
                        const next = draftTitle.trim()
                        if (next && next !== item.title) onRename(item.id, next)
                        setEditingId(null)
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.currentTarget.blur()
                        }
                        if (e.key === 'Escape') {
                          setEditingId(null)
                        }
                      }}
                    />
                  ) : (
                    <span>{item.title || 'Nova conversa'}</span>
                  )}
                  {!editing && (
                    <div className="wasabi-conversation-actions">
                      <button
                        type="button"
                        aria-label="Renomear conversa"
                        onClick={e => {
                          e.stopPropagation()
                          setDraftTitle(item.title || 'Nova conversa')
                          setEditingId(item.id)
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m18 2 4 4-12 12H6v-4L18 2Z" />
                          <path d="M4 22h16" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        aria-label="Apagar conversa"
                        onClick={e => {
                          e.stopPropagation()
                          onDelete(item.id)
                        }}
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </aside>
  )
}
