import { ITransactionRepository } from '../../ports/outbound/transaction.repository'
import { ICategoryRepository } from '../../ports/outbound/category.repository'
import { IInflationRepository } from '../../ports/outbound/inflation.repository'
import { ICacheRepository } from '../../ports/outbound/cache.repository'

interface Input {
  userId: string
  year:   number
}

export type IpcaCategoryStatus =
  | 'ABOVE'
  | 'BELOW'
  | 'ALIGNED'
  | 'INSUFFICIENT_DATA'

interface IpcaCategoryComparison {
  categoryId:       string
  name:             string
  color:            string
  icon:             string
  ipcaGroup:        string | null
  currentAvgCents:  number
  previousAvgCents: number
  userChange:       number | null    // pp (percentual)
  ipcaChange:       number | null    // pp (percentual)
  delta:            number | null
  status:           IpcaCategoryStatus
}

interface Output {
  period:          string
  year:            number
  monthsCovered:   number
  ipcaAccumulated: number | null
  categories:      IpcaCategoryComparison[]
  fetchedAt:       string
}

const MONTH_NAMES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export class GetIpcaComparisonUseCase {
  constructor(
    private readonly transactions: ITransactionRepository,
    private readonly categories:   ICategoryRepository,
    private readonly inflation:    IInflationRepository,
    private readonly cache:        ICacheRepository,
  ) {}

  async execute(input: Input): Promise<Output> {
    const cacheKey = `ipca:comparison:${input.userId}:${input.year}`
    const cached = await this.cache.get<Output>(cacheKey)
    if (cached) return cached

    const { year } = input
    const now = new Date()
    const refMonth = year < now.getFullYear() ? 12 : Math.max(1, now.getMonth() + 1)

    const currFrom = new Date(year, 0, 1)
    const currTo   = new Date(year, refMonth, 0, 23, 59, 59)
    const prevFrom = new Date(year - 1, 0, 1)
    const prevTo   = new Date(year - 1, refMonth, 0, 23, 59, 59)

    const [currByCat, prevByCat, allCategories, ipcaAcc] = await Promise.all([
      this.transactions.groupByCategory(input.userId, currFrom, currTo),
      this.transactions.groupByCategory(input.userId, prevFrom, prevTo),
      this.categories.findByUser(input.userId),
      this.inflation.getHeadlineYTD(year, refMonth),
    ])

    const catMap = new Map(allCategories.map(c => [c.id, c]))
    const allCatIds = new Set([...currByCat.map(c => c.categoryId), ...prevByCat.map(c => c.categoryId)])

    const ipcaCache = new Map<string, number | null>()
    const fetchIpcaForGroup = async (group: string | null): Promise<number | null> => {
      if (!group) return null
      if (ipcaCache.has(group)) return ipcaCache.get(group)!
      const value = await this.inflation.getGroupYTD(group, year, refMonth)
      ipcaCache.set(group, value)
      return value
    }

    const categories: IpcaCategoryComparison[] = []
    for (const catId of allCatIds) {
      const meta = catMap.get(catId)
      if (!meta || meta.type !== 'EXPENSE') continue

      const currTotal = currByCat.find(c => c.categoryId === catId)?.total ?? 0
      const prevTotal = prevByCat.find(c => c.categoryId === catId)?.total ?? 0

      const currAvg = currTotal / refMonth
      const prevAvg = prevTotal / refMonth

      const ipcaChange = await fetchIpcaForGroup(meta.ipcaGroup ?? null)

      let userChange: number | null = null
      let delta: number | null = null
      let status: IpcaCategoryStatus = 'INSUFFICIENT_DATA'

      if (prevAvg > 0 && currAvg > 0) {
        userChange = ((currAvg - prevAvg) / prevAvg) * 100
        userChange = Math.round(userChange * 10) / 10
        if (ipcaChange !== null) {
          delta  = Math.round((userChange - ipcaChange) * 10) / 10
          status = delta >  1 ? 'ABOVE'
                 : delta < -1 ? 'BELOW'
                 : 'ALIGNED'
        }
      }

      categories.push({
        categoryId:       catId,
        name:             meta.name,
        color:            meta.color,
        icon:             meta.icon,
        ipcaGroup:        meta.ipcaGroup ?? null,
        currentAvgCents:  Math.round(currAvg),
        previousAvgCents: Math.round(prevAvg),
        userChange,
        ipcaChange,
        delta,
        status,
      })
    }

    categories.sort((a, b) => Math.abs(b.delta ?? -1) - Math.abs(a.delta ?? -1))

    const period = `jan-${MONTH_NAMES[refMonth - 1]}/${year} vs jan-${MONTH_NAMES[refMonth - 1]}/${year - 1}`

    const result: Output = {
      period,
      year,
      monthsCovered:   refMonth,
      ipcaAccumulated: ipcaAcc,
      categories,
      fetchedAt:       new Date().toISOString(),
    }

    await this.cache.set(cacheKey, result, 3600)
    return result
  }
}
