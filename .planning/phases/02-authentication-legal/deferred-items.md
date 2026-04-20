## Pre-existing TypeScript errors (out of scope for 02-07)

Discovered during `pnpm typecheck` run for plan 02-07:

- `app/(auth)/login/page.tsx(21,10)`: `<GoogleAuthBlock />` missing required `captchaToken` prop
- `app/(auth)/login/page.tsx(29,10)`: `<LoginForm />` missing required `captchaToken` prop  
- `app/(auth)/signup/page.tsx(21,10)`: `<GoogleAuthBlock />` missing required `captchaToken` prop
- `app/(auth)/signup/page.tsx(29,10)`: `<LoginForm />` missing required `captchaToken` prop

These errors exist in files not touched by plan 02-07. `LoginForm` and `GoogleAuthBlock` have `captchaToken: string | null` as a required prop but the page components pass no props. These were pre-existing before plan 02-07 started.

Root cause: the `captchaToken` prop was likely added to the form components in plans 02-05/02-06 (gap-turnstile/gap-oauth-verified) but the page-level wiring was not yet done (page needs to pass a Turnstile token state down). This is a plan-02-08 or separate gap plan concern.

