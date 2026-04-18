---
phase: 01-foundation-infrastructure
plan: 04
plan_number: 4
plan_name: pwa-serwist
type: execute
wave: 3
depends_on: [3]
files_modified:
  - /Users/ashleyakbar/barterkin/package.json
  - /Users/ashleyakbar/barterkin/pnpm-lock.yaml
  - /Users/ashleyakbar/barterkin/next.config.ts
  - /Users/ashleyakbar/barterkin/app/sw.ts
  - /Users/ashleyakbar/barterkin/app/manifest.ts
  - /Users/ashleyakbar/barterkin/app/~offline/page.tsx
  - /Users/ashleyakbar/barterkin/public/icons/icon-192.png
  - /Users/ashleyakbar/barterkin/public/icons/icon-512.png
  - /Users/ashleyakbar/barterkin/public/icons/icon-maskable.png
  - /Users/ashleyakbar/barterkin/global.d.ts
autonomous: true
requirements:
  - FOUND-09
must_haves:
  truths:
    - "`@serwist/next` and `serwist` installed as devDependencies at pinned versions"
    - "next.config.ts wraps the config with `withSerwist` and sets `disable: process.env.NODE_ENV === 'development'` (RESEARCH Pattern 2)"
    - "app/sw.ts is a valid Serwist service worker source file"
    - "app/manifest.ts returns a Next.js MetadataRoute.Manifest with Barterkin name/colors/icons"
    - "3 PWA icons exist at public/icons/icon-{192,512,maskable}.png (placeholders — Phase 6 swaps for branded set)"
    - "`pnpm build --webpack` generates `public/sw.js` and exits 0"
    - "`curl -I http://localhost:3000/manifest.webmanifest` returns 200 when `pnpm start` is running after a build"
    - "`/~offline` route exists for offline fallback"
  artifacts:
    - path: "/Users/ashleyakbar/barterkin/next.config.ts"
      provides: "withSerwist-wrapped Next.js config"
      contains: "withSerwist"
    - path: "/Users/ashleyakbar/barterkin/app/sw.ts"
      provides: "Serwist service worker source (precache + defaultCache + offline fallback)"
      contains: "new Serwist("
    - path: "/Users/ashleyakbar/barterkin/app/manifest.ts"
      provides: "Next.js dynamic web manifest"
      contains: "export default function manifest"
    - path: "/Users/ashleyakbar/barterkin/app/~offline/page.tsx"
      provides: "Offline fallback HTML matching Serwist's fallback entry"
      exports: ["default"]
    - path: "/Users/ashleyakbar/barterkin/public/icons/icon-192.png"
      provides: "192×192 PWA icon (placeholder sage/forest)"
    - path: "/Users/ashleyakbar/barterkin/public/icons/icon-512.png"
      provides: "512×512 PWA icon"
    - path: "/Users/ashleyakbar/barterkin/public/icons/icon-maskable.png"
      provides: "512×512 maskable PWA icon"
  key_links:
    - from: "next.config.ts"
      to: "app/sw.ts"
      via: "withSerwist({ swSrc: 'app/sw.ts', swDest: 'public/sw.js' })"
      pattern: "swSrc:\\s*['\"]app/sw\\.ts['\"]"
    - from: "app/sw.ts"
      to: "app/~offline/page.tsx"
      via: "Serwist fallbacks config using matcher for document requests"
      pattern: "fallbacks"
    - from: "app/manifest.ts"
      to: "public/icons/*.png"
      via: "manifest icons array referencing file paths"
      pattern: "/icons/icon-(192|512|maskable)\\.png"
---

<objective>
Wire Serwist-backed PWA: service worker source, web app manifest, offline fallback page, three placeholder icons, and the `withSerwist` next.config wrapper. Service worker is disabled in development (per RESEARCH Pattern 2); production build under webpack (already pinned in Plan 02) generates `public/sw.js`. Phase 6 (Landing + Polish) replaces the placeholder icons with the final branded set — not this phase.

