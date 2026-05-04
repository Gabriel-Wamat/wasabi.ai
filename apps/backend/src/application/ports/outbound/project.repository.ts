import { Project, ProjectProps } from '../../../domain/entities/project.entity'
import { PaginatedResult } from '../../../shared/pagination/paginate'

export interface ProjectFilters {
  status?:   'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  tags?:     string[]
  search?:   string
  page:      number
  limit:     number
}

export interface IProjectRepository {
  findById(id: string, userId: string): Promise<Project | null>
  findMany(userId: string, filters: ProjectFilters): Promise<PaginatedResult<Project>>
  create(data: ProjectProps): Promise<Project>
  update(id: string, userId: string, data: Partial<Omit<ProjectProps, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<Project>
  delete(id: string, userId: string): Promise<void>
  countActive(userId: string): Promise<number>
}
