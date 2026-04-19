# A4 Probe Results — disposable-email-domains-js + signInWithOtp captchaToken

Probed: 2026-04-19

## A4: disposable-email-domains-js export shape

**Outcome B** — RESEARCH assumption A4 was incorrect. The package does NOT export a `DisposableEmailChecker` class. It exports named functions directly:

```
top-level keys: disposableEmailBlocklist, disposableEmailBlocklistSet, isDisposableEmailDomain, isDisposableEmail
```

**Wave 1 must use:**
```ts
import { isDisposableEmail } from 'disposable-email-domains-js'
// takes full email address, returns boolean
isDisposableEmail('test@mailinator.com') // true
isDisposableEmail('test@gmail.com')      // false
```

Also available: `isDisposableEmailDomain(domain: string)` — takes domain only.

Update Plan 02-02 Task 2-2-2: replace `new DisposableEmailChecker()` pattern with `{ isDisposableEmail }` named import from RESEARCH Pattern 7.

## Q1: signInWithOtp captchaToken enforcement

**Outcome Q1-A** — Supabase DOES enforce captchaToken on signInWithOtp.

Probe result with invalid token `'deliberately-invalid-token-probe'`:
```
error: captcha protection: request disallowed (invalid-input-response)
code:  captcha_failed
status: 400
```

Q1 confirmed — Plan 02-02 Task 2.4 can rely on Supabase's server-side Turnstile verification. No extra `/siteverify` call needed in `lib/actions/auth.ts`. The `signInWithOtp({ options: { captchaToken } })` pattern is sufficient.
