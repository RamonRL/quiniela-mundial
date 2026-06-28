#!/usr/bin/env bash
#
# Runner LOCAL de crónicas automáticas (pensado para cron).
#
# Qué hace:
#   1. `db:pending-cronicas` lista los partidos finished, con > N h desde el
#      kickoff (CRONICA_DELAY_HOURS, default 4 ≈ pitido final + 2 h) y SIN
#      crónica todavía. Idempotente: nunca regenera una ya publicada.
#   2. Por cada código, invoca `claude -p "/cronica-qm <code>"` en modo
#      headless. El comando investiga en la web, redacta y publica directo
#      en la BD (status=published).
#
# Si no hay pendientes, sale en segundos sin gastar tokens.
#
# Requisitos (ya presentes en esta máquina):
#   - `.env.local` con DATABASE_URL + Supabase (lo usa db:upsert-news).
#   - Claude Code autenticado en ~/.claude (login de suscripción) o
#     ANTHROPIC_API_KEY exportada.
#
# Instalar en cron (cada hora en punto), p. ej.:
#   crontab -e
#   0 * * * * /home/ramon.romero/workspace/personal/quiniela-mundial/scripts/auto-cronica.sh >> "$HOME/.cronica-qm.log" 2>&1
#
# Ver el log:  tail -f ~/.cronica-qm.log

set -euo pipefail

REPO="/home/ramon.romero/workspace/personal/quiniela-mundial"
cd "$REPO"

# Cron arranca con un PATH mínimo. Cargamos node/pnpm desde nvm y añadimos
# el bin de Claude Code (~/.local/bin). Si cambias de gestor de versiones,
# ajusta este bloque.
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || true
export PATH="$HOME/.local/bin:$PATH"

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }

echo "[$(ts)] auto-cronica: arranque"

# Sanity: que las herramientas estén en PATH antes de seguir.
for bin in pnpm claude; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "[$(ts)] ERROR: '$bin' no está en PATH — revisa el bloque de PATH del script"
    exit 1
  fi
done

codes="$(pnpm -s db:pending-cronicas | grep -E '^[A-Z]{1,3}[0-9]{1,3}$' || true)"
if [ -z "$codes" ]; then
  echo "[$(ts)] sin crónicas pendientes"
  exit 0
fi

echo "[$(ts)] pendientes: $(echo "$codes" | tr '\n' ' ')"
for code in $codes; do
  echo "[$(ts)] === crónica $code ==="
  if claude -p "/cronica-qm $code" --dangerously-skip-permissions; then
    echo "[$(ts)] OK: $code publicado"
  else
    echo "[$(ts)] WARN: falló la crónica de $code, continúo con el resto"
  fi
done

echo "[$(ts)] auto-cronica: fin"
