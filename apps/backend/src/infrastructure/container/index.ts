import { PrismaClient } from '@prisma/client'
import { InMemoryCacheAdapter } from '../adapters/driven/cache/in-memory.adapter'
import { LocalFsStorageAdapter } from '../adapters/driven/storage/local-fs.adapter'
import { PrismaDocumentRepository } from '../adapters/driven/database/repositories/prisma-document.repository'
import { PrismaProjectRepository } from '../adapters/driven/database/repositories/prisma-project.repository'
import { PrismaTransactionRepository } from '../adapters/driven/database/repositories/prisma-transaction.repository'
import { PrismaGoalRepository } from '../adapters/driven/database/repositories/prisma-goal.repository'
import { PrismaUserRepository } from '../adapters/driven/database/repositories/prisma-user.repository'
import { PrismaCategoryRepository } from '../adapters/driven/database/repositories/prisma-category.repository'
import { RegisterUseCase } from '../../application/use-cases/auth/register'
import { LoginUseCase } from '../../application/use-cases/auth/login'
import { CreateDocumentUseCase } from '../../application/use-cases/document/create-document'
import { ListDocumentsUseCase } from '../../application/use-cases/document/list-documents'
import { GetDocumentUseCase } from '../../application/use-cases/document/get-document'
import { UpdateDocumentUseCase } from '../../application/use-cases/document/update-document'
import { DeleteDocumentUseCase } from '../../application/use-cases/document/delete-document'
import { CreateProjectUseCase } from '../../application/use-cases/project/create-project'
import { ListProjectsUseCase } from '../../application/use-cases/project/list-projects'
import { UpdateProjectProgressUseCase } from '../../application/use-cases/project/update-project-progress'
import { CreateTransactionUseCase } from '../../application/use-cases/financial/create-transaction'
import { ListTransactionsUseCase } from '../../application/use-cases/financial/list-transactions'
import { UpdateTransactionUseCase } from '../../application/use-cases/financial/update-transaction'
import { DeleteTransactionUseCase } from '../../application/use-cases/financial/delete-transaction'
import { GetFinancialSummaryUseCase } from '../../application/use-cases/financial/get-financial-summary'
import { GetDashboardOverviewUseCase } from '../../application/use-cases/dashboard/get-dashboard-overview'
import { CreateCategoryUseCase } from '../../application/use-cases/financial/create-category'
import { ListCategoriesUseCase } from '../../application/use-cases/financial/list-categories'
import { UpdateCategoryUseCase } from '../../application/use-cases/financial/update-category'
import { DeleteCategoryUseCase } from '../../application/use-cases/financial/delete-category'
import { UpdateProjectUseCase } from '../../application/use-cases/project/update-project'
import { DeleteProjectUseCase } from '../../application/use-cases/project/delete-project'
import { GetProfileUseCase } from '../../application/use-cases/user/get-profile'
import { UpdateProfileUseCase } from '../../application/use-cases/user/update-profile'
import { ChangePasswordUseCase } from '../../application/use-cases/user/change-password'
import { IbgeAdapter } from '../adapters/driven/external/ibge.adapter'
import { GetIpcaComparisonUseCase } from '../../application/use-cases/financial/get-ipca-comparison'
import { createLlmAdapter } from '../adapters/driven/llm/llm-adapter.factory'
import { TransformersEmbeddingAdapter } from '../adapters/driven/embeddings/transformers-embedding.adapter'
import { SqliteVecVectorRepository } from '../adapters/driven/database/repositories/sqlite-vec-vector.repository'
import { PrismaChatRepository } from '../adapters/driven/database/repositories/prisma-chat.repository'
import { PrismaLlmSettingsRepository } from '../adapters/driven/database/repositories/prisma-llm-settings.repository'
import { ChatContextBuilder } from '../../application/services/chat-context-builder'
import { ListConversationsUseCase } from '../../application/use-cases/chat/list-conversations'
import { CreateConversationUseCase } from '../../application/use-cases/chat/create-conversation'
import { DeleteConversationUseCase } from '../../application/use-cases/chat/delete-conversation'
import { RenameConversationUseCase } from '../../application/use-cases/chat/rename-conversation'
import { GetMessagesUseCase } from '../../application/use-cases/chat/get-messages'
import { SendMessageUseCase } from '../../application/use-cases/chat/send-message'
import { getPaths } from '../../shared/paths'
import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

/**
 * Lê (ou cria) um secret estável persistido em config.json.
 * Usado para HMAC de URLs de arquivo, JWT em modo local, etc.
 */
function getOrCreateLocalSecret(configFile: string, key: string): string {
  let config: Record<string, string> = {}
  if (existsSync(configFile)) {
    try { config = JSON.parse(readFileSync(configFile, 'utf-8')) } catch { config = {} }
  }
  if (!config[key]) {
    config[key] = randomBytes(32).toString('hex')
    writeFileSync(configFile, JSON.stringify(config, null, 2))
  }
  return config[key]
}

