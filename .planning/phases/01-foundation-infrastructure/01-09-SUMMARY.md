---
plan: 09
plan_name: cloudflare-dns
status: partial
completed_at: "2026-04-19"
---

# Plan 01-09 Summary: cloudflare-dns

## What Was Done

- README updated with Phase 6 DNS cutover runbook (Netlify → Vercel: A `76.76.21.21` + CNAME `cname.vercel-dns.com`)
- `scripts/cloudflare-dns.mjs` — NOT created in this pass (plan was `checkpoint:human-action`; CF_API_TOKEN required)
- barterkin.com DNS: SOA exists in Cloudflare (zone `62def5475df0d359095a370e051404e0`) but no A/CNAME records applied yet — dig returns NOERROR with empty ANSWER section

## Status

- Script: **pending** — `scripts/cloudflare-dns.mjs` not yet committed
- DNS records: **pending** — barterkin.com has no A/CNAME pointing at Netlify
- Phase 6 cutover runbook: **committed** in README (ce42bfd)

## Impact on Phase 1

FOUND-03 (DNS control) and FOUND-12 (legacy kept live) are not fully satisfied.
barterkin.com does not currently serve the legacy Netlify page.
This is a deferred manual step requiring CF_API_TOKEN from 1Password.

## Action Required

```bash
export CF_API_TOKEN="<from 1Password>"
export NETLIFY_HOSTNAME="<netlify-site>.netlify.app"
node scripts/cloudflare-dns.mjs
```
