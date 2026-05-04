import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import multipart from '@fastify/multipart'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'

import { buildContainer } from './infrastructure/container/index'
import { errorHandler } from './infrastructure/adapters/driving/http/middlewares/error-handler'
import { authRoutes } from './infrastructure/adapters/driving/http/routes/auth.routes'
import { documentRoutes } from './infrastructure/adapters/driving/http/routes/document.routes'
import { projectRoutes } from './infrastructure/adapters/driving/http/routes/project.routes'
import { transactionRoutes } from './infrastructure/adapters/driving/http/routes/transaction.routes'
import { financialRoutes } from './infrastructure/adapters/driving/http/routes/financial.routes'
import { dashboardRoutes } from './infrastructure/adapters/driving/http/routes/dashboard.routes'
import { categoryRoutes } from './infrastructure/adapters/driving/http/routes/category.routes'
import { userRoutes } from './infrastructure/adapters/driving/http/routes/user.routes'
import { calendarRoutes } from './infrastructure/adapters/driving/http/routes/calendar.routes'

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  },
})

async function bootstrap() {
  const container = buildContainer()
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is required')
  }

  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, { origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000', credentials: true })
  await app.register(rateLimit, { max: 100, timeWindow: '1 minute' })
  await app.register(jwt, { secret: jwtSecret })
  await app.register(multipart, { limits: { fileSize: 10 * 1024 * 1024 } })

  app.setErrorHandler(errorHandler)

  app.get('/health', async () => ({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  }))

  await app.register(authRoutes,        { prefix: '/api/auth',         container } as any)
  await app.register(userRoutes,        { prefix: '/api/user',         container } as any)
  await app.register(documentRoutes,    { prefix: '/api/documents',    container } as any)
  await app.register(projectRoutes,     { prefix: '/api/projects',     container } as any)
  await app.register(transactionRoutes, { prefix: '/api/transactions', container } as any)
  await app.register(financialRoutes,   { prefix: '/api/financial',    container } as any)
  await app.register(dashboardRoutes,   { prefix: '/api/dashboard',    container } as any)
  await app.register(categoryRoutes,    { prefix: '/api',              container } as any)
  await app.register(calendarRoutes,    { prefix: '/api/calendar',     container } as any)

  const port = Number(process.env.PORT ?? 3001)
  await app.listen({ port, host: '0.0.0.0' })
  console.log(`\n🚀 Backend rodando em http://localhost:${port}\n`)

  const shutdown = async () => {
    await app.close()
    await container.redis.disconnect()
    await container.prisma.$disconnect()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

bootstrap().catch(err => {
  console.error(err)
  process.exit(1)
})
