---
phase: 01-foundation-infrastructure
plan: 09
plan_number: 9
plan_name: cloudflare-dns
type: execute
wave: 3
depends_on: [2]
files_modified:
  - /Users/ashleyakbar/barterkin/scripts/cloudflare-dns.mjs
  - /Users/ashleyakbar/barterkin/README.md
autonomous: false
requirements:
  - FOUND-03
  - FOUND-12
must_haves:
  truths:
    - "Cloudflare DNS for `barterkin.com` (root + www) points at the Netlify site currently hosting legacy/index.html (D-14)"
    - "`dig +short barterkin.com` returns Netlify's IP (or Netlify-known CNAME apex) from public resolvers within DNS TTL"
    - "`curl -sL https://barterkin.com/ -o /dev/null -w '%{http_code}'` returns 200 with the legacy page body served"
    - "scripts/cloudflare-dns.mjs is idempotent — running it twice yields no new records"
    - "Existing SPF / DKIM / DMARC TXT records from pre-phase (10/10 mail-tester) are NOT disturbed"
    - "README 'Phase 6 DNS cutover procedure' section documents the reverse (Netlify → Vercel) switch"
  artifacts:
    - path: "/Users/ashleyakbar/barterkin/scripts/cloudflare-dns.mjs"
      provides: "Idempotent Node script that PUTs barterkin.com DNS records pointing at Netlify"
      contains: "zone 62def5475df0d359095a370e051404e0"
    - path: "/Users/ashleyakbar/barterkin/README.md"
      provides: "Phase 6 cutover procedure (Netlify → Vercel) + how to re-run the DNS script"
      contains: "76.76.21.21"
  key_links:
    - from: "scripts/cloudflare-dns.mjs"
      to: "Cloudflare API v4"
      via: "CF_API_TOKEN env var + zone-scoped PUT"
      pattern: "api.cloudflare.com/client/v4"
    - from: "barterkin.com (public DNS)"
      to: "Netlify edge (legacy index.html)"
      via: "A record + CNAME www"
      pattern: "netlify"
---

<objective>
Add Cloudflare DNS records pointing `barterkin.com` (root + www) at the current Netlify site so visitors to the brand domain see the legacy page during Phases 1–5 (D-10, D-11, D-14). Ship an idempotent script that reads the Netlify target from `netlify sites:list` (or a pinned value) and creates the Cloudflare A/CNAME records if missing. Document the Phase-6 reverse procedure (Netlify → Vercel) in README so the eventual cutover is a 10-minute swap.

Purpose: D-14 is THE Phase-1-visible deliverable — someone typing `barterkin.com` into a browser must see the legacy landing page. CONTEXT §specifics states: "Phase 1 visible deliverable at completion: `barterkin.com` shows the legacy Netlify page". This plan makes that true.

Output: DNS records live; `curl -I https://barterkin.com/` returns 200 with Netlify headers; script in `scripts/` for re-running.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-CONTEXT.md
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-RESEARCH.md
@/Users/ashleyakbar/barterkin/README.md
@/Users/ashleyakbar/barterkin/scripts
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-01-SUMMARY.md

<interfaces>
Cloudflare identifiers (from CONTEXT / memory):
- Zone id: `62def5475df0d359095a370e051404e0`
- Domain: `barterkin.com`
- API token: stored in 1Password as `CF_API_TOKEN` (token-scoped to this zone, with DNS:Edit)

