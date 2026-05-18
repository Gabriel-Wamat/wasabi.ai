import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Container } from '../../../../../infrastructure/container'
import { authMiddleware, getUserId } from '../middlewares/auth.middleware'
import { TransactionType } from '../../../../../domain/entities/transaction.entity'

const createBody = z.object({
  name:  z.string().min(1).max(50),
  type:  z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon:  z.string().max(10).optional(),
})

const updateBody = z.object({
  name:  z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon:  z.string().max(10).optional(),
})

export async function categoryRoutes(app: FastifyInstance, { container }: { container: Container }) {
  app.addHook('onRequest', authMiddleware)

  app.get('/categories', async (req, reply) => {
    const userId = getUserId(req)
    const { type } = z.object({ type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']).optional() }).parse(req.query)
    const categories = await container.listCategories.execute({ userId, type: type as TransactionType | undefined })
    return reply.send({ data: categories.map(c => c.toJSON()) })
  })

  app.post('/categories', async (req, reply) => {
    const body = createBody.parse(req.body)
    const userId = getUserId(req)
    const category = await container.createCategory.execute({ userId, ...body })
    return reply.status(201).send({ data: category.toJSON() })
  })

  app.put('/categories/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body = updateBody.parse(req.body)
    const userId = getUserId(req)
    const category = await container.updateCategory.execute({ id, userId, ...body })
    return reply.send({ data: category.toJSON() })
  })

  app.delete('/categories/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const userId = getUserId(req)
    await container.deleteCategory.execute({ id, userId })
    return reply.status(204).send()
  })
}
