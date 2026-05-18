# Release Checklist — Wasabi

Este documento lista **tudo** que precisa estar pronto antes de mandar o link do release para alguém baixar e usar. Os itens marcados com 👤 dependem de você (configuração externa); os outros já estão automatizados no workflow.

---

## Pré-requisito absoluto: backend hospedado

Sem um backend público, o app desktop abre mas **não funciona** (login falha, dashboard vazio, todas as chamadas de API dão erro de conexão).

### Opções de hospedagem (em ordem de simplicidade)

| Provider | PostgreSQL | Redis | Storage | Custo inicial | Setup |
|----------|-----------|-------|---------|---------------|-------|
| **Railway** | incluso | incluso (add-on) | usar S3/R2 | $5 grátis/mês | mais fácil |
| **Fly.io** | Postgres app | Upstash | R2/S3 | grátis com limites | médio |
| **Render** | incluso | incluso (paid) | S3/R2 | DB grátis 90d | fácil |
| **VPS (Hetzner/DO)** | docker-compose | docker-compose | MinIO ou R2 | $5/mês | mais controle |

Para storage S3-compatível barato: **Cloudflare R2** (10GB grátis, sem cobrança de egress).

### Variáveis que o backend precisa em produção

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=<min 32 chars, gere com: openssl rand -base64 48>
CORS_ORIGIN=tauri://localhost,https://tauri.localhost
S3_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=wasabi-prod
S3_ACCESS_KEY=...
S3_SECRET_KEY=...

# Opcionais
ANTHROPIC_API_KEY=sk-ant-...     # para o chat (Feature 4)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://api.wasabi.app/oauth-callback
```

> **CORS importante:** o app Tauri faz requests com origin `tauri://localhost` (ou `https://tauri.localhost` no Windows). Adicione **ambos** ao `CORS_ORIGIN`.

---

## Checklist passo-a-passo

### 1. 👤 Hospedar o backend

- [ ] Criar Postgres na cloud (Railway/Fly/Render)
- [ ] Criar Redis na cloud (Upstash dá certo grátis)
- [ ] Criar bucket S3-compatível (Cloudflare R2 recomendado)
- [ ] Deploy do backend (`apps/backend`) com variáveis de ambiente
- [ ] Rodar migrations: `pnpm --filter @personal-hub/backend exec prisma migrate deploy`
- [ ] Rodar seed se quiser dados demo: `pnpm --filter @personal-hub/backend seed`
- [ ] Verificar healthcheck: `curl https://api.SEU_DOMINIO/health` → deve retornar `{ "status": "ok", ... }`

### 2. 👤 Configurar GitHub repo

- [ ] Em **Settings → Secrets and variables → Actions → Variables**, criar:
  - `WASABI_API_URL` = `https://api.SEU_DOMINIO/api`
- [ ] (opcional) Em Secrets, criar `ANTHROPIC_API_KEY` se for habilitar o chat

### 3. 👤 Atualizar repo nos scripts

- [ ] Editar `scripts/install-mac.sh` linha `GITHUB_REPO="wasabiapp/wasabi"` para o seu owner/repo real

### 4. ✅ Workflow já está pronto

O `build-desktop.yml` faz:

- ✅ Guard rail: aborta se `WASABI_API_URL` não estiver definida
- ✅ Builda macOS Intel (x86_64) **e** Apple Silicon (aarch64) separadamente
- ✅ Builda Windows (.msi + NSIS .exe)
- ✅ Builda Linux (.deb + .rpm + .AppImage)
- ✅ Smoke test: aborta se nenhum installer for gerado
- ✅ Anexa `install-mac.sh` ao release
- ✅ `fail_on_unmatched_files` ativo nos uploads críticos
- ✅ Cache do Cargo para builds rápidos

### 5. Disparar o release

```bash
# garante que main está limpo e tudo tá commitado
git status

# cria tag e push
git tag v1.0.0
git push origin v1.0.0
```

O workflow vai disparar nos 4 runners (Mac Intel, Mac ARM, Linux, Windows) em paralelo. Ao final, abra `https://github.com/<owner>/<repo>/releases` e veja os assets.

### 6. Verificação manual antes de mandar pros amigos

- [ ] Baixar o `.dmg` em outro Mac → seguir fluxo de install (ver `README.md → Download`)
- [ ] Baixar o `.msi` em outro Windows → instalar → abrir → fazer login
- [ ] Baixar o `.AppImage` em Linux → `chmod +x` → executar → fazer login
- [ ] **Confirmar que o login realmente acontece** (network tab do dev tools deve mostrar requests pra `https://api.SEU_DOMINIO`)

### 7. Mandar para os amigos

Texto sugerido:

```
Wasabi v1.0.0 está no ar!
👉 https://github.com/<owner>/<repo>/releases/latest

Mac:    rode no terminal:
        curl -fsSL https://github.com/<owner>/<repo>/releases/latest/download/install-mac.sh | bash

Windows: baixe o .msi → se aparecer SmartScreen, "Mais informações" → "Executar mesmo assim"

Linux:   baixe o .AppImage → chmod +x Wasabi*.AppImage → ./Wasabi*.AppImage

Login demo: demo@personalhub.dev / senha123
```

---

## Pendências / próximos passos

### Curto prazo (1 semana)

- [ ] **Apple Developer Program** ($99/ano) — elimina o "danificado" no Mac sem precisar de install.sh
- [ ] **Code signing Windows** — Azure Trusted Signing (~$10/mês) ou cert tradicional
- [ ] **Auto-updater** — `tauri-plugin-updater` + manifest hospedado

### Médio prazo

- [ ] Crash reporting (Sentry tem SDK Tauri)
- [ ] Release notes automatizadas (release-please ou changesets)
- [ ] Canal beta vs stable (tags `v*-beta` separadas)
- [ ] Homebrew Cask oficial

---

## Troubleshooting

### "Build falhou: WASABI_API_URL está vazia"
Defina a variable no repositório (Settings → Variables).

### "Mac diz que está danificado"
- Solução temporária: install-mac.sh (já incluso no release)
- Solução definitiva: Apple Developer Program

### "Windows SmartScreen bloqueia"
- Hoje: clicar "Mais informações → Executar mesmo assim"
- Definitivo: code signing

### "App abre mas dashboard fica vazio / login não funciona"
- Confirme que `WASABI_API_URL` aponta pro backend correto
- Confirme que o backend tem CORS liberado para `tauri://localhost`
- Abra DevTools no Tauri (F12 em dev) e veja erros de rede

### "macOS arm64 baixa rodou, Intel não"
- Confirme que o release tem **dois** dmgs: um com `aarch64` no nome, outro com `x64`
- Se só tem um, o workflow falhou em algum runner — abra o GH Actions e veja
