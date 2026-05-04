'use client'

import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'

interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: string
  end: string
  location?: string
  attendees?: { email: string; name?: string }[]
  htmlLink: string
  isAllDay: boolean
}

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(dateStr))
}

const primaryButtonStyle = {
  background: 'var(--gr)',
  color: '#000',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 10px 24px rgba(17, 199, 111, 0.12)',
} as const

const secondaryActionStyle = {
  background: 'var(--s2)',
  color: 'var(--tx)',
  border: '1px solid var(--bd)',
  borderRadius: '8px',
  fontWeight: 500,
  cursor: 'pointer',
} as const

export default function CalendarPage() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)

  async function loadEvents() {
    setLoadingEvents(true)
    try {
      const today = new Date().toISOString()
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const result = await api.get<{ data: CalendarEvent[] }>(
        `/calendar/events?timeMin=${encodeURIComponent(today)}&timeMax=${encodeURIComponent(nextMonth)}&maxResults=50`,
      )
      setEvents(result.data)
    } catch (err: any) {
      alert(err.message ?? 'Erro ao carregar eventos do calendário')
    } finally {
      setLoadingEvents(false)
    }
  }

  async function checkConnectionStatus() {
    try {
      const result = await api.get<{ data: { connected: boolean } }>('/calendar/status')
      setConnected(result.data.connected)
      if (result.data.connected) await loadEvents()
    } catch (err) {
      console.error('Erro ao verificar conexão:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkConnectionStatus()
  }, [])

  async function handleOAuthCode(code: string) {
    try {
      await api.post('/calendar/connect', { code })
      setConnected(true)
      await loadEvents()
      alert('Conectado com sucesso!')
    } catch (err: any) {
      alert(err.message ?? 'Erro ao conectar com Google Calendar')
    }
  }

  async function handleConnect() {
    try {
      const data = await api.get<{ data: { authUrl: string } }>('/calendar/auth-url')
      const width = 600
      const height = 700
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2
      const popup = window.open(
        data.data.authUrl,
        'Google Calendar',
        `width=${width},height=${height},left=${left},top=${top}`,
      )

      const listener = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return
        if (event.data.type !== 'GOOGLE_OAUTH_CODE') return
        window.removeEventListener('message', listener)
        popup?.close()
        await handleOAuthCode(event.data.code)
      }
      window.addEventListener('message', listener)
    } catch (err: any) {
      alert(err.message ?? 'Erro ao conectar com Google Calendar')
    }
  }

  async function handleDisconnect() {
    if (!confirm('Deseja realmente desconectar?')) return
    try {
      await api.post('/calendar/disconnect', {})
      setConnected(false)
      setEvents([])
      alert('Desconectado com sucesso!')
    } catch (err: any) {
      alert(err.message ?? 'Erro ao desconectar')
    }
  }

  if (loading) {
    return (
      <div style={{ padding: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--tx)' }}>
          📅 Google Calendar
        </h1>
        <p style={{ color: 'var(--t2)' }}>Carregando...</p>
      </div>
    )
  }

  return (
    <div style={{ padding: '2rem', background: 'transparent', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--tx)' }}>📅 Google Calendar</h1>
        <button
          onClick={connected ? handleDisconnect : handleConnect}
          style={{
            padding: '0.75rem 1.5rem',
            ...(connected ? { background: 'var(--rd)', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' } : primaryButtonStyle),
            borderRadius: '8px',
            fontSize: '14px',
          }}
        >
          {connected ? 'Desconectar' : 'Conectar Google Calendar'}
        </button>
      </div>

      {!connected ? (
        <div style={{ background: 'var(--s1)', border: '2px dashed var(--bd)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📅</div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--tx)' }}>Conecte sua Agenda</h2>
          <p style={{ color: 'var(--t2)', marginBottom: '1.5rem', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
            Conecte seu Google Calendar para visualizar seus compromissos diretamente no Wasabi
          </p>
          <button onClick={handleConnect} style={{ padding: '0.875rem 2rem', ...primaryButtonStyle, fontSize: '15px' }}>
            Conectar Agora
          </button>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--tx)' }}>Próximos Eventos ({events.length})</h2>
            <button onClick={loadEvents} disabled={loadingEvents} style={{ padding: '0.5rem 1rem', ...(loadingEvents ? secondaryActionStyle : primaryButtonStyle), cursor: loadingEvents ? 'not-allowed' : 'pointer', fontSize: '13px', opacity: loadingEvents ? 0.6 : 1 }}>
              {loadingEvents ? 'Carregando...' : 'Atualizar'}
            </button>
          </div>

          {loadingEvents ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--t2)', background: 'var(--s1)', borderRadius: '12px', border: '1px solid var(--bd)' }}>
              Carregando eventos...
            </div>
          ) : events.length === 0 ? (
            <div style={{ background: 'var(--s1)', borderRadius: '12px', padding: '3rem', textAlign: 'center', border: '1px solid var(--bd)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <p style={{ color: 'var(--t2)' }}>Nenhum evento nos próximos 30 dias</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {events.map(event => (
                <div key={event.id} style={{ background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: '12px', padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--tx)' }}>{event.title || 'Sem título'}</h3>
                      <div style={{ color: 'var(--t2)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                        {event.isAllDay ? `Dia inteiro - ${new Date(event.start).toLocaleDateString('pt-BR')}` : `${formatDate(event.start)} - ${formatDate(event.end)}`}
                      </div>
                      {event.location && <div style={{ color: 'var(--t2)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>{event.location}</div>}
                      {event.description && <p style={{ color: 'var(--t2)', fontSize: '0.875rem', marginTop: '0.75rem', lineHeight: 1.6 }}>{event.description}</p>}
                    </div>
                    <a href={event.htmlLink} target="_blank" rel="noopener noreferrer" style={{ padding: '0.5rem 1rem', ...primaryButtonStyle, textDecoration: 'none', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                      Abrir
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
