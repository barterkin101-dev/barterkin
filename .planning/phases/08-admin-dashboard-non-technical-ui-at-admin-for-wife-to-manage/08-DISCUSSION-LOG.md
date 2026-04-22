# Phase 8: Admin Dashboard — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 08-admin-dashboard-non-technical-ui-at-admin-for-wife-to-manage
**Areas discussed:** Admin access control, Members list & search, Ban/unban flow, Contact requests

---

## Admin Access Control

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded email in middleware | Check logged-in email against NEXT_PUBLIC_ADMIN_EMAIL env var. No DB migration needed. | ✓ |
| is_admin flag on profiles table | Boolean column + manual Supabase Studio toggle | |
| Supabase custom JWT claim | app_metadata.role = 'admin' via Supabase hook | |

**User's choice:** Hardcoded email in middleware

| Option | Description | Selected |
|--------|-------------|----------|
| app/(admin)/ route group, no AppNav | Separate layout with own admin chrome | ✓ |
| app/(app)/admin/, shares AppNav | Lives inside existing member shell | |

**User's choice:** app/(admin)/ route group, no AppNav

---

## Members List & Search

| Option | Description | Selected |
|--------|-------------|----------|
| Name + county + join date + status | Clean actionable summary with status badge | ✓ |
| Name + email + county + join date + status | Adds email address for off-platform contact | |
| Full profile summary | Avatar, skills, county, join date, status, contact count | |

**User's choice:** Name + county + join date + status

| Option | Description | Selected |
|--------|-------------|----------|
| Real-time search by name | Filters as she types, no submit button | ✓ |
| Search by name or email | Filters by display name OR email | |
| Submit-button search | Types then hits Enter/Search | |

**User's choice:** Real-time search by name

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — link to /admin/members/[id] detail page | Each row links to full admin profile view | ✓ |
| No — inline actions only | Ban/unban done directly from list row | |

**User's choice:** Yes — link to /admin/members/[id] detail page

---

## Ban/Unban Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmation dialog, no reason required | AlertDialog with Confirm/Cancel | ✓ |
| Confirmation dialog + optional reason note | Adds text field for audit trail | |
| One-click, no confirmation | Immediate ban, no prompt | |

**User's choice:** Confirmation dialog, no reason required

| Option | Description | Selected |
|--------|-------------|----------|
| No notification | Silent ban — profile disappears from directory | ✓ |
| Yes — email them | Ban notification via Resend (new template needed) | |

**User's choice:** No notification (silent ban)

---

## Contact Requests

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — show full message | Sender, recipient, message text, status, date | ✓ |
| Metadata only | Sender name, recipient name, status, date — no body | |

**User's choice:** Yes — show full message

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-mark as reviewed on view | No button — viewing marks all visible rows as reviewed | ✓ |
| Per-row 'Mark reviewed' button | Manual explicit marking | |

**User's choice:** Auto-mark on view

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — simple status filter tabs | All \| Bounced \| Failed tabs | ✓ |
| No filter — show all in one list | Single chronological list | |

**User's choice:** Status filter tabs (All / Bounced / Failed)

---

## Claude's Discretion

- Table vs. card list for members — planner decides
- Admin nav structure (sidebar vs. top links) — planner decides, keep minimal
- Pagination vs. load-more — planner decides
- Admin chrome styling — sage/forest palette, cleaner than member shell

## Deferred Ideas

None.
