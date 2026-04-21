# Barterkin — Founding Member Outreach Template

## Section 1 — Overview

This is the operational runbook for Phase 7 outreach, implementing decisions D-01 through D-05 from `07-CONTEXT.md`. Ashley sends each DM personally from her own TikTok account — no brand blast, no automation — because the warm-personal tone is the whole point of the founding-member offer. Responses land in a linked Google Sheet (field spec in Section 4) and Ashley manually transfers consented members into the hardcoded `members[]` array in `scripts/seed-founding-members.mjs` (Plan 02). The tracking table in Section 6 is the single source of truth for "who did we DM, who responded, who got seeded."

## Section 2 — Base DM Template

The shared warm-personal template per D-03 (sign as Ashley, first-person, reference specific listing content). Ashley customizes the `{bracketed}` slots per listing using the personalization table in Section 3.

```
Hey {first-name-or-handle}! 🌿

It's Ashley — I loved seeing {listing-name} on the original Georgia Barter page ({legacy-site-reference}) and I wanted to reach out personally.

I'm building a dedicated home for the Georgia barter community at barterkin.com — a skills-barter directory where neighbors can find each other by county, category, and skill. I'd love to have you as one of our founding members, which means:

- Your profile goes live before public launch (you're in the directory day one)
- A small "Founding member" badge on your card + profile detail page
- You help shape the platform's first feedback round

If you're in, would you fill out this quick form? It captures the info I need to set up your account:
👉 {GOOGLE_FORM_URL}

Takes ~3 minutes. If you'd rather just reply over email, hello@barterkin.com is me — I'll set you up from there.

No pressure if it's not for you. Thanks either way for being part of the original crew. 🌱

— Ashley
Barterkin
```

**Placeholders** (use this exact notation so Ashley can grep/replace before sending):

- `{first-name-or-handle}` — first name if known, else TikTok handle (no `@`)
- `{listing-name}` — legacy listing title, verbatim from `legacy/index.html`
- `{legacy-site-reference}` — short reference like "the original Georgia Barter directory page"
- `{GOOGLE_FORM_URL}` — the Google Form URL Ashley receives after creating the form (Section 4). Append `?entry.{TIKTOK_FIELD_ID}=@handle` per listing so the form arrives pre-filled with the TikTok handle.

## Section 3 — Per-Listing Personalization Table

The 11 founding-member listings from `legacy/index.html`. Each hook is distinct (no boilerplate) and references the listing's actual offering. Ashley pastes the hook into the DM template between the second and third paragraphs.

| # | Listing name | TikTok handle | Legacy category | Probable county | Personal hook (1-2 sentences) | Notes |
|---|---|---|---|---|---|---|
| 1 | GG's Goodies Galore | @ggs_goodies | food | Douglas County (Douglasville) | Your from-scratch baking + the way you show up in the Douglasville food community is exactly the kind of founding-member story I want Barterkin to lead with. | |
| 2 | Kerry's Country Life | @kerryscountrylife | agriculture | Paulding County (Dallas) | Your herbal syrups and tincture knowledge are exactly what I hope the directory becomes — Georgian skills trading Georgian skills. Would love to have you set the tone. | ANCHOR per D-11. Seed first; after Kerry's profile is live, ask her to post to her 1,400+ followers about Barterkin. |
| 3 | Local Homesteader | @llaaddyybugg | agriculture | Paulding County (Dallas) | The homesteading content you put out — especially the seed-saving posts — is the kind of hands-on know-how that makes a barter directory actually work. | |
| 4 | Tamathaca's Homestead | @tamathacal | agriculture | Paulding County (Dallas) | Your homestead rhythm (the chickens, the canning, the slow-build) is the soul of what the directory is for — real Georgians trading real work. | |
| 5 | FEYOUG Plumbing | @feyoug | services | Georgia (city TBD) | Honestly, a plumber in a barter directory is the one that proves the whole concept — the services side is what most community directories miss, and I want it anchored from day one. | County unknown — confirm in consent form; D-04 marks county as required field. |
| 6 | Ashley's Nail Studio | @ashley | beauty | Paulding County (Dallas) | Your nail work is beautiful, and having a beauty/self-care founder in the directory balances out all the food and homestead energy — it shows the breadth of what "skills" means here. | |
| 7 | Lovelylocs | @lovelylocs | wellness | Georgia (city TBD) | The natural hair + scalp care knowledge you share is real specialist work, and that's exactly the kind of skill the directory needs to surface properly by category. | County unknown — confirm in consent form; D-04 marks county as required field. |
| 8 | Kelly's Kitchen | @kellymystic119 | food | Paulding County (Dallas) | Your kitchen content — the from-scratch, "here's how I actually cook for my people" energy — is the warm tone I want the whole directory to feel like. | |
| 9 | Yellow Butterfly Farm | @yellow_butterfly_farm | agriculture | Carroll County (Carrollton) | A working farm in Carroll County would give the directory geographic reach outside Paulding, which is exactly what a "find a Georgian" platform needs to feel real. | |
| 10 | SiR Arts & Etc | @sir_arts | crafts | Fulton County (South Fulton) | Your art + craft practice brings South Fulton into the directory, and it's the kind of creative-trade that rounds out a community where most of the early listings are food/farm. | |
| 11 | Donna Marie | @donnamarie | wellness | Georgia (city TBD) | Your wellness work (especially the holistic-care content) belongs in the directory alongside the homesteaders and cooks — it makes the whole offering feel complete. | County unknown — confirm in consent form; D-04 marks county as required field. |

