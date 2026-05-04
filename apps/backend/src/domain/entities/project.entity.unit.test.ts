import { describe, it, expect } from 'vitest'
import { Project } from './project.entity'

const base = {
  id: 'p1', userId: 'u1', title: 'Test', description: null,
  status: 'ACTIVE' as const, priority: 'MEDIUM' as const,
  progress: 0, tags: [], links: [], color: '#11C76F',
  startDate: null, endDate: null, createdAt: new Date(), updatedAt: new Date(),
}

describe('Project entity', () => {
  it('isActive returns true for ACTIVE projects', () => {
    const p = new Project(base)
    expect(p.isActive()).toBe(true)
    expect(p.isCompleted()).toBe(false)
  })

  it('updateProgress to 100 sets status to COMPLETED', () => {
    const p = new Project(base)
    const updated = p.updateProgress(100)
    expect(updated.progress).toBe(100)
    expect(updated.status).toBe('COMPLETED')
    expect(updated.isCompleted()).toBe(true)
  })

  it('updateProgress clamps between 0-100', () => {
    const p = new Project(base)
    expect(() => p.updateProgress(101)).toThrow()
    expect(() => p.updateProgress(-1)).toThrow()
  })

  it('updateProgress between 0-99 keeps original status', () => {
    const p = new Project({ ...base, status: 'ACTIVE' })
    const updated = p.updateProgress(50)
    expect(updated.status).toBe('ACTIVE')
    expect(updated.progress).toBe(50)
  })
})
