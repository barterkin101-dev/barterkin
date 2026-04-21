# Phase 5: Contact Relay + Trust (joined) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-20
**Phase:** 05-contact-relay-trust-joined
**Areas discussed:** Contact form UI, Report + Block affordance, New contact badge, Email template fidelity

---

## Contact form UI

| Option | Description | Selected |
|--------|-------------|----------|
| Sheet (slide-over) on profile page | Contact button on /m/[username] opens a right-side sheet. No page navigation. shadcn Sheet component already available. Most common pattern on directory/marketplace apps — user stays in context. | ✓ |
| Modal dialog on profile page | A centered modal via shadcn Dialog. Same outcome, more disruptive. | |
| Navigate to /contact/[username] | Separate route. Simpler — no sheet/modal state management, deep-linkable. Slightly more friction. | |

**User's choice:** Sheet (slide-over) on profile page

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inline success state in the sheet | Sheet stays open, form replaces with success message + Close button. User stays in context. | ✓ |
| Toast notification, sheet closes | Sheet closes on success, toast pops. User lands back on profile page. | |

**User's choice:** Inline success state in the sheet

---

## Report + Block affordance

| Option | Description | Selected |
|--------|-------------|----------|
| 3-dot overflow menu | A "..." icon button in the profile card header. shadcn DropdownMenu with "Block [Name]" and "Report [Name]" items. Unobtrusive, familiar. | ✓ |
| Flag icon in profile header | A small flag/report icon always visible. Block only via dropdown after interactions. | |

**User's choice:** 3-dot overflow menu

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dialog confirmation for both | Block = AlertDialog with consequences. Report = Dialog with reason dropdown + optional note. | ✓ |
| Block instant (undo toast), Report = dialog | Block is immediate with an undo toast. Report still gets a dialog. | |

**User's choice:** Dialog confirmation for both

---

## New contact badge

| Option | Description | Selected |
|--------|-------------|----------|
| Nav bar badge on "My Profile" link | Red dot or count badge on the nav link to /profile. Clears once user visits /profile. No new UI components. | ✓ |
| Banner on /directory | Dismissible banner at top of /directory on first page load after new contact. | |
| Skip the in-app badge | Email IS the notification — don't add UI complexity. Defer the badge. | |

**User's choice:** Nav bar badge on "My Profile" link

---

## Email template fidelity

| Option | Description | Selected |
|--------|-------------|----------|
| Branded React Email template | emails/contact-relay.tsx. Sage/forest header, sender name + message in body, clear reply-direct footer. react-email@4.x already in scope per CLAUDE.md. | ✓ |
| Plain text only | No HTML, no template. Fastest, highest deliverability, no rendering bugs. | |

**User's choice:** Branded React Email template

---

| Option | Description | Selected |
|--------|-------------|----------|
| "[Sender Name] wants to barter with you" | Personal, clear, action-oriented. | ✓ |
| "New message from [Sender Name] on Barterkin" | More platform-branded, slightly less punchy. | |
| Claude's discretion | Pick whichever reads best. | |

**User's choice:** "[Sender Name] wants to barter with you"

---

| Option | Description | Selected |
|--------|-------------|----------|
| Standard footer only | "Georgia Barter Network • barterkin.com • Unsubscribe" | |
| Add sender's profile link | Include link to sender's /m/[username] in the email body. | |
| Claude's discretion | Keep it minimal — you know what belongs in a good transactional email. | ✓ |

**User's choice:** Claude's discretion

---

## Claude's Discretion

- Email footer content and sender profile link placement
- HMAC signature verification for Resend webhook
- `contact_requests.seen_at` update mechanism
- shadcn Sheet dimensions and animation
- RLS policy design for `blocks`, `reports`, `contact_requests` tables
- PostHog event firing approach (posthog-node in Edge Function)

## Deferred Ideas

- Unblock flow — defer to v1.1
- Sender notification on bounce — defer to post-MVP
- Contact history / sent contacts view — no inbox UI in MVP
- Proactive rate-limit display in Contact Sheet — defer to post-launch
