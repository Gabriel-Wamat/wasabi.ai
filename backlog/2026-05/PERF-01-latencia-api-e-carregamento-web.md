# PERF-01 — Latência API P95 e Carregamento Web Inicial

- Tipo: Melhoria
- Classe de Prioridade: Alta
- Score (VRUE): Valor=4, Risco=3, Urgência=3, Esforço=3, Score=3.33
- Justificativa de prioridade: Resposta lenta afeta produtividade e percepção de qualidade.
- Owner: Backend Lead
- Prazo alvo: 2026-06-12

## 1) Problema e impacto
Sem metas de latência claras; tempo de carregamento inicial do dashboard pode degradar em builds desktop/web.

## 2) Objetivo mensurável
- Métrica/Meta: API P95 ≤ 400ms nos endpoints do dashboard; LCP ≤ 2.5s em ambiente local estável.
- Data-alvo: 2026-06-12

## 3) Critérios de aceite (verificáveis)
- [ ] Script de medição de P95 por endpoint (`scripts/metrics/api-latency.md` com instruções)
- [ ] Medição do LCP do dashboard com duas amostras documentadas
- [ ] Registro do antes/depois com targets atingidos ou gap report

## 4) Restrições
- Sem ferramentas pagas; usar Node/Vitest/cURL/Chrome DevTools

## 5) Dependências e riscos
- Dependências: `apps/backend`, `apps/web`
- Riscos: variação de ambiente local → Mitigação: repetir 3x e usar medianas

## Definição de pronto de produto (DoD)
- [ ] Resultados publicados em `docs/product/scorecard-2026-05.md`
- [ ] Scripts/instruções versionados
- [ ] Ajustes mínimos aplicados (cache/custos de consulta) ou plano de follow-up

## Notas de mudança
- Escopo inicial: medição + quick wins
- Mudanças aprovadas: —
