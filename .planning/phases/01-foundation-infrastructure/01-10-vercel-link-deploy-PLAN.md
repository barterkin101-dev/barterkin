---
phase: 01-foundation-infrastructure
plan: 10
plan_number: 10
plan_name: vercel-link-deploy
type: execute
wave: 7
depends_on: [8, 9]
files_modified:
  - /Users/ashleyakbar/barterkin/README.md
autonomous: false
requirements:
  - FOUND-03
  - FOUND-06
  - FOUND-11
  - FOUND-07
must_haves:
  truths:
    - "Vercel project `barterkin` is linked to the `Biznomad/barterkin` GitHub repo (D-04 — after first scaffold commits succeeded, which by now they have)"
    - "All 7 Phase 1 env vars are populated in Vercel for `production`, `preview`, and `development` scopes"
    - "A production deploy from the current `main` commit is green (`pnpm build --webpack` succeeds on Vercel)"
    - "A preview deploy triggered by a throwaway branch is green within 3 minutes of push"
    - "`curl -sI <production-url>` returns 200 serving the Plan 02 scaffold (`Barterkin foundation` card visible)"
    - "Clicking 'Fire test event' on the preview URL produces a PostHog event (ROADMAP success criterion #5 satisfied end-to-end)"
    - "Supabase Studio SMTP is wired to Resend with a verified test-email send (FOUND-07 completion; manual step)"
    - "Home page renders on preview without hydration errors (Vercel build logs clean)"
  artifacts:
    - path: "/Users/ashleyakbar/barterkin/README.md"
      provides: "Vercel setup + env-var manifest + deploy verification checklist"
      contains: "VERCEL_TEAM_ID=team_lgW6L6OTcKom1vrTkNwdsGJ4"
  key_links:
    - from: "GitHub Biznomad/barterkin"
      to: "Vercel barterkin project"
      via: "Vercel GitHub integration (auto-deploys on push-to-main + PR previews)"
      pattern: "vercel.*barterkin"
    - from: "Vercel env vars"
      to: "Supabase (hfdcsickergdcdvejbcw) + PostHog (387571) + Resend"
      via: "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, NEXT_PUBLIC_POSTHOG_KEY, NEXT_PUBLIC_POSTHOG_HOST, NEXT_PUBLIC_SITE_URL"
      pattern: "NEXT_PUBLIC_SUPABASE_URL"
---

