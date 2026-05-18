Matriz de Testes — WAM-7 Kickoff do Gate de QA/Sec
===================================================

Data: 2026-05-15

1) Handshake local desabilitado por padrão
-----------------------------------------

| Cenário | Comando/Passo | Esperado | Observado | Resultado |
|---|---|---|---|---|
| Healthcheck responde | `curl -sf http://127.0.0.1:${PORT}/health` | HTTP 200 e `{ status: "ok" }` | Conforme durante CI (ver workflow qa-gate) | OK |
| Handshake local | `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:${PORT}/api/local/handshake` | HTTP != 200 (rota ausente) | 404 em CI | OK |

2) Secret scanning (gitleaks)
-----------------------------

| Cenário | Comando/Passo | Esperado | Observado | Resultado |
|---|---|---|---|---|
| Vazamentos no repo | GitHub Action gitleaks | 0 achados bloqueantes | Nenhum achado crítico | OK |

Classificação de Severidade
---------------------------
- Risco histórico: rota `/api/local/handshake` habilitada em produção permitiria emissão de JWT sem autenticação (Critical).
- Mitigação implementada: feature flag `ENABLE_LOCAL_HANDSHAKE=false` por padrão e verificação automatizada em CI.

Decisão Final
-------------
APROVADO COM RESSALVAS — gate inicial criado e ativo. Itens pendentes para endurecimento adicional:
- Adicionar auditoria de dependências com falha em `high/critical` via `audit-ci` (follow-up).
- Cobertura de testes para fluxos de auth (login/register/refresh) e RBAC.
- Validação de CORS em produção (origens explícitas).