Netlify target discovery (RESEARCH §Open Question #1, A3 assumption):
- Netlify site currently serves legacy index.html — exact target (apex IP or `*.netlify.app` CNAME) must be confirmed at execute time.
- Two valid patterns:
  1. **Flattened CNAME apex** (Cloudflare "CNAME flattening"): CNAME root → `apex-loadbalancer.netlify.com`
  2. **Pinned A record**: A root → one of Netlify's apex IPs (e.g. `75.2.60.5`, `99.83.190.102` — Netlify publishes these)
- `www` is simpler: CNAME www → `<site-name>.netlify.app`

Recommended: use Cloudflare's CNAME flattening if Cloudflare is proxying (orange-cloud) or the zone is on a paid plan; fall back to A record if not.

Pre-existing TXT records (from pre-phase DNS work — 10/10 mail-tester per CONTEXT):
- SPF (`v=spf1 include:_spf.resend.com ~all` or similar)
- DKIM (`resend._domainkey.barterkin.com` CNAME → Resend-issued target)
- DMARC (`_dmarc.barterkin.com` TXT → `v=DMARC1; p=quarantine; rua=...`)

These TXT records MUST NOT be touched by this plan. The script only creates missing A/CNAME records for `@` and `www`; TXT and MX records are off-limits.

Existing operational scripts (kept from pre-phase per CONTEXT §code_context):
- `scripts/setup-dns.mjs` — prior DNS automation (read for patterns)
- `scripts/send-mailtest.mjs` — mail-tester ping

Write a NEW script `scripts/cloudflare-dns.mjs` that's focused on only the A/CNAME work; leave the existing scripts untouched.
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: Confirm Netlify target and apply Cloudflare records</name>
  <files>
    - /Users/ashleyakbar/barterkin/scripts/cloudflare-dns.mjs
  </files>
  <read_first>
    - /Users/ashleyakbar/barterkin/scripts/setup-dns.mjs (prior DNS script — steal its auth pattern)
    - /Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-CONTEXT.md (D-10, D-11, D-14, D-13)
    - /Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-RESEARCH.md §Open Question #1, §Runtime State Inventory
  </read_first>
  <action>
  Step 1 — Confirm the current Netlify hosting target. Two methods, pick whichever is easier for the developer:

  **Option A — from Netlify CLI (preferred):**
  ```bash
  # Login if needed (opens browser)
  npx netlify-cli login
  npx netlify-cli sites:list
  # Identify the site serving barterkin's legacy index.html — note the `url` and the `ssl_url` values.
  # The `url` is like https://<slug>.netlify.app — use this hostname as the CNAME target.
  ```

  **Option B — from Netlify UI:**
  Visit https://app.netlify.com → identify the site → `Site configuration` → `Domain management` → note the default Netlify subdomain (e.g. `amazing-site-a1b2c3.netlify.app`).

  Record the exact hostname as `NETLIFY_HOSTNAME` for the next step. Also check whether the site previously had a custom-domain `barterkin.com` configured — if yes, the prior `setup-dns.mjs` run may have already created partial records and this script runs idempotently.

  Step 2 — Create `/Users/ashleyakbar/barterkin/scripts/cloudflare-dns.mjs`. This is a Node ESM script (`.mjs`) using `fetch` (Node 20+ native). It reads `CF_API_TOKEN` from env, the Netlify hostname from a flag or env, and applies records idempotently:
  ```js
  #!/usr/bin/env node
  // scripts/cloudflare-dns.mjs
  //
  // Idempotently point barterkin.com (root + www) at the Netlify site serving the legacy page.
  // Run during Phase 1 (D-14); the reverse (→ Vercel) happens at Phase 6 cutover (D-13).
  //
  // Usage:
  //   CF_API_TOKEN=... NETLIFY_HOSTNAME=yoursite.netlify.app node scripts/cloudflare-dns.mjs
  //
  // Requires:
  //   CF_API_TOKEN     Cloudflare API token with DNS:Edit for zone 62def5475df0d359095a370e051404e0
  //   NETLIFY_HOSTNAME Netlify default hostname (e.g. amazing-site-a1b2c3.netlify.app)

  const ZONE_ID = '62def5475df0d359095a370e051404e0'
  const DOMAIN = 'barterkin.com'
  const API = 'https://api.cloudflare.com/client/v4'

  const TOKEN = process.env.CF_API_TOKEN
  const NETLIFY_HOSTNAME = process.env.NETLIFY_HOSTNAME

  if (!TOKEN) {
    console.error('FATAL: CF_API_TOKEN env var is required.')
    process.exit(2)
  }
  if (!NETLIFY_HOSTNAME) {
    console.error('FATAL: NETLIFY_HOSTNAME env var is required (e.g. amazing-site-a1b2c3.netlify.app).')
    process.exit(2)
  }

  const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }

  async function cf(path, init = {}) {
    const res = await fetch(`${API}${path}`, { ...init, headers })
    const json = await res.json()
    if (!json.success) {
      console.error('Cloudflare API error:', JSON.stringify(json.errors, null, 2))
      process.exit(1)
    }
    return json.result
  }

  async function upsertRecord({ type, name, content, proxied = false, ttl = 1 }) {
    // `ttl: 1` means "auto" (let Cloudflare decide).
    const existing = await cf(
      `/zones/${ZONE_ID}/dns_records?type=${type}&name=${encodeURIComponent(name)}`,
    )
    const keep = existing.find((r) => r.content === content && r.proxied === proxied)
    if (keep) {
      console.log(`OK ${type} ${name} → ${content} already exists (id=${keep.id}).`)
      return
    }
    // Remove stale records of same type+name (but different content) so a re-run converges.
    for (const r of existing) {
      console.log(`DELETE ${type} ${name} → ${r.content} (id=${r.id})`)
      await cf(`/zones/${ZONE_ID}/dns_records/${r.id}`, { method: 'DELETE' })
    }
    const body = JSON.stringify({ type, name, content, proxied, ttl })
    const created = await cf(`/zones/${ZONE_ID}/dns_records`, { method: 'POST', body })
    console.log(`CREATE ${type} ${name} → ${content} (id=${created.id})`)
  }

  async function main() {
    console.log(`Ensuring ${DOMAIN} (root + www) → Netlify (${NETLIFY_HOSTNAME}) on zone ${ZONE_ID}`)

    // Root (@) — use CNAME flattening (Cloudflare treats CNAME on apex as flattened A).
    // If zone is on a free plan without flattening, switch to a Netlify apex IP (e.g. '75.2.60.5') in the A record.
    await upsertRecord({
      type: 'CNAME',
      name: DOMAIN,
      content: NETLIFY_HOSTNAME,
      proxied: false, // DNS-only; Netlify handles TLS termination.
    })

    // www — standard CNAME.
    await upsertRecord({
      type: 'CNAME',
      name: `www.${DOMAIN}`,
      content: NETLIFY_HOSTNAME,
      proxied: false,
    })

    console.log('Done. Verify with:')
    console.log(`  dig +short ${DOMAIN}`)
    console.log(`  curl -sI https://${DOMAIN}/ | head -5`)
  }

  main().catch((e) => {
    console.error(e)
    process.exit(1)
  })
  ```

  Step 3 — Run the script (developer sources `CF_API_TOKEN` from 1Password):
  ```bash
  cd /Users/ashleyakbar/barterkin
  export CF_API_TOKEN="$(op read 'op://<vault>/barterkin/cloudflare/api_token')"   # adjust op path if needed
  export NETLIFY_HOSTNAME="<the-netlify-hostname-from-step-1>"
  node scripts/cloudflare-dns.mjs
  # Expect a CREATE or two OK lines; second run = two OK lines (idempotent).
  ```

  Step 4 — Verify DNS propagation (TTL typically 5min with Cloudflare):
  ```bash
  sleep 60
  dig +short barterkin.com        # expect: IP resolved via Cloudflare flattening (or 75.2.x.x if A record used)
  dig +short www.barterkin.com
  curl -sI https://barterkin.com/ | head -5   # expect HTTP/2 200; `server: Netlify` header
  ```

  This task is `checkpoint:human-action` because:
  - `CF_API_TOKEN` must be sourced from 1Password — planner can't script the `op read` without the vault path
  - `NETLIFY_HOSTNAME` requires a lookup from the Netlify UI/CLI that's specific to the developer's account
  - DNS propagation timing varies; developer verifies the final `curl` output
  </action>
  <acceptance_criteria>
    - `test -f /Users/ashleyakbar/barterkin/scripts/cloudflare-dns.mjs`
    - `grep -q "ZONE_ID = '62def5475df0d359095a370e051404e0'" /Users/ashleyakbar/barterkin/scripts/cloudflare-dns.mjs`
    - `grep -q "barterkin.com" /Users/ashleyakbar/barterkin/scripts/cloudflare-dns.mjs`
    - Script is idempotent: running twice produces only `OK` lines on the second run (no CREATE lines).
    - `dig +short barterkin.com` returns at least one non-empty line after propagation (≥60s post-apply)
    - `dig +short www.barterkin.com` returns at least one non-empty line
    - `curl -sI https://barterkin.com/ | head -1` returns `HTTP/2 200` (or `HTTP/1.1 200 OK` on older TLS stacks)
    - `curl -s https://barterkin.com/ | grep -qi "Georgia Barter\|Barterkin\|skills"` (the legacy page actually serves — prevents a silent empty 200)
    - `dig +short TXT barterkin.com | wc -l` returns ≥1 (SPF still present — pre-phase TXT records untouched)
    - `dig +short TXT _dmarc.barterkin.com | wc -l` returns ≥1 (DMARC intact)
    - `dig +short CNAME resend._domainkey.barterkin.com` returns a Resend target (DKIM intact)
  </acceptance_criteria>
  <verify>
    <automated>test -f /Users/ashleyakbar/barterkin/scripts/cloudflare-dns.mjs && grep -q "62def5475df0d359095a370e051404e0" /Users/ashleyakbar/barterkin/scripts/cloudflare-dns.mjs && dig +short barterkin.com | grep -q . && curl -sI https://barterkin.com/ | head -1 | grep -qE "HTTP/(2|1\.1) 200"</automated>
  </verify>
  <done>Idempotent Cloudflare script in `scripts/`; records applied; `barterkin.com` resolves to Netlify and serves 200 with legacy content; SPF/DKIM/DMARC intact.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Document Phase 6 cutover + commit</name>
  <files>
    - /Users/ashleyakbar/barterkin/README.md
  </files>
  <read_first>
    - /Users/ashleyakbar/barterkin/README.md (Plan 01 already has a stub "Phase 6 DNS cutover procedure" block — expand it)
    - /Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-CONTEXT.md D-13
  </read_first>
  <action>
  Step 1 — Replace the stubbed "Phase 6 DNS cutover procedure" section from Plan 01 with a concrete runbook:
  ```markdown
  ## Phase 6 DNS cutover: Netlify → Vercel

  During Phases 1–5, `barterkin.com` points at Netlify (legacy `index.html`) via `scripts/cloudflare-dns.mjs`. When Phase 6 ships the new landing page on Vercel, switch DNS. ~10 minute cutover, no canary (D-13).

  ### Pre-flight (before changing DNS)

  1. In Vercel → `barterkin` project → Settings → Domains: add `barterkin.com` and `www.barterkin.com`. Vercel displays the exact A/CNAME targets to use (canonical values are A `76.76.21.21` for apex + CNAME `cname.vercel-dns.com` for www).
  2. Verify the Vercel production deployment is green and visibly renders the new landing (visit the `*.vercel.app` URL directly; load at 360px viewport width — LAND-03).
  3. Confirm SPF/DKIM/DMARC TXT records are still in Cloudflare (`dig TXT barterkin.com`) — email must not regress.

  ### Cutover script (future-Phase-6 work)

  Copy `scripts/cloudflare-dns.mjs` to `scripts/cloudflare-dns-vercel.mjs`; swap the two `upsertRecord` calls:
  - `upsertRecord({ type: 'A',     name: 'barterkin.com',     content: '76.76.21.21',         proxied: false })`
  - `upsertRecord({ type: 'CNAME', name: 'www.barterkin.com', content: 'cname.vercel-dns.com', proxied: false })`

  Run it:
  ```bash
  CF_API_TOKEN=... node scripts/cloudflare-dns-vercel.mjs
  ```

  The script is idempotent and DELETEs stale records, so the Netlify CNAMEs are replaced cleanly.

  ### Post-cutover verification

  ```bash
  sleep 60                                   # Cloudflare TTL typically 5min; first-wave resolvers update faster
  dig +short barterkin.com                   # expect 76.76.21.21 (or Vercel's current apex IPs)
  dig +short www.barterkin.com               # expect cname.vercel-dns.com + resolved IPs
  curl -sI https://barterkin.com/ | head -5  # expect server: Vercel
  curl -s  https://barterkin.com/ | grep -qi "Barterkin"   # confirms new landing serves
  ```

  ### Decommission Netlify

  1. In Netlify dashboard → site settings → "Stop site" (preserves the deploy history for rollback).
  2. Leave `legacy/index.html` in the repo until Phase 6 confirms the cutover is stable — delete in a follow-up commit.

  ### If things go wrong

  Roll back by re-running `node scripts/cloudflare-dns.mjs` (the Netlify-pointing version) — records converge in one resolver-TTL window.
  ```

  Step 2 — Commit:
  ```bash
  cd /Users/ashleyakbar/barterkin
  git add scripts/cloudflare-dns.mjs README.md
  git commit -m "feat(foundation): Cloudflare DNS → Netlify for legacy page + Phase 6 cutover runbook

- scripts/cloudflare-dns.mjs: idempotent script applying CNAME @/www → Netlify (D-14)
- Zone 62def5475df0d359095a370e051404e0, domain barterkin.com
- TTL auto; DNS-only (no Cloudflare proxy to avoid double-TLS termination with Netlify)
- Leaves SPF / DKIM / DMARC TXT records untouched (pre-phase 10/10 mail-tester still holds)
- README: Phase 6 cutover runbook (Netlify → Vercel A 76.76.21.21 + CNAME cname.vercel-dns.com, D-13)

Covers FOUND-03 (DNS control), FOUND-12 (legacy kept live)."
  git push origin main
  ```
  </action>
  <acceptance_criteria>
    - `grep -q "76.76.21.21" /Users/ashleyakbar/barterkin/README.md` (Vercel apex IP in cutover runbook)
    - `grep -q "cname.vercel-dns.com" /Users/ashleyakbar/barterkin/README.md`
    - `grep -q "Phase 6 DNS cutover" /Users/ashleyakbar/barterkin/README.md`
    - `grep -q "62def5475df0d359095a370e051404e0" /Users/ashleyakbar/barterkin/scripts/cloudflare-dns.mjs`
    - `git log --oneline -1 | grep -q "Cloudflare DNS → Netlify"`
    - Working tree clean: `test -z "$(git status --porcelain)"`
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && grep -q "76.76.21.21" README.md && grep -q "cname.vercel-dns.com" README.md && git log --oneline -1 | grep -q "Cloudflare DNS"</automated>
  </verify>
  <done>Script committed; README has complete Phase 6 runbook; commit on origin/main.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Public DNS → brand domain | Anyone can resolve `barterkin.com`; no sensitive info leaked by records themselves. |
