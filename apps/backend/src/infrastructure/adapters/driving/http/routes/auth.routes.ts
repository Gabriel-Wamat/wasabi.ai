import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Container } from '../../../../../infrastructure/container'

const registerBody = z.object({
  name:     z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8).max(100),
})

const loginBody = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

function signTokens(app: FastifyInstance, userId: string) {
  const access  = app.jwt.sign({ sub: userId }, { expiresIn: process.env.JWT_EXPIRES_IN ?? '15m' })
  const refresh = app.jwt.sign({ sub: userId, type: 'refresh' }, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d' })
  return { access, refresh }
}

export async function authRoutes(app: FastifyInstance, { container }: { container: Container }) {
  app.post('/register', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const body = registerBody.parse(req.body)
    const user = await container.register.execute(body)
    const tokens = signTokens(app, user.id)
    return reply.status(201).send({ data: { user, ...tokens } })
  })

  app.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const body = loginBody.parse(req.body)
    const user = await container.login.execute(body)
    const tokens = signTokens(app, user.id)
    return reply.send({ data: { user, ...tokens } })
  })

  app.post('/refresh', async (req, reply) => {
    const { token } = req.body as { token: string }
    if (!token) throw new Error('Token obrigatório')
    try {
      const payload = app.jwt.verify<{ sub: string; type: string }>(token)
      if (payload.type !== 'refresh') throw new Error()
      const tokens = signTokens(app, payload.sub)
      return reply.send({ data: tokens })
    } catch {
      return reply.status(401).send({ error: { code: 'UNAUTHORIZED', message: 'Refresh token inválido' } })
    }
  })

  app.post('/logout', async (_req, reply) => {
    return reply.send({ data: { ok: true } })
  })
}
