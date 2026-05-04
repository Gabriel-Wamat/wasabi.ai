import { User } from '../../../domain/entities/user.entity'
import { AppError } from '../../../shared/errors/app-error'

interface GetProfileInput {
  userId: string
}

export class GetProfileUseCase {
  constructor(
    private readonly userRepo: any
  ) {}

  async execute(input: GetProfileInput): Promise<User> {
    const user = await this.userRepo.findById(input.userId)
    if (!user) {
      throw AppError.notFound('Usuário')
    }
    return user
  }
}
