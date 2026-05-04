import { AppError } from '../../../shared/errors/app-error'
import bcrypt from 'bcryptjs'

interface ChangePasswordInput {
  userId: string
  currentPassword: string
  newPassword: string
}

export class ChangePasswordUseCase {
  constructor(
    private readonly userRepo: any
  ) {}

  async execute(input: ChangePasswordInput): Promise<void> {
    const user = await this.userRepo.findById(input.userId)
    if (!user) {
      throw AppError.notFound('Usuário')
    }

    const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash)
    if (!isValid) {
      throw AppError.validation('Senha atual incorreta')
    }

    if (input.newPassword.length < 8) {
      throw AppError.validation('Nova senha deve ter no mínimo 8 caracteres')
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 12)
    await this.userRepo.update(input.userId, { passwordHash })
  }
}
