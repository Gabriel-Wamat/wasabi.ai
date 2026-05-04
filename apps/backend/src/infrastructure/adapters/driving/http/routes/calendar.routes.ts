import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { Container } from '../../../../../infrastructure/container'
import { authMiddleware, getUserId } from '../middlewares/auth.middleware'
import { google } from 'googleapis'
import { AppError } from '../../../../../shared/errors/app-error'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI ?? 'http://localhost:3000/oauth-callback.html'

function ensureGoogleConfig() {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
    throw AppError.validation('Google Calendar não configurado')
  }
}

function getOAuth2Client() {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  )
}

export async function calendarRoutes(app: FastifyInstance, { container }: { container: Container }) {
  app.addHook('onRequest', authMiddleware)

  // Gerar URL de autorização
  app.get('/auth-url', async (req, reply) => {
    ensureGoogleConfig()
    const oauth2Client = getOAuth2Client()
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events.readonly'
      ],
      prompt: 'consent'
    })
    return reply.send({ data: { authUrl } })
  })

  // Callback OAuth (trocar code por token)
  app.post('/connect', async (req, reply) => {
    ensureGoogleConfig()
    const { code } = z.object({ code: z.string() }).parse(req.body)
    const userId = getUserId(req)
    
    try {
      const oauth2Client = getOAuth2Client()
      const { tokens } = await oauth2Client.getToken(code)
      
      // Salvar tokens no banco
      await container.prisma.user.update({
        where: { id: userId },
        data: {
          googleAccessToken: tokens.access_token,
          googleRefreshToken: tokens.refresh_token,
          googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        }
      })

      return reply.send({ data: { success: true } })
    } catch (err: any) {
      return reply.status(400).send({ error: { code: 'INVALID_CODE', message: 'Código inválido' } })
    }
  })

  // Desconectar Google Calendar
  app.post('/disconnect', async (req, reply) => {
    const userId = getUserId(req)
    
    await container.prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: null,
        googleRefreshToken: null,
        googleTokenExpiry: null,
      }
    })

    return reply.send({ data: { success: true } })
  })

  // Buscar eventos do calendário
  app.get('/events', async (req, reply) => {
    const userId = getUserId(req)
    const { maxResults = 50, timeMin, timeMax } = z.object({
      maxResults: z.coerce.number().min(1).max(250).default(50),
      timeMin: z.string().datetime().optional(),
      timeMax: z.string().datetime().optional(),
    }).parse(req.query)

    const user = await container.prisma.user.findUnique({ where: { id: userId } })
    
    if (!user?.googleRefreshToken) {
      return reply.status(400).send({ 
        error: { code: 'NOT_CONNECTED', message: 'Google Calendar não conectado' } 
      })
    }

    try {
      const oauth2Client = getOAuth2Client()
      oauth2Client.setCredentials({
        access_token: user.googleAccessToken,
        refresh_token: user.googleRefreshToken,
        expiry_date: user.googleTokenExpiry?.getTime(),
      })

      // Renovar token se expirado
      const tokenInfo = await oauth2Client.getAccessToken()
      if (tokenInfo.token !== user.googleAccessToken) {
        await container.prisma.user.update({
          where: { id: userId },
          data: { googleAccessToken: tokenInfo.token }
        })
      }

      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
      
      const response = await calendar.events.list({
        calendarId: 'primary',
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
        timeMin: timeMin || new Date().toISOString(),
        timeMax,
      })

      const events = response.data.items?.map(event => ({
        id: event.id,
        title: event.summary,
        description: event.description,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location,
        attendees: event.attendees?.map(a => ({ email: a.email, name: a.displayName })),
        htmlLink: event.htmlLink,
        isAllDay: !event.start?.dateTime,
      })) || []

      return reply.send({ data: events })
    } catch (err: any) {
      return reply.status(500).send({ 
        error: { code: 'CALENDAR_ERROR', message: err.message || 'Erro ao buscar eventos' } 
      })
    }
  })

  // Status da conexão
  app.get('/status', async (req, reply) => {
    const userId = getUserId(req)
    const user = await container.prisma.user.findUnique({ 
      where: { id: userId },
      select: { googleRefreshToken: true }
    })
    
    return reply.send({ 
      data: { 
        connected: !!user?.googleRefreshToken 
      } 
    })
  })
}
