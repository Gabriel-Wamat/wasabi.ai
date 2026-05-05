/**
 * Port para fonte de inflação (IBGE / IPCA).
 * Implementação driven: IbgeAdapter.
 *
 * Valores retornados são percentuais (ex: 4.83 = +4,83%).
 * Período é o acumulado YTD (do início do ano até `referenceMonth`).
 */
export interface IInflationRepository {
  /**
   * IPCA acumulado headline (índice geral) do ano até o mês de referência.
   * @param year         Ano civil (ex: 2025)
   * @param referenceMonth Mês de referência (1-12). Se omitido, usa o último mês com dado disponível.
   */
  getHeadlineYTD(year: number, referenceMonth?: number): Promise<number | null>

  /**
   * IPCA acumulado YTD por grupo IBGE.
   * @param groupCode    Código do grupo (classificação 315), ex: "7170" (Alimentação).
   * @param year         Ano civil
   * @param referenceMonth Mês de referência (1-12). Se omitido, usa o último mês disponível.
   */
  getGroupYTD(groupCode: string, year: number, referenceMonth?: number): Promise<number | null>
}
