import { describe, it, expect } from 'vitest'
import { AppError } from './app-error'

describe('AppError', () => {
  it('notFound creates 404 error', () => {
    const e = AppError.notFound('Documento')
    expect(e.statusCode).toBe(404)
    expect(e.code).toBe('NOT_FOUND')
    expect(e.message).toContain('Documento')
  })

  it('unauthorized creates 401 error', () => {
    const e = AppError.unauthorized()
    expect(e.statusCode).toBe(401)
    expect(e.code).toBe('UNAUTHORIZED')
  })

  it('conflict creates 409 error', () => {
    const e = AppError.conflict('Email já existe')
    expect(e.statusCode).toBe(409)
    expect(e.code).toBe('CONFLICT')
  })

  it('validation creates 400 error with details', () => {
    const e = AppError.validation('Dados inválidos', { field: 'email' })
    expect(e.statusCode).toBe(400)
    expect(e.code).toBe('VALIDATION_ERROR')
    expect(e.details).toEqual({ field: 'email' })
  })

  it('is instance of Error', () => {
    const e = AppError.notFound('Test')
    expect(e).toBeInstanceOf(Error)
    expect(e).toBeInstanceOf(AppError)
  })
})
