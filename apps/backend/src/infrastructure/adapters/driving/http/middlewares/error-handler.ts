import { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { AppError } from '../../../../../shared/errors/app-error'
import { ZodError } from 'zod'

export function errorHandler(error: FastifyError, _req: FastifyRequest, reply: FastifyReply) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: { code: error.code, message: error.message, details: error.details },
    })
  }
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: { code: 'VALIDATION_ERROR', message: 'Dados inválidos', details: error.flatten() },
    })
  }
  console.error('[ERROR]', error)
  return reply.status(500).send({
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
  })
}
