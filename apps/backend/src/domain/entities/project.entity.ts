export type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED'
export type Priority      = 'LOW' | 'MEDIUM' | 'HIGH'

export interface ProjectProps {
  id:          string
  userId:      string
  title:       string
  description: string | null
  status:      ProjectStatus
  priority:    Priority
  progress:    number
  tags:        string[]
  links:       Array<{ label: string; url: string }>
  color:       string
  startDate:   Date | null
  endDate:     Date | null
  createdAt:   Date
  updatedAt:   Date
}

export class Project {
  constructor(private readonly props: ProjectProps) {}

  get id()       { return this.props.id }
  get userId()   { return this.props.userId }
  get status()   { return this.props.status }
  get progress() { return this.props.progress }
  get title()    { return this.props.title }

  isActive()    { return this.props.status === 'ACTIVE' }
  isCompleted() { return this.props.status === 'COMPLETED' }

  updateProgress(value: number): Project {
    if (value < 0 || value > 100) throw new Error('Progress must be 0-100')
    const newStatus: ProjectStatus = value === 100 ? 'COMPLETED' : this.props.status
    return new Project({ ...this.props, progress: value, status: newStatus, updatedAt: new Date() })
  }

  toJSON() { return { ...this.props } }
}
