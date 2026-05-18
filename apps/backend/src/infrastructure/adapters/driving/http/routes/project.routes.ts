import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Container } from '../../../../../infrastructure/container'
import { authMiddleware, getUserId } from '../middlewares/auth.middleware'
import { AppError } from '../../../../../shared/errors/app-error'

const projectBodyShape = {
  title:       z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  status:      z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).default('ACTIVE'),
  priority:    z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  tags:        z.array(z.string()).default([]),
  color:       z.string().regex(/^#[0-9A-Fa-f]{6}$/).default('#11C76F'),
  startDate:   z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
  endDate:     z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
}

const dateOrderRefinement = {
  message: 'startDate deve ser anterior a endDate',
  path: ['endDate'],
}

const createBody = z.object(projectBodyShape).refine(
  data => !data.startDate || !data.endDate || data.startDate < data.endDate,
  dateOrderRefinement,
)

const updateBody = z.object(projectBodyShape).partial().refine(
  data => !data.startDate || !data.endDate || data.startDate < data.endDate,
  dateOrderRefinement,
)

const listQuery = z.object({
  status:   z.enum(['ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  search:   z.string().optional(),
  tags:     z.string().optional().transform(v => v ? v.split(',') : undefined),
  page:     z.coerce.number().min(1).default(1),
  limit:    z.coerce.number().min(1).max(100).default(20),
})

export async function projectRoutes(app: FastifyInstance, { container }: { container: Container }) {
  app.addHook('onRequest', authMiddleware)

  app.get('/', async (req, reply) => {
    const q      = listQuery.parse(req.query)
    const userId = getUserId(req)
    const result = await container.listProjects.execute(userId, q)
    return reply.send(result)
  })

  app.post('/', async (req, reply) => {
    const body   = createBody.parse(req.body)
    const userId = getUserId(req)
    const proj   = await container.createProject.execute({ ...body, userId })
    return reply.status(201).send({ data: proj })
  })

  app.get('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const userId = getUserId(req)
    const proj   = await container.projRepo.findById(id, userId)
    if (!proj) throw AppError.notFound('Projeto')
    return reply.send({ data: proj.toJSON() })
  })

  app.put('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const body   = updateBody.parse(req.body)
    const userId = getUserId(req)
    const updated = await container.updateProject.execute({ id, userId, ...body })
    return reply.send({ data: updated.toJSON() })
  })

  app.patch('/:id/progress', async (req, reply) => {
    const { id }       = req.params as { id: string }
    const { progress } = z.object({ progress: z.number().min(0).max(100) }).parse(req.body)
    const userId = getUserId(req)
    const result = await container.updateProjectProgress.execute(id, userId, progress)
    return reply.send({ data: result })
  })

  app.delete('/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const userId = getUserId(req)
    await container.deleteProject.execute({ id, userId })
    return reply.status(204).send()
  })
}
