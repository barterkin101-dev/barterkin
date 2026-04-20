---
status: partial
phase: 03-profile-georgia-gate
source: [03-VERIFICATION.md]
started: 2026-04-20T00:00:00Z
updated: 2026-04-20T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Full profile save flow
expected: Fill all 10 fields at /profile/edit, click Save → "Profile saved." toast appears, fields persist on reload
result: [pending]

### 2. Publish gate tooltip
expected: With incomplete profile, hover the disabled Publish switch → ProfileCompletenessChecklist tooltip opens showing X on missing fields
result: [pending]

### 3. Avatar client-side validation
expected: Upload 3MB JPEG → "That file is larger than 2 MB..." error; upload PDF → "Only JPG, PNG, and WEBP..." error
result: [pending]

### 4. Cross-session publish visibility
expected: Complete profile, publish, then from a second verified session visit /m/[slug] → profile card visible
result: [pending]

### 5. Non-visible profile empty state
expected: Authenticated verified user visits /m/nonexistent-slug → "This profile isn't available." heading + "Go to directory" CTA
result: [pending]

### 6. Slug lock (D-08)
expected: Save as "Kerry Smith" (slug: kerry-smith), change name to "Kerry Jones", save again → slug stays /m/kerry-smith (unchanged)
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
