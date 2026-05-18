import { PrismaClient, Prisma } from '@prisma/client'
import { IProjectRepository, ProjectFilters } from '../../../../../application/ports/outbound/project.repository'
import { Project, ProjectProps } from '../../../../../domain/entities/project.entity'
import { PaginatedResult, paginationToSkipTake } from '../../../../../shared/pagination/paginate'
import { parseJsonArray, parseJsonAny, serializeJson } from '../../../../../shared/json-fields'

function toDomain(row: any): Project {
  return new Project({
    id:          row.id,
    userId:      row.userId,
    title:       row.title,
    description: row.description,
    status:      row.status,
    priority:    row.priority,
    progress:    row.progress,
    tags:        parseJsonArray(row.tags),
    links:       parseJsonAny(row.links, []),
    color:       row.color,
    startDate:   row.startDate,
    endDate:     row.endDate,
    createdAt:   row.createdAt,
    updatedAt:   row.updatedAt,
  })
}

export class PrismaProjectRepository implements IProjectRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string, userId: string): Promise<Project | null> {
    const row = await this.prisma.project.findFirst({ where: { id, userId } })
    return row ? toDomain(row) : null
  }

  async findMany(userId: string, filters: ProjectFilters): Promise<PaginatedResult<Project>> {
    const where: Prisma.ProjectWhereInput = { userId }
    if (filters.status)   where.status   = filters.status
    if (filters.priority) where.priority = filters.priority
    if (filters.search)   where.title    = { contains: filters.search }
    if (filters.tags?.length) {
      where.AND = filters.tags.map(tag => ({ tags: { contains: `"${tag}"` } }))
    }

    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        ...paginationToSkipTake({ page: filters.page, limit: filters.limit }),
      }),
      this.prisma.project.count({ where }),
    ])
    const totalPages = Math.ceil(total / filters.limit)
    return {
      data: rows.map(toDomain),
      meta: { total, page: filters.page, limit: filters.limit, totalPages, hasNext: filters.page < totalPages, hasPrev: filters.page > 1 },
    }
  }

  async create(data: ProjectProps): Promise<Project> {
    const row = await this.prisma.project.create({
      data: {
        id: data.id, userId: data.userId, title: data.title,
        description: data.description, status: data.status,
        priority: data.priority, progress: data.progress,
        tags:  serializeJson(data.tags  ?? []),
        links: serializeJson(data.links ?? []),
        color: data.color, startDate: data.startDate, endDate: data.endDate,
      },
    })
    return toDomain(row)
  }

  async update(id: string, userId: string, data: Partial<Omit<ProjectProps, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<Project> {
    const { tags, links, ...scalarData } = data
    const updateData: Prisma.ProjectUpdateManyMutationInput = {
      ...scalarData,
      ...(tags  !== undefined ? { tags:  serializeJson(tags) }  : {}),
      ...(links !== undefined ? { links: serializeJson(links) } : {}),
      updatedAt: new Date(),
    }
    const result = await this.prisma.project.updateMany({
      where: { id, userId },
      data:  updateData,
    })
    if (result.count === 0) throw new Error('Project not found')
    const row = await this.prisma.project.findFirstOrThrow({ where: { id, userId } })
    return toDomain(row)
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.prisma.project.deleteMany({ where: { id, userId } })
  }

  async countActive(userId: string): Promise<number> {
    return this.prisma.project.count({ where: { userId, status: 'ACTIVE' } })
  }
}
