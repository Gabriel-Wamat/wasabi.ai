import { IProjectRepository } from '../../../application/ports/outbound/project.repository'
import { AppError } from '../../../shared/errors/app-error'

export class UpdateProjectProgressUseCase {
  constructor(private readonly projects: IProjectRepository) {}

  async execute(id: string, userId: string, progress: number) {
    const project = await this.projects.findById(id, userId)
    if (!project) throw AppError.notFound('Projeto')
    const updated = project.updateProgress(progress)
    const saved   = await this.projects.update(id, userId, { progress: updated.progress, status: updated.status })
    return saved.toJSON()
  }
}
