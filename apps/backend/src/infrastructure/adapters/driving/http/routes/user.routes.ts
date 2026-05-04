import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Container } from '../../../../../infrastructure/container'
import { authMiddleware, getUserId } from '../middlewares/auth.middleware'

const updateProfileBody = z.object({
  name:     z.string().min(2).max(100).optional(),
  timezone: z.string().optional(),
  avatar:   z.string().url().optional(),
})

const changePasswordBody = z.object({
  currentPassword: z.string().min(1),
  newPassword:     z.string().min(8).max(100),
})

export async function userRoutes(app: FastifyInstance, { container }: { container: Container }) {
  app.addHook('onRequest', authMiddleware)

  app.get('/me', async (req, reply) => {
    const userId = getUserId(req)
    const user = await container.getProfile.execute({ userId })
    return reply.send({ data: user.toPublic() })
  })

  app.put('/me', async (req, reply) => {
    const userId = getUserId(req)
    const body = updateProfileBody.parse(req.body)
    const user = await container.updateProfile.execute({ userId, ...body })
    return reply.send({ data: user.toPublic() })
  })

  app.post('/me/change-password', async (req, reply) => {
    const userId = getUserId(req)
    const body = changePasswordBody.parse(req.body)
    await container.changePassword.execute({ userId, ...body })
    return reply.send({ data: { success: true } })
  })
}