export function buildContainer() {
  const paths = getPaths()

  /* DATABASE_URL pode vir do env (dev) ou ser derivado dos paths (release). */
  const dbUrl = process.env.DATABASE_URL?.startsWith('file:')
    ? process.env.DATABASE_URL
    : `file:${paths.databaseFile}`

  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: { db: { url: dbUrl } },
  })

  const cache = new InMemoryCacheAdapter()

  const fileSigningSecret = getOrCreateLocalSecret(paths.configFile, 'fileSigningSecret')
  const storage = new LocalFsStorageAdapter(paths.filesDir, fileSigningSecret)

  const docRepo  = new PrismaDocumentRepository(prisma)
  const projRepo = new PrismaProjectRepository(prisma)
  const txRepo   = new PrismaTransactionRepository(prisma)
  const goalRepo = new PrismaGoalRepository(prisma)
  const userRepo = new PrismaUserRepository(prisma)
  const catRepo  = new PrismaCategoryRepository(prisma)
  const chatRepo = new PrismaChatRepository(prisma)

  const llmSettingsSecret = getOrCreateLocalSecret(paths.configFile, 'llmSettingsSecret')
  const llmSettingsRepo = new PrismaLlmSettingsRepository(prisma, llmSettingsSecret)

  const vectorRepo = new SqliteVecVectorRepository({
    dbFile:    paths.databaseFile,
    dimension: 384,
  })

  const ibge = new IbgeAdapter(cache)
  const llm  = createLlmAdapter(process.env)

  const embeddings = new TransformersEmbeddingAdapter({
    modelsDir: paths.modelsDir,
  })

  const chatContext = new ChatContextBuilder(userRepo, docRepo, projRepo, txRepo, goalRepo, embeddings, vectorRepo)

  return {
    prisma,
    cache,
    /** alias mantido por compatibilidade com rotas existentes (`container.s3`). */
    s3: storage,
    storage,
    paths,
    register: new RegisterUseCase(userRepo),
    login:    new LoginUseCase(userRepo),
    createDocument: new CreateDocumentUseCase(docRepo),
    listDocuments:  new ListDocumentsUseCase(docRepo),
    getDocument:    new GetDocumentUseCase(docRepo),
    updateDocument: new UpdateDocumentUseCase(docRepo),
    deleteDocument: new DeleteDocumentUseCase(docRepo),
    createProject:         new CreateProjectUseCase(projRepo),
    listProjects:          new ListProjectsUseCase(projRepo),
    updateProjectProgress: new UpdateProjectProgressUseCase(projRepo),
    updateProject:         new UpdateProjectUseCase(projRepo),
    deleteProject:         new DeleteProjectUseCase(projRepo),
    createTransaction:   new CreateTransactionUseCase(txRepo, cache, catRepo),
    listTransactions:    new ListTransactionsUseCase(txRepo),
    updateTransaction:   new UpdateTransactionUseCase(txRepo, catRepo, cache),
    deleteTransaction:   new DeleteTransactionUseCase(txRepo, cache),
    getFinancialSummary: new GetFinancialSummaryUseCase(txRepo, cache),
    getIpcaComparison:   new GetIpcaComparisonUseCase(txRepo, catRepo, ibge, cache),
    getDashboardOverview: new GetDashboardOverviewUseCase(docRepo, projRepo, txRepo, goalRepo, cache),
    createCategory: new CreateCategoryUseCase(catRepo),
    listCategories: new ListCategoriesUseCase(catRepo),
    updateCategory: new UpdateCategoryUseCase(catRepo),
    deleteCategory: new DeleteCategoryUseCase(catRepo, txRepo),
    getProfile: new GetProfileUseCase(userRepo),
    updateProfile: new UpdateProfileUseCase(userRepo),
    changePassword: new ChangePasswordUseCase(userRepo),
    listConversations:   new ListConversationsUseCase(chatRepo),
    createConversation:  new CreateConversationUseCase(chatRepo),
    deleteConversation:  new DeleteConversationUseCase(chatRepo),
    renameConversation:  new RenameConversationUseCase(chatRepo),
    getChatMessages:     new GetMessagesUseCase(chatRepo),
    sendChatMessage:     new SendMessageUseCase(chatRepo, llm, cache, chatContext, llmSettingsRepo, process.env),
    llm,
    llmSettingsRepo,
    goalRepo,
    userRepo,
    docRepo,
    projRepo,
    txRepo,
    catRepo,
    chatRepo,
    vectorRepo,
    embeddings,
  }
}

export type Container = ReturnType<typeof buildContainer>
