---
status: testing
phase: 05-contact-relay-trust-joined
source:
  - 05-01-SUMMARY.md
  - 05-02-SUMMARY.md
  - 05-03-SUMMARY.md
  - 05-04-SUMMARY.md
  - 05-05-SUMMARY.md
  - 05-06-SUMMARY.md
started: 2026-04-21T04:00:00Z
updated: 2026-04-21T04:00:00Z
---

## Current Test

number: 3
name: Rate limit error shown
expected: |
  After sending 5 contact messages to different recipients in one day, a 6th attempt shows
  an inline error: "You've reached your daily contact limit." The form stays open.
awaiting: user response

## Tests

### 1. Contact button visible on member profile
expected: Visiting /m/[username] while logged in as a different member shows a "Contact" button. Clicking it opens a bottom sheet with a message textarea and a Send button. The profile's display name appears in the sheet header.
result: pass

### 2. Contact form sends email relay
expected: Typing a message (≥10 chars) in the contact sheet and clicking Send shows a success state ("Your message was sent"). The recipient receives an email from the relay domain with reply-to set to the sender's email.
result: pass

### 3. Rate limit error shown
expected: After sending 5 contact messages to different recipients in one day, a 6th attempt shows an inline error: "You've reached your daily contact limit." (or equivalent copy). The form stays open so the user can see the message.
result: [pending]

### 4. Block member from overflow menu
expected: On a member's profile, opening the overflow menu (⋯) shows a "Block" option. Confirming the block redirects to /directory and a toast appears: "[Name] blocked. They've been removed from your directory view." The blocked member no longer appears in the directory listing.
result: [pending]

### 5. Report member from overflow menu
expected: On a member's profile, opening the overflow menu shows a "Report" option. Selecting a reason (e.g. "Spam") and submitting the form shows a success state. No redirect occurs — the dialog closes in place.
result: [pending]

### 6. Unseen contact badge appears in nav
expected: When Account A receives a contact from Account B, Account A's nav shows a notification indicator on the "Profile" link (a dot for 1 unread, or a pill showing the count for 2+). The indicator is visible before Account A visits /profile.
result: [pending]

### 7. Badge clears after visiting profile
expected: After Account A visits /profile (or navigates to it), the unseen contact badge in the nav disappears on the next page load. Refreshing confirms the badge is gone.
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
skipped: 0
pending: 7

## Gaps

[none yet]
