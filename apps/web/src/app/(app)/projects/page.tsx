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

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL')
  const [priorityFilter, setPriorityFilter] = useState('ALL')

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [searchTerm, statusFilter, priorityFilter, allProjects])

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

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(p => p.status === statusFilter)
    }

    if (priorityFilter !== 'ALL') {
      filtered = filtered.filter(p => p.priority === priorityFilter)
    }

    setProjects(filtered)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('ALL')
    setPriorityFilter('ALL')
  }

  const hasActiveFilters = searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL'

  const handleProgress = async (id: string, progress: number) => {
    const newProg = Math.min(100, Math.max(0, progress + 5))
    await api.patch(`/projects/${id}/progress`, { progress: newProg })
    setAllProjects(ps => ps.map(p => p.id === id ? { ...p, progress: newProg } : p))
  }

  const handleEdit = (project: Project) => {
    setSelectedProject(project)
    setIsEditModalOpen(true)
  }

  const handleDeleteClick = (project: Project) => {
    setSelectedProject(project)
    setIsDeleteDialogOpen(true)
  }

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

  return (
    <div>
      <Header title="Projetos" />
      <div style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Projetos</div>
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>+ Novo</Button>
        </div>

        <FilterBar onClear={hasActiveFilters ? clearFilters : undefined}>
          <SearchFilter
            placeholder="Buscar projetos..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
          <Filter
            label="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as any)}
            options={[
              { value: 'ALL', label: 'Todos' },
              { value: 'ACTIVE', label: 'Ativos' },
              { value: 'PAUSED', label: 'Pausados' },
              { value: 'COMPLETED', label: 'Concluídos' },
              { value: 'ARCHIVED', label: 'Arquivados' },
            ]}
          />
          <Filter
            label="Prioridade"
            value={priorityFilter}
            onChange={setPriorityFilter}
            options={[
              { value: 'ALL', label: 'Todas' },
              { value: 'LOW', label: 'Baixa' },
              { value: 'MEDIUM', label: 'Média' },
              { value: 'HIGH', label: 'Alta' },
            ]}
          />
        </FilterBar>

        <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 12 }}>
          {projects.length} {projects.length === 1 ? 'projeto' : 'projetos'} {hasActiveFilters && '(filtrados)'}
        </div>

        {loading ? (
          <div style={{ color: 'var(--t2)', padding: 20 }}>Carregando...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
            {projects.map(p => {
              const dotColor = p.status === 'ACTIVE' ? '#11C76F' : p.status === 'PAUSED' ? '#FFC107' : p.status === 'COMPLETED' ? '#4A90D9' : '#444'
              return (
                <div key={p.id} style={{ background: 'var(--s2)', border: '1px solid var(--bd)', borderRadius: 10, padding: 16, position: 'relative', transition: 'border-color .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gr)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--bd)')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    {statusBadge(p.status)}
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: dotColor }} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--t2)', marginBottom: 12, lineHeight: 1.5 }}>{p.description}</div>
                  <div style={{ height: 4, background: 'var(--s3)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', width: `${p.progress}%`, background: p.color, borderRadius: 2, transition: 'width .3s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 10 }}>
                    <span style={{ color: 'var(--t2)' }}>Progresso</span>
                    <span style={{ color: p.color, fontWeight: 600 }}>{p.progress}%</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                    {p.tags.map(t => (
                      <span key={t} style={{ fontSize: 10, background: 'var(--s3)', color: 'var(--t2)', padding: '2px 6px', borderRadius: 4 }}>{t}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button
                      onClick={() => handleEdit(p)}
                      style={{
                        flex: 1, background: 'var(--s3)', border: '1px solid var(--bd)',
                        borderRadius: 6, padding: '6px', color: 'var(--tx)',
                        fontSize: 11, cursor: 'pointer', fontWeight: 500,
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bd)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--s3)')}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteClick(p)}
                      style={{
                        flex: 1, background: 'rgba(244, 67, 54, 0.1)', border: '1px solid rgba(244, 67, 54, 0.3)',
                        borderRadius: 6, padding: '6px', color: 'var(--rd)',
                        fontSize: 11, cursor: 'pointer', fontWeight: 500,
                        transition: 'background 0.15s'
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244, 67, 54, 0.2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(244, 67, 54, 0.1)')}
                    >
                      Excluir
                    </button>
                  </div>
                </div>
              )
            })}
            {!projects.length && (
              <div style={{ color: 'var(--t3)', gridColumn: '1/-1', padding: 40, textAlign: 'center' }}>
                {hasActiveFilters ? 'Nenhum projeto encontrado com os filtros aplicados' : 'Nenhum projeto cadastrado'}
              </div>
            )}
          </div>
        )}
      </div>

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={loadProjects}
      />

      {selectedProject && (
        <EditProjectModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={loadProjects}
          project={selectedProject}
        />
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
