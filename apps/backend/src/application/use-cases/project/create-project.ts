import { uuidv7 } from 'uuidv7'
import { IProjectRepository } from '../../../application/ports/outbound/project.repository'
import { Priority, ProjectStatus } from '../../../domain/entities/project.entity'

interface Input {
  userId:       string
  title:        string
  description?: string
  status?:      ProjectStatus
  priority?:    Priority
  tags?:        string[]
  color?:       string
  startDate?:   Date
  endDate?:     Date
}

export class CreateProjectUseCase {
  constructor(private readonly projects: IProjectRepository) {}

  async execute(input: Input) {
    const project = await this.projects.create({
      id:          uuidv7(),
      userId:      input.userId,
      title:       input.title,
      description: input.description ?? null,
      status:      input.status   ?? 'ACTIVE',
      priority:    input.priority ?? 'MEDIUM',
      progress:    0,
      tags:        input.tags  ?? [],
      links:       [],
      color:       input.color ?? '#11C76F',
      startDate:   input.startDate ?? null,
      endDate:     input.endDate   ?? null,
      createdAt:   new Date(),
      updatedAt:   new Date(),
    })
    return project.toJSON()
  }
}