Purpose: FOUND-09 requires an installable PWA shell from day one. Landing the plumbing in Phase 1 means Phase 6 is a visual swap (icons, theme-color, content) rather than an infrastructure project. Serwist + Turbopack incompat is why `build` already uses `--webpack` (Plan 02 Task 1 Step 4) — this plan leverages that pin.

Output: `pnpm build` produces `public/sw.js`; `pnpm start` serves `/manifest.webmanifest` with Barterkin metadata and icons; Chrome DevTools > Application > Manifest shows "Install" is available.
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
@/Users/ashleyakbar/barterkin/next.config.ts
@/Users/ashleyakbar/barterkin/.gitignore
@/Users/ashleyakbar/barterkin/app/layout.tsx
@/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-03-SUMMARY.md

<interfaces>
Package versions (RESEARCH Standard Stack line 132; verify with `pnpm view` if > 30 days):
- `@serwist/next`: `^9.0.0`
- `serwist`: `^9.0.0`

Existing build script (Plan 02): `"build": "next build --webpack"` — keep. Serwist + Turbopack are incompatible at build time (PITFALLS Pitfall 2 / RESEARCH Pattern 2).

Serwist config structure (RESEARCH Pattern 2, line ~392):
```ts
import withSerwistInit from '@serwist/next'
const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
})
```

Manifest (RESEARCH Pattern 2, line ~440):
- name: 'Barterkin'
- short_name: 'Barterkin'
- description: "Georgia's community skills exchange."
- start_url: '/'
- display: 'standalone'
- background_color: '#eef3e8' (`--sage-bg`)
- theme_color: '#2d5a27' (`--forest`)

Next.js manifest.ts convention: when `app/manifest.ts` exists, Next.js serves it at `/manifest.webmanifest`.

`.gitignore` from Plan 01 already excludes `public/sw.js` and `public/workbox-*.js` so the generated files aren't committed. Icons under `public/icons/` ARE committed.

