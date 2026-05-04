import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Container } from '../../../../../infrastructure/container'
import { authMiddleware, getUserId } from '../middlewares/auth.middleware'
import { AppError } from '../../../../../shared/errors/app-error'
import { uuidv7 } from 'uuidv7'

const summaryQuery = z.object({
  period:   z.enum(['THIS_MONTH', 'LAST_MONTH', 'THIS_YEAR', 'CUSTOM']).default('THIS_MONTH'),
  dateFrom: z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  dateTo:   z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
})

const goalBody = z.object({
  title:         z.string().min(1).max(100),
  targetAmount:  z.number().int().positive(),
  currentAmount: z.number().int().min(0).default(0),
  deadline:      z.string().datetime().transform(v => new Date(v)),
  icon:          z.string().default('🎯'),
})

export async function financialRoutes(app: FastifyInstance, { container }: { container: Container }) {
  app.addHook('onRequest', authMiddleware)

  app.get('/summary', async (req, reply) => {
    const q      = summaryQuery.parse(req.query)
    const userId = getUserId(req)
    const result = await container.getFinancialSummary.execute({ userId, ...q })
    return reply.send({ data: result })
  })

  app.get('/cashflow', async (req, reply) => {
    const userId  = getUserId(req)
    const { months } = z.object({ months: z.coerce.number().min(1).max(24).default(6) }).parse(req.query)
    const cashflow = await container.txRepo.cashflow(userId, months)
    return reply.send({ data: cashflow })
  })

  app.get('/by-category', async (req, reply) => {
    const userId  = getUserId(req)
    const now     = new Date()
    const dateFrom = new Date(now.getFullYear(), now.getMonth(), 1)
    const dateTo   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
    const result  = await container.txRepo.groupByCategory(userId, dateFrom, dateTo)
    return reply.send({ data: result })
  })

  app.get('/goals', async (req, reply) => {
    const userId = getUserId(req)
    const goals  = await container.goalRepo.findByUser(userId)
    return reply.send({ data: goals.map(g => g.toJSON()) })
  })

  app.post('/goals', async (req, reply) => {
    const body   = goalBody.parse(req.body)
    const userId = getUserId(req)
    const goal   = await container.goalRepo.create({ ...body, id: uuidv7(), userId, createdAt: new Date(), updatedAt: new Date() })
    return reply.status(201).send({ data: goal.toJSON() })
  })

  app.put('/goals/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body   = goalBody.partial().parse(req.body)
    const userId = getUserId(req)
    const goal   = await container.goalRepo.findById(id, userId)
    if (!goal) throw AppError.notFound('Meta')
    const updated = await container.goalRepo.update(id, userId, body)
    return reply.send({ data: updated.toJSON() })
  })

  app.delete('/goals/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const userId = getUserId(req)
    const goal   = await container.goalRepo.findById(id, userId)
    if (!goal) throw AppError.notFound('Meta')
    await container.goalRepo.delete(id, userId)
    return reply.status(204).send()
  })
}
