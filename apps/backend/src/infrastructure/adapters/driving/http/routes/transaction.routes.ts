import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Container } from '../../../../../infrastructure/container'
import { authMiddleware, getUserId } from '../middlewares/auth.middleware'

const createBody = z.object({
  type:          z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount:        z.number().int().positive(),
  categoryId:    z.string().uuid(),
  description:   z.string().min(1).max(200),
  date:          z.string().datetime().transform(v => new Date(v)),
  paymentMethod: z.enum(['PIX', 'CREDIT_CARD', 'DEBIT_CARD', 'CASH', 'BANK_TRANSFER', 'OTHER']).default('PIX'),
  isRecurring:   z.boolean().default(false),
  tags:          z.array(z.string()).default([]),
})

const listQuery = z.object({
  type:       z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional(),
  categoryId: z.string().uuid().optional(),
  dateFrom:   z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  dateTo:     z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  amountMin:  z.coerce.number().optional(),
  amountMax:  z.coerce.number().optional(),
  page:       z.coerce.number().min(1).default(1),
  limit:      z.coerce.number().min(1).max(100).default(30),
})

export async function transactionRoutes(app: FastifyInstance, { container }: { container: Container }) {
  app.addHook('onRequest', authMiddleware)

  app.get('/', async (req, reply) => {
    const q      = listQuery.parse(req.query)
    const userId = getUserId(req)
    const result = await container.listTransactions.execute(userId, q)
    return reply.send(result)
  })

  app.post('/', async (req, reply) => {
    const body   = createBody.parse(req.body)
    const userId = getUserId(req)
    const tx     = await container.createTransaction.execute({ ...body, userId })
    return reply.status(201).send({ data: tx })
  })

  app.put('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body   = createBody.partial().parse(req.body)
    const userId = getUserId(req)
    const updated = await container.updateTransaction.execute({ id, userId, ...body })
    return reply.send({ data: updated })
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const userId = getUserId(req)
    await container.deleteTransaction.execute({ id, userId })
    return reply.status(204).send()
  })
}
