import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Container } from '../../../../container'
import { authMiddleware, getUserId } from '../middlewares/auth.middleware'
import { AppError } from '../../../../../shared/errors/app-error'

const sendBody = z.object({
  content: z.string().min(1).max(4000),
})

const titleBody = z.object({
  title: z.string().min(1).max(100),
})

export async function chatRoutes(app: FastifyInstance, { container }: { container: Container }) {
  app.addHook('onRequest', authMiddleware)

  /* List conversations */
  app.get('/conversations', async (req, reply) => {
    const userId = getUserId(req)
    const data   = await container.listConversations.execute(userId)
    return reply.send({ data })
  })

  /* Create conversation */
  app.post('/conversations', async (req, reply) => {
    const userId = getUserId(req)
    const data   = await container.createConversation.execute({ userId })
    return reply.status(201).send({ data })
  })

  /* Delete conversation */
  app.delete('/conversations/:id', async (req, reply) => {
    const userId = getUserId(req)
    const { id } = req.params as { id: string }
    await container.deleteConversation.execute({ id, userId })
    return reply.status(204).send()
  })

  /* List messages */
  app.get('/conversations/:id/messages', async (req, reply) => {
    const userId = getUserId(req)
    const { id } = req.params as { id: string }
    const data   = await container.getChatMessages.execute({ conversationId: id, userId })
    return reply.send({ data })
  })

  /* Update title */
  app.patch('/conversations/:id', async (req, reply) => {
    const userId = getUserId(req)
    const { id } = req.params as { id: string }
    const body   = titleBody.parse(req.body)
    const updated = await container.renameConversation.execute({ id, userId, title: body.title })
    return reply.send({ data: updated.toJSON() })
  })

  /* Send message — SSE stream */
  app.post('/conversations/:id/messages', async (req, reply) => {
    const userId = getUserId(req)
    const { id } = req.params as { id: string }
    const body   = sendBody.parse(req.body)

    /* SSE headers */
    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache, no-transform')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.setHeader('X-Accel-Buffering', 'no')
    reply.raw.flushHeaders?.()

    let clientConnected = true
    reply.raw.on('close', () => {
      clientConnected = false
    })

    const writeEvent = (event: string, data: unknown) => {
      if (!clientConnected || reply.raw.destroyed || reply.raw.writableEnded) return
      try {
        reply.raw.write(`event: ${event}\n`)
        reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
      } catch {
        clientConnected = false
      }
    }

    /* Mantém a conexão viva */
    const keepAlive = setInterval(() => {
      if (!clientConnected || reply.raw.destroyed || reply.raw.writableEnded) return
      try { reply.raw.write(': keep-alive\n\n') } catch { clientConnected = false }
    }, 15000)

    try {
      const result = await container.sendChatMessage.execute({
        userId,
        conversationId: id,
        content:        body.content,
        onDelta: (text) => writeEvent('delta', { text }),
        onTitle: (title) => writeEvent('title', { title }),
      })

      writeEvent('done', {
        messageId:  result.messageId,
        tokensUsed: result.tokensUsed,
      })
    } catch (err) {
      const message = err instanceof AppError
        ? err.message
        : (err as Error).message ?? 'Erro ao processar mensagem'
      writeEvent('error', { message })
    } finally {
      clearInterval(keepAlive)
      if (!reply.raw.destroyed && !reply.raw.writableEnded) reply.raw.end()
    }
  })
}
