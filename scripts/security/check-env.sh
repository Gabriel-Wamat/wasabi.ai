#!/usr/bin/env bash
set -euo pipefail

# Checagens simples de `.env` locais (rascunho)
FILE=".env"
[ -f "$FILE" ] || { echo "[WARN] .env não encontrado"; exit 0; }

grep -E "JWT_SECRET=.{16,}" "$FILE" >/dev/null || {
  echo "[FAIL] JWT_SECRET ausente ou muito curto (<16)"; exit 1;
}

echo "[OK] .env básico parece válido"