## Section 4 — Google Form Spec (SEED-02)

The consent form Ashley creates in Google Forms. All fields documented here so Ashley can reconstruct the form without reference to another document.

**Field list (verbatim from PLAN `<interfaces>`):**

- **Consent to migrate listing:** Y/N (REQUIRED, radio)
- **Display name / updates:** short-text (prefilled with legacy listing name; member can edit)
- **Bio / description:** long-text (max 500 chars; mirrors `profiles.bio`)
- **Skills offered:** up to 5 short-text fields (mirrors `skills_offered` cap)
- **Skills wanted:** up to 5 short-text fields (optional; mirrors `skills_wanted` cap)
- **County:** dropdown of 159 Georgia counties (REQUIRED — this is the data legacy lacks)
- **Preferred email:** email (REQUIRED; used for Supabase auth user creation)
- **TikTok handle:** short-text (pre-filled from DM via `?entry.XXXX=@handle` URL param per Open Question #5)

**Form metadata:**

- **Form name:** "Barterkin — Founding Member Consent"
- **Description (at top of form):** "Barterkin is the new home for the Georgia Barter community. If you're opting in, this form captures everything I need to set up your founding-member profile. If you're declining, just answer Q1 = No and that's it — your info won't be migrated, and your legacy listing stays up until the old site retires."
- **Response destination:** Linked Google Sheet, file name "Barterkin Founding Member Responses". Ashley reviews responses weekly and copies consenting rows into `scripts/seed-founding-members.mjs` `members[]` array.
- **URL pre-fill spec (Open Question #5):** For each DM, Ashley appends `?entry.{TIKTOK_FIELD_ID}=@handle` so the form arrives pre-filled with the member's TikTok handle. Ashley looks up the field ID once after creating the form (Form editor → three-dot menu → "Get pre-filled link" → fill TikTok field → copy URL → the `entry.XXXXXXX` numeric ID is the `TIKTOK_FIELD_ID`). She then populates it per-listing in the DM variants above.
- **Decline handling (Open Question #3):** If consent=No, do NOT seed and do NOT remove from legacy. Legacy retires in Phase 6 regardless; "no" respondents simply don't carry over. This is documented in the form description so respondents understand the opt-out is low-friction (no email, no follow-up).

**Category mapping reference** (Ashley applies after response; confirm with member if ambiguous per Assumption A4 in `07-RESEARCH.md`):

| Legacy category | Barterkin category |
|---|---|
| food | Food & Kitchen |
| services | Trades & Repair |
| crafts | Arts & Crafts |
| agriculture | Outdoors & Animals |
| beauty | Wellness & Bodywork |
| wellness | Wellness & Bodywork |

## Section 5 — Reply-To Email (D-02)

`hello@barterkin.com` is the member-facing reply-to for all outreach correspondence. Members who prefer not to use the Google Form reply here directly.

**BLOCKING precondition (per Assumption A1 in `07-RESEARCH.md`): DO NOT send DM #1 until both items below are confirmed.**

- [ ] Send a test email to `hello@barterkin.com`; confirm it arrives in Ashley's monitored inbox (via Google Workspace alias, forward-to rule, or Namecheap mail routing — whichever is configured at the registrar)
- [ ] Confirm the Resend dashboard shows `hello@barterkin.com` as a verified sender alongside the existing `noreply@barterkin.com` (Phase 1 deliverable; Assumption A2)

Without both boxes checked, any member who emails `hello@barterkin.com` instead of using the form disappears into a black hole — zero follow-through, zero conversion.

## Section 6 — Tracking Table

Ashley updates the status cells as outreach progresses. Keep this table in git so there's an audit trail of every DM sent and its outcome.

| # | Listing name | DM sent date | Response received? | Consent Y/N | Seeded? (Plan 04) | Notes |
|---|---|---|---|---|---|---|
| 1 | GG's Goodies Galore | | | | | |
| 2 | Kerry's Country Life | | | | | ANCHOR — seed first |
| 3 | Local Homesteader | | | | | |
| 4 | Tamathaca's Homestead | | | | | |
| 5 | FEYOUG Plumbing | | | | | County unknown; confirm in form |
| 6 | Ashley's Nail Studio | | | | | |
| 7 | Lovelylocs | | | | | County unknown; confirm in form |
| 8 | Kelly's Kitchen | | | | | |
| 9 | Yellow Butterfly Farm | | | | | |
| 10 | SiR Arts & Etc | | | | | |
| 11 | Donna Marie | | | | | County unknown; confirm in form |

## Section 7 — Cutoff Date (Pitfall 7)

The seed script (Plan 02) hardcodes `CUTOFF_DATE = '2026-06-01'`. Outreach must conclude before this date. Past cutoff, the founding-member offer is closed and the seed script requires `--force` to run — this is intentional friction so we don't accidentally mint "founding members" months after launch.

If Ashley needs to extend the window (e.g., Kerry's 1,400-follower boost drives late consent traffic), she bumps `CUTOFF_DATE` in the seed script and commits the change with a one-line rationale in the commit message.

## Section 8 — Sending Order & Pacing

The order matters because Kerry is the ANCHOR (D-11). If Kerry says no, the post-seed boost disappears and the remaining 10 DMs have less amplification to lean on.

1. **Day 0 — Anchor:** DM Kerry's Country Life (@kerryscountrylife) first. Wait for response before batching the rest.
2. **Day 0-1 — Paulding cluster:** Once Kerry consents, DM the other four Paulding-County listings (Local Homesteader, Tamathaca's Homestead, Ashley's Nail Studio, Kelly's Kitchen) in the same 24-hour window — they know each other's content, so seeing two or three familiar names already "in" raises response rates.
3. **Day 2 — Geographic reach:** DM Yellow Butterfly Farm (Carroll) and SiR Arts & Etc (South Fulton) to start pulling in listings from outside Paulding. This is the "directory covers Georgia, not just Dallas" proof.
4. **Day 3 — Unknown-county trio:** DM FEYOUG Plumbing, Lovelylocs, Donna Marie. Their Google Form submission will populate the county field; no need to ask in the DM.
5. **Day 4-5 — Food anchor:** DM GG's Goodies Galore last. GG is an active poster and responds quickly, so ending here gives the strongest closer to the first-wave count.

If a DM goes unread for 72 hours, send one light nudge reply to the same thread ("Hey, no rush — just wanted to make sure this didn't get buried. 🌿"). No second nudge; respect silence as a no.

**Why this order is not arbitrary:** Kerry's consent de-risks the other 10 asks because her audience overlaps with at least four of the Paulding listings. Starting with GG or Ashley instead would mean approaching the most-active posters without the anchor's implicit endorsement, and that's exactly the dynamic D-11 flags as the single highest-leverage move in Phase 7.


## Section 9 — FAQ Anticipations

Members will ask these. Canned answers keep the tone consistent and save Ashley time.

- **"Is this the same as the old Georgia Barter page?"** — No. Same community, new home. The `index.html` page on Netlify retires in Phase 6. Barterkin is a proper directory with search, categories, and privacy-protected contact.
- **"Will my email be public?"** — No. Contact goes through a relay: someone presses "Contact", fills a short form, and you get an email from Barterkin with their message. Your address is never shown in the directory.
- **"What does 'founding member' actually get me?"** — (a) profile live before public launch, (b) a "Founding member" badge on your card and detail page, (c) a seat at the first feedback round (I'll DM you when that happens).
- **"Can I edit my profile later?"** — Yes. Everything you submit is editable from your account after you sign in. The form is just to get us started.
- **"How did you get my TikTok handle?"** — You're on the original Georgia Barter page (`legacy/index.html` on the old Netlify site), which is public. I'm only DMing the 11 people already listed there.
- **"I'm not in Georgia anymore."** — Barterkin is Georgia-only for v1. If you've moved, skip the consent form (answer No to Q1) and I'll leave your legacy listing up until the old site retires in Phase 6.
