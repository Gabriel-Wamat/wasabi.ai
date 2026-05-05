import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { uuidv7 } from 'uuidv7'

const prisma = new PrismaClient()

async function main() {
  if (process.env.SEED_DEMO_DATA !== 'true') {
    console.log('Seed demo ignorado. Use SEED_DEMO_DATA=true para criar dados de demonstração.')
    return
  }

  console.log('🌱 Seeding database...')

  // User
  const resetDemoData = process.env.SEED_RESET === 'true'
  const passwordHash = await bcrypt.hash('senha123', 12)
  const user = await prisma.user.upsert({
    where: { email: 'demo@personalhub.dev' },
    update: {
      name: 'Demo User',
      passwordHash,
      timezone: 'America/Recife',
    },
    create: {
      id: uuidv7(),
      name: 'Demo User',
      email: 'demo@personalhub.dev',
      passwordHash,
      timezone: 'America/Recife',
    },
  })
  console.log('✔ User:', user.email)

  const existingRecords = await Promise.all([
    prisma.transaction.count({ where: { userId: user.id } }),
    prisma.financialGoal.count({ where: { userId: user.id } }),
    prisma.project.count({ where: { userId: user.id } }),
    prisma.document.count({ where: { userId: user.id } }),
    prisma.financialCategory.count({ where: { userId: user.id } }),
  ])

  if (!resetDemoData && existingRecords.some(count => count > 0)) {
    console.log('✔ Demo data already exists. Use SEED_RESET=true to recreate it.')
    console.log('\n✅ Seed concluído!')
    console.log('   Email: demo@personalhub.dev')
    console.log('   Senha: senha123')
    return
  }

  if (resetDemoData) {
    await prisma.transaction.deleteMany({ where: { userId: user.id } })
    await prisma.financialGoal.deleteMany({ where: { userId: user.id } })
    await prisma.project.deleteMany({ where: { userId: user.id } })
    await prisma.document.deleteMany({ where: { userId: user.id } })
    await prisma.financialCategory.deleteMany({ where: { userId: user.id } })
  }

  // Default categories — ipcaGroup mapeia para classificação 315 (grupos IPCA do IBGE)
  const cats = [
    { name: 'Moradia',      type: 'EXPENSE' as const, color: '#4A90D9', icon: '🏠', isDefault: true, ipcaGroup: '7445' },
    { name: 'Alimentação',  type: 'EXPENSE' as const, color: '#11C76F', icon: '🛒', isDefault: true, ipcaGroup: '7170' },
    { name: 'Transporte',   type: 'EXPENSE' as const, color: '#FFC107', icon: '🚗', isDefault: true, ipcaGroup: '7486' },
    { name: 'Saúde',        type: 'EXPENSE' as const, color: '#A78BFA', icon: '❤️',  isDefault: true, ipcaGroup: '7625' },
    { name: 'Lazer',        type: 'EXPENSE' as const, color: '#FB923C', icon: '🎮', isDefault: true, ipcaGroup: '7660' },
    { name: 'Assinaturas',  type: 'EXPENSE' as const, color: '#34D399', icon: '📱', isDefault: true, ipcaGroup: '7715' },
    { name: 'Outros',       type: 'EXPENSE' as const, color: '#888888', icon: '💸', isDefault: true, ipcaGroup: null },
    { name: 'Salário',      type: 'INCOME'  as const, color: '#11C76F', icon: '💼', isDefault: true, ipcaGroup: null },
    { name: 'Freelance',    type: 'INCOME'  as const, color: '#4A90D9', icon: '💰', isDefault: true, ipcaGroup: null },
    { name: 'Investimentos',type: 'INCOME'  as const, color: '#A78BFA', icon: '📈', isDefault: true, ipcaGroup: null },
  ]

  const createdCats = await Promise.all(
    cats.map(c => prisma.financialCategory.create({ data: { id: uuidv7(), ...c, userId: user.id } }))
  )
  console.log('✔ Categories:', createdCats.length)

  const catMap = Object.fromEntries(createdCats.map(c => [c.name, c.id]))

  // Documents
  const docs = [
    { type: 'PERSONAL' as const, category: 'RG', title: 'RG', number: '12.345.678-9', issuerName: 'SSP-PE', issuedAt: new Date('2010-03-10') },
    { type: 'PERSONAL' as const, category: 'CPF', title: 'CPF', number: '123.456.789-00', issuerName: 'Receita Federal' },
    { type: 'PERSONAL' as const, category: 'CNH', title: 'CNH', number: '00123456789', issuerName: 'DETRAN-PE', issuedAt: new Date('2019-08-12'), expiresAt: new Date('2025-08-12') },
    { type: 'PERSONAL' as const, category: 'Passaporte', title: 'Passaporte', number: 'FY123456', issuerName: 'Polícia Federal', issuedAt: new Date('2014-02-03'), expiresAt: new Date('2024-02-03') },
    { type: 'PERSONAL' as const, category: 'Título de Eleitor', title: 'Título de Eleitor', number: '1234 5678 9012', issuerName: 'TSE', issuedAt: new Date('2018-09-15') },
    { type: 'WORK' as const, category: 'Contrato', title: 'Contrato CLT', company: 'Empresa A', issuedAt: new Date('2022-03-01') },
    { type: 'WORK' as const, category: 'Holerite', title: 'Holerite Mai/2025', company: 'Empresa A', issuedAt: new Date('2025-05-05') },
    { type: 'WORK' as const, category: 'Certificado', title: 'Certificado AWS SAA', company: 'Amazon', issuedAt: new Date('2023-11-15'), expiresAt: new Date('2025-11-15') },
    { type: 'WORK' as const, category: 'Certificado', title: 'Certificado React', company: 'Udemy', issuedAt: new Date('2024-01-10') },
  ]
  await Promise.all(docs.map(d => prisma.document.create({ data: { id: uuidv7(), userId: user.id, tags: [], metadata: {}, ...d } })))
  console.log('✔ Documents:', docs.length)

  // Projects
  const projects = [
    { title: 'Personal Hub', description: 'Plataforma centralizada com app desktop e CI/CD.', status: 'ACTIVE' as const, priority: 'HIGH' as const, progress: 68, tags: ['TypeScript', 'Tauri', 'React'], color: '#11C76F' },
    { title: 'Site Pessoal', description: 'Portfolio com Next.js, blog e case studies.', status: 'COMPLETED' as const, priority: 'MEDIUM' as const, progress: 100, tags: ['Next.js', 'Vercel'], color: '#4A90D9' },
    { title: 'App Fitness', description: 'Rastreador de treinos e nutrição.', status: 'PAUSED' as const, priority: 'LOW' as const, progress: 35, tags: ['React Native', 'Expo'], color: '#FFC107' },
    { title: 'Curso TypeScript', description: 'TypeScript avançado — decorators e generics.', status: 'ACTIVE' as const, priority: 'MEDIUM' as const, progress: 58, tags: ['TypeScript'], color: '#A78BFA' },
    { title: 'API Open Source', description: 'SDK para integração com gateways de pagamento.', status: 'ACTIVE' as const, priority: 'HIGH' as const, progress: 22, tags: ['Node.js', 'OSS'], color: '#FB923C' },
    { title: 'Dashboard Analytics', description: 'Painel de métricas para clientes B2B.', status: 'ACTIVE' as const, priority: 'MEDIUM' as const, progress: 45, tags: ['React', 'D3'], color: '#34D399' },
  ]
  await Promise.all(projects.map(p => prisma.project.create({ data: { id: uuidv7(), userId: user.id, links: [], ...p } })))
  console.log('✔ Projects:', projects.length)

  // Transactions (últimos 6 meses)
  const now = new Date()
  const txs = []
  for (let m = 5; m >= 0; m--) {
    const month = new Date(now.getFullYear(), now.getMonth() - m, 1)
    txs.push(
      { type: 'INCOME' as const,  amount: 820000, categoryId: catMap['Salário']     ?? createdCats[7].id, description: 'Salário',        date: new Date(month.getFullYear(), month.getMonth(), 5),  paymentMethod: 'BANK_TRANSFER' as const },
      { type: 'EXPENSE' as const, amount: 220000, categoryId: catMap['Moradia']      ?? createdCats[0].id, description: 'Aluguel',        date: new Date(month.getFullYear(), month.getMonth(), 1),  paymentMethod: 'PIX' as const },
      { type: 'EXPENSE' as const, amount: 45000,  categoryId: catMap['Alimentação']  ?? createdCats[1].id, description: 'Supermercado',  date: new Date(month.getFullYear(), month.getMonth(), 8),  paymentMethod: 'DEBIT_CARD' as const },
      { type: 'EXPENSE' as const, amount: 18000,  categoryId: catMap['Alimentação']  ?? createdCats[1].id, description: 'iFood',          date: new Date(month.getFullYear(), month.getMonth(), 12), paymentMethod: 'CREDIT_CARD' as const },
      { type: 'EXPENSE' as const, amount: 18000,  categoryId: catMap['Transporte']   ?? createdCats[2].id, description: 'Combustível',   date: new Date(month.getFullYear(), month.getMonth(), 15), paymentMethod: 'CREDIT_CARD' as const },
      { type: 'EXPENSE' as const, amount: 6000,   categoryId: catMap['Assinaturas']  ?? createdCats[5].id, description: 'Plano Celular', date: new Date(month.getFullYear(), month.getMonth(), 15), paymentMethod: 'CREDIT_CARD' as const },
    )
  }
  // Extra freelance
  txs.push({ type: 'INCOME' as const, amount: 150000, categoryId: catMap['Freelance'] ?? createdCats[8].id, description: 'Freelance Dev', date: new Date(now.getFullYear(), now.getMonth(), 20), paymentMethod: 'PIX' as const })

  await Promise.all(txs.map(t => prisma.transaction.create({ data: { id: uuidv7(), userId: user.id, tags: [], isRecurring: false, ...t } })))
  console.log('✔ Transactions:', txs.length)

  // Goals
  const goals = [
    { title: 'Reserva de Emergência', targetAmount: 3000000, currentAmount: 1850000, deadline: new Date('2025-12-31'), icon: '🛡️' },
    { title: 'Viagem Internacional',  targetAmount: 1500000, currentAmount: 420000,  deadline: new Date('2026-06-30'), icon: '✈️' },
    { title: 'Notebook Novo',         targetAmount: 800000,  currentAmount: 640000,  deadline: new Date('2025-08-31'), icon: '💻' },
    { title: 'Investimentos 2025',    targetAmount: 2000000, currentAmount: 980000,  deadline: new Date('2025-12-31'), icon: '📈' },
  ]
  await Promise.all(goals.map(g => prisma.financialGoal.create({ data: { id: uuidv7(), userId: user.id, ...g } })))
  console.log('✔ Goals:', goals.length)

  console.log('\n✅ Seed concluído!')
  console.log('   Email: demo@personalhub.dev')
  console.log('   Senha: senha123')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
