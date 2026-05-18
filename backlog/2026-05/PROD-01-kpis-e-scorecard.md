# PROD-01 — Definir KPIs e Scorecard do Produto

- Tipo: Melhoria
- Classe de Prioridade: Alta
- Score (VRUE): Valor=5, Risco=3, Urgência=4, Esforço=3, Score=4.0
- Justificativa de prioridade: Medir valor é pré-requisito para priorizar corretamente.
- Owner: PO de Plataforma
- Prazo alvo: 2026-05-29

## 1) Problema e impacto
Sem métricas não há visibilidade sobre adoção, eficiência e gargalos, prejudicando decisões de investimento.

## 2) Objetivo mensurável
- Métrica/Meta: Publicar lista de KPIs com definições e fontes + quadro mensal no repositório.
  - Ex.: WAU/MAU internos, tarefas concluídas/semana, tempo de setup dev, tempo de restauração de backup (MTTR-Data), taxa de erro backend, tempo de build desktop.
- Linha de base: não existe
- Data-alvo: 2026-05-29

## 3) Critérios de aceite (verificáveis)
- [ ] Documento `docs/product/kpis.md` com ≥ 8 KPIs (definição, fórmula, fonte, frequência)
- [ ] Planilha/markdown `docs/product/scorecard-2026-05.md` com baseline preenchida
- [ ] Onde possível, comandos/scripts de coleta descritos em `scripts/metrics/`

## 4) Restrições
- Limitação de instrumentação automática no curto prazo; iniciar manual/híbrido

## 5) Dependências e riscos
- Dependências: acesso a logs/CI e containeres locais
- Riscos: esforço maior que o previsto para coletar baseline → Mitigação: priorizar KPIs com coleta fácil

## Definição de pronto de produto (DoD)
- [ ] KPIs documentados e revisados
- [ ] Primeiro scorecard mensal publicado
- [ ] Instruções de coleta disponíveis

## Notas de mudança
- Escopo inicial: definição e baseline manual
- Mudanças aprovadas: —
