#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# Barterkin production deploy script
# =============================================================================
# Usage: ./scripts/deploy.sh
# Prerequisites:
#   - pnpm installed
#   - vercel CLI logged in (npx vercel login)
#   - supabase CLI logged in (npx supabase login)
#   - .env.local with all required vars
# =============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() { echo -e "${GREEN}[deploy]${NC} $1"; }
warn() { echo -e "${YELLOW}[warn]${NC} $1"; }
error() { echo -e "${RED}[error]${NC} $1"; exit 1; }

# ---------------------------------------------------------------------------
# 1. Preflight checks
# ---------------------------------------------------------------------------
log "Preflight checks..."

command -v pnpm >/dev/null 2>&1 || error "pnpm not found. Install: npm install -g pnpm"
command -v npx >/dev/null 2>&1 || error "npx not found."

[[ -f .env.local ]] || warn ".env.local not found — using system env vars"

# ---------------------------------------------------------------------------
# 2. Install + build + test
# ---------------------------------------------------------------------------
log "Installing dependencies..."
pnpm install --frozen-lockfile

log "Running typecheck..."
pnpm typecheck

log "Running unit tests..."
pnpm test --run

log "Building..."
pnpm build

# ---------------------------------------------------------------------------
# 3. Database migrations
# ---------------------------------------------------------------------------
log "Pushing Supabase migrations..."
npx supabase db push

# ---------------------------------------------------------------------------
# 4. Deploy to Vercel
# ---------------------------------------------------------------------------
log "Deploying to Vercel (production)..."
npx vercel --prod

# ---------------------------------------------------------------------------
# 5. Post-deploy smoke
# ---------------------------------------------------------------------------
log "Running post-deploy smoke tests..."
NEXT_PUBLIC_SITE_URL=$(grep NEXT_PUBLIC_SITE_URL .env.local 2>/dev/null | cut -d= -f2 || echo "")
if [[ -n "$NEXT_PUBLIC_SITE_URL" ]]; then
  PLAYWRIGHT_BASE_URL="$NEXT_PUBLIC_SITE_URL" pnpm e2e tests/e2e/listings-smoke.spec.ts
  PLAYWRIGHT_BASE_URL="$NEXT_PUBLIC_SITE_URL" pnpm e2e tests/e2e/landing-smoke.spec.ts
else
  warn "NEXT_PUBLIC_SITE_URL not found in .env.local — skipping smoke tests"
fi

log "Deploy complete."