Global type declaration needed for `app/sw.ts`:
```ts
// global.d.ts — declares the service-worker self context
declare const self: ServiceWorkerGlobalScope
```
(This satisfies `tsc --noEmit` for the `sw.ts` file; alternative is `// @ts-check` ignores.)
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Install Serwist, wire next.config.ts, write sw.ts + manifest + offline page</name>
  <files>
    - /Users/ashleyakbar/barterkin/package.json
    - /Users/ashleyakbar/barterkin/pnpm-lock.yaml
    - /Users/ashleyakbar/barterkin/next.config.ts
    - /Users/ashleyakbar/barterkin/app/sw.ts
    - /Users/ashleyakbar/barterkin/app/manifest.ts
    - /Users/ashleyakbar/barterkin/app/~offline/page.tsx
    - /Users/ashleyakbar/barterkin/global.d.ts
    - /Users/ashleyakbar/barterkin/app/layout.tsx
  </files>
  <read_first>
    - /Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-RESEARCH.md §Pattern 2 (lines ~379-468)
    - /Users/ashleyakbar/barterkin/next.config.ts (current scaffold-default config)
    - /Users/ashleyakbar/barterkin/app/layout.tsx (current Plan 02 layout — needs `themeColor` and `appleWebApp` metadata)
    - /Users/ashleyakbar/barterkin/.gitignore (confirm `public/sw.js` exclusion from Plan 01)
    - /Users/ashleyakbar/barterkin/tsconfig.json (check whether WebWorker lib is present; may need update for sw.ts)
  </read_first>
  <action>
  Step 1 — Install deps:
  ```bash
  cd /Users/ashleyakbar/barterkin
  pnpm add -D @serwist/next serwist
  ```

  Step 2 — Replace `next.config.ts` with the Serwist-wrapped version (RESEARCH Pattern 2 line 392):
  ```ts
  // next.config.ts
  import type { NextConfig } from 'next'
  import withSerwistInit from '@serwist/next'

  const withSerwist = withSerwistInit({
    swSrc: 'app/sw.ts',
    swDest: 'public/sw.js',
    cacheOnNavigation: true,
    reloadOnOnline: true,
    // Serwist+Turbopack build incompat (PITFALLS Pitfall 2) → package.json build script uses --webpack.
    // Dev server (next dev) runs on Turbopack by default; disable PWA in dev to avoid friction.
    disable: process.env.NODE_ENV === 'development',
  })

  const nextConfig: NextConfig = {
    images: {
      remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
    },
  }

  export default withSerwist(nextConfig)
  ```

  Step 3 — Create `global.d.ts` at project root (or extend existing):
  ```ts
  // global.d.ts — service-worker global context for app/sw.ts
  declare const self: ServiceWorkerGlobalScope
  ```

  Step 4 — Create `app/sw.ts` (Serwist service worker entry, RESEARCH Pattern 2 line 411):
  ```ts
  import { defaultCache } from '@serwist/next/worker'
  import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
  import { Serwist } from 'serwist'

  declare global {
    interface WorkerGlobalScope extends SerwistGlobalConfig {
      __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
    }
  }

  declare const self: ServiceWorkerGlobalScope

  const serwist = new Serwist({
    precacheEntries: self.__SW_MANIFEST,
    skipWaiting: true,
    clientsClaim: true,
    navigationPreload: true,
    runtimeCaching: defaultCache,
    fallbacks: {
      entries: [
        {
          url: '/~offline',
          matcher: ({ request }) => request.destination === 'document',
        },
      ],
    },
  })

  serwist.addEventListeners()
  ```

  Step 5 — Create `app/manifest.ts` (Next.js dynamic manifest, RESEARCH Pattern 2 line 440):
  ```ts
  import type { MetadataRoute } from 'next'

  export default function manifest(): MetadataRoute.Manifest {
    return {
      name: 'Barterkin',
      short_name: 'Barterkin',
      description: "Georgia's community skills exchange.",
      start_url: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      background_color: '#eef3e8', // --color-sage-bg
      theme_color: '#2d5a27',       // --color-forest
      icons: [
        { src: '/icons/icon-192.png',      sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512.png',      sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    }
  }
  ```

  Step 6 — Create offline fallback at `app/~offline/page.tsx`. (Next.js treats `~` literally — the route is `/~offline`; safe character that won't collide with any future app route.)
  ```tsx
  export const metadata = {
    title: 'Offline — Barterkin',
  }

  export default function OfflinePage() {
    return (
      <main className="min-h-screen flex items-center justify-center bg-sage-bg text-forest-deep p-6">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-3xl mb-4">You&apos;re offline</h1>
          <p className="text-forest-mid">
            Barterkin will be back when your connection returns. Your session and any in-progress
            messages are preserved on your device.
          </p>
        </div>
      </main>
    )
  }
  ```

  Step 7 — Add PWA metadata to `app/layout.tsx` so browsers pick up the theme color and Apple web-app hint. Edit the existing `export const metadata` block to:
  ```ts
  import type { Metadata, Viewport } from 'next'

  // ... (keep existing font imports)

  export const metadata: Metadata = {
    title: 'Barterkin',
    description: "Georgia's community skills exchange.",
    appleWebApp: { capable: true, title: 'Barterkin', statusBarStyle: 'default' },
    applicationName: 'Barterkin',
    formatDetection: { telephone: false },
  }

  export const viewport: Viewport = {
    themeColor: '#2d5a27',
    width: 'device-width',
    initialScale: 1,
  }
  ```
  (Preserve the existing `RootLayout` function and `<html>` / `<body>` markup from Plan 02.)
  </action>
  <acceptance_criteria>
    - `jq -r '.devDependencies["@serwist/next"]' /Users/ashleyakbar/barterkin/package.json` matches `^9`
    - `jq -r '.devDependencies.serwist' /Users/ashleyakbar/barterkin/package.json` matches `^9`
    - `grep -q "withSerwist" /Users/ashleyakbar/barterkin/next.config.ts` and `grep -q "swSrc: 'app/sw.ts'" /Users/ashleyakbar/barterkin/next.config.ts`
    - `grep -q "disable: process.env.NODE_ENV === 'development'" /Users/ashleyakbar/barterkin/next.config.ts`
    - `test -f /Users/ashleyakbar/barterkin/app/sw.ts && grep -q "new Serwist(" /Users/ashleyakbar/barterkin/app/sw.ts`
    - `test -f /Users/ashleyakbar/barterkin/app/manifest.ts && grep -q "short_name: 'Barterkin'" /Users/ashleyakbar/barterkin/app/manifest.ts`
    - `grep -q "background_color: '#eef3e8'" /Users/ashleyakbar/barterkin/app/manifest.ts` (sage-bg)
    - `grep -q "theme_color: '#2d5a27'" /Users/ashleyakbar/barterkin/app/manifest.ts` (forest)
    - `test -f /Users/ashleyakbar/barterkin/app/~offline/page.tsx && grep -q "You&apos;re offline\|You're offline" /Users/ashleyakbar/barterkin/app/~offline/page.tsx`
    - `test -f /Users/ashleyakbar/barterkin/global.d.ts`
    - `grep -q "themeColor: '#2d5a27'" /Users/ashleyakbar/barterkin/app/layout.tsx` (viewport export or metadata)
    - `grep -q "appleWebApp" /Users/ashleyakbar/barterkin/app/layout.tsx`
    - `cd /Users/ashleyakbar/barterkin && pnpm typecheck` exits 0
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && pnpm typecheck && grep -q "withSerwist" next.config.ts && grep -q "short_name: 'Barterkin'" app/manifest.ts && test -f app/sw.ts && test -f "app/~offline/page.tsx"</automated>
  </verify>
  <done>All Serwist wiring files in place; typecheck passes; placeholder icons still pending (next task).</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: Generate placeholder icons, verify build emits sw.js, commit</name>
  <files>
    - /Users/ashleyakbar/barterkin/public/icons/icon-192.png
    - /Users/ashleyakbar/barterkin/public/icons/icon-512.png
    - /Users/ashleyakbar/barterkin/public/icons/icon-maskable.png
  </files>
  <read_first>
    - /Users/ashleyakbar/barterkin/app/manifest.ts (exact icon filenames + purpose values — must match)
  </read_first>
  <action>
  Step 1 — Install `sharp` as a devDependency, then generate 3 placeholder icons. `sharp` is an optional peer of Next.js and may not resolve via plain CommonJS `require()` in all environments; explicitly installing it avoids silent `MODULE_NOT_FOUND` failures. 5MB one-time install is acceptable — it's used only at scaffold time and can be removed after Phase 6 swaps in branded icons.
  ```bash
  cd /Users/ashleyakbar/barterkin
  mkdir -p public/icons
  pnpm add -D sharp

  # Generate the 3 icons with an inline Node ESM script (sharp resolved from node_modules).
  node <<'EOF'
  const sharp = require('sharp');
  const fs = require('fs');

  const sage = '#eef3e8';
  const forest = '#2d5a27';

  async function makeIcon(size, filename, maskable = false) {
    // Simple solid forest square with centered Lora-style "B" in sage.
    // Maskable variant: add 10% safe padding so the "B" survives circular masks.
    const pad = maskable ? Math.floor(size * 0.1) : 0;
    const inner = size - pad * 2;
    const fontSize = Math.floor(inner * 0.6);
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <rect width="${size}" height="${size}" fill="${forest}"/>
        <text x="50%" y="50%"
              text-anchor="middle" dominant-baseline="central"
              font-family="Georgia, Lora, serif" font-weight="700"
              font-size="${fontSize}" fill="${sage}">B</text>
      </svg>
    `;
    await sharp(Buffer.from(svg)).png().toFile(filename);
    console.log(`wrote ${filename}`);
  }

  (async () => {
    await makeIcon(192, 'public/icons/icon-192.png', false);
    await makeIcon(512, 'public/icons/icon-512.png', false);
    await makeIcon(512, 'public/icons/icon-maskable.png', true);
  })().catch((e) => { console.error(e); process.exit(1); });
  EOF
  ```

  Step 2 — Verify all three icons exist and are non-empty (guard against a silent script failure):
  ```bash
  ls -l /Users/ashleyakbar/barterkin/public/icons/
  file /Users/ashleyakbar/barterkin/public/icons/icon-192.png  # expect "PNG image data, 192 x 192"
  file /Users/ashleyakbar/barterkin/public/icons/icon-512.png  # expect "PNG image data, 512 x 512"
  ```

  Step 3 — Run the production build. Serwist must emit `public/sw.js`:
  ```bash
  cd /Users/ashleyakbar/barterkin
  pnpm build   # uses --webpack per Plan 02 pin
  ls -l public/sw.js   # generated by Serwist — must exist after build
  ```

  Step 4 — Run `pnpm start` and probe the manifest + icons:
  ```bash
  pnpm start &
  sleep 5
  curl -sI http://localhost:3000/manifest.webmanifest | head -1   # expect HTTP/1.1 200 OK
  curl -s  http://localhost:3000/manifest.webmanifest | grep -q '"short_name":"Barterkin"'
  curl -sI http://localhost:3000/icons/icon-192.png | head -1     # expect HTTP/1.1 200 OK
  curl -sI http://localhost:3000/sw.js | head -1                  # expect HTTP/1.1 200 OK
  kill %1
  ```

  Step 5 — Commit:
  ```bash
  git add package.json pnpm-lock.yaml next.config.ts global.d.ts app/sw.ts app/manifest.ts "app/~offline/page.tsx" app/layout.tsx public/icons/
  git commit -m "feat(foundation): Serwist PWA shell + manifest + placeholder icons

