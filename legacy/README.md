# Legacy — not deployed

This directory preserves the pre-Next.js static site that was served from Netlify
(at a Netlify-owned subdomain, never barterkin.com itself) prior to Phase 6 launch.

Retained for historical visual-identity reference only. Do NOT deploy; do NOT
re-wire anywhere in the Next.js app.

## Files

- `index.html` — the original static landing page. Sage/forest/teal palette (teal was
  intentionally dropped in Phase 1 when the palette was ported to `app/globals.css`).
  Visual reference for Phase 6 parity verification only.

## Retirement plan

After Phase 6 UAT confirms the new landing page at `https://barterkin.com` is
visually on-par with this legacy file on both desktop and 360px mobile, the
Netlify deploy will be manually suspended in the Netlify dashboard. No repo
change is required for that step — Netlify separation is operational, not
structural.

## Why it stays in the repo

1. Historical reference for future redesigns
2. Visual regression guardrail during Phase 6 retrospective
3. Tag of commit history for `/m/ashley` hand-off

Do not delete without an ADR.
