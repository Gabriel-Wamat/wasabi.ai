import { PrismaClient } from '@prisma/client'
import { RedisAdapter } from '../adapters/driven/cache/redis.adapter'
import { S3Adapter } from '../adapters/driven/storage/s3.adapter'
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
import { OpenAiEmbeddingAdapter } from '../adapters/driven/embeddings/openai-embedding.adapter'
import { PrismaVectorContextRepository } from '../adapters/driven/database/repositories/prisma-vector-context.repository'
import { PrismaChatRepository } from '../adapters/driven/database/repositories/prisma-chat.repository'
import { PrismaLlmSettingsRepository } from '../adapters/driven/database/repositories/prisma-llm-settings.repository'
import { ChatContextBuilder } from '../../application/services/chat-context-builder'
import { ListConversationsUseCase } from '../../application/use-cases/chat/list-conversations'
import { CreateConversationUseCase } from '../../application/use-cases/chat/create-conversation'
import { DeleteConversationUseCase } from '../../application/use-cases/chat/delete-conversation'
import { RenameConversationUseCase } from '../../application/use-cases/chat/rename-conversation'
import { GetMessagesUseCase } from '../../application/use-cases/chat/get-messages'
import { SendMessageUseCase } from '../../application/use-cases/chat/send-message'

export function buildContainer() {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

  const redis = new RedisAdapter(process.env.REDIS_URL ?? 'redis://localhost:6379')

  const s3 = new S3Adapter({
    endpoint:       process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    publicEndpoint: process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT ?? 'http://localhost:9000',
    region:         process.env.S3_REGION ?? 'us-east-1',
    bucket:         process.env.S3_BUCKET ?? 'personalhub-dev',
    accessKey:      process.env.S3_ACCESS_KEY ?? 'minio_user',
    secretKey:      process.env.S3_SECRET_KEY ?? 'minio_pass',
  })

  const docRepo  = new PrismaDocumentRepository(prisma)
  const projRepo = new PrismaProjectRepository(prisma)
  const txRepo   = new PrismaTransactionRepository(prisma)
  const goalRepo = new PrismaGoalRepository(prisma)
  const userRepo = new PrismaUserRepository(prisma)
  const catRepo  = new PrismaCategoryRepository(prisma)
  const chatRepo = new PrismaChatRepository(prisma)
  const llmSettingsRepo = new PrismaLlmSettingsRepository(
    prisma,
    process.env.LLM_SETTINGS_SECRET ?? process.env.JWT_SECRET ?? 'dev-only-llm-settings-secret',
  )
  const vectorRepo = new PrismaVectorContextRepository(prisma)
  const ibge     = new IbgeAdapter(redis)
  const llm      = createLlmAdapter(process.env)
  const embeddings = new OpenAiEmbeddingAdapter({
    apiKey: process.env.EMBEDDINGS_PROVIDER === 'openai' || process.env.LLM_PROVIDER === 'openai'
      ? process.env.OPENAI_API_KEY
      : undefined,
    model: process.env.OPENAI_EMBEDDING_MODEL ?? 'text-embedding-3-small',
    baseUrl: process.env.OPENAI_BASE_URL,
  })
  const chatContext = new ChatContextBuilder(userRepo, docRepo, projRepo, txRepo, goalRepo, embeddings, vectorRepo)

  return {
    prisma,
    redis,
    s3,
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
    createTransaction:   new CreateTransactionUseCase(txRepo, redis),
    listTransactions:    new ListTransactionsUseCase(txRepo),
    updateTransaction:   new UpdateTransactionUseCase(txRepo, redis),
    deleteTransaction:   new DeleteTransactionUseCase(txRepo, redis),
    getFinancialSummary: new GetFinancialSummaryUseCase(txRepo, redis),
    getIpcaComparison:   new GetIpcaComparisonUseCase(txRepo, catRepo, ibge, redis),
    getDashboardOverview: new GetDashboardOverviewUseCase(docRepo, projRepo, txRepo, goalRepo, redis),
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
    sendChatMessage:     new SendMessageUseCase(chatRepo, llm, redis, chatContext, llmSettingsRepo, process.env),
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
