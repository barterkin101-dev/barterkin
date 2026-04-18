---
phase: 01-foundation-infrastructure
plan: 02
plan_number: 2
plan_name: nextjs-scaffold
type: execute
wave: 1
depends_on: [1]
files_modified:
  - /Users/ashleyakbar/barterkin/package.json
  - /Users/ashleyakbar/barterkin/pnpm-lock.yaml
  - /Users/ashleyakbar/barterkin/tsconfig.json
  - /Users/ashleyakbar/barterkin/next.config.ts
  - /Users/ashleyakbar/barterkin/postcss.config.mjs
  - /Users/ashleyakbar/barterkin/eslint.config.mjs
  - /Users/ashleyakbar/barterkin/components.json
  - /Users/ashleyakbar/barterkin/app/layout.tsx
  - /Users/ashleyakbar/barterkin/app/page.tsx
  - /Users/ashleyakbar/barterkin/app/globals.css
  - /Users/ashleyakbar/barterkin/components/ui/button.tsx
  - /Users/ashleyakbar/barterkin/components/ui/card.tsx
  - /Users/ashleyakbar/barterkin/components/ui/input.tsx
  - /Users/ashleyakbar/barterkin/components/ui/label.tsx
  - /Users/ashleyakbar/barterkin/lib/utils.ts
autonomous: false
requirements:
  - FOUND-01
  - FOUND-02
must_haves:
  truths:
    - "`pnpm install` runs clean against the pinned lockfile"
    - "`pnpm dev` boots Next.js on http://localhost:3000 with no errors"
    - "`pnpm typecheck` (tsc --noEmit) exits 0"
    - "`pnpm build --webpack` exits 0 (Serwist compat requires webpack per PITFALLS Pitfall 2; configured here even though PWA wrapping comes in Plan 04)"
    - "app/globals.css declares all 7 palette vars in `@theme` and bridges next/font vars via `@theme inline`"
    - "Lora (serif) and Inter (sans) loaded via next/font/google in app/layout.tsx"
    - "shadcn new-york style installed with 4 primitives (button, card, input, label)"
    - "Placeholder home page at / renders `Barterkin foundation` and shows the sage palette"
  artifacts:
    - path: "/Users/ashleyakbar/barterkin/package.json"
      provides: "Workspace manifest pinning Next.js 16.2, React 19.2, TS 5.7, Tailwind v4, shadcn deps"
      contains: "\"next\": \"^16.2"
    - path: "/Users/ashleyakbar/barterkin/app/globals.css"
      provides: "Tailwind v4 theme tokens (@theme + @theme inline) + shadcn base layer"
      contains: "@theme"
    - path: "/Users/ashleyakbar/barterkin/app/layout.tsx"
      provides: "Root layout with Lora + Inter fonts and palette-aware body classes"
      contains: "next/font/google"
    - path: "/Users/ashleyakbar/barterkin/components.json"
      provides: "shadcn config in new-york + Tailwind v4 mode"
      contains: "\"style\": \"new-york\""
    - path: "/Users/ashleyakbar/barterkin/components/ui/button.tsx"
      provides: "shadcn Button primitive (proof the CLI init succeeded)"
      contains: "data-slot=\"button\""
  key_links:
    - from: "app/layout.tsx"
      to: "app/globals.css"
      via: "import './globals.css'"
      pattern: "import.*globals\\.css"
    - from: "app/globals.css"
      to: "next/font CSS variables"
      via: "@theme inline { --font-sans: var(--font-sans), ...; --font-serif: var(--font-serif), ...; }"
      pattern: "@theme inline"
    - from: "package.json build script"
      to: "Serwist compat requirement"
      via: "\"build\": \"next build --webpack\" (PITFALLS Pitfall 2)"
      pattern: "next build --webpack"
---

<objective>
Scaffold Next.js 16.2 with TypeScript strict, App Router, Tailwind v4, shadcn/ui (new-york), and Lora + Inter fonts. Port the sage/forest/clay palette from `legacy/index.html` into `@theme` tokens. Build script uses `--webpack` so Plan 04 (Serwist PWA) can drop in without compat rework.

Purpose: This is the only plan that touches the base scaffold files. Every Wave 2+ plan (Supabase SSR, PWA, PostHog, Resend, tests, CI) depends on this output. Get the palette and fonts correct here once — downstream plans inherit them.

