QA Gate e Verificação de Segurança
=================================

Este diretório concentra a estratégia de QA/Security do projeto e os artefatos de verificação por release/PR.

Princípios
----------
- Sem evidência reproduzível, sem aprovação.
- Falha crítica de segurança ou integridade: bloqueio imediato.
- Cobertura orientada a risco e impacto de negócio.

Checks mínimos (por PR/main)
----------------------------
- Secret scanning (gitleaks) — sem vazamentos.
- Handshake local DESABILITADO em CI/prod (`ENABLE_LOCAL_HANDSHAKE=false`).
- Build + testes de unidade verdes.

Como rodar localmente
---------------------
- `pnpm --filter @personal-hub/backend build && ENABLE_LOCAL_HANDSHAKE=false PORT=0 node apps/backend/dist/server.js`
- Acesse `GET /health` (200) e confirme que `GET /api/local/handshake` retorna 404.

Estrutura
---------
- `matrices/` — matrizes de teste por issue/release.
- `checklists/` — checklists de release e segurança.

Template de Matriz
------------------
| Cenário | Comando/Passo | Esperado | Observado | Resultado |
|---|---|---|---|---|
| Título do cenário | comandos `curl`/scripts | saída/status esperado | evidência resumida | OK/NOK |

Classificação de severidade
---------------------------
- Critical — exploração remota ou perda de dados.
- High — bypass de auth/privilege, vazamento sensível.
- Medium — comportamento incorreto com workaround.
- Low — cosmético, sem impacto de negócio.

Decisão final por issue: Aprovado / Bloqueado / Aprovado com ressalvas.
