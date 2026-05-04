import { PrismaClient } from '@prisma/client'
import { uuidv7 } from 'uuidv7'
import { IUserRepository } from '../../../../../application/ports/outbound/user.repository'
import { User } from '../../../../../domain/entities/user.entity'

function toDomain(row: any): User {
  return new User({
    id: row.id, name: row.name, email: row.email,
    passwordHash: row.passwordHash, avatar: row.avatar,
    timezone: row.timezone, plan: row.plan,
    createdAt: row.createdAt, updatedAt: row.updatedAt,
  })
}

export class PrismaUserRepository implements IUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { id } })
    return row ? toDomain(row) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const row = await this.prisma.user.findUnique({ where: { email } })
    return row ? toDomain(row) : null
  }

  async create(data: { name: string; email: string; passwordHash: string }): Promise<User> {
    const row = await this.prisma.user.create({ data: { id: uuidv7(), ...data } })
    return toDomain(row)
  }

  async update(id: string, data: Partial<{ name: string; avatar: string; timezone: string; passwordHash: string }>): Promise<User> {
    const row = await this.prisma.user.update({ where: { id }, data: { ...data, updatedAt: new Date() } })
    return toDomain(row)
  }
}
