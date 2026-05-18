# SEC-01 — Segurança e Privacidade (Baseline)

- Tipo: Débito Técnico
- Classe de Prioridade: Alta
- Score (VRUE): Valor=4, Risco=5, Urgência=4, Esforço=3, Score=4.33
- Justificativa de prioridade: Reduz risco de vazamento de dados e builds incorretos.
- Owner: Backend Lead
- Prazo alvo: 2026-06-05

## 1) Problema e impacto
Segredos em `.env` locais e configuração de build podem expor dados ou gerar instaladores mal configurados.

## 2) Objetivo mensurável
- Métrica/Meta: Checklist mínimo de segurança e privacidade aplicado ao repo e pipeline.
- Data-alvo: 2026-06-05

## 3) Critérios de aceite (verificáveis)
- [ ] Política de segredos documentada em `docs/security/secrets.md` (armazenamento, rotação, variáveis públicas vs privadas)
- [ ] Verificação local de `.env` sensíveis adicionada em `scripts/security/check-env.sh`
- [ ] Revisão do `build-desktop.yml` confirmando uso obrigatório de `WASABI_API_URL` e exemplos de configuração
- [ ] Guia de hardening de release em `docs/security/release-hardening.md`

## 4) Restrições
- Sem compra de ferramentas neste ciclo; usar scripts e políticas

## 5) Dependências e riscos
- Dependências: CI do GitHub
- Riscos: Falso-positivos em linter de `.env` → Mitigação: regras enxutas e documentadas

## Definição de pronto de produto (DoD)
- [ ] Docs de segurança publicados
- [ ] Script roda e reporta corretamente
- [ ] Pipeline revisado e documentado

## Notas de mudança
- Escopo inicial: políticas + scripts leves
- Mudanças aprovadas: —