Output: Runnable Next.js app, 4 shadcn primitives, palette + fonts wired, build passes under webpack.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-CONTEXT.md
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-RESEARCH.md
@/Users/ashleyakbar/barterkin/.planning/research/STACK.md
@/Users/ashleyakbar/barterkin/.planning/research/PITFALLS.md
@/Users/ashleyakbar/barterkin/legacy/index.html
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-01-SUMMARY.md

<interfaces>
CSS variables to port from `legacy/index.html` into `@theme` (verbatim hex values — do not tweak):
```
--sage-bg:     #eef3e8
--sage-light:  #dfe8d5
--sage-pale:   #f4f7f0
--forest:      #2d5a27
--forest-deep: #1e4420
--forest-mid:  #3a7032
--clay:        #c4956a
```
Under Tailwind v4 these become `--color-sage-bg`, `--color-forest`, etc. inside `@theme`. Utility classes then exist as `bg-sage-bg`, `text-forest`, `border-clay`, etc.

next/font variables:
- `Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })`
- `Lora({ subsets: ['latin'], variable: '--font-serif', display: 'swap' })`

These MUST be bridged with `@theme inline` (not plain `@theme`) per PITFALLS.md Pitfall 4 — otherwise `font-sans`/`font-serif` utilities fall back to system default.

Expected package versions (verify with `pnpm view <pkg> version` at exec time if > 30 days old):
- `next@16.2.x` (currently 16.2.2)
- `react@19.2.x`, `react-dom@19.2.x`
- `typescript@5.7.x`
- `tailwindcss@4.1.x`
- `@tailwindcss/postcss@4.1.x`
- `shadcn@3.x` CLI (via `pnpm dlx`)
- `lucide-react@0.4xx`
- `tw-animate-css@1.x` (shadcn new-york default)
</interfaces>
</context>

<tasks>

