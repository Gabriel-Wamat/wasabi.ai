'use client'

import { useEffect, useMemo, useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

type TaskStatus = 'TODO' | 'DOING' | 'DONE'
type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH'
type Energy = 'LOW' | 'MEDIUM' | 'HIGH'

interface TaskLink {
  id: string
  title: string
  url: string
}

type NoteBlockType = 'TEXT' | 'HEADING' | 'CHECKLIST' | 'DIVIDER' | 'CODE' | 'TABLE'

interface NoteBlock {
  id: string
  type: NoteBlockType
  content: string
  checked?: boolean
  cells?: string[][]
}

interface DailyTask {
  id: string
  title: string
  notes: string
  category: string
  status: TaskStatus
  priority: TaskPriority
  energy: Energy
  start: string
  duration: number
  links: TaskLink[]
  noteBlocks: NoteBlock[]
}

const statusLabel: Record<TaskStatus, string> = {
  TODO: 'A fazer',
  DOING: 'Em foco',
  DONE: 'Concluída',
}

const priorityLabel: Record<TaskPriority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
}

const priorityColor: Record<TaskPriority, string> = {
  LOW: 'var(--bl)',
  MEDIUM: 'var(--yw)',
  HIGH: 'var(--rd)',
}

const energyLabel: Record<Energy, string> = {
  LOW: 'Leve',
  MEDIUM: 'Normal',
  HIGH: 'Profunda',
}

const blockOptions: Array<{ type: NoteBlockType; label: string; hint: string; icon: string }> = [
  { type: 'TEXT', label: 'Texto', hint: 'Escreva uma anotação simples', icon: 'T' },
  { type: 'HEADING', label: 'Título 2', hint: 'Crie uma seção dentro da tarefa', icon: 'H2' },
  { type: 'CHECKLIST', label: 'Checklist', hint: 'Acompanhe itens marcáveis', icon: '☑' },
  { type: 'TABLE', label: 'Tabela', hint: 'Organize linhas e status', icon: '▦' },
  { type: 'DIVIDER', label: 'Divisor', hint: 'Separe partes da anotação', icon: '—' },
  { type: 'CODE', label: 'Código', hint: 'Guarde comandos ou trechos técnicos', icon: '</>' },
]

const initialForm = {
  title: '',
  notes: '',
  category: 'Pessoal',
  priority: 'MEDIUM' as TaskPriority,
  energy: 'MEDIUM' as Energy,
  start: '09:00',
  duration: 45,
}

function todayInputValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createNoteBlock(type: NoteBlockType, content = ''): NoteBlock {
  if (type === 'TABLE') {
    return {
      id: makeId(),
      type,
      content: 'Tabela',
      cells: [
        ['Nome', 'Status'],
        ['', ''],
        ['', ''],
      ],
    }
  }

  return {
    id: makeId(),
    type,
    content,
    checked: type === 'CHECKLIST' ? false : undefined,
  }
}

function noteBlocksFromText(notes: string): NoteBlock[] {
  return [createNoteBlock('TEXT', notes)]
}

function summarizeNoteBlocks(blocks: NoteBlock[]) {
  const firstReadable = blocks.find(block => {
    if (block.type === 'DIVIDER') return false
    if (block.type === 'TABLE') return block.cells?.some(row => row.some(cell => cell.trim()))
    return block.content.trim()
  })

  if (!firstReadable) return ''
  if (firstReadable.type === 'TABLE') return 'Tabela de acompanhamento'
  return firstReadable.content.trim()
}

function defaultTasks(): DailyTask[] {
  return [
    {
      id: makeId(),
      title: 'Revisar prioridades do dia',
      notes: 'Escolher os 3 blocos mais importantes antes de abrir novas demandas.',
      category: 'Rotina',
      status: 'DOING',
      priority: 'HIGH',
      energy: 'MEDIUM',
      start: '08:30',
      duration: 25,
      links: [],
      noteBlocks: noteBlocksFromText('Escolher os 3 blocos mais importantes antes de abrir novas demandas.'),
    },
    {
      id: makeId(),
      title: 'Trabalhar no projeto principal',
      notes: 'Bloco sem interrupções para avançar a entrega de maior impacto.',
      category: 'Trabalho',
      status: 'TODO',
      priority: 'HIGH',
      energy: 'HIGH',
      start: '09:30',
      duration: 90,
      links: [],
      noteBlocks: noteBlocksFromText('Bloco sem interrupções para avançar a entrega de maior impacto.'),
    },
    {
      id: makeId(),
      title: 'Organizar documentos pendentes',
      notes: 'Verificar vencimentos e anexar arquivos que ainda não foram importados.',
      category: 'Admin',
      status: 'TODO',
      priority: 'MEDIUM',
      energy: 'LOW',
      start: '14:00',
      duration: 40,
      links: [],
      noteBlocks: noteBlocksFromText('Verificar vencimentos e anexar arquivos que ainda não foram importados.'),
    },
  ]
}