- @serwist/next@9 wired via withSerwist in next.config.ts
- app/sw.ts Serwist service worker (precache + defaultCache + /~offline fallback)
- app/manifest.ts — name/short_name/theme_color/background_color from palette
- app/~offline/page.tsx — offline HTML shell
- 3 placeholder icons (192/512/maskable) generated via sharp
- PWA disabled in dev (Turbopack-friendly); build uses --webpack (Plan 02 pin)

Covers FOUND-09. Phase 6 replaces placeholder icons with the final branded set."
  git push origin main

  # Note: public/sw.js and public/workbox-*.js are .gitignore-excluded from Plan 01 —
  # they are build artefacts, regenerated on every `pnpm build`.
  ```
  </action>
  <acceptance_criteria>
    - `test -f /Users/ashleyakbar/barterkin/public/icons/icon-192.png` and file size > 200 bytes (not empty)
    - `file /Users/ashleyakbar/barterkin/public/icons/icon-192.png | grep -q "192 x 192"` (ImageMagick/file reports correct dims)
    - `file /Users/ashleyakbar/barterkin/public/icons/icon-512.png | grep -q "512 x 512"`
    - `test -f /Users/ashleyakbar/barterkin/public/icons/icon-maskable.png`
    - `cd /Users/ashleyakbar/barterkin && pnpm build` exits 0 under webpack
    - After `pnpm build`, `test -f /Users/ashleyakbar/barterkin/public/sw.js` (Serwist-emitted; regenerated each build)
    - `pnpm start &` then `curl -sI http://localhost:3000/manifest.webmanifest | head -1` returns `HTTP/1.1 200 OK`
    - `curl -s http://localhost:3000/manifest.webmanifest | grep -q '"short_name":"Barterkin"'`
    - `curl -sI http://localhost:3000/sw.js | head -1` returns `HTTP/1.1 200 OK`
    - `curl -sI http://localhost:3000/icons/icon-192.png | head -1` returns `HTTP/1.1 200 OK`
    - `git log --oneline -1 | grep -q "Serwist PWA shell"`
    - `git ls-files public/sw.js 2>/dev/null | wc -l` returns `0` (sw.js NOT tracked — it's a build artefact)
    - `git ls-files public/icons/ | wc -l` returns `3` (3 icon PNGs tracked)
  </acceptance_criteria>
  <verify>
    <automated>cd /Users/ashleyakbar/barterkin && pnpm build && test -f public/sw.js && test -f public/icons/icon-192.png && test -f public/icons/icon-512.png && git ls-files public/icons | wc -l | grep -q '^3$' && ! git ls-files public/sw.js | grep -q sw.js</automated>
  </verify>
  <done>Production build emits `public/sw.js`, manifest served at `/manifest.webmanifest` with Barterkin metadata, 3 placeholder icons committed, build artefacts NOT tracked, commit on `origin/main`.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Service worker fetch handler → network | Serwist caches navigation responses; must not cache authenticated API responses containing cookies. `defaultCache` handles this correctly (excludes POST + credentials) — relying on Serwist maintained defaults. |
| Offline fallback → static asset | Offline page is pure HTML/CSS; no data access, no secrets. |
| Manifest icons → public bucket | Icons served from `/public/icons/`; no PII or auth data. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-04-01 | Information Disclosure | Service worker caching authenticated Supabase responses | accept (Phase 1) | Phase 1 has no authenticated content or Supabase read paths yet; Serwist `defaultCache` from `@serwist/next/worker` excludes non-GET and credentialed fetches by default. Revisit in Phase 4 (Directory) with `runtimeCaching` rules for `*.supabase.co` (deny list) |
| T-04-02 | Denial of Service | Service worker returning stale offline page for authenticated routes | accept | `/~offline` is a plain static page; worst case user sees offline message. No data corruption risk. |
| T-04-03 | Tampering | `public/sw.js` committed and drifted from `app/sw.ts` | mitigate | `.gitignore` excludes `public/sw.js` (Plan 01); `pnpm build` regenerates on every build; CI (Plan 08) runs build which regenerates |
| T-04-04 | Spoofing | PWA icons hotlinked from an attacker-controlled host | mitigate | Manifest references `/icons/*.png` (same-origin only); no external URLs |
| T-04-05 | Information Disclosure | Build-time console logs including env vars (Pitfall 5 from RESEARCH) | mitigate | No `console.log(process.env)` anywhere in `next.config.ts`, `sw.ts`, or `manifest.ts`; Plan 08 gitleaks CI rescans on every PR |
</threat_model>

<verification>
Plan 04 is complete when:
1. `pnpm build` exits 0 and emits `public/sw.js`
2. `pnpm start` + `curl -sI /manifest.webmanifest` returns 200
3. 3 icons at `public/icons/icon-{192,512,maskable}.png` all exist with correct dimensions
4. `/~offline` route renders without errors
5. `git ls-files public/sw.js` returns empty (build artefact not tracked)
6. Commit on `origin/main`
</verification>

<success_criteria>
- FOUND-09 satisfied: installable PWA shell with manifest + service worker + icon set
- Phase 6 only needs to swap icons + polish offline page — plumbing is done
- Build pipeline (`--webpack`) inherited from Plan 02 still works end-to-end
</success_criteria>

<output>
After completion, create `/Users/ashleyakbar/barterkin/.planning/phases/01-foundation-infrastructure/01-04-SUMMARY.md`. Capture the exact `@serwist/next` + `serwist` versions installed and the commit SHA. Note explicitly that Phase 6 (Landing + Polish) is responsible for replacing the 3 placeholder icons with branded assets.
</output>
