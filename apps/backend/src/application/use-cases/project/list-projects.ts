import { IProjectRepository, ProjectFilters } from '../../../application/ports/outbound/project.repository'

export class ListProjectsUseCase {
  constructor(private readonly projects: IProjectRepository) {}

  async execute(userId: string, filters: Partial<ProjectFilters> = {}) {
    const result = await this.projects.findMany(userId, {
      ...filters,
      page:  filters.page  ?? 1,
      limit: filters.limit ?? 20,
    })
    return { ...result, data: result.data.map(p => p.toJSON()) }
  }
}