function parseStoredTasks(saved: string): DailyTask[] {
  try {
    const parsed = JSON.parse(saved) as Partial<DailyTask>[]
    if (!Array.isArray(parsed)) return defaultTasks()
    return parsed.map(task => ({
      id: task.id ?? makeId(),
      title: task.title ?? 'Sem título',
      notes: task.notes ?? '',
      category: task.category ?? 'Pessoal',
      status: task.status ?? 'TODO',
      priority: task.priority ?? 'MEDIUM',
      energy: task.energy ?? 'MEDIUM',
      start: task.start ?? '09:00',
      duration: task.duration ?? 45,
      links: Array.isArray(task.links) ? task.links : [],
      noteBlocks: Array.isArray(task.noteBlocks) ? task.noteBlocks : noteBlocksFromText(task.notes ?? ''),
    }))
  } catch {
    return defaultTasks()
  }
}

function minutesLabel(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (!hours) return `${mins}min`
  return mins ? `${hours}h ${mins}min` : `${hours}h`
}

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(`${value}T12:00:00`))
}

function periodFromTime(time: string) {
  const hour = Number(time.slice(0, 2))
  if (hour < 12) return 'Manhã'
  if (hour < 18) return 'Tarde'
  return 'Noite'
}

function normalizeUrl(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', color: 'var(--t2)', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>
      {children}
    </label>
  )
}

function panelStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: 'rgba(20,20,20,.92)',
    border: '1px solid var(--bd)',
    borderRadius: 10,
    boxShadow: '0 18px 42px rgba(0,0,0,.16)',
    ...extra,
  }
}

