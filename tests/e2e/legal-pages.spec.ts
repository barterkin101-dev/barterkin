import { test } from '@playwright/test'

test.describe('legal pages (AUTH-10 + GEO-04)', () => {
  test.fixme('/legal/tos renders with H1 "Terms of Service"', async () => {})
  test.fixme('/legal/tos contains the GEO-04 Georgia non-residency clause verbatim', async () => {})
  test.fixme('/legal/privacy renders with H1 "Privacy Policy"', async () => {})
  test.fixme('/legal/guidelines renders with H1 "Community Guidelines"', async () => {})
})
