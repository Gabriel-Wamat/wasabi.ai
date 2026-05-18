# Governança de Backlog — Wamat Personal (Wasabi)

Missão: garantir entrega contínua de valor com risco controlado.

## Regras de Governança
- Nenhuma issue sem critério de aceite objetivo.
- Nenhuma prioridade sem justificativa de valor/risco.
- Nenhum aumento de escopo sem registro e alinhamento.

## Padrão de Backlog (obrigatório em toda issue)
Cada issue deve conter:
1) Problema e impacto
2) Objetivo mensurável (com meta e data-alvo)
3) Critérios de aceite verificáveis
4) Restrições
5) Dependências e riscos

Saídas obrigatórias por issue:
- Priorização explícita (score + classe Alta/Média/Baixa)
- Critérios de aceite claros
- Definição de pronto de produto (DoD) para a entrega

## Como priorizamos
Usamos a Matriz Valor–Risco–Urgência ÷ Esforço (VRUE):

Score = (Valor + Redução de Risco + Urgência) / Esforço

- Valor, Risco, Urgência, Esforço ∈ {1..5}. Ver detalhes em `docs/governanca/prioritizacao.md`.
- Classe de prioridade: Alta (score ≥ 2.5), Média (1.6–2.49), Baixa (< 1.6).

## Definições (DoR/DoD)
- DoR (Definition of Ready): critérios para iniciar execução — ver `docs/governanca/definicoes.md`.
- DoD (Definition of Done): "pronto de produto" — ver `docs/governanca/definicoes.md`.

## Controle de Mudanças de Escopo
Qualquer mudança após planejamento deve ser registrada como solicitação de mudança com análise de impacto — ver `docs/governanca/change-control.md`.

## Onde ficam as issues
- Backlog planejado por ciclo: `backlog/YYYY-MM/`.
- Uma issue por arquivo `.md` seguindo o template: `docs/governanca/issue-template.md`.

## Cadência
- Planejamento quinzenal (sexta-feira, semanas pares).
- Review e retro semanais (sexta-feira).
- Atualização de status a cada mudança relevante.
