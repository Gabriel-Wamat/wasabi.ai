export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'RATE_LIMITED'

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }

  static notFound(resource: string) {
    return new AppError('NOT_FOUND', `${resource} não encontrado`, 404)
  }

  static unauthorized(msg = 'Não autorizado') {
    return new AppError('UNAUTHORIZED', msg, 401)
  }

  static forbidden(msg = 'Acesso negado') {
    return new AppError('FORBIDDEN', msg, 403)
  }

  static conflict(msg: string) {
    return new AppError('CONFLICT', msg, 409)
  }

  static validation(msg: string, details?: unknown) {
    return new AppError('VALIDATION_ERROR', msg, 400, details)
  }
}
