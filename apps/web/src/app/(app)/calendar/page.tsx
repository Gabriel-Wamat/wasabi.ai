'use client'

import { useEffect, useMemo, useState } from 'react'
import { api } from '@/lib/api/client'

type CalendarFilter = 'all' | 'today' | 'week' | 'meetings' | 'allDay' | 'date'

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

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

function MonthCalendar({
  events,
  selectedDate,
  onSelectDate,
}: {
  events: CalendarEvent[]
  selectedDate: Date | null
  onSelectDate: (date: Date | null) => void
}) {
  const today = new Date()
  const [viewYear, setViewYear] = useState(today.getFullYear())
  const [viewMonth, setViewMonth] = useState(today.getMonth())

  // Days that have events
  const eventDays = useMemo(() => {
    const s = new Set<string>()
    events.forEach(ev => {
      const d = toDate(ev.start)
      if (d && d.getFullYear() === viewYear && d.getMonth() === viewMonth) {
        s.add(d.getDate().toString())
      }
    })
    return s
  }, [events, viewYear, viewMonth])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  // Build grid: start from Sunday of the first week
  const firstDay = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  function handleDay(day: number) {
    const clicked = new Date(viewYear, viewMonth, day)
    if (selectedDate && isSameDay(selectedDate, clicked)) {
      onSelectDate(null) // deselect
    } else {
      onSelectDate(clicked)
    }
  }

  const isSelectedDay = (day: number) => {
    if (!selectedDate) return false
    return selectedDate.getFullYear() === viewYear &&
           selectedDate.getMonth() === viewMonth &&
           selectedDate.getDate() === day
  }

  const isTodayDay = (day: number) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day

  return (
    <div className="month-cal">
      <div className="month-cal-head">
        <button className="month-cal-nav" onClick={prevMonth} title="Mês anterior">‹</button>
        <span className="month-cal-title">{MONTHS_PT[viewMonth]} {viewYear}</span>
        <button className="month-cal-nav" onClick={nextMonth} title="Próximo mês">›</button>
      </div>
      <div className="month-cal-grid">
        {WEEKDAYS.map(w => (
          <div key={w} className="month-cal-weekday">{w}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />
          const hasEv  = eventDays.has(day.toString())
          const sel    = isSelectedDay(day)
          const tod    = isTodayDay(day)
          return (
            <button
              key={day}
              className={`month-cal-day${sel ? ' sel' : ''}${tod && !sel ? ' today' : ''}`}
              onClick={() => handleDay(day)}
              title={hasEv ? 'Há eventos neste dia' : undefined}
            >
              {day}
              {hasEv && <span className="month-cal-dot" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<CalendarFilter>('all')
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  function handleSelectDate(date: Date | null) {
    setSelectedDate(date)
    if (date) setFilter('date')
    else setFilter('all')
  }

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
          || (filter === 'date' && !!start && !!selectedDate && isSameDay(start, selectedDate))

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
        <style>{calendarStyles}</style>
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
                  onClick={() => { setFilter(option.value); setSelectedDate(null) }}
                >
                  {option.label}
                </button>
              ))}
              {filter === 'date' && selectedDate && (
                <button
                  className="active"
                  onClick={() => { setFilter('all'); setSelectedDate(null) }}
                  title="Limpar filtro de data"
                >
                  {selectedDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} ✕
                </button>
              )}
            </div>
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Buscar evento, local ou descrição..."
              aria-label="Buscar eventos"
            />
          </section>

          <MonthCalendar
            events={events}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
          />

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

      <style>{calendarStyles}</style>
    </main>
  )
}

const calendarStyles = `
  /* ── Page shell ── */
  .calendar-page {
    display: grid;
    gap: 12px;
    padding: 16px 0 32px;
    color: var(--tx);
  }

  /* ── Shared card base ── */
  .calendar-header,
  .calendar-connect-card,
  .calendar-toolbar,
  .agenda-panel,
  .event-detail-panel,
  .calendar-loading {
    background: rgba(20, 20, 20, 0.9);
    border: 1px solid var(--bd);
    border-radius: 10px;
  }

  /* ── Header ── */
  .calendar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 18px;
  }

  .calendar-eyebrow {
    margin: 0 0 2px;
    color: var(--gr);
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }

  .calendar-header h1 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  .calendar-header > div > span,
  .panel-head p {
    display: block;
    margin-top: 2px;
    font-size: 12px;
    color: var(--t2);
  }

  .calendar-actions,
  .detail-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  /* ── Buttons ── */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    padding: 0 14px;
    border-radius: 7px;
    border: 1px solid var(--bd);
    font-size: 13px;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 120ms ease, background 120ms ease;
  }
  .btn:hover { opacity: 0.85; }
  .btn:disabled { cursor: not-allowed; opacity: 0.45; }
  .btn.primary { background: var(--gr); border-color: transparent; color: #04120a; }
  .btn.secondary { background: var(--s2); color: var(--tx); }
  .btn.danger { background: rgba(240, 85, 108, 0.1); border-color: rgba(240, 85, 108, 0.3); color: var(--rd); }

  /* ── Error ── */
  .calendar-error {
    padding: 10px 14px;
    border: 1px solid rgba(240, 85, 108, 0.35);
    border-radius: 8px;
    color: var(--rd);
    background: rgba(240, 85, 108, 0.08);
    font-size: 13px;
    font-weight: 600;
  }

  /* ── Connect / Loading card ── */
  .calendar-connect-card,
  .calendar-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 32px 24px;
    text-align: center;
  }

  .calendar-connect-mark {
    display: grid;
    width: 40px;
    height: 40px;
    place-items: center;
    border: 1px solid rgba(17, 199, 111, 0.3);
    border-radius: 10px;
    background: rgba(17, 199, 111, 0.08);
    color: var(--gr);
    font-size: 13px;
    font-weight: 800;
    letter-spacing: 0.02em;
  }

  .calendar-connect-card h2 {
    margin: 4px 0 0;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .calendar-connect-card p {
    max-width: 380px;
    margin: 0 0 6px;
    font-size: 13px;
    color: var(--t2);
    line-height: 1.5;
  }

  /* ── Summary grid ── */
  .calendar-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
  }

  .summary-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 14px 16px;
    background: rgba(20, 20, 20, 0.9);
    border: 1px solid var(--bd);
    border-radius: 10px;
  }

  .summary-card.strong { border-color: rgba(17, 199, 111, 0.28); }
  .summary-card span { font-size: 11px; font-weight: 600; color: var(--t2); text-transform: uppercase; letter-spacing: 0.06em; }
  .summary-card strong { font-size: 22px; font-weight: 700; line-height: 1.1; letter-spacing: -0.02em; margin-top: 2px; }
  .summary-card small { font-size: 11px; color: var(--t3); margin-top: 1px; }

  /* ── Toolbar ── */
  .calendar-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
  }

  .calendar-filters {
    display: flex;
    gap: 3px;
    padding: 3px;
    border: 1px solid var(--bd);
    border-radius: 8px;
    background: var(--s1);
  }

  .calendar-filters button {
    height: 28px;
    padding: 0 10px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--t2);
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: background 120ms, color 120ms;
  }

  .calendar-filters button.active {
    background: rgba(17, 199, 111, 0.12);
    color: var(--gr);
  }

  .calendar-toolbar input {
    flex: 1;
    max-width: 360px;
    height: 34px;
    padding: 0 12px;
    border: 1px solid var(--bd);
    border-radius: 8px;
    background: var(--s1);
    color: var(--tx);
    font: inherit;
    font-size: 13px;
    outline: none;
    transition: border-color 120ms;
  }

  .calendar-toolbar input:focus { border-color: rgba(17, 199, 111, 0.45); }

  /* ── Month calendar ── */
  .month-cal {
    background: rgba(20, 20, 20, 0.9);
    border: 1px solid var(--bd);
    border-radius: 10px;
    padding: 12px 16px;
    user-select: none;
  }

  .month-cal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }

  .month-cal-title {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .month-cal-nav {
    width: 26px;
    height: 26px;
    border: 1px solid var(--bd);
    border-radius: 6px;
    background: var(--s2);
    color: var(--t2);
    font-size: 15px;
    line-height: 1;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: background 0.1s, color 0.1s;
  }

  .month-cal-nav:hover { background: var(--s3); color: var(--tx); }

  .month-cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
  }

  .month-cal-weekday {
    text-align: center;
    font-size: 10px;
    font-weight: 700;
    color: var(--t3);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2px 0 6px;
  }

  .month-cal-day {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    height: 32px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--t2);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }

  .month-cal-day:hover { background: rgba(255,255,255,.04); color: var(--tx); }
  .month-cal-day.today { color: var(--gr); font-weight: 700; }
  .month-cal-day.sel {
    background: rgba(17, 199, 111, 0.16);
    color: var(--gr);
    font-weight: 700;
    border: 1px solid rgba(17, 199, 111, 0.32);
  }

  .month-cal-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: var(--gr);
    opacity: 0.75;
    flex-shrink: 0;
  }

  /* ── Layout: agenda + detail ── */
  .calendar-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 12px;
    align-items: start;
  }

  .agenda-panel,
  .event-detail-panel {
    min-width: 0;
    padding: 16px;
  }

  .event-detail-panel {
    position: sticky;
    top: 16px;
    display: grid;
    gap: 14px;
  }

  .event-detail-panel h2 {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: -0.01em;
    line-height: 1.3;
  }

  .panel-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  .agenda-panel h2 {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
  }

  .agenda-groups {
    display: grid;
    gap: 14px;
  }

  .agenda-group h3 {
    margin: 0 0 8px;
    color: var(--t2);
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .agenda-list {
    display: grid;
    border: 1px solid var(--bd);
    border-radius: 8px;
    overflow: hidden;
  }

  .agenda-item {
    display: grid;
    grid-template-columns: 96px minmax(0, 1fr);
    gap: 12px;
    width: 100%;
    padding: 11px 14px;
    border: 0;
    border-bottom: 1px solid rgba(255,255,255,.05);
    background: transparent;
    color: var(--tx);
    text-align: left;
    cursor: pointer;
    transition: background 120ms;
  }

  .agenda-item:last-child { border-bottom: 0; }
  .agenda-item:hover { background: rgba(255,255,255,.025); }
  .agenda-item.selected { background: rgba(17, 199, 111, 0.07); }

  .agenda-time {
    color: var(--t2);
    font-size: 12px;
    font-weight: 600;
    line-height: 1.35;
  }

  .agenda-main,
  .agenda-title-row {
    display: grid;
    min-width: 0;
    gap: 4px;
  }

  .agenda-title-row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 8px;
  }

  .agenda-title-row strong {
    overflow: hidden;
    font-size: 13px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .kind-chip,
  .detail-topline span {
    width: max-content;
    border-radius: 999px;
    border: 1px solid rgba(17, 199, 111, 0.28);
    padding: 2px 7px;
    color: var(--gr);
    background: rgba(17, 199, 111, 0.07);
    font-size: 10px;
    font-weight: 700;
  }

  .agenda-meta,
  .agenda-description {
    overflow: hidden;
    font-size: 12px;
    color: var(--t2);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail-topline {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .detail-grid { display: grid; gap: 0; }

  .detail-grid div {
    display: grid;
    grid-template-columns: 76px minmax(0, 1fr);
    gap: 8px;
    align-items: start;
    padding: 8px 0;
    border-bottom: 1px solid rgba(255,255,255,.05);
  }

  .detail-grid div:last-child { border-bottom: 0; }

  .detail-grid span { font-size: 11px; color: var(--t2); font-weight: 500; padding-top: 1px; }
  .detail-grid strong { overflow-wrap: anywhere; font-size: 13px; font-weight: 600; }

  .detail-section { display: grid; gap: 6px; }
  .detail-section h3 { margin: 0; font-size: 11px; font-weight: 700; color: var(--t2); text-transform: uppercase; letter-spacing: 0.07em; }
  .detail-section p {
    display: -webkit-box;
    margin: 0;
    overflow: hidden;
    font-size: 12px;
    line-height: 1.55;
    color: var(--t2);
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 5;
  }

  .attendee-list { display: grid; gap: 6px; }
  .attendee-list span { overflow: hidden; font-size: 12px; color: var(--t2); text-overflow: ellipsis; white-space: nowrap; }

  .agenda-empty {
    padding: 24px 16px;
    color: var(--t3);
    text-align: center;
    font-size: 13px;
  }

  @media (max-width: 1120px) {
    .calendar-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .calendar-layout { grid-template-columns: 1fr; }
    .event-detail-panel { position: static; }
  }

  @media (max-width: 760px) {
    .calendar-page { padding: 12px 0 24px; }
    .calendar-header, .calendar-toolbar { flex-direction: column; align-items: stretch; }
    .calendar-actions, .detail-actions { flex-direction: column; align-items: stretch; }
    .calendar-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .calendar-filters { overflow-x: auto; }
    .calendar-toolbar input { max-width: none; }
    .agenda-item { grid-template-columns: 1fr; gap: 6px; }
    .agenda-title-row { grid-template-columns: 1fr; }
  }
`
