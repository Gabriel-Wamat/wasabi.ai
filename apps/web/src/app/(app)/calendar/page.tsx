'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api/client'

type CalendarFilter = 'all' | 'today' | 'week' | 'meetings' | 'allDay'

interface CalendarAttendee {
  email?: string
  name?: string
  optional?: boolean
  responseStatus?: string
  self?: boolean
}

interface CalendarEvent {
  id: string
  title?: string
  description?: string
  start?: string
  end?: string
  location?: string
  attendees?: CalendarAttendee[]
  htmlLink?: string
  hangoutLink?: string
  conferenceLink?: string
  status?: string
  eventType?: string
  updated?: string
  isAllDay: boolean
}

function toDate(value?: string) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function dayKey(value?: string) {
  const date = toDate(value)
  if (!date) return 'sem-data'
  return date.toISOString().slice(0, 10)
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function isWithinDays(date: Date, days: number) {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + days)
  return date >= start && date < end
}

function cleanDescription(value?: string) {
  if (!value) return ''

  if (typeof window !== 'undefined') {
    const doc = new DOMParser().parseFromString(value, 'text/html')
    return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
  }

  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function formatDay(value?: string) {
  const date = toDate(value)
  if (!date) return 'Sem data'

  const today = new Date()
  const tomorrow = new Date()
  tomorrow.setDate(today.getDate() + 1)

  if (isSameDay(date, today)) return 'Hoje'
  if (isSameDay(date, tomorrow)) return 'Amanhã'

  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
  }).format(date)
}

function formatDateShort(value?: string) {
  const date = toDate(value)
  if (!date) return '-'
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

function formatTime(value?: string) {
  const date = toDate(value)
  if (!date) return '-'
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date)
}

function formatEventTime(event: CalendarEvent) {
  if (event.isAllDay) return 'Dia inteiro'
  return `${formatTime(event.start)} - ${formatTime(event.end)}`
}

function getEventKind(event: CalendarEvent) {
  if (event.eventType === 'birthday') return 'Aniversário'
  if (event.isAllDay) return 'Dia inteiro'
  if (event.conferenceLink || event.hangoutLink) return 'Meet'
  if ((event.attendees?.length ?? 0) > 0) return 'Reunião'
  return 'Compromisso'
}

function attendeeSummary(event?: CalendarEvent) {
  const count = event?.attendees?.length ?? 0
  if (!count) return 'Sem convidados'
  const accepted = event?.attendees?.filter(a => a.responseStatus === 'accepted').length ?? 0
  return `${count} convidados${accepted ? ` · ${accepted} confirmados` : ''}`
}

const filterOptions: { value: CalendarFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: '7 dias' },
  { value: 'meetings', label: 'Reuniões' },
  { value: 'allDay', label: 'Dia inteiro' },
]

