#!/usr/bin/env bash
#
# Wasabi — installer para macOS (workaround para apps não assinados).
#
# Uso (via terminal):
#   curl -fsSL https://github.com/<owner>/<repo>/releases/latest/download/install-mac.sh | bash
#
# Por que existe:
#   Sem Apple Developer ID, o macOS marca o .dmg baixado pelo browser com
#   "com.apple.quarantine" e bloqueia a abertura ("app está danificado").
#   Quando baixamos via curl, o atributo NÃO é aplicado — então o instalador
#   monta o .dmg, copia o app pra /Applications e remove qualquer quarentena
#   residual. Resultado: duplo-clique normal funciona.
#
# Requisitos: bash, curl, hdiutil, ditto (todos vêm com macOS).
#

set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────
GITHUB_REPO="${WASABI_REPO:-wasabiapp/wasabi}"   # override: WASABI_REPO=org/repo bash install-mac.sh
APP_NAME="Wasabi.app"
INSTALL_DIR="/Applications"

# ── Helpers ───────────────────────────────────────────────────────────────────
c_red()    { printf '\033[0;31m%s\033[0m' "$1"; }
c_green()  { printf '\033[0;32m%s\033[0m' "$1"; }
c_yellow() { printf '\033[0;33m%s\033[0m' "$1"; }
c_blue()   { printf '\033[0;34m%s\033[0m' "$1"; }
c_dim()    { printf '\033[2m%s\033[0m' "$1"; }

step()    { echo "$(c_blue "▸") $1"; }
ok()      { echo "$(c_green "✓") $1"; }
warn()    { echo "$(c_yellow "!") $1"; }
fail()    { echo "$(c_red "✗") $1" >&2; exit 1; }

cleanup() {
  if [ -n "${MOUNT_POINT:-}" ] && [ -d "$MOUNT_POINT" ]; then
    hdiutil detach "$MOUNT_POINT" -quiet >/dev/null 2>&1 || true
  fi
  if [ -n "${TMP_DIR:-}" ] && [ -d "$TMP_DIR" ]; then
    rm -rf "$TMP_DIR"
  fi
}
trap cleanup EXIT INT TERM

# ── Sanity ────────────────────────────────────────────────────────────────────
if [ "$(uname)" != "Darwin" ]; then
  fail "Este instalador é apenas para macOS. Detectado: $(uname)"
fi

if ! command -v curl >/dev/null 2>&1; then
  fail "curl não está disponível."
fi

# ── Detect arch ───────────────────────────────────────────────────────────────
ARCH="$(uname -m)"
case "$ARCH" in
  arm64)  ASSET_PATTERN="aarch64\\.dmg$" ;;
  x86_64) ASSET_PATTERN="x64\\.dmg$" ;;
  *)      fail "Arquitetura não suportada: $ARCH" ;;
esac

step "Plataforma: macOS $ARCH"

# ── Resolve latest release ────────────────────────────────────────────────────
step "Consultando última release de $GITHUB_REPO..."
API_URL="https://api.github.com/repos/${GITHUB_REPO}/releases/latest"

RELEASE_JSON="$(curl -fsSL --max-time 30 "$API_URL" 2>/dev/null || true)"
if [ -z "$RELEASE_JSON" ]; then
  fail "Não consegui consultar a API do GitHub. Verifique sua conexão ou se o repo é público."
fi

# Extrai URL do .dmg compatível com a arch (sem dependência de jq)
DMG_URL="$(printf '%s' "$RELEASE_JSON" \
  | grep -Eo '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]+\.dmg"' \
  | sed -E 's/.*"(https[^"]+)".*/\1/' \
  | grep -E "$ASSET_PATTERN" \
  | head -n1)"

