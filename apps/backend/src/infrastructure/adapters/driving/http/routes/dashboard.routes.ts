import { FastifyInstance } from 'fastify'
import { Container } from '../../../../../infrastructure/container'
import { authMiddleware, getUserId } from '../middlewares/auth.middleware'

export async function dashboardRoutes(app: FastifyInstance, { container }: { container: Container }) {
  app.addHook('onRequest', authMiddleware)

  app.get('/overview', async (req, reply) => {
    const userId = getUserId(req)
    const data   = await container.getDashboardOverview.execute(userId)
    return reply.send({ data })
  })
}