| Cloudflare API → DNS state | `CF_API_TOKEN` (in 1Password) has DNS:Edit scope for this zone only — least privilege. |
| Legacy Netlify site → public traffic | Static HTML; no backend; no auth; no secrets. |
| TXT records (SPF/DKIM/DMARC) | Must survive the plan intact — corrupting them would drop email deliverability from 10/10. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-09-01 | Tampering | Script accidentally deleting SPF/DKIM/DMARC TXT records | mitigate | Script scopes queries by `type=CNAME|A`; never queries or modifies TXT records. Acceptance criterion verifies TXT / DMARC / DKIM records still resolve post-apply. |
| T-09-02 | Information Disclosure | `CF_API_TOKEN` committed to repo | mitigate | Token sourced from environment at run time (`process.env.CF_API_TOKEN`) — never written to disk or logged; Plan 08 gitleaks catches any `Cloudflare API token` pattern |
| T-09-03 | Elevation of Privilege | Script run with a global-scope Cloudflare token | accept with caveat | Developer MUST create a token scoped to this zone + DNS:Edit only (RESEARCH § doesn't specify token scope but principle is standard CF practice); documented as a checkpoint action |
| T-09-04 | Spoofing | DNS cutover to a hostile Netlify site | accept | Attack requires Cloudflare dashboard compromise; Cloudflare enforces 2FA; out of MVP scope to mitigate further |
| T-09-05 | Denial of Service | Stale records preventing new records from converging (CNAME + A coexist for same name) | mitigate | Script DELETEs stale records of the same type+name before creating new ones — idempotent by construction |
| T-09-06 | Information Disclosure | Cloudflare proxy (orange-cloud) caching authenticated responses from a future Vercel deploy | accept | Script sets `proxied: false` (DNS-only mode); Phase 6 cutover documented to keep DNS-only for now; revisit when Vercel's own caching is sufficient |
</threat_model>

<verification>
Plan 09 is complete when:
1. `scripts/cloudflare-dns.mjs` exists and is idempotent
2. `barterkin.com` resolves publicly and returns 200 + Netlify-hosted legacy content
3. SPF/DKIM/DMARC TXT records intact post-apply
4. README has the Phase 6 cutover runbook with exact Vercel targets
5. Commit on `origin/main`
</verification>

<success_criteria>
- FOUND-03 satisfied: DNS is under developer control and working for the brand domain
- FOUND-12 satisfied: legacy Netlify page stays live at `barterkin.com` until Phase 6
- CONTEXT §specifics "Phase 1 visible deliverable" met: `barterkin.com` shows the legacy page
- Phase 6 DNS cutover is a 10-minute, scripted, documented operation — not a research project
</success_criteria>

<output>
After completion, create `/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-09-SUMMARY.md`. Capture: the exact Netlify hostname used as the CNAME target, the `dig +short barterkin.com` output immediately post-apply, the `curl -sI https://barterkin.com/` first line, and the commit SHA. Note in the summary whether the developer needs to retain or rotate the Cloudflare API token.
</output>
