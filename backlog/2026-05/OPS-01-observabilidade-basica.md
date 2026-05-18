# OPS-01 — Observabilidade Básica (Logs e Erros)

- Tipo: Melhoria
- Classe de Prioridade: Média
- Score (VRUE): Valor=3, Risco=3, Urgência=3, Esforço=3, Score=3.0
- Justificativa de prioridade: Diagnóstico ágil reduz MTTR e aumenta previsibilidade.
- Owner: Backend Lead
- Prazo alvo: 2026-06-12

## 1) Problema e impacto
Dificuldade de isolar falhas sem estrutura mínima de logs padronizados e captura de erros de frontend/backend.

## 2) Objetivo mensurável
- Métrica/Meta: Padronizar logs (níveis, correlação de request) e documentar integração futura com coletor.
- Data-alvo: 2026-06-12

## 3) Critérios de aceite (verificáveis)
- [ ] Guia `docs/operations/logging.md` com níveis, formato (JSON), campos mínimos e exemplos
- [ ] Middleware de request-id/correlação documentado (e, se trivial, habilitado)
- [ ] Como capturar erros no frontend descrito em `docs/operations/frontend-errors.md`

## 4) Restrições
- Sem contratação de serviço externo neste ciclo; foco em padrão e preparo

## 5) Dependências e riscos
- Dependências: apps/backend e apps/web
- Riscos: aumento de verbosidade → Mitigação: níveis e amostragem documentados

## Definição de pronto de produto (DoD)
- [ ] Padrão de logs publicado
- [ ] Exemplo executável local
- [ ] Documentos de referência para evolução futura

## Notas de mudança
- Escopo inicial: definição e exemplos
- Mudanças aprovadas: —
