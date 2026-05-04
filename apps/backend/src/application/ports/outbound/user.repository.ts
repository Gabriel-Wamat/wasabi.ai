import { User } from '../../../domain/entities/user.entity'

export interface IUserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(data: Pick<ReturnType<User['toPublic']>, 'name' | 'email'> & { passwordHash: string }): Promise<User>
  update(id: string, data: Partial<Pick<ReturnType<User['toPublic']>, 'name' | 'avatar' | 'timezone'>>): Promise<User>
}
