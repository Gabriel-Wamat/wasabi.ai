import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Container } from '../../../../../infrastructure/container'
import { authMiddleware, getUserId } from '../middlewares/auth.middleware'

const createBody = z.object({
  type:       z.enum(['PERSONAL', 'WORK']),
  category:   z.string().min(1).max(50),
  title:      z.string().min(1).max(100),
  number:     z.string().optional(),
  issuerName: z.string().optional(),
  issuedAt:   z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  expiresAt:  z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  company:    z.string().optional(),
  tags:       z.array(z.string()).default([]),
  metadata:   z.record(z.unknown()).default({}),
})

const updateBody = createBody.partial()

const listQuery = z.object({
  type:     z.enum(['PERSONAL', 'WORK']).optional(),
  category: z.string().optional(),
  status:   z.enum(['VALID', 'EXPIRING_SOON', 'EXPIRED', 'NO_EXPIRY']).optional(),
  search:   z.string().optional(),
  tags:     z.string().optional().transform(v => v ? v.split(',') : undefined),
  page:     z.coerce.number().min(1).default(1),
  limit:    z.coerce.number().min(1).max(100).default(20),
  sort:     z.enum(['expiresAt', 'createdAt', 'title']).default('createdAt'),
  order:    z.enum(['asc', 'desc']).default('desc'),
})

export async function documentRoutes(app: FastifyInstance, { container }: { container: Container }) {
  app.addHook('onRequest', authMiddleware)

  app.get('/', async (req, reply) => {
    const q      = listQuery.parse(req.query)
    const userId = getUserId(req)
    const result = await container.listDocuments.execute(userId, q)
    return reply.send(result)
  })

  app.post('/', async (req, reply) => {
    const body   = createBody.parse(req.body)
    const userId = getUserId(req)
    const doc    = await container.createDocument.execute({ ...body, userId })
    return reply.status(201).send({ data: doc })
  })

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const userId = getUserId(req)
    const doc    = await container.getDocument.execute(id, userId)
    return reply.send({ data: doc })
  })

  app.put('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body   = updateBody.parse(req.body)
    const userId = getUserId(req)
    const doc    = await container.updateDocument.execute(id, userId, body)
    return reply.send({ data: doc })
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const userId = getUserId(req)
    await container.deleteDocument.execute(id, userId)
    return reply.status(204).send()
  })

  app.post('/:id/upload', async (req, reply) => {
    const { id }  = req.params as { id: string }
    const userId  = getUserId(req)
    const data    = await req.file()
    if (!data) return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'Arquivo obrigatório' } })

    const buffer  = await data.toBuffer()
    const key     = `documents/${userId}/${id}/${data.filename}`
    await container.s3.upload(key, buffer, data.mimetype)
    const url     = await container.s3.getPresignedUrl(key)
    await container.updateDocument.execute(id, userId, { fileUrl: key })
    return reply.send({ data: { url } })
  })
}
