import { AppError } from '../../../shared/errors/app-error'
import { ProjectStatus, Priority } from '@prisma/client'

interface UpdateProjectInput {
  id: string
  userId: string
  title?: string
  description?: string
  status?: ProjectStatus
  priority?: Priority
  progress?: number
  tags?: string[]
  color?: string
  startDate?: Date
  endDate?: Date
}

export class UpdateProjectUseCase {
  constructor(
    private readonly projectRepo: any
  ) {}

  async execute(input: UpdateProjectInput) {
    const project = await this.projectRepo.findById(input.id, input.userId)
    if (!project) {
      throw AppError.notFound('Projeto')
    }

    const updates: any = {}
    if (input.title !== undefined) updates.title = input.title
    if (input.description !== undefined) updates.description = input.description
    if (input.status !== undefined) updates.status = input.status
    if (input.priority !== undefined) updates.priority = input.priority
    if (input.progress !== undefined) {
      if (input.progress < 0 || input.progress > 100) {
        throw AppError.validation('Progresso deve estar entre 0 e 100')
      }
      updates.progress = input.progress
    }
    if (input.tags !== undefined) updates.tags = input.tags
    if (input.color !== undefined) updates.color = input.color
    if (input.startDate !== undefined) updates.startDate = input.startDate
    if (input.endDate !== undefined) updates.endDate = input.endDate

    return await this.projectRepo.update(input.id, input.userId, updates)
  }
}