<task type="checkpoint:human-action" gate="blocking">
  <name>Task 1: Run create-next-app and install base deps</name>
  <files>
    - /Users/ashleyakbar/barterkin/package.json
    - /Users/ashleyakbar/barterkin/pnpm-lock.yaml
    - /Users/ashleyakbar/barterkin/tsconfig.json
    - /Users/ashleyakbar/barterkin/next.config.ts
    - /Users/ashleyakbar/barterkin/postcss.config.mjs
    - /Users/ashleyakbar/barterkin/eslint.config.mjs
    - /Users/ashleyakbar/barterkin/app/layout.tsx
    - /Users/ashleyakbar/barterkin/app/page.tsx
    - /Users/ashleyakbar/barterkin/app/globals.css
  </files>
  <read_first>
    - /Users/ashleyakbar/barterkin/.planning/research/STACK.md §Installation (lines ~76-120)
    - /Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-RESEARCH.md §Pattern 2 (Serwist + Turbopack note), §Design Tokens (@theme inline), §Recommended Project Structure
    - /Users/ashleyakbar/barterkin/.planning/research/PITFALLS.md Pitfall 2 (Serwist + Turbopack build incompat), Pitfall 4 (Tailwind v4 font vars)
  </read_first>
  <action>
  Step 1 — Verify pnpm is available:
  ```bash
  which pnpm || corepack enable pnpm
  pnpm --version   # expect 9.x or later
  node --version   # expect v20.x or higher (v22.14.0 per memory is fine)
  ```

  Step 2 — Run `create-next-app` INTO the existing `~/barterkin` directory.
  `create-next-app` refuses to run inside a non-empty folder by default. Use the `--use-pnpm` flag and scaffold into a sibling temp dir, then move files across (keeps the Plan 01 commit + `.planning/` + `legacy/` intact):
  ```bash
  cd /tmp
  rm -rf barterkin-scaffold
  pnpm create next-app@16.2 barterkin-scaffold \
    --typescript --tailwind --eslint --app --src-dir=false --import-alias "@/*" --use-pnpm --turbopack
  # Non-interactive — these flags answer every prompt.
  ```
  Next.js 16 scaffolds with Turbopack as the default dev server (we keep that). `--tailwind` emits the Tailwind v4 PostCSS config.

  Step 3 — Copy the scaffold files into `~/barterkin` WITHOUT clobbering `.planning/`, `CLAUDE.md`, `legacy/`, `.gitignore`, `README.md`, `.env.local.example`:
  ```bash
  cd /tmp/barterkin-scaffold
  # Copy source files
  cp -r app /Users/ashleyakbar/barterkin/
  cp -r public /Users/ashleyakbar/barterkin/
  cp package.json tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs next-env.d.ts /Users/ashleyakbar/barterkin/
  # Preserve the existing .gitignore written in Plan 01 — do NOT overwrite
  cd /Users/ashleyakbar/barterkin
  rm -rf /tmp/barterkin-scaffold
  ```

  Step 4 — Override the `build` script to use webpack (PITFALLS Pitfall 2 / RESEARCH Pattern 2). Also add `typecheck`:
  Using the Edit tool, open `/Users/ashleyakbar/barterkin/package.json` and modify the `"scripts"` block to EXACTLY:
  ```json
  "scripts": {
    "dev": "next dev",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit"
  }
  ```
  Add `"engines": { "node": ">=20.0.0", "pnpm": ">=9.0.0" }` at the top level.

  Step 5 — Install (generates `pnpm-lock.yaml`):
  ```bash
  cd /Users/ashleyakbar/barterkin
  pnpm install
  ```
  Add `lucide-react` (icons for shadcn) and `tw-animate-css` (shadcn new-york default) + `@vercel/analytics`:
  ```bash
  pnpm add lucide-react tw-animate-css @vercel/analytics
  ```

  Step 6 — Smoke test the dev server:
  ```bash
  pnpm dev &
  sleep 8
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000   # expect 200
  kill %1
  ```

  This task is `checkpoint:human-action` because `create-next-app` may prompt if pnpm can't auto-install or if the network lags; user can retry or resolve. After `pnpm install` succeeds and `pnpm dev` returns 200, signal `resume`.
  </action>
  <acceptance_criteria>
    - `test -f /Users/ashleyakbar/barterkin/package.json`
    - `jq -r .dependencies.next /Users/ashleyakbar/barterkin/package.json` matches `^16.2` or later patch
    - `jq -r .dependencies.react /Users/ashleyakbar/barterkin/package.json` matches `^19.2`
    - `jq -r .devDependencies.typescript /Users/ashleyakbar/barterkin/package.json` matches `^5`
    - `jq -r '.devDependencies["tailwindcss"]' /Users/ashleyakbar/barterkin/package.json` matches `^4`
    - `jq -r .scripts.build /Users/ashleyakbar/barterkin/package.json` equals `next build --webpack`
    - `jq -r .scripts.typecheck /Users/ashleyakbar/barterkin/package.json` equals `tsc --noEmit`
    - `jq -r '.engines.node' /Users/ashleyakbar/barterkin/package.json` starts with `>=20`
    - `test -f /Users/ashleyakbar/barterkin/app/layout.tsx && test -f /Users/ashleyakbar/barterkin/app/page.tsx && test -f /Users/ashleyakbar/barterkin/app/globals.css`
    - `test -f /Users/ashleyakbar/barterkin/pnpm-lock.yaml`
    - `grep -q "\"strict\": true" /Users/ashleyakbar/barterkin/tsconfig.json`
    - `test -d /Users/ashleyakbar/barterkin/.planning` (preserved) && `test -f /Users/ashleyakbar/barterkin/legacy/index.html` (preserved)
    - `cd /Users/ashleyakbar/barterkin && pnpm typecheck` exits 0
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && jq -r '.scripts.build' package.json | grep -q "next build --webpack" && test -f app/globals.css && pnpm typecheck</automated>
  </verify>
  <done>Next.js 16.2 scaffold installed into `~/barterkin`, base deps installed, lockfile generated, `pnpm typecheck` passes, `legacy/` and `.planning/` preserved.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: shadcn init + primitives + palette/fonts wiring</name>
  <files>
    - /Users/ashleyakbar/barterkin/components.json
    - /Users/ashleyakbar/barterkin/components/ui/button.tsx
    - /Users/ashleyakbar/barterkin/components/ui/card.tsx
    - /Users/ashleyakbar/barterkin/components/ui/input.tsx
    - /Users/ashleyakbar/barterkin/components/ui/label.tsx
    - /Users/ashleyakbar/barterkin/lib/utils.ts
    - /Users/ashleyakbar/barterkin/app/layout.tsx
    - /Users/ashleyakbar/barterkin/app/page.tsx
    - /Users/ashleyakbar/barterkin/app/globals.css
  </files>
  <read_first>
    - /Users/ashleyakbar/barterkin/app/layout.tsx (current scaffold-default layout — inspect before replacing)
    - /Users/ashleyakbar/barterkin/app/globals.css (current scaffold-default stylesheet)
    - /Users/ashleyakbar/barterkin/legacy/index.html (source of truth for the 7 palette hex values)
    - /Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-RESEARCH.md §Pattern 3 (PostHog layout example), §Design Tokens, §shadcn Component Install Set
  </read_first>
  <action>
  Step 1 — Run shadcn init with new-york style, Tailwind v4 mode:
  ```bash
  cd /Users/ashleyakbar/barterkin
  pnpm dlx shadcn@latest init --yes --force-css-conflict --base-color=stone
  ```
  If the `--yes` prompt still asks for style, select `new-york` and for base-color select `stone`. shadcn writes `components.json`, updates `app/globals.css` with its base layer, creates `lib/utils.ts`, and adds `tailwindcss-animate` (or `tw-animate-css`) to `devDependencies`.

  Verify `components.json` has:
  ```json
  {
    "style": "new-york",
    "rsc": true,
    "tsx": true,
    "tailwind": { "config": "", "css": "app/globals.css", "baseColor": "stone", "cssVariables": true },
    "aliases": { "components": "@/components", "utils": "@/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" }
  }
  ```
  If `components.json` doesn't match, Edit it to this shape.

  Step 2 — Add 4 primitives (per Claude's Discretion guidance; skip `form` to avoid pulling RHF/Zod into Phase 1):
  ```bash
  pnpm dlx shadcn@latest add button card input label
  ```
  This writes `components/ui/{button,card,input,label}.tsx`.

  Step 3 — Rewrite `app/globals.css`. Preserve the shadcn base layer block that `shadcn init` emitted, but add the Barterkin palette in `@theme` and the font bridge in `@theme inline` — per PITFALLS Pitfall 4. The final file should look like:
  ```css
  @import "tailwindcss";
  @import "tw-animate-css";

  @custom-variant dark (&:is(.dark *));

  /* Barterkin palette — ported from legacy/index.html (verbatim hex) */
  @theme {
    --color-sage-bg:     #eef3e8;
    --color-sage-light:  #dfe8d5;
    --color-sage-pale:   #f4f7f0;
    --color-forest:      #2d5a27;
    --color-forest-deep: #1e4420;
    --color-forest-mid:  #3a7032;
    --color-clay:        #c4956a;
  }

  /* next/font CSS vars are registered on <html> as --font-sans / --font-serif;
     @theme inline is required to reference another CSS var (Tailwind v4 behaviour). */
  @theme inline {
    --font-sans:  var(--font-sans),  system-ui, -apple-system, sans-serif;
    --font-serif: var(--font-serif), Georgia, 'Times New Roman', serif;
  }

  /* shadcn new-york base layer — keep what shadcn init wrote below.
     If the init overwrote this file, paste the emitted :root { --background... --foreground... etc. } block here.
     Do NOT hand-edit shadcn tokens — re-run `shadcn add` if needed. */
  @layer base {
    :root {
      /* populated by `shadcn init` — leave untouched */
    }
    .dark {
      /* populated by `shadcn init` — leave untouched */
    }
  }

  @layer base {
    * { @apply border-border outline-ring/50; }
    body { @apply bg-background text-foreground; }
  }
  ```
  Use the Edit tool to make these changes — preserve the shadcn `:root {}` and `.dark {}` blocks emitted by `shadcn init` rather than deleting them.

  Step 4 — Rewrite `app/layout.tsx` with Lora + Inter via `next/font/google`:
  ```tsx
  import type { Metadata } from 'next'
  import { Inter, Lora } from 'next/font/google'
  import { Analytics } from '@vercel/analytics/next'
  import './globals.css'

  const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
  const lora  = Lora({ subsets: ['latin'], variable: '--font-serif', display: 'swap' })

  export const metadata: Metadata = {
    title: 'Barterkin',
    description: "Georgia's community skills exchange.",
  }

  export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
      <html lang="en" className={`${inter.variable} ${lora.variable}`}>
        <body className="font-sans bg-sage-bg text-forest-deep min-h-screen antialiased">
          {children}
          <Analytics />
        </body>
      </html>
    )
  }
  ```

  Step 5 — Rewrite `app/page.tsx` as a palette-proof placeholder (D-05 initial scaffold content + ROADMAP success criterion #1):
  ```tsx
  import { Button } from '@/components/ui/button'
  import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

  export default function HomePage() {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-xl w-full bg-sage-pale border-forest-mid/20">
          <CardHeader>
            <CardTitle className="font-serif text-3xl text-forest-deep">
              Barterkin foundation
            </CardTitle>
            <CardDescription className="text-forest-mid">
              Phase 1 scaffold: palette + fonts + shadcn installed. Auth, directory, and contact relay ship in Phases 2–5.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button className="bg-forest hover:bg-forest-deep text-sage-bg">Sage / forest primary</Button>
            <Button variant="outline" className="border-clay text-clay hover:bg-clay/10">Clay accent</Button>
          </CardContent>
        </Card>
      </main>
    )
  }
  ```

  Step 6 — Verify:
  ```bash
  pnpm typecheck
  pnpm build   # must succeed under webpack
  pnpm dev &
  sleep 8
  curl -s http://localhost:3000 | grep -oE "--color-(sage-bg|sage-light|sage-pale|forest|forest-deep|forest-mid|clay)" | sort -u | wc -l   # expect 7
  curl -s http://localhost:3000 | grep -qi "Barterkin foundation"
  kill %1
  ```
  </action>
  <acceptance_criteria>
    - `test -f /Users/ashleyakbar/barterkin/components.json && jq -r .style components.json` returns `new-york`
    - `test -f /Users/ashleyakbar/barterkin/components/ui/button.tsx` and `grep -q 'data-slot="button"' /Users/ashleyakbar/barterkin/components/ui/button.tsx` (shadcn v4 refactor marker)
    - `test -f /Users/ashleyakbar/barterkin/components/ui/card.tsx && test -f /Users/ashleyakbar/barterkin/components/ui/input.tsx && test -f /Users/ashleyakbar/barterkin/components/ui/label.tsx && test -f /Users/ashleyakbar/barterkin/lib/utils.ts`
    - `grep -cE "^\s*--color-(sage-bg|sage-light|sage-pale|forest|forest-deep|forest-mid|clay):" /Users/ashleyakbar/barterkin/app/globals.css` returns `7`
    - `grep -q "@theme inline" /Users/ashleyakbar/barterkin/app/globals.css` (font variable bridge present — PITFALLS Pitfall 4)
    - `grep -q "from 'next/font/google'" /Users/ashleyakbar/barterkin/app/layout.tsx` and `grep -qE "Inter\(|Lora\(" /Users/ashleyakbar/barterkin/app/layout.tsx`
    - `grep -q "variable: '--font-sans'" /Users/ashleyakbar/barterkin/app/layout.tsx` and `grep -q "variable: '--font-serif'" /Users/ashleyakbar/barterkin/app/layout.tsx`
    - `grep -q "Barterkin foundation" /Users/ashleyakbar/barterkin/app/page.tsx`
    - `cd /Users/ashleyakbar/barterkin && pnpm typecheck` exits 0
    - `cd /Users/ashleyakbar/barterkin && pnpm build` exits 0 under webpack (build logs include `Compiled successfully` or equivalent)
    - `pnpm dev` renders `http://localhost:3000` with HTTP 200 and the served HTML contains the string `Barterkin foundation`
    - Served CSS contains all 7 palette CSS variables when `curl http://localhost:3000 | grep -oE "--color-(sage|forest|clay)" | sort -u` is run (count matches 7 distinct vars across the page + inlined CSS chunk)
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && pnpm typecheck && pnpm build && grep -q "@theme inline" app/globals.css && grep -c "^  --color-" app/globals.css | awk '{exit ($1 >= 7) ? 0 : 1}'</automated>
  </verify>
  <done>shadcn installed in new-york + Tailwind v4 mode with 4 primitives; palette + fonts wired per PITFALLS-compliant patterns; placeholder home page renders the brand palette; `pnpm typecheck` + `pnpm build --webpack` both exit 0.</done>
</task>

<task type="auto">
  <name>Task 3: Commit scaffold + verify clean working tree</name>
  <files>
    - /Users/ashleyakbar/barterkin/package.json
    - /Users/ashleyakbar/barterkin/pnpm-lock.yaml
    - (all new scaffold files)
  </files>
  <read_first>
    - /Users/ashleyakbar/barterkin/.gitignore (ensure node_modules/.next are actually ignored before staging)
  </read_first>
  <action>
  ```bash
  cd /Users/ashleyakbar/barterkin
  git status
  git add package.json pnpm-lock.yaml tsconfig.json next.config.ts postcss.config.mjs eslint.config.mjs next-env.d.ts components.json app/ components/ lib/ public/
  git commit -m "feat(foundation): scaffold Next.js 16.2 + Tailwind v4 + shadcn new-york

- Next.js 16.2 App Router, React 19.2, TypeScript strict
- Tailwind v4 with @theme tokens (sage/forest/clay palette ported from legacy/index.html)
- @theme inline bridges next/font CSS vars (PITFALLS Pitfall 4)
- shadcn new-york primitives: button, card, input, label
- Lora + Inter via next/font/google
- build script uses --webpack (Serwist compat — PITFALLS Pitfall 2)

Covers FOUND-01, FOUND-02."
  git push origin main
  git status   # expect: clean
  ```
  </action>
  <acceptance_criteria>
    - `git -C /Users/ashleyakbar/barterkin log --oneline -1` shows `feat(foundation): scaffold Next.js 16.2 + Tailwind v4 + shadcn new-york`
    - `git -C /Users/ashleyakbar/barterkin status --porcelain | wc -l` returns `0` (clean tree)
    - `git -C /Users/ashleyakbar/barterkin ls-files | grep -c "^node_modules/"` returns `0` (node_modules not tracked — .gitignore holds)
    - `git -C /Users/ashleyakbar/barterkin ls-files | grep -c "^\.next/"` returns `0`
    - Remote is up to date: `git -C /Users/ashleyakbar/barterkin log origin/main..HEAD --oneline` is empty (local == origin/main)
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && git log --oneline -1 | grep -q "scaffold Next.js 16.2" && test -z "$(git status --porcelain)" && test -z "$(git log origin/main..HEAD --oneline)"</automated>
  </verify>
  <done>Scaffold commit lands on `origin/main`, working tree is clean, no build or node_modules leakage.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Committed source → public GitHub | Every file world-readable. Scaffold must not ship real env values. |
| `pnpm install` from npm registry | Supply-chain surface — lockfile pins exact versions after first install. |
| Build output → `.next/` | Not committed (`.gitignore` from Plan 01 excludes it). |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-02-01 | Tampering | `pnpm-lock.yaml` | mitigate | Lockfile committed; Plan 08 CI will run `pnpm install --frozen-lockfile` (D-16) to enforce reproducibility |
| T-02-02 | Information Disclosure | Build output accidentally committed | mitigate | `.gitignore` from Plan 01 excludes `.next/`, `out/`, `node_modules/`, `public/sw.js`; Plan 08 adds gitleaks as second line of defence |
| T-02-03 | Elevation of Privilege | Shadcn CLI pulling `tw-animate-css` from npm | accept | Widely-used package, lockfile pins exact version; supply-chain risk equivalent to rest of npm dep tree |
| T-02-04 | Denial of Service | `pnpm dev` port 3000 already in use on developer machine | accept | Error is loud (Next.js logs `Port 3000 is in use`); developer can re-run on a different port. No mitigation in plan. |
| T-02-05 | Tampering | shadcn init overwriting Plan-01 `.gitignore` | mitigate | Task 1 Step 3 explicitly avoids overwriting `.gitignore` when copying scaffold files; Task 2 verifies `.gitignore` still contains the Plan 01 lines before commit |
| T-02-06 | Information Disclosure | `next/font/google` making a fetch to Google at build time | accept | next/font self-hosts the font files into `.next` at build; no runtime call to Google. No env boundary crossed. |
</threat_model>

<verification>
Plan 02 is complete when:
1. `pnpm typecheck && pnpm build` both exit 0
2. `pnpm dev` serves localhost:3000 with HTTP 200 and content includes `Barterkin foundation`
3. Served CSS contains all 7 palette `--color-*` vars
4. `components/ui/{button,card,input,label}.tsx` all exist
5. `@theme inline` block present in globals.css (PITFALLS Pitfall 4 guard)
6. `scripts.build` in package.json equals `next build --webpack` (PITFALLS Pitfall 2 guard)
7. Commit pushed to `origin/main`; working tree clean
</verification>

<success_criteria>
- FOUND-01 satisfied: Next.js 16.2, pnpm, Tailwind v4, shadcn new-york, TS strict, Lora + Inter all wired
- FOUND-02 satisfied: Sage/forest/clay palette declared as Tailwind v4 `@theme` tokens
- Build-script webpack flag in place so Plan 04 (Serwist) can drop in without rework
- Font-variable bridge (`@theme inline`) in place so later UI plans don't trip on Pitfall 4
- `legacy/index.html` and `.planning/` untouched by scaffold
</success_criteria>

<output>
After completion, create `/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-02-SUMMARY.md`. Capture: exact Next.js patch version installed, exact shadcn CLI version, and the commit SHA.
</output>
