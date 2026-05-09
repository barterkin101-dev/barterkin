#!/usr/bin/env bash
# Barterkin Business Metrics
# Queries Supabase for key business metrics and generates actionable insights.
# Usage: ./scripts/business-metrics.sh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# ─── Config ──────────────────────────────────────────────────────────
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-https://hfdcsickergdcdvejbcw.supabase.co}"
SUPABASE_KEY="${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}"

if [[ -z "$SUPABASE_KEY" ]]; then
  if [[ -f .env.local ]]; then
    SUPABASE_KEY=$(grep "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=" .env.local | cut -d'=' -f2- | tr -d '"' || true)
  fi
fi

if [[ -z "$SUPABASE_KEY" ]]; then
  echo "ERROR: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY not set"
  exit 1
fi

API_BASE="$SUPABASE_URL/rest/v1"

# ─── Helpers ─────────────────────────────────────────────────────────
sb_count() {
  local table="$1"
  local filter="${2:-}"
  local url="$API_BASE/$table?select=id"
  [[ -n "$filter" ]] && url="$url&$filter"
  local result
  result=$(curl -sI -w "\n%{http_code}" "$url" \
    -H "apikey: $SUPABASE_KEY" \
    -H "Authorization: Bearer $SUPABASE_KEY" \
    -H "Range: 0-0" \
    -H "Prefer: count=exact" 2>/dev/null || true)
  local code=$(echo "$result" | tail -1)
  if [[ "$code" == "200" ]]; then
    echo "$result" | grep -i "^content-range:" | sed 's/.*\///' | tr -d '\r' || echo "0"
  else
    echo "0"
  fi
}

# ─── Fetch Metrics ───────────────────────────────────────────────────
echo "📊 Barterkin Business Metrics"
echo "════════════════════════════════════════"
echo "Time: $(date -Iseconds)"
echo ""

MEMBERS=$(sb_count "profiles" "")
echo "👤 Total Members: $MEMBERS"

WEEK_AGO=$(date -u -v-7d +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '7 days ago' +%Y-%m-%dT%H:%M:%SZ)
NEW_MEMBERS=$(sb_count "profiles" "created_at=gte.$WEEK_AGO")
echo "🆕 New Members (7d): $NEW_MEMBERS"

LISTINGS=$(sb_count "listings" "")
echo "📋 Total Listings: $LISTINGS"

NEW_LISTINGS=$(sb_count "listings" "created_at=gte.$WEEK_AGO")
echo "🆕 New Listings (7d): $NEW_LISTINGS"

TICKETS=$(sb_count "tickets" "status=eq.open")
echo "🎫 Open Tickets: $TICKETS"

CONVERSATIONS=$(sb_count "conversations" "")
echo "💬 Conversations: $CONVERSATIONS"

MESSAGES=$(sb_count "messages" "")
echo "💌 Messages: $MESSAGES"

CONTACTS=$(sb_count "contact_requests" "")
echo "📨 Contact Requests: $CONTACTS"

BANNED=$(sb_count "profiles" "banned=eq.true")
echo "🚫 Banned Members: $BANNED"

echo ""
echo "════════════════════════════════════════"

# ─── Business Insights ───────────────────────────────────────────────
INSIGHTS=()
ACTIONS=()

if [[ "$NEW_MEMBERS" -eq 0 && "$MEMBERS" -gt 0 ]]; then
  INSIGHTS+=("⚠️ No new signups in the last 7 days. Growth is stalled.")
  ACTIONS+=("🎯 Launch a referral campaign or social media push")
fi

if [[ "$NEW_LISTINGS" -eq 0 && "$LISTINGS" -gt 0 ]]; then
  INSIGHTS+=("⚠️ No new listings this week. Member engagement is low.")
  ACTIONS+=("📧 Send a re-engagement email to existing members")
fi

if [[ "$TICKETS" -gt 5 ]]; then
  INSIGHTS+=("🚨 $TICKETS open support tickets. Response time may be suffering.")
  ACTIONS+=("👩‍💼 Assign tickets to support team or auto-respond with FAQ")
fi

if [[ "$LISTINGS" -gt 0 && "$MEMBERS" -gt 0 ]]; then
  RATIO=$(echo "scale=2; $LISTINGS / $MEMBERS" | bc 2>/dev/null || echo "N/A")
  if [[ "$RATIO" != "N/A" ]]; then
    if (( $(echo "$RATIO < 0.5" | bc -l) )); then
      INSIGHTS+=("📉 Listing-to-member ratio is low ($RATIO). Members aren't posting.")
      ACTIONS+=("📝 Add onboarding prompts that encourage first listing")
    fi
  fi
fi

if [[ ${#INSIGHTS[@]} -gt 0 ]]; then
  echo "🧠 Insights:"
  for i in "${!INSIGHTS[@]}"; do
    echo "  ${INSIGHTS[$i]}"
    echo "    → ${ACTIONS[$i]}"
  done
else
  echo "✅ All key metrics look healthy. Keep shipping."
fi

echo ""
