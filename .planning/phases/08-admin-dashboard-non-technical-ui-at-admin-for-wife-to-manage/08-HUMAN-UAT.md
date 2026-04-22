---
status: partial
phase: 08-admin-dashboard-non-technical-ui-at-admin-for-wife-to-manage
source: [08-VERIFICATION.md]
started: 2026-04-22T20:00:00Z
updated: 2026-04-22T20:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Admin stats render live data
expected: Log in as admin at /admin, verify 3 stat cards (Total Members, Active Members, Pending Contact Requests) show real integers from Supabase — not zeros or placeholder text
result: [pending]

### 2. Real-time search UX
expected: At /admin/members, type in the search box — list filters instantly as you type. Press Escape or click X to clear the query and restore full list
result: [pending]

### 3. Member detail completeness
expected: Click into any member from the list — /admin/members/[id] renders full profile: avatar, display name, location, bio, skills, member since, ban status badge
result: [pending]

### 4. Ban/Unban end-to-end flow
expected: On a member detail page, click Ban — AlertDialog appears with clear copy. Confirm — success toast fires, ban status badge flips to "Banned". Unban works the same in reverse
result: [pending]

### 5. Contact requests tab persistence
expected: On /admin/contacts, click the Bounced tab — URL changes to ?status=bounced. Refresh the page — still on Bounced tab (URL preserved)
result: [pending]

### 6. Invalid ?status= fallback
expected: Manually navigate to /admin/contacts?status=completely-invalid — page shows All tab active (graceful fallback, no crash)
result: [pending]

### 7. Non-technical UX walkthrough (critical)
expected: Ashley's wife can navigate the full admin dashboard independently — find a member, view their profile, ban/unban — without coaching or technical guidance
result: [pending]

### 8. "Last 7 days" copy clarity
expected: The "Last 7 days" helper text on the stats dashboard is unambiguous to a non-technical user — clearly explains what time period the numbers cover
result: [pending]

## Summary

total: 8
passed: 0
issues: 0
pending: 8
skipped: 0
blocked: 0

## Gaps
