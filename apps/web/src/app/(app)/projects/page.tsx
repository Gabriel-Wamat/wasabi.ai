'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api/client'
import { Project, PaginatedResponse, ProjectStatus } from '@/types'
import { Header } from '@/components/layout/Header'
import { Button } from '@/components/ui/Button'
import { statusBadge } from '@/components/ui/Badge'
import { CreateProjectModal } from '@/components/projects/CreateProjectModal'
import { EditProjectModal } from '@/components/projects/EditProjectModal'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/components/ui/Toast'
import { FilterBar, Filter, SearchFilter } from '@/components/ui/Filters'

export default function ProjectsPage() {
  const { showToast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')

  useEffect(() => { loadProjects() }, [])
  useEffect(() => { applyFilters() }, [searchTerm, statusFilter, priorityFilter, allProjects])

  const loadProjects = () => {
    setLoading(true)
    api.get<PaginatedResponse<Project>>('/projects?limit=100')
      .then(r => setAllProjects(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  const applyFilters = () => {
    let filtered = [...allProjects]
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }
    if (statusFilter !== 'ALL') filtered = filtered.filter(p => p.status === statusFilter)
    if (priorityFilter !== 'ALL') filtered = filtered.filter(p => p.priority === priorityFilter)
    setProjects(filtered)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('ALL')
    setPriorityFilter('ALL')
  }

  const hasActiveFilters = searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL'

  const handleEdit = (project: Project) => { setSelectedProject(project); setIsEditModalOpen(true) }
  const handleDeleteClick = (project: Project) => { setSelectedProject(project); setIsDeleteDialogOpen(true) }

  const handleDeleteConfirm = async () => {
    if (!selectedProject) return
    try {
      await api.delete(`/projects/${selectedProject.id}`)
      showToast('Projeto excluído com sucesso!', 'success')
      loadProjects()
    } catch (err: any) {
      showToast(err.message ?? 'Erro ao excluir projeto', 'error')
    }
  }

  const priorityBadge = (priority: string) => {
    const map: Record<string, string> = { LOW: 'blue', MEDIUM: 'yellow', HIGH: 'red' }
    const labels: Record<string, string> = { LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta' }
    return <span className={`badge ${map[priority] ?? 'gray'}`}><span className="dot"/>{labels[priority] ?? priority}</span>
  }

  return (
    <div>
      <Header title="Projetos" />
      <div className="page-pad">
        <FilterBar onClear={hasActiveFilters ? clearFilters : undefined}>
          <SearchFilter placeholder="Buscar projetos..." value={searchTerm} onChange={setSearchTerm} />
          <Filter label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v as any)} options={[
            { value: 'ALL', label: 'Todos' },
            { value: 'ACTIVE', label: 'Ativos' },
            { value: 'PAUSED', label: 'Pausados' },
            { value: 'COMPLETED', label: 'Concluídos' },
            { value: 'ARCHIVED', label: 'Arquivados' },
          ]} />
          <Filter label="Prioridade" value={priorityFilter} onChange={setPriorityFilter} options={[
            { value: 'ALL', label: 'Todas' },
            { value: 'LOW', label: 'Baixa' },
            { value: 'MEDIUM', label: 'Média' },
            { value: 'HIGH', label: 'Alta' },
          ]} />
          <div className="filter-meta">{projects.length} projeto{projects.length !== 1 ? 's' : ''}</div>
          <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>+ Novo</Button>
        </FilterBar>

        {loading ? (
          <div className="muted" style={{ padding: 20 }}>Carregando...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {projects.map(p => (
              <div key={p.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="row between">
                  {statusBadge(p.status)}
                  {priorityBadge(p.priority)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{p.title}</div>
                  <div className="dim" style={{ fontSize: 12, lineHeight: 1.5 }}>{p.description}</div>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${p.progress}%`, background: p.color }} />
                </div>
                <div className="row between" style={{ fontSize: 12 }}>
                  <span className="dim">Progresso</span>
                  <span style={{ color: p.color, fontWeight: 700 }}>{p.progress}%</span>
                </div>
                {p.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {p.tags.map(t => <span key={t} className="tag">{t}</span>)}
                  </div>
                )}
                <div className="row" style={{ marginTop: 'auto', gap: 6 }}>
                  <button onClick={() => handleEdit(p)} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>Editar</button>
                  <button onClick={() => handleDeleteClick(p)} className="btn btn-danger btn-sm" style={{ flex: 1 }}>Excluir</button>
                </div>
              </div>
            ))}
            {!projects.length && (
              <div className="card dim" style={{ gridColumn: '1/-1', textAlign: 'center', padding: 40 }}>
                {hasActiveFilters ? 'Nenhum projeto encontrado com os filtros aplicados' : 'Nenhum projeto cadastrado'}
              </div>
            )}
          </div>
        )}
      </div>

      <CreateProjectModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSuccess={loadProjects} />
      {selectedProject && (
        <EditProjectModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} onSuccess={loadProjects} project={selectedProject} />
      )}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Excluir Projeto"
        message="Tem certeza que deseja excluir este projeto? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        danger={true}
      />
    </div>
  )
}
