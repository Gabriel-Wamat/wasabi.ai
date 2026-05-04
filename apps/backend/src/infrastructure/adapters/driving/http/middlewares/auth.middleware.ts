import { FastifyRequest, FastifyReply } from 'fastify'
import { AppError } from '../../../../../shared/errors/app-error'

export async function authMiddleware(req: FastifyRequest, _reply: FastifyReply) {
  try {
    await req.jwtVerify()
  } catch {
    throw AppError.unauthorized()
  }
}

export function getUserId(req: FastifyRequest): string {
  return (req.user as any).sub
}
