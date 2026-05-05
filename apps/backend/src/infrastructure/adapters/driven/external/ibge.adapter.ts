import { IInflationRepository } from '../../../../application/ports/outbound/inflation.repository'
import { ICacheRepository } from '../../../../application/ports/outbound/cache.repository'

/**
 * Adapter para a API SIDRA do IBGE.
 *
 * Endpoint:
 *   /api/v3/agregados/7060/periodos/{periodos}/variaveis/2265
 *     ?localidades=N1[1]&classificacao=315[{groupCode}]
 *
 * Variável 2265 = IPCA - Variação acumulada no ano (%).
 * Periodos no formato AAAAMM (ex: "202505").
 *
 * Cache: 24h (TTL 86400s) — IPCA muda 1x/mês.
 */
export class IbgeAdapter implements IInflationRepository {
  private readonly base = 'https://servicodados.ibge.gov.br/api/v3/agregados/7060'
  private readonly headlineGroup = '7169'
  private readonly cacheTtl = 86400

  constructor(private readonly cache: ICacheRepository) {}

  async getHeadlineYTD(year: number, referenceMonth?: number): Promise<number | null> {
    return this.fetchYTD(this.headlineGroup, year, referenceMonth, 'headline')
  }

  async getGroupYTD(groupCode: string, year: number, referenceMonth?: number): Promise<number | null> {
    return this.fetchYTD(groupCode, year, referenceMonth, 'group')
  }

  private async fetchYTD(
    groupCode: string,
    year: number,
    referenceMonth: number | undefined,
    kind: string,
  ): Promise<number | null> {
    const cacheKey = `ipca:${kind}:${groupCode}:${year}:${referenceMonth ?? 'latest'}`
    const cached = await this.cache.get<number | null>(cacheKey)
    if (cached !== null && cached !== undefined) return cached

    const month = referenceMonth ?? this.latestAvailableMonth(year)
    if (month < 1) return null

    const periodo = `${year}${String(month).padStart(2, '0')}`
    const url = `${this.base}/periodos/${periodo}/variaveis/2265?localidades=N1[1]&classificacao=315[${groupCode}]`

    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } })
      if (!res.ok) return null
      const json = (await res.json()) as IbgeAggregateResponse
      const value = this.extractValue(json)
      await this.cache.set(cacheKey, value, this.cacheTtl)
      return value
    } catch (err) {
      console.error('[IbgeAdapter] fetch failed:', (err as Error).message)
      return null
    }
  }

  private extractValue(json: IbgeAggregateResponse): number | null {
    const series = json?.[0]?.resultados?.[0]?.series?.[0]?.serie
    if (!series) return null
    const values = Object.values(series)
    const last = values[values.length - 1]
    if (last === '...' || last === '-' || last === undefined) return null
    const num = Number(last)
    return Number.isFinite(num) ? num : null
  }

  private latestAvailableMonth(year: number): number {
    const now = new Date()
    if (year < now.getFullYear()) return 12
    if (year > now.getFullYear()) return -1
    // mês corrente costuma sair só na 2ª semana → usa mês anterior
    return Math.max(1, now.getMonth())
  }
}

/* ----- IBGE response shape (subset) ----- */
type IbgeAggregateResponse = Array<{
  resultados?: Array<{
    series?: Array<{ serie?: Record<string, string> }>
  }>
}>
