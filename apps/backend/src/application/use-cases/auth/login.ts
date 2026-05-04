import bcrypt from 'bcryptjs'
import { IUserRepository } from '../../../application/ports/outbound/user.repository'
import { AppError } from '../../../shared/errors/app-error'

interface Input {
  email:    string
  password: string
}

export class LoginUseCase {
  constructor(private readonly users: IUserRepository) {}

  async execute({ email, password }: Input) {
    const user = await this.users.findByEmail(email)
    if (!user) throw AppError.unauthorized('Credenciais inválidas')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) throw AppError.unauthorized('Credenciais inválidas')

    return user.toPublic()
  }
}