export default function PlannerPage() {
  const [selectedDate, setSelectedDate] = useState(todayInputValue())
  const [tasks, setTasks] = useState<DailyTask[]>([])
  const [loadedKey, setLoadedKey] = useState('')
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('ALL')
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [openTaskMenuId, setOpenTaskMenuId] = useState<string | null>(null)
  const [isBlockMenuOpen, setIsBlockMenuOpen] = useState(false)
  const [blockSearch, setBlockSearch] = useState('')
  const [isLinkFormOpen, setIsLinkFormOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  const storageKey = `wasabi-daily-planner:${selectedDate}`

  useEffect(() => {
    const saved = localStorage.getItem(storageKey)
    setTasks(saved ? parseStoredTasks(saved) : defaultTasks())
    setLoadedKey(storageKey)
    setEditingId(null)
    setSelectedTaskId(null)
    setOpenTaskMenuId(null)
    setIsTaskModalOpen(false)
    setForm(initialForm)
  }, [storageKey])

  useEffect(() => {
    if (loadedKey === storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(tasks))
    }
  }, [loadedKey, storageKey, tasks])

  const stats = useMemo(() => {
    const done = tasks.filter(task => task.status === 'DONE').length
    const focus = tasks.filter(task => task.priority === 'HIGH' && task.status !== 'DONE').length
    const plannedMinutes = tasks.reduce((total, task) => total + task.duration, 0)
    const completion = tasks.length ? Math.round((done / tasks.length) * 100) : 0
    return { done, focus, plannedMinutes, completion }
  }, [tasks])

  const filteredTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return tasks
      .filter(task => statusFilter === 'ALL' || task.status === statusFilter)
      .filter(task => {
        if (!normalizedQuery) return true
        return [task.title, task.notes, task.category].some(value => value.toLowerCase().includes(normalizedQuery))
      })
      .sort((a, b) => a.start.localeCompare(b.start))
  }, [query, statusFilter, tasks])

  const groupedTasks = useMemo(() => {
    return ['Manhã', 'Tarde', 'Noite'].map(period => ({
      period,
      tasks: filteredTasks.filter(task => periodFromTime(task.start) === period),
    }))
  }, [filteredTasks])

  const focusTasks = tasks
    .filter(task => task.status !== 'DONE')
    .sort((a, b) => {
      const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 }
      return priorityOrder[a.priority] - priorityOrder[b.priority] || a.start.localeCompare(b.start)
    })
    .slice(0, 3)

  const selectedTask = useMemo(
    () => tasks.find(task => task.id === selectedTaskId) ?? null,
    [selectedTaskId, tasks],
  )

  const filteredBlockOptions = useMemo(() => {
    const normalizedSearch = blockSearch.trim().toLowerCase()
    if (!normalizedSearch) return blockOptions
    return blockOptions.filter(option => (
      option.label.toLowerCase().includes(normalizedSearch)
      || option.hint.toLowerCase().includes(normalizedSearch)
    ))
  }, [blockSearch])

  useEffect(() => {
    setIsBlockMenuOpen(false)
    setBlockSearch('')
    setIsLinkFormOpen(false)
    setLinkTitle('')
    setLinkUrl('')
  }, [selectedTask])

  function resetForm() {
    setEditingId(null)
    setForm(initialForm)
  }

  function openCreateTask() {
    resetForm()
    setIsTaskModalOpen(true)
  }

  function submitTask(e: React.FormEvent) {
    e.preventDefault()
    const title = form.title.trim()
    if (!title) return

    if (editingId) {
      setTasks(current => current.map(task => (
        task.id === editingId
          ? { ...task, ...form, title, notes: form.notes.trim(), duration: Number(form.duration), noteBlocks: noteBlocksFromText(form.notes.trim()) }
          : task
      )))
      resetForm()
      setIsTaskModalOpen(false)
      return
    }

    setTasks(current => [
      ...current,
      {
        id: makeId(),
        title,
        notes: form.notes.trim(),
        category: form.category,
        status: 'TODO',
        priority: form.priority,
        energy: form.energy,
        start: form.start,
        duration: Number(form.duration),
        links: [],
        noteBlocks: noteBlocksFromText(form.notes.trim()),
      },
    ])
    resetForm()
    setIsTaskModalOpen(false)
  }

  function editTask(task: DailyTask) {
    setEditingId(task.id)
    setForm({
      title: task.title,
      notes: task.notes,
      category: task.category,
      priority: task.priority,
      energy: task.energy,
      start: task.start,
      duration: task.duration,
    })
    setIsTaskModalOpen(true)
  }

  function openTaskDetails(task: DailyTask) {
    setOpenTaskMenuId(null)
    setIsBlockMenuOpen(false)
    setBlockSearch('')
    setIsLinkFormOpen(false)
    setSelectedTaskId(task.id)
  }

  function updateStatus(id: string, status: TaskStatus) {
    setTasks(current => current.map(task => task.id === id ? { ...task, status } : task))
    setOpenTaskMenuId(null)
  }

  function deleteTask(id: string) {
    setTasks(current => current.filter(task => task.id !== id))
    setOpenTaskMenuId(null)
    if (editingId === id) resetForm()
    if (selectedTaskId === id) setSelectedTaskId(null)
  }

  function clearDone() {
    setTasks(current => current.filter(task => task.status !== 'DONE'))
  }

  function resetDay() {
    setTasks(defaultTasks())
    resetForm()
  }

  function updateSelectedTask(updater: (task: DailyTask) => DailyTask) {
    if (!selectedTask) return
    setTasks(current => current.map(task => task.id === selectedTask.id ? updater(task) : task))
  }

  function updateTaskTitle(title: string) {
    updateSelectedTask(task => ({ ...task, title }))
  }

  function updateTaskBlock(blockId: string, patch: Partial<NoteBlock>) {
    updateSelectedTask(task => {
      const nextBlocks = task.noteBlocks.map(block => block.id === blockId ? { ...block, ...patch } : block)
      return { ...task, noteBlocks: nextBlocks, notes: summarizeNoteBlocks(nextBlocks) }
    })
  }

  function updateTableCell(blockId: string, rowIndex: number, cellIndex: number, value: string) {
    updateSelectedTask(task => {
      const nextBlocks = task.noteBlocks.map(block => {
        if (block.id !== blockId || block.type !== 'TABLE') return block
        const cells = (block.cells ?? []).map(row => [...row])
        cells[rowIndex][cellIndex] = value
        return { ...block, cells }
      })
      return { ...task, noteBlocks: nextBlocks, notes: summarizeNoteBlocks(nextBlocks) }
    })
  }

  function addTableRow(blockId: string) {
    updateSelectedTask(task => {
      const nextBlocks = task.noteBlocks.map(block => (
        block.id === blockId && block.type === 'TABLE'
          ? { ...block, cells: [...(block.cells ?? []), ['', '']] }
          : block
      ))
      return { ...task, noteBlocks: nextBlocks }
    })
  }

  function addTaskBlock(type: NoteBlockType) {
    updateSelectedTask(task => {
      const nextBlocks = [...task.noteBlocks, createNoteBlock(type)]
      return { ...task, noteBlocks: nextBlocks, notes: summarizeNoteBlocks(nextBlocks) }
    })
    setIsBlockMenuOpen(false)
    setBlockSearch('')
  }

  function removeTaskBlock(blockId: string) {
    updateSelectedTask(task => {
      const nextBlocks = task.noteBlocks.filter(block => block.id !== blockId)
      return { ...task, noteBlocks: nextBlocks, notes: summarizeNoteBlocks(nextBlocks) }
    })
  }

  function addTaskLink(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedTask) return
    const url = normalizeUrl(linkUrl)
    if (!url) return

    const link: TaskLink = {
      id: makeId(),
      title: linkTitle.trim() || url.replace(/^https?:\/\//i, ''),
      url,
    }

    setTasks(current => current.map(task => (
      task.id === selectedTask.id ? { ...task, links: [...task.links, link] } : task
    )))
    setLinkTitle('')
    setLinkUrl('')
    setIsLinkFormOpen(false)
  }

  function removeTaskLink(linkId: string) {
    if (!selectedTask) return
    setTasks(current => current.map(task => (
      task.id === selectedTask.id
        ? { ...task, links: task.links.filter(link => link.id !== linkId) }
        : task
    )))
  }

  return (
    <div>
      <Header title="Planejador Diário" />

      <div style={{ padding: 20, display: 'grid', gap: 16 }}>
        <section style={{ ...panelStyle({ padding: 18 }), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12, alignItems: 'stretch' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--t2)', fontSize: 12, marginBottom: 6, textTransform: 'capitalize' }}>{formatDateLabel(selectedDate)}</div>
            <h1 style={{ fontSize: 24, lineHeight: 1.1, marginBottom: 12 }}>Plano do dia</h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--tx)', padding: '8px 10px', fontSize: 12, outline: 'none' }}
              />
              <Button variant="secondary" onClick={clearDone}>Limpar concluídas</Button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, minWidth: 0 }}>
            {[
              ['Progresso', `${stats.completion}%`, `${stats.done}/${tasks.length} tarefas`],
              ['Foco', String(stats.focus), 'alta prioridade'],
              ['Tempo', minutesLabel(stats.plannedMinutes), 'planejado'],
              ['Pendentes', String(tasks.length - stats.done), 'a executar'],
            ].map(([label, value, hint]) => (
              <div key={label} style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 9, padding: 12, minWidth: 0 }}>
                <div style={{ color: 'var(--t2)', fontSize: 11, marginBottom: 8 }}>{label}</div>
                <div style={{ color: label === 'Progresso' ? 'var(--gr)' : 'var(--tx)', fontSize: 22, fontWeight: 800, lineHeight: 1, whiteSpace: 'nowrap' }}>{value}</div>
                <div style={{ color: 'var(--t3)', fontSize: 11, marginTop: 7 }}>{hint}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
          <aside style={{ display: 'grid', gap: 16 }}>
            <div style={panelStyle({ padding: 16 })}>
              <Button variant="primary" onClick={openCreateTask} style={{ width: '100%', padding: '12px 14px', fontSize: 13, fontWeight: 700 }}>
                + Nova tarefa
              </Button>
            </div>

            <div style={panelStyle({ padding: 16 })}>
              <h2 style={{ fontSize: 16, marginBottom: 12 }}>Top 3 foco</h2>
              <div style={{ display: 'grid', gap: 8 }}>
                {focusTasks.map((task, index) => (
                  <button
                    key={task.id}
                    onClick={() => updateStatus(task.id, 'DOING')}
                    style={{ display: 'grid', gridTemplateColumns: '26px 1fr', gap: 8, alignItems: 'center', textAlign: 'left', background: task.status === 'DOING' ? 'var(--gd)' : 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--tx)', padding: 10 }}
                  >
                    <span style={{ color: 'var(--gr)', fontWeight: 800 }}>{index + 1}</span>
                    <span>
                      <span style={{ display: 'block', fontSize: 12, fontWeight: 700 }}>{task.title}</span>
                      <span style={{ display: 'block', color: 'var(--t2)', fontSize: 11 }}>{task.start} · {minutesLabel(task.duration)}</span>
                    </span>
                  </button>
                ))}
                {!focusTasks.length && <div style={{ color: 'var(--t3)', fontSize: 12 }}>Sem tarefas pendentes.</div>}
              </div>
            </div>
          </aside>

          <main style={{ display: 'grid', gap: 14 }}>
            <div style={{ ...panelStyle({ padding: 14 }), display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, alignItems: 'end' }}>
              <div>
                <FieldLabel>Buscar</FieldLabel>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar tarefas..."
                  style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--tx)', padding: '10px 12px', fontSize: 13, outline: 'none' }}
                />
              </div>
              <div>
                <FieldLabel>Status</FieldLabel>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'ALL' | TaskStatus)} style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--tx)', padding: '10px 12px', fontSize: 13, outline: 'none' }}>
                  <option value="ALL">Todos</option>
                  {(['TODO', 'DOING', 'DONE'] as TaskStatus[]).map(status => <option key={status} value={status}>{statusLabel[status]}</option>)}
                </select>
              </div>
              <div style={{ color: 'var(--t2)', fontSize: 12, paddingBottom: 9, textAlign: 'right' }}>
                {filteredTasks.length} tarefa{filteredTasks.length === 1 ? '' : 's'}
              </div>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {groupedTasks.map(group => (
                <section key={group.period} style={panelStyle({ overflow: 'visible' })}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--bd)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: 15 }}>{group.period}</h2>
                    <span style={{ color: 'var(--t3)', fontSize: 11 }}>{group.tasks.reduce((total, task) => total + task.duration, 0)}min</span>
                  </div>

                  <div style={{ display: 'grid' }}>
                    {group.tasks.map(task => (
                      <div
                        key={task.id}
                        onClick={() => openTaskDetails(task)}
                        style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr) 30px', gap: 10, alignItems: 'start', padding: '14px', borderBottom: '1px solid rgba(255,255,255,.045)', background: task.status === 'DOING' ? 'rgba(10,35,24,.48)' : 'transparent', cursor: 'pointer' }}
                      >
                        <div style={{ color: 'var(--t2)', fontSize: 12, fontWeight: 700, paddingTop: 2, lineHeight: 1.05 }}>
                          {task.start}
                          <div style={{ color: 'var(--t3)', fontSize: 10, fontWeight: 500, marginTop: 4 }}>{minutesLabel(task.duration)}</div>
                        </div>

                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                            <strong style={{ fontSize: 14, lineHeight: 1.15, textDecoration: task.status === 'DONE' ? 'line-through' : 'none', color: task.status === 'DONE' ? 'var(--t2)' : 'var(--tx)' }}>{task.title}</strong>
                            <span style={{ fontSize: 10, color: priorityColor[task.priority], border: `1px solid ${priorityColor[task.priority]}`, borderRadius: 999, padding: '2px 7px' }}>{priorityLabel[task.priority]}</span>
                            <span style={{ fontSize: 10, color: 'var(--t2)', background: 'var(--s3)', borderRadius: 999, padding: '2px 7px' }}>{task.category}</span>
                            <span style={{ fontSize: 10, color: 'var(--t2)' }}>{energyLabel[task.energy]}</span>
                          </div>
                          {task.notes && <div style={{ color: 'var(--t2)', fontSize: 12, lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.notes}</div>}
                        </div>

                        <div style={{ position: 'relative', display: 'flex', justifyContent: 'flex-end' }}>
                          <button
                            aria-label={`Ações de ${task.title}`}
                            onClick={event => {
                              event.stopPropagation()
                              setOpenTaskMenuId(current => current === task.id ? null : task.id)
                            }}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 999,
                              border: 'none',
                              background: 'transparent',
                              color: openTaskMenuId === task.id ? 'var(--gr)' : 'var(--tx)',
                              fontSize: 16,
                              fontWeight: 800,
                              lineHeight: 1,
                              cursor: 'pointer',
                            }}
                          >
                            ...
                          </button>

                          {openTaskMenuId === task.id && (
                            <div
                              onClick={event => event.stopPropagation()}
                              style={{
                                position: 'absolute',
                                top: 30,
                                right: 0,
                                zIndex: 80,
                                minWidth: 136,
                                padding: 6,
                                background: 'var(--s1)',
                                border: '1px solid var(--bd)',
                                borderRadius: 9,
                                boxShadow: '0 18px 44px rgba(0,0,0,.34)',
                                display: 'grid',
                                gap: 2,
                              }}
                            >
                              {task.status !== 'DOING' && task.status !== 'DONE' && (
                                <button onClick={event => { event.stopPropagation(); updateStatus(task.id, 'DOING') }} style={{ textAlign: 'left', background: 'transparent', border: 0, color: 'var(--tx)', padding: '8px 10px', borderRadius: 7, fontSize: 12 }}>Focar</button>
                              )}
                              {task.status !== 'DONE' && (
                                <button onClick={event => { event.stopPropagation(); updateStatus(task.id, 'DONE') }} style={{ textAlign: 'left', background: 'transparent', border: 0, color: 'var(--gr)', padding: '8px 10px', borderRadius: 7, fontSize: 12 }}>Concluir</button>
                              )}
                              {task.status === 'DONE' && (
                                <button onClick={event => { event.stopPropagation(); updateStatus(task.id, 'TODO') }} style={{ textAlign: 'left', background: 'transparent', border: 0, color: 'var(--tx)', padding: '8px 10px', borderRadius: 7, fontSize: 12 }}>Reabrir</button>
                              )}
                              <button onClick={event => { event.stopPropagation(); editTask(task) }} style={{ textAlign: 'left', background: 'transparent', border: 0, color: 'var(--tx)', padding: '8px 10px', borderRadius: 7, fontSize: 12 }}>Editar</button>
                              <button onClick={event => { event.stopPropagation(); deleteTask(task.id) }} style={{ textAlign: 'left', background: 'transparent', border: 0, color: 'var(--rd)', padding: '8px 10px', borderRadius: 7, fontSize: 12 }}>Excluir</button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {!group.tasks.length && (
                      <div style={{ padding: '16px 14px', color: 'var(--t3)', fontSize: 12 }}>Nenhuma tarefa neste período.</div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </main>
        </section>
      </div>

      <Modal
        isOpen={Boolean(selectedTask)}
        onClose={() => setSelectedTaskId(null)}
        title={selectedTask?.title ?? 'Detalhes da tarefa'}
        maxWidth="min(700px, calc(100vw - 32px))"
        hideHeader
      >
        {selectedTask && (
          <div style={{ position: 'relative', maxWidth: 600, margin: '0 auto', display: 'grid', gap: 16, padding: '8px 2px 2px' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', minHeight: 28 }}>
              <button
                type="button"
                onClick={() => setSelectedTaskId(null)}
                aria-label="Fechar detalhes da tarefa"
                style={{ background: 'transparent', border: 0, color: 'var(--t2)', cursor: 'pointer', fontSize: 22, width: 30, height: 30, borderRadius: 8 }}
              >
                ×
              </button>
            </div>

            <section style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
              <input
                value={selectedTask.title}
                onChange={event => updateTaskTitle(event.target.value)}
                aria-label="Título da tarefa"
                style={{ width: '100%', background: 'transparent', border: 0, color: 'var(--tx)', fontSize: 26, fontWeight: 800, lineHeight: 1.12, outline: 'none', padding: '2px 0' }}
              />

              <div style={{ display: 'grid', gap: 7, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                {[
                  { icon: '◉', label: 'Status', value: statusLabel[selectedTask.status], color: 'var(--gr)' },
                  { icon: '▣', label: 'Categoria', value: selectedTask.category, color: 'var(--t2)' },
                  { icon: '!', label: 'Prioridade', value: priorityLabel[selectedTask.priority], color: priorityColor[selectedTask.priority] },
                  { icon: '◷', label: 'Horário', value: `${selectedTask.start} · ${minutesLabel(selectedTask.duration)}`, color: 'var(--t2)' },
                  { icon: '◆', label: 'Energia', value: energyLabel[selectedTask.energy], color: 'var(--t2)' },
                ].map(({ icon, label, value, color }) => (
                  <div
                    key={label}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '132px minmax(0, 1fr)',
                      alignItems: 'center',
                      gap: 16,
                      minHeight: 28,
                      color: 'var(--t2)',
                      fontSize: 12,
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                      <span style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 999, background: 'rgba(255,255,255,.045)', color, fontSize: 10, lineHeight: 1, flexShrink: 0 }}>
                        {icon}
                      </span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                    </span>
                    <span style={{ color, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                {selectedTask.noteBlocks.map(block => (
                  <div key={block.id} style={{ display: 'grid', gridTemplateColumns: '24px minmax(0, 1fr) 24px', gap: 8, alignItems: block.type === 'DIVIDER' ? 'center' : 'start', minHeight: 32 }}>
                    <span style={{ color: 'var(--t3)', fontSize: 12, paddingTop: block.type === 'HEADING' ? 7 : 10, textAlign: 'center' }}>
                      {block.type === 'TEXT' && 'T'}
                      {block.type === 'HEADING' && 'H2'}
                      {block.type === 'CHECKLIST' && '☑'}
                      {block.type === 'DIVIDER' && '—'}
                      {block.type === 'CODE' && '</>'}
                      {block.type === 'TABLE' && '▦'}
                    </span>

                    {block.type === 'TEXT' && (
                      <textarea
                        value={block.content}
                        onChange={event => updateTaskBlock(block.id, { content: event.target.value })}
                        placeholder="Escreva uma anotação..."
                        rows={2}
                        style={{ width: '100%', resize: 'vertical', minHeight: 48, background: 'transparent', border: 0, color: 'var(--tx)', padding: '8px 0', fontSize: 14, lineHeight: 1.5, outline: 'none' }}
                      />
                    )}

                    {block.type === 'HEADING' && (
                      <input
                        value={block.content}
                        onChange={event => updateTaskBlock(block.id, { content: event.target.value })}
                        placeholder="Título da seção"
                        style={{ width: '100%', background: 'transparent', border: 0, color: 'var(--tx)', padding: '8px 0', fontSize: 19, fontWeight: 800, outline: 'none' }}
                      />
                    )}

                    {block.type === 'CHECKLIST' && (
                      <label style={{ display: 'grid', gridTemplateColumns: '18px 1fr', gap: 8, alignItems: 'center', padding: '7px 0' }}>
                        <input
                          type="checkbox"
                          checked={Boolean(block.checked)}
                          onChange={event => updateTaskBlock(block.id, { checked: event.target.checked })}
                        />
                        <input
                          value={block.content}
                          onChange={event => updateTaskBlock(block.id, { content: event.target.value })}
                          placeholder="Item do checklist"
                          style={{ width: '100%', background: 'transparent', border: 0, color: 'var(--tx)', fontSize: 14, outline: 'none', textDecoration: block.checked ? 'line-through' : 'none' }}
                        />
                      </label>
                    )}

                    {block.type === 'DIVIDER' && (
                      <div style={{ height: 1, background: 'var(--bd)', margin: '14px 0' }} />
                    )}

                    {block.type === 'CODE' && (
                      <textarea
                        value={block.content}
                        onChange={event => updateTaskBlock(block.id, { content: event.target.value })}
                        placeholder="Cole comandos, queries ou trechos técnicos..."
                        rows={4}
                        style={{ width: '100%', resize: 'vertical', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--tx)', padding: 12, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12, lineHeight: 1.55, outline: 'none' }}
                      />
                    )}

                    {block.type === 'TABLE' && (
                      <div style={{ overflow: 'hidden', border: '1px solid var(--bd)', borderRadius: 8 }}>
                        {(block.cells ?? []).map((row, rowIndex) => (
                          <div key={`${block.id}-${rowIndex}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: rowIndex === 0 ? 0 : '1px solid var(--bd)' }}>
                            {row.map((cell, cellIndex) => (
                              <input
                                key={`${block.id}-${rowIndex}-${cellIndex}`}
                                value={cell}
                                onChange={event => updateTableCell(block.id, rowIndex, cellIndex, event.target.value)}
                                placeholder={rowIndex === 0 ? 'Propriedade' : 'Valor'}
                                style={{ minWidth: 0, background: rowIndex === 0 ? 'rgba(255,255,255,.03)' : 'transparent', border: 0, borderLeft: cellIndex === 0 ? 0 : '1px solid var(--bd)', color: 'var(--tx)', padding: '10px 12px', fontSize: 12, fontWeight: rowIndex === 0 ? 700 : 500, outline: 'none' }}
                              />
                            ))}
                          </div>
                        ))}
                        <button type="button" onClick={() => addTableRow(block.id)} style={{ width: '100%', textAlign: 'left', background: 'transparent', border: 0, borderTop: '1px solid var(--bd)', color: 'var(--t2)', padding: '10px 12px', fontSize: 12 }}>
                          + Nova linha
                        </button>
                      </div>
                    )}

                    <button
                      type="button"
                      aria-label="Remover bloco"
                      onClick={() => removeTaskBlock(block.id)}
                      style={{ background: 'transparent', border: 0, color: 'var(--t3)', fontSize: 16, height: 28, cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </div>
                ))}

                {!selectedTask.noteBlocks.length && (
                  <div style={{ color: 'var(--t3)', fontSize: 13, padding: '8px 0' }}>Adicione um bloco para começar.</div>
                )}

                <div style={{ position: 'relative', marginTop: 4 }}>
                  <button
                    type="button"
                    onClick={() => setIsBlockMenuOpen(current => !current)}
                    style={{ background: 'transparent', border: 0, color: 'var(--t2)', fontSize: 13, padding: '8px 0', cursor: 'pointer' }}
                  >
                    + Adicionar bloco
                  </button>

                  {isBlockMenuOpen && (
                    <div style={{ position: 'absolute', left: 0, bottom: 36, zIndex: 30, width: 'min(360px, calc(100vw - 72px))', maxHeight: 330, overflow: 'auto', background: 'var(--s1)', border: '1px solid var(--bd)', borderRadius: 12, boxShadow: '0 22px 60px rgba(0,0,0,.4)', padding: 8 }}>
                      <div style={{ color: 'var(--t2)', fontSize: 13, fontWeight: 800, padding: '8px 10px 10px' }}>Sugestões</div>
                      <input
                        value={blockSearch}
                        onChange={event => setBlockSearch(event.target.value)}
                        placeholder="/Digite para pesquisar"
                        autoFocus
                        style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--tx)', padding: '9px 10px', fontSize: 13, outline: 'none', marginBottom: 8 }}
                      />
                      {filteredBlockOptions.map(option => (
                        <button
                          key={option.type}
                          type="button"
                          onClick={() => addTaskBlock(option.type)}
                          style={{ width: '100%', display: 'grid', gridTemplateColumns: '36px 1fr', gap: 10, alignItems: 'center', textAlign: 'left', background: 'transparent', border: 0, borderRadius: 8, color: 'var(--tx)', padding: 10, cursor: 'pointer' }}
                        >
                          <span style={{ color: 'var(--t2)', fontSize: 14, fontWeight: 800, textAlign: 'center' }}>{option.icon}</span>
                          <span>
                            <span style={{ display: 'block', fontSize: 14, fontWeight: 750 }}>{option.label}</span>
                            <span style={{ display: 'block', color: 'var(--t3)', fontSize: 11, marginTop: 2 }}>{option.hint}</span>
                          </span>
                        </button>
                      ))}
                      {!filteredBlockOptions.length && (
                        <div style={{ color: 'var(--t3)', fontSize: 12, padding: '10px' }}>Nenhum bloco encontrado.</div>
                      )}
                    </div>
                  )}
                </div>
              </div>

            </section>

            <aside style={{ display: 'grid', gap: 10, alignContent: 'start', borderTop: '1px solid var(--bd)', paddingTop: 14 }}>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
                  <h3 style={{ fontSize: 13, color: 'var(--t2)' }}>Links</h3>
                  <button
                    type="button"
                    onClick={() => setIsLinkFormOpen(current => !current)}
                    style={{ background: 'transparent', border: 0, color: 'var(--gr)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                  >
                    {isLinkFormOpen ? 'Cancelar' : '+ Adicionar link'}
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedTask.links.map(link => (
                    <div key={link.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center', maxWidth: 260, background: 'rgba(255,255,255,.035)', border: '1px solid var(--bd)', borderRadius: 8, padding: '8px 10px' }}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" style={{ minWidth: 0, color: 'inherit', textDecoration: 'none' }}>
                        <span style={{ display: 'block', fontSize: 12, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.title}</span>
                        <span style={{ display: 'block', color: 'var(--t3)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{link.url}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => removeTaskLink(link.id)}
                        style={{ background: 'transparent', border: 0, color: 'var(--rd)', fontSize: 16, width: 24, height: 24 }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  {!selectedTask.links.length && <div style={{ color: 'var(--t3)', fontSize: 12 }}>Nenhum link salvo.</div>}
                </div>
              </div>

              {isLinkFormOpen && (
              <form onSubmit={addTaskLink} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, .8fr) minmax(0, 1fr) auto', gap: 8, alignItems: 'end' }}>
                <div>
                  <FieldLabel>Nome</FieldLabel>
                  <input
                    value={linkTitle}
                    onChange={event => setLinkTitle(event.target.value)}
                    placeholder="Ex: briefing, documento, referência"
                    style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--tx)', padding: '10px 12px', fontSize: 12, outline: 'none' }}
                  />
                </div>
                <div>
                  <FieldLabel>URL</FieldLabel>
                  <input
                    value={linkUrl}
                    onChange={event => setLinkUrl(event.target.value)}
                    placeholder="https://..."
                    style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--tx)', padding: '10px 12px', fontSize: 12, outline: 'none' }}
                  />
                </div>
                <Button type="submit" variant="primary" style={{ fontSize: 12, height: 37 }}>Salvar</Button>
              </form>
              )}
            </aside>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false)
          resetForm()
        }}
        title={editingId ? 'Editar tarefa' : 'Nova tarefa'}
      >
        <form onSubmit={submitTask}>
          <div style={{ marginBottom: 12 }}>
            <FieldLabel>Tarefa</FieldLabel>
            <input
              value={form.title}
              onChange={e => setForm(current => ({ ...current, title: e.target.value }))}
              placeholder="Ex: finalizar proposta"
              autoFocus
              style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--tx)', padding: '10px 12px', fontSize: 13, outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <FieldLabel>Notas</FieldLabel>
            <textarea
              value={form.notes}
              onChange={e => setForm(current => ({ ...current, notes: e.target.value }))}
              placeholder="Contexto, próximo passo ou critério de pronto"
              rows={3}
              style={{ width: '100%', resize: 'vertical', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--tx)', padding: '10px 12px', fontSize: 13, outline: 'none', lineHeight: 1.45 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
            <div>
              <FieldLabel>Categoria</FieldLabel>
              <select value={form.category} onChange={e => setForm(current => ({ ...current, category: e.target.value }))} style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--tx)', padding: '10px 12px', fontSize: 13, outline: 'none' }}>
                {['Pessoal', 'Trabalho', 'Admin', 'Saúde', 'Estudo'].map(category => <option key={category}>{category}</option>)}
              </select>
            </div>
            <div>
              <FieldLabel>Prioridade</FieldLabel>
              <select value={form.priority} onChange={e => setForm(current => ({ ...current, priority: e.target.value as TaskPriority }))} style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--tx)', padding: '10px 12px', fontSize: 13, outline: 'none' }}>
                {(['HIGH', 'MEDIUM', 'LOW'] as TaskPriority[]).map(priority => <option key={priority} value={priority}>{priorityLabel[priority]}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div>
              <FieldLabel>Início</FieldLabel>
              <input type="time" value={form.start} onChange={e => setForm(current => ({ ...current, start: e.target.value }))} style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--tx)', padding: '10px 12px', fontSize: 13, outline: 'none' }} />
            </div>
            <div>
              <FieldLabel>Duração</FieldLabel>
              <input type="number" min={10} step={5} value={form.duration} onChange={e => setForm(current => ({ ...current, duration: Number(e.target.value) }))} style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--tx)', padding: '10px 12px', fontSize: 13, outline: 'none' }} />
            </div>
            <div>
              <FieldLabel>Energia</FieldLabel>
              <select value={form.energy} onChange={e => setForm(current => ({ ...current, energy: e.target.value as Energy }))} style={{ width: '100%', background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--tx)', padding: '10px 12px', fontSize: 13, outline: 'none' }}>
                {(['HIGH', 'MEDIUM', 'LOW'] as Energy[]).map(energy => <option key={energy} value={energy}>{energyLabel[energy]}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="button" variant="secondary" onClick={() => {
              setIsTaskModalOpen(false)
              resetForm()
            }} style={{ flex: 1 }}>
              Cancelar
            </Button>
            <Button type="submit" variant="primary" style={{ flex: 1 }}>
              {editingId ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
