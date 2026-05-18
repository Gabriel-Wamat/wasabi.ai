import 'dotenv/config'
import { join, resolve } from 'node:path'
import { promises as fs } from 'node:fs'
import { createReadStream } from 'node:fs'
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
import { chatRoutes } from './infrastructure/adapters/driving/http/routes/chat.routes'
import { ensureLocalBootstrap } from './infrastructure/bootstrap/local'
import { getPaths } from './shared/paths'
import { randomBytes } from 'node:crypto'
import { env } from './shared/env'
import { startSlackDigestScheduler } from './infrastructure/services/slack-digest'

const app = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'warn' : 'info',
    transport: env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
    // Redação preventiva de credenciais e dados sensíveis em logs
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'res.headers["set-cookie"]',
        'response.headers["set-cookie"]',
        'req.body.password',
        'req.body.currentPassword',
        'req.body.newPassword',
        'req.body.apiKey',
      ],
      censor: '[REDACTED]'
    },
  },
})

async function bootstrap() {
  const paths = getPaths()

  /* JWT secret persistido em config (gerado na 1ª execução) */
  const configFile = paths.configFile
  let jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    let cfg: Record<string, string> = {}
    try { cfg = JSON.parse(await fs.readFile(configFile, 'utf-8')) } catch { cfg = {} }
    if (!cfg.jwtSecret) {
      cfg.jwtSecret = randomBytes(48).toString('hex')
      await fs.writeFile(configFile, JSON.stringify(cfg, null, 2))
    }
    jwtSecret = cfg.jwtSecret
  }

  const container = buildContainer()
  const slackDigestScheduler = startSlackDigestScheduler(container, {
    webhookUrl: env.SLACK_DIGEST_WEBHOOK_URL,
    enabled: env.SLACK_DIGEST_ENABLED ?? Boolean(env.SLACK_DIGEST_WEBHOOK_URL),
    timezone: env.SLACK_DIGEST_TIMEZONE,
  }, app.log as any)

  /* Bootstrap local: aplica schema, cria user e categorias defaults */
  const schemaPath = process.env.PRISMA_SCHEMA_PATH ?? resolve(__dirname, '../prisma/schema.prisma')
  const { defaultUserId } = await ensureLocalBootstrap(container.prisma, schemaPath)

  await app.register(helmet, { contentSecurityPolicy: false })
  const corsOrigins = env.CORS_ORIGIN
    ? env.CORS_ORIGIN.split(',').map(o => o.trim())
    : ['http://localhost:3000', 'http://localhost:3003']

  await app.register(cors, {
    origin: (origin, cb) => {
      if (!origin) return cb(null, true)
      if (origin === 'tauri://localhost' || origin === 'http://tauri.localhost') return cb(null, true)
      if (corsOrigins.includes(origin)) return cb(null, true)
      cb(new Error('Not allowed by CORS'), false)
    },
    credentials: true,
  })
  await app.register(rateLimit, { max: 600, timeWindow: '1 minute' })
  await app.register(jwt, { secret: jwtSecret })
  await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } })

  app.setErrorHandler(errorHandler)

  /* Health */
  app.get('/health', async () => ({
    status:    'ok',
    timestamp: new Date().toISOString(),
    uptime:    process.uptime(),
  }))

  /**
   * Local handshake — APENAS PARA AMBIENTE LOCAL/DESKTOP.
   *
   * Segurança: por padrão esta rota fica DESABILITADA. Para habilitar
   * explicitamente em desenvolvimento/desktop, defina
   *   ENABLE_LOCAL_HANDSHAKE=true
   * no ambiente do backend. Em produção esta rota NÃO deve estar ativa.
   */
  const enableLocalHandshake = String(process.env.ENABLE_LOCAL_HANDSHAKE || '').toLowerCase() === 'true'
  if (enableLocalHandshake) {
    app.get('/api/local/handshake', async (_req, reply) => {
      const token = app.jwt.sign(
        { sub: defaultUserId, mode: 'local' },
        { expiresIn: '180d' },
      )
      return reply.send({
        data: {
          accessToken:  token,
          refreshToken: token,
          userId:       defaultUserId,
        },
      })
    })
  }

  /* Servir arquivos locais com token HMAC */
  app.get('/api/files/*', async (req, reply) => {
    const params = req.params as { '*': string }
    const query  = req.query as { exp?: string; token?: string }
    const key    = decodeURIComponent(params['*'] ?? '')
    const exp    = Number(query.exp)
    const token  = String(query.token ?? '')

    if (!container.storage.verifyToken(key, exp, token)) {
      return reply.status(403).send({ error: { code: 'FORBIDDEN', message: 'Token inválido ou expirado' } })
    }
    const fullPath = container.storage.resolvePath(key)
    if (!fullPath) return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Arquivo não encontrado' } })

    try {
      await fs.stat(fullPath)
    } catch {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Arquivo não encontrado' } })
    }

    reply.header('Content-Disposition', `inline; filename="${key.split('/').pop() ?? 'file'}"`)
    return reply.send(createReadStream(fullPath))
  })

  await app.register(authRoutes,        { prefix: '/api/auth',         container } as any)
  await app.register(userRoutes,        { prefix: '/api/user',         container } as any)
  await app.register(documentRoutes,    { prefix: '/api/documents',    container } as any)
  await app.register(projectRoutes,     { prefix: '/api/projects',     container } as any)
  await app.register(transactionRoutes, { prefix: '/api/transactions', container } as any)
  await app.register(financialRoutes,   { prefix: '/api/financial',    container } as any)
  await app.register(dashboardRoutes,   { prefix: '/api/dashboard',    container } as any)
  await app.register(categoryRoutes,    { prefix: '/api',              container } as any)
  await app.register(calendarRoutes,    { prefix: '/api/calendar',     container } as any)
  await app.register(chatRoutes,        { prefix: '/api/chat',         container } as any)

  /* Porta: argv --port=NNNN, env PORT, ou 0 (livre escolhida pelo SO) */
  const portArg = process.argv.find(a => a.startsWith('--port='))?.slice(7)
  const port = Number(portArg ?? process.env.PORT ?? 3001)

  await app.listen({ port, host: '127.0.0.1' })
  const address = app.server.address()
  const actualPort = typeof address === 'object' && address ? address.port : port

  /* Sinaliza ao Tauri (sidecar) qual porta foi escolhida */
  console.log(`WASABI_BACKEND_READY port=${actualPort} dataDir=${paths.root}`)

  const shutdown = async () => {
    try { slackDigestScheduler.stop() } catch { /* swallow */ }
    try { await app.close() } catch { /* swallow */ }
    try { await container.cache.disconnect() } catch { /* swallow */ }
    try { container.vectorRepo.close() } catch { /* swallow */ }
    try { await container.prisma.$disconnect() } catch { /* swallow */ }
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT',  shutdown)
}

bootstrap().catch(err => {
  console.error('[wasabi-backend] fatal:', err)
  process.exit(1)
})