export default function CalendarPage() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<CalendarFilter>('all')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function loadEvents() {
    setLoadingEvents(true)
    setError(null)
    try {
      const today = new Date().toISOString()
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      const result = await api.get<{ data: CalendarEvent[] }>(
        `/calendar/events?timeMin=${encodeURIComponent(today)}&timeMax=${encodeURIComponent(nextMonth)}&maxResults=50`,
      )
      setEvents(result.data)
      setSelectedId(current => current ?? result.data[0]?.id ?? null)
    } catch (err: any) {
      setError(err.message ?? 'Erro ao carregar eventos do calendário')
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
    } catch (err: any) {
      setError(err.message ?? 'Erro ao conectar com Google Calendar')
    }
  }

  async function handleConnect() {
    const width = 600
    const height = 700
    const left = window.screen.width / 2 - width / 2
    const top = window.screen.height / 2 - height / 2
    const popup = window.open(
      'about:blank',
      'Google Calendar',
      `width=${width},height=${height},left=${left},top=${top}`,
    )

    try {
      const data = await api.get<{ data: { authUrl: string } }>('/calendar/auth-url')

      if (!popup) {
        window.location.href = data.data.authUrl
        return
      }

      popup.location.href = data.data.authUrl

      const listener = async (event: MessageEvent) => {
        const allowedOrigins = new Set([window.location.origin, 'http://localhost:3000'])
        if (!allowedOrigins.has(event.origin)) return
        if (event.data.type !== 'GOOGLE_OAUTH_CODE') return
        window.removeEventListener('message', listener)
        popup.close()
        await handleOAuthCode(event.data.code)
      }
      window.addEventListener('message', listener)
    } catch (err: any) {
      popup?.close()
      setError(err.message ?? 'Erro ao conectar com Google Calendar')
    }
  }

  async function handleDisconnect() {
    if (!confirm('Deseja realmente desconectar?')) return
    try {
      await api.post('/calendar/disconnect', {})
      setConnected(false)
      setEvents([])
      setSelectedId(null)
    } catch (err: any) {
      setError(err.message ?? 'Erro ao desconectar')
    }
  }

  const stats = useMemo(() => {
    const now = new Date()
    return {
      total: events.length,
      today: events.filter(event => {
        const date = toDate(event.start)
        return date ? isSameDay(date, now) : false
      }).length,
      week: events.filter(event => {
        const date = toDate(event.start)
        return date ? isWithinDays(date, 7) : false
      }).length,
      meetings: events.filter(event => getEventKind(event) === 'Meet' || getEventKind(event) === 'Reunião').length,
    }
  }, [events])

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return events.filter(event => {
      const start = toDate(event.start)
      const kind = getEventKind(event)
      const matchesFilter =
        filter === 'all'
          || (filter === 'today' && !!start && isSameDay(start, new Date()))
          || (filter === 'week' && !!start && isWithinDays(start, 7))
          || (filter === 'meetings' && (kind === 'Meet' || kind === 'Reunião'))
          || (filter === 'allDay' && event.isAllDay)

      const text = [event.title, event.location, cleanDescription(event.description)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return matchesFilter && (!normalizedQuery || text.includes(normalizedQuery))
    })
  }, [events, filter, query])

  const groupedEvents = useMemo(() => {
    return filteredEvents.reduce<Record<string, CalendarEvent[]>>((groups, event) => {
      const key = dayKey(event.start)
      groups[key] = [...(groups[key] ?? []), event]
      return groups
    }, {})
  }, [filteredEvents])

  const selectedEvent = useMemo(() => {
    return events.find(event => event.id === selectedId) ?? filteredEvents[0]
  }, [events, filteredEvents, selectedId])

  useEffect(() => {
    if (filteredEvents.length && !filteredEvents.some(event => event.id === selectedId)) {
      setSelectedId(filteredEvents[0].id)
    }
  }, [filteredEvents, selectedId])

  if (loading) {
    return (
      <main className="calendar-page">
        <section className="calendar-loading">Carregando agenda...</section>
        <style jsx>{calendarStyles}</style>
      </main>
    )
  }

  return (
    <main className="calendar-page">
      <header className="calendar-header">
        <div>
          <p className="calendar-eyebrow">Google Calendar</p>
          <h1>Agenda</h1>
          <span>{connected ? 'Sincronizada com os próximos 30 dias' : 'Conecte sua conta para ver seus compromissos'}</span>
        </div>
        <div className="calendar-actions">
          {connected && (
            <button className="btn secondary" onClick={loadEvents} disabled={loadingEvents}>
              {loadingEvents ? 'Atualizando' : 'Atualizar'}
            </button>
          )}
          <button className={connected ? 'btn danger' : 'btn primary'} onClick={connected ? handleDisconnect : handleConnect}>
            {connected ? 'Desconectar' : 'Conectar agenda'}
          </button>
        </div>
      </header>

      {error && <div className="calendar-error">{error}</div>}

      {!connected ? (
        <section className="calendar-connect-card">
          <div className="calendar-connect-mark">GC</div>
          <h2>Conecte sua agenda</h2>
          <p>Veja seus compromissos, reuniões e eventos de dia inteiro dentro do Wasabi, sem misturar com as outras telas.</p>
          <button className="btn primary" onClick={handleConnect}>Conectar Google Calendar</button>
        </section>
      ) : (
        <>
          <section className="calendar-summary-grid">
            <div className="summary-card strong">
              <span>Próximos eventos</span>
              <strong>{stats.total}</strong>
              <small>em 30 dias</small>
            </div>
            <div className="summary-card">
              <span>Hoje</span>
              <strong>{stats.today}</strong>
              <small>na sua agenda</small>
            </div>
            <div className="summary-card">
              <span>7 dias</span>
              <strong>{stats.week}</strong>
              <small>para planejar</small>
            </div>
            <div className="summary-card">
              <span>Reuniões</span>
              <strong>{stats.meetings}</strong>
              <small>com pessoas ou Meet</small>
            </div>
          </section>

          <section className="calendar-toolbar">
            <div className="calendar-filters" aria-label="Filtros da agenda">
              {filterOptions.map(option => (
                <button
                  key={option.value}
                  className={filter === option.value ? 'active' : ''}
                  onClick={() => setFilter(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Buscar evento, local ou descrição..."
              aria-label="Buscar eventos"
            />
          </section>

          <section className="calendar-layout">
            <div className="agenda-panel">
              <div className="panel-head">
                <div>
                  <h2>Próximos eventos</h2>
                  <p>{filteredEvents.length} eventos encontrados</p>
                </div>
              </div>

              {loadingEvents ? (
                <div className="agenda-empty">Atualizando eventos...</div>
              ) : filteredEvents.length === 0 ? (
                <div className="agenda-empty">Nenhum evento para este filtro.</div>
              ) : (
                <div className="agenda-groups">
                  {Object.entries(groupedEvents).map(([key, dayEvents]) => (
                    <div className="agenda-group" key={key}>
                      <h3>{formatDay(dayEvents[0]?.start)}</h3>
                      <div className="agenda-list">
                        {dayEvents.map(event => {
                          const description = cleanDescription(event.description)
                          const isSelected = selectedEvent?.id === event.id
                          return (
                            <button
                              className={isSelected ? 'agenda-item selected' : 'agenda-item'}
                              key={event.id}
                              onClick={() => setSelectedId(event.id)}
                            >
                              <span className="agenda-time">{formatEventTime(event)}</span>
                              <span className="agenda-main">
                                <span className="agenda-title-row">
                                  <strong>{event.title || 'Sem título'}</strong>
                                  <span className="kind-chip">{getEventKind(event)}</span>
                                </span>
                                <span className="agenda-meta">
                                  {event.location || attendeeSummary(event)}
                                </span>
                                {description && <span className="agenda-description">{description}</span>}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <aside className="event-detail-panel">
              {selectedEvent ? (
                <>
                  <div className="detail-topline">
                    <span>{getEventKind(selectedEvent)}</span>
                    {selectedEvent.status && <span>{selectedEvent.status === 'confirmed' ? 'Confirmado' : selectedEvent.status}</span>}
                  </div>
                  <h2>{selectedEvent.title || 'Sem título'}</h2>

                  <div className="detail-grid">
                    <div>
                      <span>Data</span>
                      <strong>{formatDateShort(selectedEvent.start)}</strong>
                    </div>
                    <div>
                      <span>Horário</span>
                      <strong>{formatEventTime(selectedEvent)}</strong>
                    </div>
                    <div>
                      <span>Local</span>
                      <strong>{selectedEvent.location || 'Não informado'}</strong>
                    </div>
                    <div>
                      <span>Convidados</span>
                      <strong>{attendeeSummary(selectedEvent)}</strong>
                    </div>
                  </div>

                  {cleanDescription(selectedEvent.description) && (
                    <div className="detail-section">
                      <h3>Descrição</h3>
                      <p>{cleanDescription(selectedEvent.description)}</p>
                    </div>
                  )}

                  {!!selectedEvent.attendees?.length && (
                    <div className="detail-section">
                      <h3>Participantes</h3>
                      <div className="attendee-list">
                        {selectedEvent.attendees.slice(0, 6).map(attendee => (
                          <span key={`${attendee.email}-${attendee.name}`}>
                            {attendee.name || attendee.email} · {attendee.responseStatus === 'accepted' ? 'confirmou' : 'pendente'}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="detail-actions">
                    {(selectedEvent.conferenceLink || selectedEvent.hangoutLink) && (
                      <a className="btn primary" href={selectedEvent.conferenceLink || selectedEvent.hangoutLink} target="_blank" rel="noreferrer">
                        Entrar na reunião
                      </a>
                    )}
                    {selectedEvent.htmlLink && (
                      <a className="btn secondary" href={selectedEvent.htmlLink} target="_blank" rel="noreferrer">
                        Abrir no Google
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <div className="agenda-empty">Selecione um evento para ver os detalhes.</div>
              )}
            </aside>
          </section>
        </>
      )}

      <style jsx>{calendarStyles}</style>
    </main>
  )
}

const calendarStyles = `
  .calendar-page {
    display: grid;
    gap: 18px;
    min-height: 100vh;
    padding: 26px 32px 40px;
    color: var(--tx);
  }

  .calendar-header,
  .calendar-connect-card,
  .calendar-toolbar,
  .agenda-panel,
  .event-detail-panel,
  .calendar-loading {
    background: rgba(24, 24, 24, 0.88);
    border: 1px solid var(--bd);
    border-radius: 12px;
    box-shadow: 0 18px 50px rgba(0, 0, 0, 0.18);
  }

  .calendar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 22px 24px;
  }

  .calendar-eyebrow {
    margin: 0 0 4px;
    color: var(--gr);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }

  .calendar-header h1,
  .calendar-connect-card h2,
  .agenda-panel h2,
  .event-detail-panel h2 {
    margin: 0;
    font-size: 24px;
    line-height: 1.05;
  }

  .calendar-header span,
  .calendar-connect-card p,
  .panel-head p,
  .event-detail-panel p,
  .summary-card small,
  .summary-card span,
  .agenda-meta,
  .agenda-description,
  .detail-grid span,
  .attendee-list span {
    color: var(--t2);
  }

  .calendar-header span,
  .panel-head p {
    display: block;
    margin-top: 6px;
    font-size: 13px;
  }

  .calendar-actions,
  .detail-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 0 16px;
    border-radius: 8px;
    border: 1px solid var(--bd);
    font-size: 13px;
    font-weight: 800;
    text-decoration: none;
    cursor: pointer;
    transition: transform 160ms ease, border-color 160ms ease, background 160ms ease;
  }

  .btn:hover { transform: translateY(-1px); }
  .btn:disabled { cursor: not-allowed; opacity: 0.58; transform: none; }
  .btn.primary { background: var(--gr); border-color: transparent; color: #04120a; }
  .btn.secondary { background: var(--s2); color: var(--tx); }
  .btn.danger { background: rgba(255, 69, 88, 0.12); border-color: rgba(255, 69, 88, 0.42); color: var(--rd); }

  .calendar-error {
    padding: 14px 16px;
    border: 1px solid rgba(255, 69, 88, 0.42);
    border-radius: 10px;
    color: var(--rd);
    background: rgba(255, 69, 88, 0.1);
    font-weight: 700;
  }

  .calendar-connect-card,
  .calendar-loading {
    display: grid;
    justify-items: center;
    gap: 12px;
    padding: 52px 24px;
    text-align: center;
  }

  .calendar-connect-mark {
    display: grid;
    width: 58px;
    height: 58px;
    place-items: center;
    border: 1px solid rgba(17, 199, 111, 0.35);
    border-radius: 14px;
    background: rgba(17, 199, 111, 0.1);
    color: var(--gr);
    font-weight: 900;
  }

  .calendar-connect-card p { max-width: 520px; margin: 0 0 8px; }

  .calendar-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 14px;
  }

  .summary-card {
    display: grid;
    gap: 6px;
    min-height: 116px;
    padding: 18px;
    background: rgba(24, 24, 24, 0.88);
    border: 1px solid var(--bd);
    border-radius: 10px;
  }

  .summary-card.strong { border-color: rgba(17, 199, 111, 0.35); }
  .summary-card span { font-size: 13px; font-weight: 700; }
  .summary-card strong { font-size: 30px; line-height: 1; }
  .summary-card small { font-size: 12px; }

  .calendar-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px;
  }

  .calendar-filters {
    display: flex;
    gap: 6px;
    padding: 4px;
    border: 1px solid var(--bd);
    border-radius: 10px;
    background: var(--s1);
  }

  .calendar-filters button {
    height: 36px;
    padding: 0 12px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: var(--t2);
    font-weight: 800;
    cursor: pointer;
  }

  .calendar-filters button.active {
    background: rgba(17, 199, 111, 0.12);
    color: var(--gr);
  }

  .calendar-toolbar input {
    flex: 1;
    max-width: 420px;
    height: 44px;
    padding: 0 14px;
    border: 1px solid var(--bd);
    border-radius: 10px;
    background: var(--s1);
    color: var(--tx);
    font: inherit;
    outline: none;
  }

  .calendar-toolbar input:focus { border-color: rgba(17, 199, 111, 0.48); }

  .calendar-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 16px;
    align-items: start;
  }

  .agenda-panel,
  .event-detail-panel {
    min-width: 0;
    padding: 20px;
  }

  .event-detail-panel {
    position: sticky;
    top: 20px;
    display: grid;
    gap: 18px;
  }

  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .agenda-groups {
    display: grid;
    gap: 18px;
  }

  .agenda-group h3 {
    margin: 0 0 10px;
    color: var(--t2);
    font-size: 12px;
    font-weight: 900;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .agenda-list {
    display: grid;
    border: 1px solid var(--bd);
    border-radius: 10px;
    overflow: hidden;
  }

  .agenda-item {
    display: grid;
    grid-template-columns: 116px minmax(0, 1fr);
    gap: 18px;
    width: 100%;
    padding: 16px 18px;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    background: transparent;
    color: var(--tx);
    text-align: left;
    cursor: pointer;
    transition: background 160ms ease;
  }

  .agenda-item:last-child { border-bottom: 0; }
  .agenda-item:hover { background: rgba(255, 255, 255, 0.03); }
  .agenda-item.selected { background: rgba(17, 199, 111, 0.08); }

  .agenda-time {
    color: var(--t2);
    font-size: 13px;
    font-weight: 800;
    line-height: 1.3;
  }

  .agenda-main,
  .agenda-title-row {
    display: grid;
    min-width: 0;
    gap: 6px;
  }

  .agenda-title-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  .agenda-title-row strong {
    overflow: hidden;
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .kind-chip,
  .detail-topline span {
    width: max-content;
    border-radius: 999px;
    border: 1px solid rgba(17, 199, 111, 0.32);
    padding: 4px 8px;
    color: var(--gr);
    background: rgba(17, 199, 111, 0.08);
    font-size: 11px;
    font-weight: 800;
  }

  .agenda-meta,
  .agenda-description {
    overflow: hidden;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail-topline {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .detail-grid {
    display: grid;
    gap: 10px;
  }

  .detail-grid div {
    display: grid;
    grid-template-columns: 86px minmax(0, 1fr);
    gap: 10px;
    align-items: start;
    padding: 10px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .detail-grid strong {
    overflow-wrap: anywhere;
    font-size: 13px;
  }

  .detail-section {
    display: grid;
    gap: 8px;
    padding-top: 2px;
  }

  .detail-section h3 {
    margin: 0;
    font-size: 13px;
  }

  .detail-section p {
    display: -webkit-box;
    max-height: 146px;
    margin: 0;
    overflow: hidden;
    font-size: 13px;
    line-height: 1.55;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 6;
  }

  .attendee-list {
    display: grid;
    gap: 8px;
  }

  .attendee-list span {
    overflow: hidden;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .agenda-empty {
    padding: 34px 16px;
    color: var(--t2);
    text-align: center;
  }

  @media (max-width: 1120px) {
    .calendar-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .calendar-layout { grid-template-columns: 1fr; }
    .event-detail-panel { position: static; }
  }

  @media (max-width: 760px) {
    .calendar-page { padding: 18px; }
    .calendar-header,
    .calendar-toolbar { align-items: stretch; flex-direction: column; }
    .calendar-actions,
    .detail-actions { flex-direction: column; align-items: stretch; }
    .calendar-summary-grid { grid-template-columns: 1fr; }
    .calendar-filters { overflow-x: auto; }
    .calendar-toolbar input { max-width: none; }
    .agenda-item { grid-template-columns: 1fr; gap: 8px; }
    .agenda-title-row { grid-template-columns: 1fr; }
  }
`
