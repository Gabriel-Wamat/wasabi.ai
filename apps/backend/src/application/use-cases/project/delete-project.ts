import { AppError } from '../../../shared/errors/app-error'

interface DeleteProjectInput {
  id: string
  userId: string
}

export class DeleteProjectUseCase {
  constructor(
    private readonly projectRepo: any
  ) {}

  async execute(input: DeleteProjectInput): Promise<void> {
    const project = await this.projectRepo.findById(input.id, input.userId)
    if (!project) {
      throw AppError.notFound('Projeto')
    }

    await this.projectRepo.delete(input.id, input.userId)
  }
}