<objective>
Link the Vercel project to GitHub (D-04 — timed deliberately AFTER the scaffold lands locally and passes CI, not against an empty repo). Populate env vars across production, preview, and development scopes. Trigger and verify a first production deploy. Manually confirm Supabase Studio SMTP is wired to Resend (FOUND-07 completion). Confirm the `Fire test event` button on the preview URL causes a PostHog event to appear in the dashboard (ROADMAP success criterion #5).

Purpose: This plan closes out Phase 1 by turning the committed code into a running preview on Vercel and proving all the external-service wiring works end-to-end. ROADMAP §Phase 1 success criteria #1, #3, #5 all depend on this plan succeeding. After this, Phase 2 can start immediately — nothing on the infra side blocks.

Output: Vercel project deploys green, env vars scoped correctly, Supabase SMTP test-email delivered, PostHog `test_event` visible on the dashboard, Phase 1 is done.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-CONTEXT.md
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-RESEARCH.md
@/Users/ashleyakbar/barterkin/.env.local.example
@/Users/ashleyakbar/barterkin/README.md
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-08-SUMMARY.md
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-09-SUMMARY.md

<interfaces>
Vercel identifiers (from CONTEXT / memory):
- Team id: `team_lgW6L6OTcKom1vrTkNwdsGJ4`
- Project slug: `barterkin` (to be created / linked)

Env vars to set (from `.env.local.example` — 7 total across all scopes):
| Var | Scope(s) | Source |
|-----|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | production, preview, development | `https://hfdcsickergdcdvejbcw.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | production, preview, development | Supabase Studio → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | production, preview, development — **mark Sensitive** (PITFALLS Pitfall 5) | Supabase Studio → Project Settings → API |
| `RESEND_API_KEY` | production, preview, development — **mark Sensitive** | Resend dashboard → API keys |
| `NEXT_PUBLIC_POSTHOG_KEY` | production, preview, development | PostHog project 387571 → Project settings |
| `NEXT_PUBLIC_POSTHOG_HOST` | production, preview, development | `https://us.i.posthog.com` (US host per RESEARCH A4) |
| `NEXT_PUBLIC_SITE_URL` | production: `https://barterkin.vercel.app` · preview: `https://${VERCEL_URL}` · development: `http://localhost:3000` | literal strings |

Vercel CLI authentication (`vercel login`) requires interactive browser auth — hence this plan is `autonomous: false`.

D-04: "Vercel GitHub integration is set up **after** the first scaffold commit succeeds locally — not against an empty repo." Plans 01–09 have already committed. Satisfied.

Supabase Studio SMTP (RESEARCH §Open Question #2, FOUND-07):
- Settings are in Supabase Studio → Project → Authentication → Emails → SMTP Settings
- Fields: Host `smtp.resend.com`, Port `465`, User `resend`, Pass `<RESEND_API_KEY>`, Sender email `hello@barterkin.com`, Sender name `Barterkin`
- "Send test email" button after save — should deliver to the admin inbox within ~30s
- No auth UI ships in Phase 1 — this is the validation that Resend + Supabase handshake is live

Build safety: PITFALLS Pitfall 5 — never `console.log(process.env)` in any build step; mark server-only vars as `Sensitive` in Vercel UI (extra log masking).
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: Link Vercel project to GitHub, set 7 env vars across 3 scopes, trigger first deploy</name>
  <files>
    - (no repo files modified in this task — all changes are in Vercel project settings)
  </files>
  <read_first>
    - /Users/ashleyakbar/barterkin/.env.local.example (exact 7 env-var names)
    - /Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-RESEARCH.md §Env-Var Structure (table ~line 883)
    - /Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-CONTEXT.md D-04, D-06, D-08
    - /Users/ashleyakbar/barterkin/.planning/research/PITFALLS.md Pitfall 5 (Vercel build log leaks)
  </read_first>
  <action>
  Step 1 — Install Vercel CLI (dev-dep so it versions with the repo):
  ```bash
  cd /Users/ashleyakbar/barterkin
  pnpm add -D vercel
  pnpm vercel --version   # expect 40.x or later
  ```

  Step 2 — Interactive `vercel login` (opens browser):
  ```bash
  pnpm vercel login
  # Choose "Continue with GitHub" — use Biznomad account.
  ```

  Step 3 — Link the local project to a new Vercel project named `barterkin` in team `team_lgW6L6OTcKom1vrTkNwdsGJ4`:
  ```bash
  pnpm vercel link --yes --project barterkin --scope team_lgW6L6OTcKom1vrTkNwdsGJ4
  # Writes .vercel/project.json locally (which is .gitignored per Plan 01).
  ```
  The CLI will prompt to create the project if it doesn't exist — say yes. If it already exists from a prior session, `vercel link` attaches to it.

  Step 4 — In the Vercel dashboard (https://vercel.com/team_lgW6L6OTcKom1vrTkNwdsGJ4/barterkin/settings/git), enable the GitHub integration pointing at `Biznomad/barterkin` on the `main` branch. This is a ONE-TIME UI step. Alternatively:
  ```bash
  pnpm vercel git connect
  ```
  After this, every push to `main` triggers a production deploy and every PR triggers a preview deploy.

  Step 5 — Source secrets (from Supabase Studio, Resend dashboard, PostHog settings — these all went through pre-phase procurement per CONTEXT). Then set each env var for each scope.

  Use the Vercel CLI to set each var non-interactively:
  ```bash
  cd /Users/ashleyakbar/barterkin

  # Helper: source from 1Password if available, otherwise prompt
  # Example using 1Password CLI (skip if using UI):
  # SUPABASE_PUBLISHABLE_KEY="$(op read 'op://<vault>/Supabase/publishable_key')"
  # SUPABASE_SERVICE_ROLE_KEY="$(op read 'op://<vault>/Supabase/service_role_key')"
  # RESEND_API_KEY="$(op read 'op://<vault>/Resend/api_key')"
  # POSTHOG_KEY="$(op read 'op://<vault>/PostHog/project_api_key')"

  # For each env, for each scope, `echo <value> | pnpm vercel env add <VAR_NAME> <scope>`:
  for SCOPE in production preview development; do
    echo "https://hfdcsickergdcdvejbcw.supabase.co" | pnpm vercel env add NEXT_PUBLIC_SUPABASE_URL $SCOPE
    echo "$SUPABASE_PUBLISHABLE_KEY"                | pnpm vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY $SCOPE
    echo "$SUPABASE_SERVICE_ROLE_KEY"               | pnpm vercel env add SUPABASE_SERVICE_ROLE_KEY $SCOPE
    echo "$RESEND_API_KEY"                          | pnpm vercel env add RESEND_API_KEY $SCOPE
    echo "$POSTHOG_KEY"                             | pnpm vercel env add NEXT_PUBLIC_POSTHOG_KEY $SCOPE
    echo "https://us.i.posthog.com"                 | pnpm vercel env add NEXT_PUBLIC_POSTHOG_HOST $SCOPE
  done

  # NEXT_PUBLIC_SITE_URL differs per scope. For preview, Vercel expands ${VERCEL_URL} at
  # deploy time — we must store the LITERAL string `https://${VERCEL_URL}` (not the value of
  # the local shell variable, which is unset on the developer's machine). Use single quotes
  # + printf to prevent local-shell expansion:
  printf '%s' 'https://barterkin.vercel.app' | pnpm vercel env add NEXT_PUBLIC_SITE_URL production
  printf '%s' 'https://${VERCEL_URL}'        | pnpm vercel env add NEXT_PUBLIC_SITE_URL preview      # stored literal; Vercel interpolates ${VERCEL_URL} at deploy time
  printf '%s' 'http://localhost:3000'        | pnpm vercel env add NEXT_PUBLIC_SITE_URL development
  ```

  Alternatively, use the Vercel web UI (Project → Settings → Environment Variables) which also supports the "Sensitive" toggle for masked vars:
  1. Mark `SUPABASE_SERVICE_ROLE_KEY` and `RESEND_API_KEY` as **Sensitive** (PITFALLS Pitfall 5).
  2. Confirm the 5 `NEXT_PUBLIC_*` vars are NOT marked sensitive (they're client-safe by design).

  Step 6 — Verify all vars are set:
  ```bash
  pnpm vercel env ls production   | grep -cE "^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|NEXT_PUBLIC_POSTHOG_KEY|NEXT_PUBLIC_POSTHOG_HOST|NEXT_PUBLIC_SITE_URL)"
  # expect: 7
  pnpm vercel env ls preview     | grep -cE "^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|NEXT_PUBLIC_POSTHOG_KEY|NEXT_PUBLIC_POSTHOG_HOST|NEXT_PUBLIC_SITE_URL)"
  # expect: 7
  pnpm vercel env ls development | grep -cE "^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY|SUPABASE_SERVICE_ROLE_KEY|RESEND_API_KEY|NEXT_PUBLIC_POSTHOG_KEY|NEXT_PUBLIC_POSTHOG_HOST|NEXT_PUBLIC_SITE_URL)"
  # expect: 7
  ```

  Step 7 — Trigger the first production deploy. The push-to-main from Plan 08 may already have kicked one off; if not, push an empty commit to trigger:
  ```bash
  git commit --allow-empty -m "chore(foundation): trigger first Vercel production deploy"
  git push origin main
  # Watch the Vercel deploy:
  pnpm vercel --prod --yes    # OR just wait for the GitHub-integration deploy to complete
  ```

  Step 8 — Wait for the deploy URL, then smoke-test:
  ```bash
  PROD_URL=$(pnpm vercel inspect --scope team_lgW6L6OTcKom1vrTkNwdsGJ4 barterkin --json | jq -r '.deploymentUrl // .alias[0]')
  # Fallback: pull from dashboard if jq path differs
  echo "Production: $PROD_URL"
  curl -sI "https://$PROD_URL/" | head -1     # expect HTTP/2 200
  curl -s  "https://$PROD_URL/" | grep -qi "Barterkin foundation"
  curl -sI "https://$PROD_URL/manifest.webmanifest" | head -1   # expect 200
  curl -sI "https://$PROD_URL/sw.js" | head -1                  # expect 200
  ```

  This task is `checkpoint:human-action` because: `vercel login` is browser-interactive; sourcing secrets from 1Password / Supabase Studio / Resend / PostHog dashboards requires the developer's credentials; marking vars as "Sensitive" is a UI toggle. Signal `resume` once the production deploy is green and the curl smoke-tests pass.
  </action>
  <acceptance_criteria>
    - `test -f /Users/ashleyakbar/barterkin/.vercel/project.json` (linked)
    - `pnpm vercel env ls production | wc -l` returns ≥8 (7 vars + header) — confirm all 7 expected names present
    - `pnpm vercel env ls preview | grep -c "SUPABASE_SERVICE_ROLE_KEY"` returns `1` (and NO `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` anywhere)
    - Latest production deploy state via `pnpm vercel ls --scope team_lgW6L6OTcKom1vrTkNwdsGJ4 barterkin --json | jq -r '.deployments[0].state'` returns `READY`
    - `curl -sI https://barterkin.vercel.app/ | head -1` returns `HTTP/2 200` (or the exact production alias if Vercel assigned a different one — capture in SUMMARY)
    - `curl -s https://barterkin.vercel.app/ | grep -qi "Barterkin foundation"` (Plan 02 scaffold serves)
    - `curl -sI https://barterkin.vercel.app/manifest.webmanifest | head -1` returns 200 (Plan 04 PWA manifest)
    - `curl -sI https://barterkin.vercel.app/sw.js | head -1` returns 200 (Plan 04 Serwist service worker)
    - `! grep -rE "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_RESEND_API_KEY" /Users/ashleyakbar/barterkin --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" --include="*.yaml" --include="*.yml" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.vercel` (repo-wide guard — covers app/, lib/, components/, docs/, scripts/, .github/, supabase/, tests/; gitleaks CI is backstop, but plan-level verify is comprehensive on a public repo)
  </acceptance_criteria>
  <verify>
    <automated>test -f /Users/ashleyakbar/barterkin/.vercel/project.json && ! grep -rE "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_RESEND_API_KEY" /Users/ashleyakbar/barterkin --include="*.ts" --include="*.tsx" --include="*.js" --include="*.mjs" --include="*.yaml" --include="*.yml" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.vercel 2>/dev/null</automated>
  </verify>
  <done>Vercel project linked + env vars set across all 3 scopes + production deploy green + sensitive vars masked; repo-wide scan (incl. docs/, scripts/, .github/, supabase/, tests/) confirms no NEXT_PUBLIC_-prefixed server-secret anywhere.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: End-to-end smoke verification (PostHog + Resend + Supabase SMTP)</name>
  <what-built>
  - Vercel production deploy at `https://barterkin.vercel.app` (and preview URLs on future PRs)
  - 7 env vars populated across production/preview/development (Task 1)
  - PostHog provider, Resend test route, Supabase Studio SMTP wiring — all from Plans 05 + 06
  </what-built>
  <how-to-verify>

  **Step A — PostHog end-to-end (ROADMAP §Phase 1 success criterion #5)**

  1. Open `https://barterkin.vercel.app/` in a browser (incognito to avoid a `person_profiles: 'identified_only'` surprise).
  2. Click the "Fire test event" button on the home page. Expect the label to flip to "Fired — check PostHog" for 3 seconds.
  3. Visit `https://us.posthog.com/project/387571/activity` (or similar — PostHog project 387571 Activity tab).
  4. Within 60 seconds, confirm a `test_event` event appears with `properties.source: 'phase-1-home-button'`.

  Screenshot / describe the PostHog event ID in the SUMMARY.

  **Step B — Resend end-to-end (FOUND-04 / FOUND-07 completion)**

  The `/api/test-email` route is production-guarded to return 404 (Plan 05 design), so Resend MUST be tested either (a) locally with `pnpm dev` + `.env.local` populated, or (b) against a preview deploy where NODE_ENV=production is set BUT the production guard still applies.

  Simpler: run locally against the developer's inbox:
  ```bash
  cd /Users/ashleyakbar/barterkin
  # Populate .env.local by copying the real values from Vercel — the CLI makes this easy:
  pnpm vercel env pull .env.local   # pulls development scope into .env.local
  pnpm dev &
  sleep 5
  curl -s -X POST http://localhost:3000/api/test-email \
    -H "Content-Type: application/json" \
    -d '{"to":"contact@biznomad.io"}'
  # Expect: {"ok":true,"id":"<resend-message-id>"}
  ```
  Confirm the email arrives in the destination inbox within 60 seconds. Capture the `id` field in SUMMARY.

  After confirming, delete `.env.local` (or keep it — it's gitignored — just don't commit).

  **Step B.1 — mail-tester composite score (ROADMAP §Phase 1 success criterion #2, FOUND-04)**

  ROADMAP success criterion #2 requires Resend email to pass SPF + DKIM + DMARC with a composite score ≥ 9/10 on mail-tester.com. The pre-phase DNS work scored 10/10 at DNS-commit time; this step RE-VERIFIES the score against the current DNS state to guarantee no drift happened during Phase 1 (Plan 09's Cloudflare script is constrained to A/CNAME, but a belt-and-braces check is cheap).

  ```bash
  cd /Users/ashleyakbar/barterkin
  node scripts/send-mailtest.mjs
  # The script:
  #   1. Fetches a fresh mail-tester.com inbox address
  #   2. Sends a Resend email to it (from hello@barterkin.com)
  #   3. Polls mail-tester.com's API for the composite score
  #   4. Prints the final score (e.g. "Score: 10/10" or "Score: 9.7/10")
  ```

  Acceptance: script output MUST report a composite score ≥ 9/10. If it's below 9:
  - Re-check SPF / DKIM / DMARC via `dig TXT barterkin.com`, `dig CNAME resend._domainkey.barterkin.com`, `dig TXT _dmarc.barterkin.com`.
  - Compare against the pre-phase values captured in `scripts/setup-dns.mjs`.
  - If a record is missing or different, re-run `scripts/setup-dns.mjs` to restore deliverability BEFORE marking Phase 1 done.

  Capture the exact score + mail-tester URL in SUMMARY.

  **Step C — Supabase Studio SMTP (FOUND-07 completion)**

  1. Visit `https://supabase.com/dashboard/project/hfdcsickergdcdvejbcw/settings/auth` (Authentication settings).
  2. Scroll to "SMTP Settings" (if not visible, it may live at `.../auth/emails`).
  3. Fill in:
     - Enable Custom SMTP: **On**
     - Sender email: `hello@barterkin.com`
     - Sender name: `Barterkin`
     - Host: `smtp.resend.com`
     - Port: `465`
     - Username: `resend`
     - Password: the `RESEND_API_KEY` value
     - Minimum interval: 60 seconds (default)
  4. Click "Save".
  5. Use Supabase Studio's "Send test email" button (if present) — or trigger a magic-link flow from the Auth section with the developer's email.
  6. Confirm the email arrives from `hello@barterkin.com` (NOT `noreply@mail.supabase.io`).

  **Step D — Vercel preview (ROADMAP §Phase 1 success criterion #3)**

  Trigger a preview deploy by pushing a throwaway branch:
  ```bash
  cd /Users/ashleyakbar/barterkin
  git checkout -b verify-preview-deploy
  echo "" >> README.md   # trivial change
  git commit -am "test(phase-1): verify preview deploy triggers"
  git push -u origin verify-preview-deploy
  ~/bin/gh pr create --fill --draft
  # Watch the PR page; Vercel bot comments within ~3 min with the preview URL.
  ```

  Verify:
  - `pnpm lint`, `pnpm typecheck`, `pnpm test --run`, `pnpm e2e`, `gitleaks` (five CI checks from Plan 08) all go green
  - Vercel preview deploy succeeds and the comment URL loads 200
  - Close the PR without merging; delete the branch: `~/bin/gh pr close --delete-branch`

  **Step E — Retire us-east-2 starter (D-21)**

  Visit `https://supabase.com/dashboard/project/vlrioprefvwkahryuuap/settings/general` → Danger Zone → Delete project. Confirm the us-east-1 project (`hfdcsickergdcdvejbcw`) still works afterwards (`pnpm vercel dev` + open home page; or just confirm home page serves from Vercel prod).

  **Step F — Final Phase 1 deliverable check (CONTEXT §specifics + ROADMAP success criteria)**

  1. `barterkin.com` loads the legacy Netlify page (Plan 09 verification repeats).
  2. `https://barterkin.vercel.app/` loads the new Next.js scaffold with sage palette.
  3. Click "Fire test event" → event visible in PostHog within 60s.
  4. `pnpm vercel env pull .env.local && curl -X POST localhost:3000/api/test-email -d '{"to":"..."}'` succeeds and email arrives.
  5. Chrome DevTools → Application → Manifest shows "Install" option for `https://barterkin.vercel.app/`.
  6. `node scripts/send-mailtest.mjs` reports composite score ≥ 9/10 (ROADMAP success criterion #2 re-verified).

  All 6 green → Phase 1 is done.
  </how-to-verify>
  <resume-signal>
  Type `phase-1-complete` after all 7 verification steps pass (A, B, B.1, C, D, E, F); OR describe the failing step (e.g. "mail-tester reported 8/10 — SPF drift" or "PostHog event didn't show up — check A4 host assumption") so Plan 10 can be revised.
  </resume-signal>
</task>

<task type="auto" tdd="false">
  <name>Task 3: Update README with env-var manifest, commit, close phase</name>
  <files>
    - /Users/ashleyakbar/barterkin/README.md
  </files>
  <read_first>
    - /Users/ashleyakbar/barterkin/README.md (accumulation from Plans 01/05/06/08/09)
    - /Users/ashleyakbar/barterkin/.env.local.example (7 vars)
  </read_first>
  <action>
  Step 1 — Add a concise "Vercel deploys + env vars" section to README. Edit after the existing "Environment variables" section:
  ```markdown
  ## Vercel deploys

  - **Production:** `main` branch pushes auto-deploy to `https://barterkin.vercel.app` via Vercel GitHub integration.
  - **Preview:** Every PR gets a unique `*.vercel.app` URL in the Vercel bot's comment.
  - **Development:** `pnpm dev` at `http://localhost:3000` with `.env.local`.

  ### Env-var manifest

  All 7 Phase-1 variables are set in Vercel for **production**, **preview**, and **development** scopes (developer command: `pnpm vercel env pull .env.local` to sync local):

  | Var | Scope | Sensitive | Source |
  |-----|-------|-----------|--------|
  | `NEXT_PUBLIC_SUPABASE_URL` | all 3 | no | `https://hfdcsickergdcdvejbcw.supabase.co` |
  | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | all 3 | no | Supabase Studio → API |
  | `SUPABASE_SERVICE_ROLE_KEY` | all 3 | **yes** | Supabase Studio → API |
  | `RESEND_API_KEY` | all 3 | **yes** | Resend dashboard |
  | `NEXT_PUBLIC_POSTHOG_KEY` | all 3 | no | PostHog project 387571 |
  | `NEXT_PUBLIC_POSTHOG_HOST` | all 3 | no | `https://us.i.posthog.com` |
  | `NEXT_PUBLIC_SITE_URL` | per scope | no | `localhost:3000` / `${VERCEL_URL}` / `barterkin.vercel.app` |

  Server-only vars (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`) are marked **Sensitive** in Vercel so build logs mask them (PITFALLS Pitfall 5). Never add `NEXT_PUBLIC_` to them — the public repo means inlined secrets are world-readable.

  ## Pulling fresh env values locally

  ```bash
  pnpm vercel env pull .env.local   # default: pulls the `development` scope
  ```

  Re-pull after any env change in Vercel. The file is gitignored; re-syncing is safe.
  ```

  Step 2 — Commit + close the phase:
  ```bash
  cd /Users/ashleyakbar/barterkin
  git add package.json pnpm-lock.yaml README.md
  git commit -m "docs(foundation): Vercel env-var manifest + vercel CLI dep

- pnpm add -D vercel (CLI for env sync + deploy commands)
- README: env-var manifest by scope + sensitive-flag guidance (PITFALLS Pitfall 5)
- Documents \`pnpm vercel env pull\` for local .env.local hydration

Closes Phase 1. Covers FOUND-03 (DNS proven via deploy), FOUND-06 (Vercel env scopes populated + Git integration live), FOUND-07 (Supabase Studio SMTP manually wired in Task 2 Step C), FOUND-11 (Vercel preview deploys green)."
  git push origin main
  ```
  </action>
  <acceptance_criteria>
    - `grep -q "Vercel deploys" /Users/ashleyakbar/barterkin/README.md`
    - `grep -q "vercel env pull" /Users/ashleyakbar/barterkin/README.md`
    - `grep -q "\\*\\*Sensitive\\*\\*" /Users/ashleyakbar/barterkin/README.md` or `grep -q "Sensitive" /Users/ashleyakbar/barterkin/README.md` (sensitive-flag docs)
    - `jq -r '.devDependencies.vercel' /Users/ashleyakbar/barterkin/package.json` is non-null
    - `git log --oneline -1 | grep -q "Vercel env-var manifest"`
    - Working tree clean: `test -z "$(git status --porcelain)"`
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && grep -q "vercel env pull" README.md && test -z "$(git status --porcelain)" && git log --oneline -1 | grep -q "Vercel env-var manifest"</automated>
  </verify>
  <done>README documents the env-var manifest and local-sync flow; final Phase 1 commit on `origin/main`.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Vercel env vars → build/runtime | Scoped production/preview/development; sensitive flag controls log masking (PITFALLS Pitfall 5). |
| `NEXT_PUBLIC_*` → browser bundle | Accepted — these are client-safe by design. |
| `SUPABASE_SERVICE_ROLE_KEY` / `RESEND_API_KEY` → build logs | Marked Sensitive in Vercel UI; Vercel masks sensitive vars automatically. Never echoed in source. |
| Supabase Studio SMTP → Resend | API key stored in Supabase Studio (managed secret); not in repo. |
| us-east-2 starter project deletion | One-time action; removes the risk of a future `supabase link` to the wrong ref. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-10-01 | Information Disclosure | Secret in Vercel build log (unmasked) | mitigate | Server-only secrets marked **Sensitive** (UI toggle documented in Task 1 Step 5) → Vercel's log-masking applies. No `console.log(process.env)` in any file (verified by Plan 08 gitleaks CI + grep here). |
| T-10-02 | Tampering | Wrong-scope env var (e.g. prod service-role in development) | accept with caveat | For MVP, all 3 scopes share the same Supabase project (hfdcsickergdcdvejbcw) per RESEARCH line 892. When a second dev environment is provisioned (Phase 2+), re-scope keys per env. Documented as a future action. |
| T-10-03 | Elevation of Privilege | Preview deploys from forks having access to production secrets | mitigate | Vercel's default policy: preview deploys from forks do NOT receive env vars unless a Vercel admin explicitly enables. This is the default; no action needed. |
| T-10-04 | Repudiation | Deploy from a compromised GitHub account | accept (solo builder scope) | D-15 skips branch protection; solo builder + 2FA on GitHub is the baseline. Revisit if collaborators join. |
| T-10-05 | Denial of Service | Vercel Hobby plan hitting compute-hours limit | accept | Phase 1 has trivial traffic; Phase 6 launch may need Pro. Flag in SUMMARY if deploy counts trend high. |
| T-10-06 | Information Disclosure | `.vercel/project.json` committed accidentally | mitigate | `.gitignore` excludes `.vercel/` (Plan 01) — verified before commit |
| T-10-07 | Spoofing | `/api/test-email` production safeguard bypassed via NODE_ENV manipulation | mitigate | Vercel sets NODE_ENV=production for all serverless functions; developer cannot override; manual test paths documented (Task 2 Step B uses local `pnpm dev` only) |
| T-10-08 | Information Disclosure | us-east-2 starter project linked by mistake → migration in wrong DB | mitigate | Task 2 Step E retires the starter project; Plan 06 `supabase/config.toml` pin also prevents this |
</threat_model>

<verification>
Plan 10 (and Phase 1) is complete when:
1. Vercel project linked + all 7 env vars set in production/preview/development
2. Production deploy green at `https://barterkin.vercel.app/`
3. `curl` smoke tests return 200 for `/`, `/manifest.webmanifest`, `/sw.js`
4. PostHog `test_event` from home-page button visible in dashboard (ROADMAP §#5)
5. Resend test-email delivers end-to-end
6. `node scripts/send-mailtest.mjs` reports composite score ≥ 9/10 (ROADMAP §#2)
7. Supabase Studio SMTP configured and verified
8. Preview deploy works green on a throwaway PR with all 5 CI checks green (ROADMAP §#3)
9. us-east-2 starter project deleted (D-21 closed)
10. Final commit on `origin/main`; all artefacts documented in README
</verification>

<success_criteria>
- FOUND-03 satisfied end-to-end (domain → Netlify via Plan 09; Vercel runs the app at `barterkin.vercel.app`)
- FOUND-06 fully satisfied (Vercel project + 3 env scopes + Git integration live)
- FOUND-07 satisfied (Supabase Studio SMTP → Resend manually confirmed; magic-links in Phase 2 will validate at real-traffic scale)
- FOUND-11 fully satisfied (CI green + Vercel preview green on PRs)
- ROADMAP §Phase 1 success criteria #1, #3, #5 all verifiable end-to-end
- Phase 1 exits with a deployable, observable, secret-safe, DNS-live foundation
</success_criteria>

<output>
After completion, create `/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-10-SUMMARY.md` with the following captures:

- Vercel production URL (alias + deployment URL)
- Commit SHA of the final Phase 1 push
- Latest CI run URL + status (green expected)
- PostHog event ID from the Fire-test-event click
- Resend message ID from the test-email send
- mail-tester composite score (≥ 9/10) + mail-tester URL (ROADMAP §#2 re-verified)
- Supabase SMTP configuration status (configured / deferred)
- us-east-2 starter retirement status (deleted / pending)
- Any open Phase-2-blocking items (expected: none)

Then create `/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-SUMMARY.md` rolling up all 10 plan summaries for the phase-level view.
</output>