if [ -z "$DMG_URL" ]; then
  # Fallback: pega o primeiro .dmg disponível (se só tiver universal)
  DMG_URL="$(printf '%s' "$RELEASE_JSON" \
    | grep -Eo '"browser_download_url"[[:space:]]*:[[:space:]]*"[^"]+\.dmg"' \
    | sed -E 's/.*"(https[^"]+)".*/\1/' \
    | head -n1)"
  warn "Asset específico para $ARCH não encontrado — usando .dmg genérico."
fi

[ -n "$DMG_URL" ] || fail "Nenhum .dmg encontrado na última release."

VERSION="$(printf '%s' "$RELEASE_JSON" \
  | grep -Eo '"tag_name"[[:space:]]*:[[:space:]]*"[^"]+"' \
  | head -n1 \
  | sed -E 's/.*"([^"]+)"$/\1/')"

ok "Release: ${VERSION:-desconhecida}"
echo "  $(c_dim "$DMG_URL")"

# ── Download ──────────────────────────────────────────────────────────────────
TMP_DIR="$(mktemp -d -t wasabi-install)"
DMG_PATH="$TMP_DIR/wasabi.dmg"

step "Baixando..."
curl -fL --progress-bar -o "$DMG_PATH" "$DMG_URL"
ok "Download concluído."

# ── Mount + copy ──────────────────────────────────────────────────────────────
step "Montando imagem de disco..."
MOUNT_OUTPUT="$(hdiutil attach "$DMG_PATH" -nobrowse -readonly -quiet -plist 2>&1)" || \
  fail "Falha ao montar o .dmg."

MOUNT_POINT="$(printf '%s' "$MOUNT_OUTPUT" \
  | grep -Eo '/Volumes/[^<]+' \
  | head -n1 \
  | sed -E 's/[[:space:]]+$//')"
[ -d "$MOUNT_POINT" ] || fail "Não consegui localizar o ponto de montagem."

SRC_APP="$MOUNT_POINT/$APP_NAME"
[ -d "$SRC_APP" ] || fail "$APP_NAME não encontrado dentro do .dmg."

# Se já existe versão antiga, remove (precisa permissão se for em /Applications)
DEST_APP="$INSTALL_DIR/$APP_NAME"
if [ -d "$DEST_APP" ]; then
  step "Removendo instalação anterior..."
  if ! rm -rf "$DEST_APP" 2>/dev/null; then
    warn "Sem permissão para escrever em $INSTALL_DIR. Solicitarei sua senha."
    sudo rm -rf "$DEST_APP" || fail "Falha ao remover $DEST_APP"
  fi
fi

step "Copiando para $INSTALL_DIR..."
if ! ditto "$SRC_APP" "$DEST_APP" 2>/dev/null; then
  warn "Sem permissão para escrever em $INSTALL_DIR. Solicitarei sua senha."
  sudo ditto "$SRC_APP" "$DEST_APP" || fail "Falha ao copiar app."
fi
ok "App copiado."

# ── Remove quarantine + ad-hoc resign ─────────────────────────────────────────
step "Removendo atributos de quarentena..."
if ! xattr -dr com.apple.quarantine "$DEST_APP" 2>/dev/null; then
  sudo xattr -dr com.apple.quarantine "$DEST_APP" 2>/dev/null || true
fi
ok "Quarentena removida."

step "Re-assinando localmente (ad-hoc)..."
# Re-assinatura ad-hoc evita o aviso "código modificado" depois do xattr
codesign --force --deep --sign - "$DEST_APP" 2>/dev/null || \
  warn "codesign ad-hoc falhou (não-fatal)."

# ── Done ──────────────────────────────────────────────────────────────────────
ok "Wasabi instalado em $DEST_APP"

step "Abrindo Wasabi..."
open "$DEST_APP" 2>/dev/null || warn "Abra manualmente pelo Launchpad."

echo
echo "$(c_green "✓") $(c_green "Tudo pronto!")"
echo "  $(c_dim "Atualizar no futuro: rode este script novamente.")"
echo "  $(c_dim "Desinstalar: rm -rf '$DEST_APP'")"
