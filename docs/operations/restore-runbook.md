# Runbook — Restauração de Backup (rascunho)

1) Parar serviços dependentes
2) Restaurar dump com `scripts/backup/pg-restore.sh`
3) Validar integridade (migrates, contagens chaves)
4) Reativar serviços e executar smoke
