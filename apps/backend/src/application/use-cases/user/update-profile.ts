import { User } from '../../../domain/entities/user.entity'
import { AppError } from '../../../shared/errors/app-error'

interface UpdateProfileInput {
  userId: string
  name?: string
  timezone?: string
  avatar?: string
}

export class UpdateProfileUseCase {
  constructor(
    private readonly userRepo: any
  ) {}

  async execute(input: UpdateProfileInput): Promise<User> {
    const user = await this.userRepo.findById(input.userId)
    if (!user) {
      throw AppError.notFound('Usuário')
    }

    const updates: any = {}
    if (input.name !== undefined) updates.name = input.name
    if (input.timezone !== undefined) updates.timezone = input.timezone
    if (input.avatar !== undefined) updates.avatar = input.avatar

    return await this.userRepo.update(input.userId, updates)
  }
}
