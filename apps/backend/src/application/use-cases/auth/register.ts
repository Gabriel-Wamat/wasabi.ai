import bcrypt from 'bcryptjs'
import { uuidv7 } from 'uuidv7'
import { IUserRepository } from '../../../application/ports/outbound/user.repository'
import { AppError } from '../../../shared/errors/app-error'

interface Input {
  name:     string
  email:    string
  password: string
}

export class RegisterUseCase {
  constructor(private readonly users: IUserRepository) {}

  async execute({ name, email, password }: Input) {
    const existing = await this.users.findByEmail(email)
    if (existing) throw AppError.conflict('Email já cadastrado')

    const passwordHash = await bcrypt.hash(password, 12)
    const user = await this.users.create({ name, email, passwordHash })
    return user.toPublic()
  }
}
