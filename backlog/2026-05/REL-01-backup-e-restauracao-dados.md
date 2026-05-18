# REL-01 — Backup e Restauração de Dados

- Tipo: Melhoria
- Classe de Prioridade: Alta
- Score (VRUE): Valor=4, Risco=5, Urgência=3, Esforço=3, Score=4.0
- Justificativa de prioridade: Garantir continuidade e recuperação em ambiente pessoal e desktop.
- Owner: Backend Lead
- Prazo alvo: 2026-06-05

## 1) Problema e impacto
Não há procedimento versionado de backup/restore do PostgreSQL (e opcionalmente Redis), elevando o risco de perda de dados.

## 2) Objetivo mensurável
- Métrica/Meta: Script de backup automático + runbook de restauração testado.
- Data-alvo: 2026-06-05

## 3) Critérios de aceite (verificáveis)
- [ ] `scripts/backup/pg-backup.sh` e `scripts/backup/pg-restore.sh` com README de uso
- [ ] Backup full local agendável (cron exemplo) e retenção configurável
- [ ] Teste de restauração documentado em `docs/operations/restore-runbook.md`

## 4) Restrições
- Ambiente local com Docker; sem infraestrutura gerenciada neste ciclo

## 5) Dependências e riscos
- Dependências: container `postgres` do `docker-compose.yml`
- Riscos: espaço em disco → Mitigação: retenção + compressão

## Definição de pronto de produto (DoD)
- [ ] Scripts versionados e testados localmente
- [ ] Runbook de restore validado fim-a-fim
- [ ] Registro do teste (data, duração, resultado)

## Notas de mudança
- Escopo inicial: scripts e runbook locais
- Mudanças aprovadas: —
