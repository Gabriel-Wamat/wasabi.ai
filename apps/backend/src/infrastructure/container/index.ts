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

export function buildContainer() {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

  const redis = new RedisAdapter(process.env.REDIS_URL ?? 'redis://localhost:6379')

  const s3 = new S3Adapter({
    endpoint:  process.env.S3_ENDPOINT  ?? 'http://localhost:9000',
    region:    process.env.S3_REGION    ?? 'us-east-1',
    bucket:    process.env.S3_BUCKET    ?? 'personalhub-dev',
    accessKey: process.env.S3_ACCESS_KEY ?? 'minio_user',
    secretKey: process.env.S3_SECRET_KEY ?? 'minio_pass',
  })

  const docRepo  = new PrismaDocumentRepository(prisma)
  const projRepo = new PrismaProjectRepository(prisma)
  const txRepo   = new PrismaTransactionRepository(prisma)
  const goalRepo = new PrismaGoalRepository(prisma)
  const userRepo = new PrismaUserRepository(prisma)
  const catRepo  = new PrismaCategoryRepository(prisma)

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
    getDashboardOverview: new GetDashboardOverviewUseCase(docRepo, projRepo, txRepo, goalRepo, redis),
    createCategory: new CreateCategoryUseCase(catRepo),
    listCategories: new ListCategoriesUseCase(catRepo),
    updateCategory: new UpdateCategoryUseCase(catRepo),
    deleteCategory: new DeleteCategoryUseCase(catRepo, txRepo),
    getProfile: new GetProfileUseCase(userRepo),
    updateProfile: new UpdateProfileUseCase(userRepo),
    changePassword: new ChangePasswordUseCase(userRepo),
    goalRepo,
    userRepo,
    docRepo,
    projRepo,
    txRepo,
    catRepo,
  }
}

export type Container = ReturnType<typeof buildContainer>
