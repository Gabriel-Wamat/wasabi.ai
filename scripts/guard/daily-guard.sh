#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

failures=0
warnings=0

section() {
  printf '\n== %s ==\n' "$1"
}

pass() {
  printf '[OK] %s\n' "$1"
}

warn() {
  warnings=$((warnings + 1))
  printf '[WARN] %s\n' "$1"
}

fail() {
  failures=$((failures + 1))
  printf '[FAIL] %s\n' "$1"
}

run_check() {
  local label="$1"
  shift

  if "$@"; then
    pass "$label"
  else
    fail "$label"
  fi
}

section "Environment policy"
run_check ".env policy" bash scripts/security/check-env.sh

section "Secret hygiene"
if command -v rg >/dev/null 2>&1; then
  secret_hits="$(
    rg -n --hidden --glob '!node_modules/**' --glob '!.git/**' \
      --glob '!pnpm-lock.yaml' --glob '!scripts/guard/daily-guard.sh' \
      --glob '!*.log' --glob '!*.pid' \
      '(sk-[A-Za-z0-9_-]{20,}|AKIA[0-9A-Z]{16}|ghp_[A-Za-z0-9_]{36,}|-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----)' \
      . || true
  )"
  if [ -n "$secret_hits" ]; then
    printf '%s\n' "$secret_hits"
    fail "hard-coded secret scan"
  else
    pass "hard-coded secret scan"
  fi
else
  warn "ripgrep not installed; skipped hard-coded secret scan"
fi

section "Dependency audit"
if command -v pnpm >/dev/null 2>&1 && [ -f pnpm-lock.yaml ]; then
  if pnpm audit --audit-level high >/tmp/personal-hub-pnpm-audit.log 2>&1; then
    pass "pnpm audit high+"
  else
    cat /tmp/personal-hub-pnpm-audit.log
    fail "pnpm audit high+"
  fi
else
  warn "pnpm or pnpm-lock.yaml unavailable; skipped dependency audit"
fi

section "Budget policy"
budget_spend="${DAILY_GUARD_BUDGET_SPEND:-}"
budget_limit="${DAILY_GUARD_BUDGET_LIMIT:-}"
budget_warn_ratio="${DAILY_GUARD_BUDGET_WARN_RATIO:-0.80}"
budget_alert_ratio="${DAILY_GUARD_BUDGET_ALERT_RATIO:-0.90}"
if [ -z "$budget_spend" ] || [ -z "$budget_limit" ]; then
  warn "budget variables not provided; set DAILY_GUARD_BUDGET_SPEND and DAILY_GUARD_BUDGET_LIMIT for enforcement"
else
  budget_pct="$(awk "BEGIN { if ($budget_limit <= 0) exit 1; printf \"%.2f\", ($budget_spend / $budget_limit) * 100 }")"
  if awk "BEGIN { exit !($budget_spend > $budget_limit) }"; then
    fail "budget spend ${budget_spend} exceeds limit ${budget_limit} (${budget_pct}%)"
  elif awk "BEGIN { exit !($budget_spend >= ($budget_limit * $budget_alert_ratio)) }"; then
    fail "budget spend ${budget_spend} reached alert threshold ${budget_alert_ratio} of limit ${budget_limit} (${budget_pct}%)"
  elif awk "BEGIN { exit !($budget_spend >= ($budget_limit * $budget_warn_ratio)) }"; then
    warn "budget spend ${budget_spend} reached warn threshold ${budget_warn_ratio} of limit ${budget_limit} (${budget_pct}%)"
  else
    pass "budget spend ${budget_spend} is below warn threshold ${budget_warn_ratio} of limit ${budget_limit} (${budget_pct}%)"
  fi
fi

section "Summary"
printf 'Failures: %s\nWarnings: %s\n' "$failures" "$warnings"

if [ "$failures" -gt 0 ]; then
  exit 1
fi
