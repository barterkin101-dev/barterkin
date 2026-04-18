# Feature Research — Georgia Barter

**Domain:** Community skills-barter directory (Georgia-only, directory-first, barter tools deferred)
**Researched:** 2026-04-17
**Confidence:** MEDIUM-HIGH (grounded in competitor analysis of TimeBanks.org, hOurworld, Simbi, Nextdoor, Craigslist; Georgia-specific economy claims are MEDIUM; directory UX table-stakes claims are HIGH and well-documented)

> **How to read this doc:** Every feature is tagged with (1) category, (2) complexity (S/M/L), (3) dependencies, (4) explicit v1 recommendation. The downstream requirements step will scope each category block with the user. Anti-features and v1 recommendations are opinionated — if you disagree, push back; don't quietly widen scope.

---

## Category Map

| Category | What Belongs Here |
|----------|-------------------|
| **Table Stakes — Directory** | Features any directory needs. Missing = feels broken. |
| **Table Stakes — Skills-Barter** | Features users of TimeBank / Simbi / hOurworld / Nextdoor specifically expect. |
| **Differentiators** | What could make Georgia Barter notably better than generic tools. |
| **Anti-Features** | Things that look good but would break the directory-first thesis. |
| **Onboarding** | First-run experience and signup-to-first-listing path. |
| **Trust & Safety** | Minimum safety layer given phone verify + ratings are cut. |
| **Georgia-Specific** | Category/content/geography choices that reflect the actual state. |

---

## 1. Table Stakes — Directory UX

Non-negotiable for any directory in 2026. Users don't reward having these; they bounce without them.

| # | Feature | Complexity | Dependencies | v1 |
|---|---------|-----------|--------------|----|
| TD-1 | **Keyword search with debounce** (200-300ms) across name, skills, bio | S | Profile data | **Include** |
| TD-2 | **Filter by category** (chips/pills, multi-select optional) | S | Taxonomy decision | **Include** |
| TD-3 | **Filter by county** (all 159 GA counties in a searchable dropdown) | S | County data seeded | **Include** |
| TD-4 | **Combined filter + search** (filters and query compose, not reset each other) | S | TD-1,2,3 | **Include** |
| TD-5 | **Profile detail page** with all fields visible, clean typography, mobile-first | M | Profile schema | **Include** |
| TD-6 | **Listing card** in grid/list (photo, name, county, category chip, 1-line skill preview) | S | TD-5 | **Include** |
| TD-7 | **Empty state for zero results** — not "No results found" but "No bakers in Dawson County yet. Be the first, or try a nearby county." | S | TD-1 | **Include** |
| TD-8 | **Empty state for category with zero listings** — seeded with CTA "List your [category] skill" | S | TD-2 | **Include** |
| TD-9 | **Loading skeletons** for directory grid (not spinners) | S | — | **Include** |
| TD-10 | **404 page** that points back to directory + signup | S | — | **Include** |
| TD-11 | **Responsive layout** (single column mobile, 2-3 col tablet, 3-4 col desktop) | S | — | **Include** |
| TD-12 | **Pagination or infinite scroll** (pagination is simpler, better for SEO/linking) | S | TD-1 | **Include — pagination** |
| TD-13 | **Result count visible** ("24 bakers in Cobb County") | S | TD-1 | **Include** |
| TD-14 | **Shareable URLs** for filter state (?category=food&county=dekalb) | S | TD-4 | **Include** |
| TD-15 | **Clear filters** button when any filter active | S | TD-4 | **Include** |
| TD-16 | **Recently joined / new members** module on directory home | S | Profile `created_at` | **Include** — solves cold-start "it looks dead" |
| TD-17 | **Mobile-friendly filter sheet** (bottom sheet, not nav sidebar on mobile) | M | TD-11 | **Include** |
| TD-18 | **Keyboard accessibility** for filters, search, cards | S | — | **Include** |
| TD-19 | **Page title / meta per profile** (`{Name} — {Category} in {County} | Georgia Barter`) | S | TD-5 | **Include** — SEO is a directory's best discovery engine |
| TD-20 | **Image optimization** (next/image or Supabase transforms) | S | Storage | **Include** |
| TD-21 | **"Your listing" edit view** from member's own profile | S | Auth, profile CRUD | **Include** |

**Rationale for depth:** 61% of users abandon a site if they can't find what they want within ~5s, and 53% abandon mobile sites that load >3s. A directory that ships without search debouncing, empty states, or shareable URLs feels amateur regardless of how many listings it has. ([DesignRush Search UX 2026](https://www.designrush.com/best-designs/websites/trends/search-ux-best-practices))

---

## 2. Table Stakes — Skills-Barter Category Specifically

Drawn from TimeBanks.org, hOurworld, Simbi, Nextdoor services, Craigslist barter/skilled-trade, Freecycle, Bunz. Users who've been on these platforms have specific expectations.

| # | Feature | Complexity | Dependencies | v1 |
|---|---------|-----------|--------------|----|
| SB-1 | **"Skills I offer" as a distinct field from "Skills I want"** — the dual-sided list is the signature pattern of the category | S | Profile schema | **Include** |
| SB-2 | **Free-text skill description per profile** (not just category tags) — every platform in the space lets members write prose about what they do | S | Profile schema | **Include** |
| SB-3 | **Category tag(s) per profile** — most platforms also add structured categories on top of prose for filtering | S | Taxonomy | **Include** |
| SB-4 | **Location display** (county, not exact address — Nextdoor uses neighborhood, hOurworld uses city) | S | County selector | **Include** |
| SB-5 | **Contact preference field** ("email only" / "email or text" / etc.) — respects members who don't want calls | S | Profile schema | **Include** |
| SB-6 | **"Availability" free-text** ("weekends", "after 5pm", "summer only") — every timebank surfaces this | S | Profile schema | **Include** |
| SB-7 | **Profile photo** (avatar, not cover) — trust signal, every platform expects it | S | Storage | **Include — optional but prompted** |
| SB-8 | **Bio / "about me"** — distinct from skills list; personality sells a barter in a way categories don't | S | Profile schema | **Include** |
| SB-9 | **First-contact mechanism that protects email privacy** — Simbi uses in-app messages, hOurworld uses internal mail, Nextdoor uses neighbor-to-neighbor, Bunz uses DMs. **No one in this category puts raw emails in public.** Georgia Barter's platform-relayed email is the category-appropriate solution given MVP scope. | M | Resend + Edge Function | **Include — core thesis** |
| SB-10 | **Member-since / recency signals** (joined date, "active this week") — reduces fear of trading with a ghost | S | Profile timestamps | **Include — joined date only for v1** |
| SB-11 | **Multiple skills per profile** — real barterers have 3-5 offerings (see existing `index.html` listings: "bees AND chickens AND sourdough AND sewing") | S | Profile schema (array or multi-row) | **Include** |
| SB-12 | **Differentiated "offer" vs "want" in search** (find people *offering* X vs *wanting* X) | M | SB-1, TD-1 | **Include** |
| SB-13 | **Cross-link "others in this category" on profile** ("More beekeepers in North Georgia") | S | TD-5 | **Defer to v1.1** — not table stakes, nice polish |
| SB-14 | **Saved / bookmarked profiles** (TimeBanks and Simbi both have this) | M | Auth, new table | **Defer to v1.1** |

**Key insight from competitors:**
- **Simbi** uses an internal credit system (50 credits on signup) + matching game. Requires ID verification via social network linking. Heavier than Georgia Barter's thesis allows.
- **hOurworld** is free, hosts 400+ timebanks and 35K members, and is inter-timebank (members can trade across banks). Uses a time-credit ledger — which we've explicitly deferred.
- **TimeBanks.org** sells software/training to local timebank groups; the pattern is community-anchored (one timebank per town).
- **Nextdoor's Services** requires real-name + address verification. Has a recommendations mechanic (needs ≥1 recommendation to appear on category page). The recommendations gate is a lever we could borrow but should **not** in v1.
- **Craigslist Atlanta barter** section is active but anonymous — the trust floor is near zero. Lots of volume, low match quality. Georgia Barter should be strictly better on trust (email verify, real names).
- **Existing `index.html` listings** show a clear pattern: members list multiple skills across multiple categories ("eggs, produce, salves, pressure washing, personalized t-shirts, herb garden, small engine repair"). Profile schema **must support multi-skill, multi-category**.

Sources: [hOurworld](https://hourworld.org/), [TimeBanks.org](https://www.timebanks.org/), [Simbi How It Works](https://simbi.com/howitworks), [Nextdoor services help](https://help.nextdoor.com/s/article/Search-for-local-service-providers), [Craigslist Atlanta barter](https://atlanta.craigslist.org/search/bar)

---

## 3. Differentiators — What Could Make Georgia Barter Notably Better

Not required to launch. Each is a lever to pull if/when the directory has demonstrable pull.

| # | Feature | Complexity | Dependencies | v1 |
|---|---------|-----------|--------------|----|
| DF-1 | **"Skill match" serendipity** — "3 Georgians offer [X] and want something you offer" on signed-in home | M | SB-1, SB-12 | **Defer to v1.1** — needs data density first |
| DF-2 | **Profile prompts** (Airbnb/Bumble-style) — "What's the weirdest thing you've bartered?", "Favorite Georgia county?" — raises profile richness for new joiners | S | Profile schema | **Include — 2-3 prompts only** |
| DF-3 | **Hometown / county pride surface** — "42 Georgians in Cobb County" counter on directory; county leaderboard by listing count | S | Aggregate query | **Include — light version** (county counter on filter) |
| DF-4 | **Curated Georgia-specific categories** (vs. generic "Services") — see Section 7 for the proposed taxonomy | S | Taxonomy decision | **Include** |
| DF-5 | **"I bartered a [X] for a [Y]" story cards** on landing page — social proof that the directory works | M | Needs content | **Defer to v1.1** — no stories yet to surface |
| DF-6 | **Photo-forward listing cards** (not text-first) — category lends itself: eggs, sourdough, nail art, braiding, sewing are visual | S | SB-7 | **Include** |
| DF-7 | **Seasonal / availability tagging** ("summer produce", "tax season accounting") — Georgia has strong seasonal rhythms | M | Profile schema | **Defer to v1.1** |
| DF-8 | **Neighbor-to-neighbor recommendations** (Nextdoor pattern, no ratings) — "3 members have bartered with them" without any star score | L | Trade-tracking schema | **Defer to Barter Tools milestone** |
| DF-9 | **"Last 30 days" activity indicator** on profiles (did they respond to contacts?) | M | Relay response tracking | **Defer to v1.1** |
| DF-10 | **Warm aesthetic consistent with landing page** — sage/forest/clay + Lora/Inter across the whole app, not just marketing page | S | Design tokens | **Include — central to brand thesis** |
| DF-11 | **TikTok handle field** on profile — existing `index.html` members default to TikTok as primary contact. Recognizing this reflects the actual Georgia community that exists. | S | Profile schema | **Include — optional field, displayed as link** |
| DF-12 | **"Contact initiated" counter** visible only to member ("5 people have contacted you") — mild gamification for retention | S | Relay logging | **Include** — also powers the success metric |
| DF-13 | **Shareable profile cards** ("Share my profile on TikTok") — the existing community is TikTok-native | S | OG images | **Include — OG image + share button** |
| DF-14 | **Nearby-county inference** ("Show me people in Cobb, Paulding, Douglas" auto-grouped as metro-west) | M | County geo data | **Defer to v1.1** — not worth custom geo now |

**Differentiator thesis:** Georgia Barter has three structural advantages against bigger competitors: (a) **Georgia-only focus** means curated categories can reflect actual local economy, (b) **TikTok-native origin** (1,400+ already interested from @kerryscountrylife comment section) means social proof + virality built in, (c) **warm community aesthetic** vs. utilitarian look of Craigslist / timebank software. DF-4, DF-10, DF-11, DF-13 all lean into these. Skip DF-1/5/7/9 until there's data.

---

## 4. Anti-Features — Explicit "Do Not Build" List

These feel like obvious adds but would break the directory-first thesis. The requirements step should treat each as pre-decided.

| # | Anti-Feature | Why Requested | Why NOT | Alternative |
|---|--------------|---------------|---------|-------------|
| AF-1 | **Cash payments / Stripe integration** | "Couldn't we charge a small fee?" | Breaks barter thesis; introduces PCI scope, tax forms, disputes, chargebacks. Kills solo-builder budget. | Always free. Donate button at best, post-launch. |
| AF-2 | **Marketplace fees / transaction commissions** | "Take 5% of trades" | Barters are off-platform and non-monetary. No trade to skim. Also makes the platform adversarial to members. | — |
| AF-3 | **In-platform real-time chat / inbox** | "Email is clunky, people want chat" | Requires websockets, notification infra, moderation, read-receipts, retention. Deferred to Barter Tools milestone by PROJECT.md. | Platform-relayed email (SB-9). Reconsider post-MVP based on signal. |
| AF-4 | **Ratings / stars / reviews** | "Users want to know who's trustworthy" | No trades have happened yet. Rating infra before trades = rating ghosts. Also: first-bad-rating kills retention. PROJECT.md cuts explicitly. | Email verify (trust floor). Phone verify as v1.1 badge. Reviews after Barter Tools ships trade state machine. |
| AF-5 | **Escrow / time-bank ledger / credits** | "How do we prevent no-shows?" | Entire Barter Tools milestone. Solo builder can't maintain. | Members self-enforce in v1. Ledger ships once directory is validated. |
| AF-6 | **Phone verification at signup** | "Stops bots" | PROJECT.md defers to v1.1 as a trust badge. Adds SMS cost and friction. | Email verify + Supabase Auth bot protection (captcha if needed). |
| AF-7 | **Rating-before-first-trade** | "Let early users rate profiles on 'vibes'" | Vanity rating. No substance behind stars. Corrodes trust in the rating system itself. | No rating until trade state machine. |
| AF-8 | **Cross-state expansion / "New York Barter", "Texas Barter"** | "Why limit to Georgia?" | Georgia-only IS the thesis. Geographic focus creates density; "nationwide" barter directories die from thinness (see Craigslist barter — high volume, low match). | Expand only after Georgia is saturated. Different brand per state if ever. |
| AF-9 | **Radius / map search** | "Airbnb has a map, why don't we?" | County filter is 90% as useful for 10% of the effort. No map tiles bill, no lat/long complexity. | County filter now. Radius in v1.1 if members complain. |
| AF-10 | **Availability calendar (scheduled slots)** | "Let members book a time" | Requires trade state machine to have any meaning. Free-text availability field (SB-6) is the v1 equivalent. | Free-text "availability" string. |
| AF-11 | **Native iOS/Android apps (SwiftUI/Kotlin)** | "Needs to be in the App Store" | PROJECT.md: PWA now, Capacitor wrap later. Native codebases = 3x maintenance for solo builder. | PWA installable. Capacitor wrap when App Store matters. |
| AF-12 | **Custom auth (passwords, 2FA, password reset flows)** | "More control over auth" | Supabase Auth is the managed provider. Rolling custom auth burns weeks and adds attack surface. | Supabase Auth: Google + Apple + magic-link. |
| AF-13 | **Groups / community boards / forums** | "Members want to chat in their county" | Forum infra = moderation burden, content policies, spam waves. Later milestone ("County community boards"). | No forum in v1. Surface county-level activity via directory only. |
| AF-14 | **Referral credits / invite rewards** | "Drive growth with rewards" | No credit system to reward with in v1 (see AF-5). Also premature optimization for growth when PMF unproven. | Pure organic + TikTok/landing page. Revisit after Barter Tools ships credits. |
| AF-15 | **Public contact reveal (plain email / phone on profile)** | "Just show the email, it's simpler" | Scrapers, spam, members leaving when their inbox is flooded. The existing `index.html` form exposes emails/phones — that's the #1 thing to fix in the rebuild. | Platform-relayed email (SB-9). TikTok handle optional because it's already a public handle. |
| AF-16 | **Pre-approval / admin review of each listing** | "Quality control" | Turns admin into the bottleneck. Solo builder + 100 signups/day = dead queue. | Post-hoc report + review queue (Trust section). |
| AF-17 | **Events / meetups / skill-share gatherings** | "Community wants to meet" | Liability, RSVPs, venue logistics. PROJECT.md defers to "later" milestone. | No events in v1 or v1.1. |
| AF-18 | **Group barters / 3-party circular trades** | "A bakes for B, B repairs for C, C cleans for A" | Requires ledger (AF-5) and matching algorithm. Deep later-milestone work. | Pairwise only for v1. |
| AF-19 | **Photo-required signup** | "Better listings need photos" | Adds friction, blocks signup in low-bandwidth areas (rural GA). Optional but prompted is the right balance. | Optional photo, strong nudge during onboarding, empty-avatar placeholder that's friendly (initials on sage background). |
| AF-20 | **Social graph / friends / follows** | "Let users follow bakers" | Adds feed, notification infra, privacy surface. Out of scope for directory. | — |

**The single most important thing in Section 4:** AF-3 (in-app chat) and AF-4 (ratings) will be requested. Hold the line until Barter Tools milestone. The PROJECT.md thesis is that the relayed-email friction IS a feature — it filters for serious contacts and produces a clean success metric (contact-button hits).

---

## 5. Onboarding — First-Run Experience

Cold-start problem: new directory is mostly empty; new user must not see "ghost town" on first login. Existing `index.html` has already seeded 11 TikTok-sourced listings + claims "1,400+ people interested" — leverage this in the rebuild.

**Signup flow (target: ≤4 steps, ≤90 seconds to first-listing):**

| # | Step | Fields | Complexity | v1 |
|---|------|--------|-----------|----|
| OB-1 | **SSO chooser** (Google / Apple / Magic-link email) | — | M (Supabase Auth) | **Include** |
| OB-2 | **Email verification gate** (required before profile goes live) | email | S (Supabase built-in) | **Include** |
| OB-3 | **County selector** (required, all 159 GA counties, searchable) | county | S | **Include** |
| OB-4 | **Profile setup: name, 1 skill offered, 1 skill wanted** (minimum viable profile) | name, skill_offered[], skill_wanted[] | M | **Include** |
| OB-5 | **Optional: bio, photo, availability, contact preference, TikTok** — each on a single scrollable page with "Skip for now" | various | M | **Include** |
| OB-6 | **"Your profile is live" confirmation** with link to profile + directory | — | S | **Include** |

**Key onboarding decisions:**

| # | Decision | Recommended | Rationale |
|---|----------|-------------|-----------|
| OB-D1 | **Photo required?** | **Optional but prompted** | Research shows each signup step beyond 3-4 increases abandonment. But listings without photos convert ~50% worse on trust. Compromise: optional during signup, prompt "Add a photo to get 2x more contacts" on first dashboard visit. |
| OB-D2 | **Tag picker vs free-text for skills?** | **Free-text with category selector** | Existing `index.html` members list non-taxonomy skills ("small engine repair", "FX makeup", "listening", "community builder"). Forcing a fixed tag list would lose them. Category is the filtering primitive; skill text is the prose. Add tag auto-suggest in v1.1 from keyword extraction. |
| OB-D3 | **Required skill count?** | **1 offered, 0 wanted (wanted is optional)** | Lower friction. Many members have an offer but aren't sure what to request — they just want to list and see what comes in. |
| OB-D4 | **County picker UX?** | **Type-ahead searchable select** | 159 counties is too many for a flat dropdown. Most Georgians don't know their county name off the top (Metro Atlanta sprawl). Show "Not sure? Type your city" hint. |
| OB-D5 | **Seed the directory visibly?** | **Yes — existing 11 index.html listings get migrated** | Cold-start prevention. A new user who lands on a directory with 0 listings leaves. Migrating the TikTok-sourced listings (with permission / as "founding member" flag) means day 1 has warm bodies. |
| OB-D6 | **Progress indicator during signup?** | **Yes — 4 dots** | Users abandon when they don't know how long the flow is. |
| OB-D7 | **"Preview your profile" before going live?** | **Yes — final step** | Lets member see what directory visitors see before email-verification commit. Reduces "this doesn't look right" post-submit regret. |
| OB-D8 | **First-time prompts?** | **One card on dashboard: "2 Georgians in [your county] are looking for [matching skill]"** | Serendipity seed. Requires DF-1 matching. **Defer to v1.1** if matching isn't built; instead show "Browse [your county]" CTA. |
| OB-D9 | **Email verification window?** | **Listing goes live only after verify; verify link expires in 24h** | Prevents dead/fake listings. Supabase Auth does this natively. |

**First-action strategy:**

The orchestrator's success metric is **contact-button hits**, not profile count. First-action for a new member should be **"see who's out there"** (viewing the directory), NOT "complete your profile." After signup:

1. Land on **dashboard with dual CTA:** "Browse [your county]" + "Complete your profile (2/5)"
2. Browsing the directory = first action that reinforces the product value
3. If they contact someone → that's the true activation moment

Profile completion nudges (add photo, add bio, add availability) happen persistently in the nav, not as onboarding walls.

**Sources:** [Andrew Chen — cold start for social products](https://andrewchen.com/how-to-solve-the-cold-start-problem-for-social-products/), [10Web — instant-start onboarding fixes TTV](https://10web.io/blog/how-instant-start-onboarding-fixes-ttv/), [Unusual VC — solving cold start](https://field-guide.unusual.vc/field-guide-consumer/solving-the-cold-start-problem)

---

## 6. Trust & Safety — Minimum Day-1 Safety Layer

We've cut phone verification, ratings, reviews, admin pre-approval, and in-platform chat. So what's the actual safety floor? Missing this layer = first bad actor ruins the brand.

| # | Feature | Complexity | Dependencies | v1 |
|---|---------|-----------|--------------|----|
| TS-1 | **Email verification enforced before profile appears in directory** | S | Supabase Auth | **Include — non-negotiable** |
| TS-2 | **"Report this profile" button** on every profile page | S | Reports table, admin view | **Include** — writes to a simple reports table; admin queue UI is v1.1 |
| TS-3 | **Rate limit on contact form** — max N relay sends per sender per 24h (suggest: 5/day, 20/week) | S | Resend + Edge Function counter | **Include — critical spam defense** |
| TS-4 | **Rate limit on signups per IP** — Supabase has this built-in; configure to 3/hour | S | Supabase Auth config | **Include** |
| TS-5 | **Disposable / temporary email blocklist** on signup | S | Public blocklist (e.g. `disposable-email-domains`) | **Include** |
| TS-6 | **Admin lockout / ban capability** — set a `banned: true` flag on profile, hidden from directory, can't send relays | S | Auth role, RLS policy | **Include — required for responding to any abuse** |
| TS-7 | **Admin impersonation (read-only) view** — admin can see profile as user sees it for triage | M | Auth roles | **Defer to v1.1** |
| TS-8 | **Report queue UI for admin** | M | TS-2, admin auth | **Defer to v1.1** — v1 can use direct Supabase table view |
| TS-9 | **Relay anti-abuse** — include original sender's verified-email hash in outbound messages; strip tracking pixels; block links to common scam domains | M | Edge Function | **Include — basics only** (no attachments, text + link max, rate-limited) |
| TS-10 | **Terms of service + privacy policy + community guidelines** | S (writing), M (review) | Lawyer or template | **Include — required for trust and for Apple SSO app review** |
| TS-11 | **CAPTCHA on signup** (hCaptcha or Cloudflare Turnstile) | S | 3rd-party lib | **Include — recommend Turnstile (free, privacy-respecting)** |
| TS-12 | **Profile visibility default: "public to directory"** — no private profiles in v1 (keep surface small) | S | — | **Include** |
| TS-13 | **Right-to-deletion** — member can delete account; cascades profile and relay logs (but retains aggregate counts) | M | DB cascade, GDPR-friendly | **Include — required legally if any EU visitors; good practice regardless** |
| TS-14 | **Admin email alerts on every report filed** | S | Resend | **Include — solo builder needs the ping** |
| TS-15 | **Account-age gate for sending contacts** — must have verified email + account ≥5 minutes before sending first relay | S | Timestamp check | **Include — cheap bot defense** |
| TS-16 | **Block repeated-target contacts** — sender can't contact same recipient more than 2x/week unless reply received | S | Relay log check | **Include — stops low-grade stalking** |
| TS-17 | **Moderation policy doc** (what's a ban, what's a warn, what's a report) | S | — | **Include — even if it's just a page** |
| TS-18 | **Obvious keyword filter on profile bio/skills at submit** (racial slurs, explicit content) | S | Word list | **Include — trivial to implement, high trust upside** |
| TS-19 | **Image moderation** (nudity, violence) on uploaded avatars | M | Supabase + moderation API (Hive, AWS Rekognition) | **Defer to v1.1** — photo upload volume will be low initially; manual review works |
| TS-20 | **"Last admin action" transparency** (removed listings show "Removed for violating [rule]") | S | — | **Defer to v1.1** |

**Minimum-viable safety stack (the must-haves within Section 6):**

1. Email verified required (TS-1) ✅ in PROJECT.md
2. Report button (TS-2) ✅
3. Contact rate limit (TS-3) ✅
4. Signup rate limit (TS-4) ✅
5. Disposable email block (TS-5) ✅
6. Admin ban (TS-6) ✅
7. ToS + privacy + guidelines (TS-10) ✅
8. CAPTCHA on signup (TS-11) ✅
9. Account-age + repeat-target limits (TS-15, TS-16) ✅

Everything else can slip to v1.1 without the directory being irresponsible.

**Sources:** [ActiveFence — Trust & Safety](https://www.activefence.com/what-is-trust-and-safety/), [Mail7 — Disposable email abuse prevention](https://mail7.app/blog/disposable-email-abuse-prevention-developers-guide), [Traceable — Intelligent rate limiting](https://www.traceable.ai/blog-post/intelligent-rate-limiting-for-api-abuse-prevention)

---

## 7. Georgia-Specific Considerations

### Georgia economy + community patterns that must shape category choices

Georgia is **bimodal**: Atlanta metro (Fulton, DeKalb, Cobb, Gwinnett, Clayton, Henry, Cherokee, Forsyth, Douglas, Paulding, Rockdale) is dense, diverse, tech-heavy, service-economy. Outside the metro — especially **North Georgia (Appalachian foothills)**, **South Georgia (agricultural belt — peanuts, cotton, pecans, Vidalia onions)**, and **coastal Georgia** — is rural, agriculture-dominant, homesteading-friendly, and has weaker formal service markets.

The existing `index.html` listings reflect the non-metro culture: Dallas GA, Carrollton, South Fulton, Douglasville. Predominantly **homesteading, food production, trades, beauty services, creative crafts**. These are the categories the community is already self-organizing around — don't impose a generic taxonomy.

### Proposed v1 category taxonomy (opinionated)

| Category | Examples | Why it exists |
|----------|----------|---------------|
| **Food & Baked Goods** | Brownies, sourdough, jams, catering, meal prep | #1 listing type in existing index.html |
| **Farm & Garden** | Eggs, produce, honey, seeds, seedlings, herbs, livestock | Homesteading is central to Georgia community-trade culture |
| **Skilled Trades** | Plumbing, electrical, HVAC, small engine repair, pressure washing, handyman, auto | Rural GA has weak access to licensed trades; huge barter demand |
| **Beauty & Hair** | Nails, braiding, locs, makeup (FX), hair styling | Strong Black-owned beauty trade culture, especially Metro Atlanta |
| **Wellness & Holistic** | Herbal tinctures, salves, massage, yoga, "listening" / companionship | Kerry's Country Life & homesteading crowd; also Atlanta wellness scene |
| **Crafts & Art** | Sewing, knitting, crochet, pottery, visual art, set design, t-shirt printing | Existing index.html has a strong crafter presence |
| **Childcare & Tutoring** | Babysitting, nanny share, homework help, music lessons, test prep | Table-stakes demand in any family-heavy community |
| **Tech & Digital** | Website help, social media, photo/video editing, computer repair | Bridges rural → metro skill gap |
| **Home & Cleaning** | House cleaning, organizing, lawn care, pet care, moving help | Common barter currency |
| **Transportation & Errands** | Rides, deliveries, errand running | Bartered everywhere, especially rural |

**10 categories.** Resist adding more. Simpler than the existing `index.html` 6-cat taxonomy (which is missing Childcare/Tutoring, Tech, Home/Cleaning, Transportation — big gaps). Resist fewer — lumping Food with Farm obscures real Georgia economic distinction (baker vs farmer are different).

### Geography-specific features

| # | Feature | Complexity | v1 |
|---|---------|-----------|----|
| GA-1 | **All 159 Georgia counties in selector** — not just Metro Atlanta counties; rural users will bounce if their county is missing | S | **Include** |
| GA-2 | **County-grouping awareness** (informal) — show "Metro Atlanta" / "North GA" / "South GA" / "Coastal" as informational groupings on directory | S | **Defer to v1.1** — county filter alone is enough for v1 |
| GA-3 | **TikTok handle as optional contact** — **existing community is TikTok-native** (see `index.html` — almost every seeded listing has a TikTok handle, several have ONLY TikTok). Recognizing this keeps the rebuild aligned with the 1,400+ already interested. | S | **Include** |
| GA-4 | **Mobile-first design** — rural GA has uneven broadband; bulk of traffic will be mobile over cellular | S | **Include (already a PWA)** |
| GA-5 | **Low-bandwidth image sizes** — default to 400px cards, lazy-load | S | **Include** |
| GA-6 | **No Spanish localization v1** — GA has ~10% Spanish-speaking population but adding i18n now is premature. Flag for v1.1. | L | **Defer** |
| GA-7 | **Georgia gate honor system** (county selector at signup, no ZIP/phone enforcement) | — | **Already locked in PROJECT.md** |
| GA-8 | **"Near me" / adjacent-county browsing** — Metro Atlanta users often span multiple counties; a Cobb user frequently trades in Fulton, Paulding | M | **Defer to v1.1** (requires county adjacency data) |
| GA-9 | **Landing page hero: keep the existing "Connecting Georgians Who Grow, Make & Trade" copy** — it's working (1,400+ interest). Rebuild the page in Next.js but don't rewrite the message. | S | **Include — copy preservation** |
| GA-10 | **Kerry's Country Life attribution on footer** — the origin story is social proof. Existing footer: "Inspired by @kerryscountrylife and the 1,400+ Georgians who said 'I'm in.'" — keep this. | S | **Include** |
| GA-11 | **Seasonal surface** — Georgia has real seasonal rhythms (peach season, pecan harvest, Vidalia onion season April-Aug). Useful for directory freshness but premature for v1. | M | **Defer to v1.1** |
| GA-12 | **North Georgia homestead cluster visibility** — Dallas, Carrollton, Dawson, Jasper counties have disproportionate existing listing density; the directory should not hide this (don't "balance" to show metro listings when user filters rural) | S | **Include (just honest filtering)** |

### Georgia cultural notes informing copy and defaults

- **"Neighbor" is a loaded-positive word** — existing landing page leans into this. Keep it. Don't shift to "user" or "member" in public-facing copy.
- **"County" > "city" as the location primitive** — rural Georgians identify by county (Hall County, Dawson County). Metro Atlanta users identify by city. Using county works for both; city alone doesn't.
- **Religion and rural identity are present but sensitive** — do NOT add faith-based filters or assumptions. Don't filter them out either if members list "church potluck" style skills.
- **Race / demographics** — existing listings reflect a racially diverse community (several Black-owned beauty/wellness listings, several White homestead/farm listings). Don't add demographic filters. Photos + names do the work.
- **Rural digital literacy varies** — signup must be simple enough for someone with a cracked Android and 3 bars of LTE.

---

## 8. Feature Dependency Map

```
Auth (Supabase SSO + email verify)
  │
  ├─> Profile CRUD (name, county, skills offered/wanted, bio, photo, availability, contact pref, TikTok)
  │     │
  │     ├─> Directory read (search + filter + card + detail)
  │     │     │
  │     │     ├─> Empty states + loading states + pagination
  │     │     │
  │     │     └─> Shareable filter URLs + SEO meta
  │     │
  │     └─> "My profile" edit view
  │
  ├─> Email verification gate ──> eligibility to appear in directory
  │
  └─> Relay contact
        │
        ├─> Contact form + Resend integration
        │
        ├─> Rate limits (per sender, per sender-recipient pair, per IP)
        │
        ├─> Relay logging (drives "contact initiated" success metric + DF-12 counter)
        │
        └─> Reply-To: sender → replies go direct

Trust layer (cross-cutting):
  ├─> Report button ──> reports table ──> admin review (queue UI is v1.1)
  ├─> Admin ban flag ──> RLS hides banned profiles from directory + blocks relay send
  ├─> CAPTCHA on signup (Turnstile)
  ├─> Disposable-email blocklist on signup
  └─> ToS + Privacy + Community Guidelines pages

Design system (cross-cutting):
  ├─> Sage/forest/clay palette tokens
  ├─> Lora (headings) + Inter (body)
  └─> Responsive primitives (card, filter chip, form, empty state)
```

### Key dependency rules

- **Profile CRUD before Directory.** You can't render a directory of profiles without the profile schema + CRUD.
- **Email verify before Directory visibility.** Cutting this = spam directory on day 1.
- **Relay contact before public launch.** Without this, the only option is AF-15 (public email reveal) which breaks the thesis.
- **Rate limiting before any public signup.** Not after. Bots find open signup forms within hours.
- **ToS + Privacy before Apple SSO.** Apple's SSO app review requires these pages; Google's doesn't strictly but does soft-require for approval.
- **CAPTCHA before any significant marketing push.** Not before launch — Turnstile is 30 min of work; add it before the directory is publicly shareable.

### Phase-structure implication (for roadmap consumer)

A sensible phase split that respects these dependencies:

1. **Phase: Foundation** — Next.js app skeleton, design tokens, Supabase setup, landing page port
2. **Phase: Auth** — Supabase SSO (Google + Apple + magic link), email verify gate, ToS/Privacy/Guidelines pages, CAPTCHA
3. **Phase: Profile** — Profile schema, profile editor, profile detail page, photo upload via Supabase Storage
4. **Phase: Directory** — Search + filter + listing grid + empty states + pagination + shareable URLs + SEO meta
5. **Phase: Contact Relay** — Resend + Edge Function, contact form, rate limits, relay logging, report button, admin ban flag
6. **Phase: Trust & Polish** — Reports table, admin view (basic), disposable email block, repeat-target limits, keyword filter, SEO polish, OG images

Auth before Profile before Directory before Contact Relay is strict. Trust layer is cross-cutting but CAPTCHA + ToS should land in Auth phase.

---

## 9. MVP Definition — Opinionated v1 Scope

### Include in v1 (must-have for launch)

**Core flow:**
- Supabase Auth (Google, Apple, magic link) + email verification gate
- Profile: name, county, bio, photo (optional), skills_offered[], skills_wanted[], availability (free-text), contact preference, TikTok handle (optional)
- Directory: keyword search + category filter + county filter, combined + URL-persistent
- Listing card grid + profile detail page + empty states + pagination + shareable filter URLs
- Platform-relayed contact form with Resend, rate-limited, with Reply-To: sender

**Trust floor:**
- Email verification required
- Report button → reports table
- Admin ban flag (manual via Supabase console until queue UI v1.1)
- Contact + signup rate limits
- Disposable email blocklist
- CAPTCHA on signup
- ToS + Privacy + Community Guidelines

**Georgia alignment:**
- All 159 counties in selector
- Curated 10-category taxonomy (see Section 7)
- Existing landing page copy + aesthetic preserved in Next.js rebuild
- TikTok handle field on profile
- Migrate existing 11 `index.html` listings as "founding members" (seeds the directory)

**Polish / non-negotiables:**
- Responsive mobile-first design
- Loading skeletons
- 404 page
- Shareable OG images per profile
- Success-metric logging: relay contact button hits (per PROJECT.md)

### Add in v1.1 (triggered by real usage signals)

- Admin report queue UI (trigger: >5 reports/week)
- "Recently joined" and "Recently active" modules (trigger: signal request from retention data)
- Nearby-county / metro grouping (trigger: users asking for it)
- Photo moderation via API (trigger: first inappropriate avatar slips through)
- Saved / bookmarked profiles (trigger: repeat-view analytics)
- Phone verification badge (trigger: trust complaints from members)
- Seasonal tags (trigger: summer / holiday season actually arrives)
- "Skill match" serendipity (DF-1) (trigger: ≥500 profiles for meaningful matches)
- Image moderation API

### Defer to Barter Tools milestone (per PROJECT.md)

- Time-bank ledger + credits
- Trade state machine (requested → agreed → completed → rated)
- In-app messaging (replaces email relay for trade coordination)
- Reviews + ratings + trust score
- Availability calendar + radius search
- Dispute flag + formal review queue

### Defer indefinitely or reject (Anti-Features)

See Section 4. Key: no cash, no fees, no forums, no events, no cross-state, no group barters, no native apps, no custom auth, no public contact reveal, no pre-approval, no rating-before-trade.

---

## 10. Prioritization Matrix (condensed)

| Feature Cluster | User Value | Solo-Builder Cost | Priority |
|-----------------|------------|-------------------|----------|
| Supabase Auth (SSO + magic link) | HIGH | MEDIUM | P1 |
| Profile schema + editor | HIGH | MEDIUM | P1 |
| Directory search + filter + grid | HIGH | MEDIUM | P1 |
| Platform-relayed contact form | HIGH | MEDIUM | P1 |
| Rate limits + CAPTCHA + disposable email block | HIGH | LOW | P1 |
| ToS + Privacy + Guidelines pages | MEDIUM | LOW | P1 |
| Empty states + loading + 404 + shareable URLs | MEDIUM | LOW | P1 |
| Seed migration of index.html listings | HIGH | LOW | P1 |
| 10-category Georgia taxonomy | HIGH | LOW | P1 |
| All 159 counties selector | HIGH | LOW | P1 |
| Report button + admin ban flag | HIGH | LOW | P1 |
| TikTok handle field | MEDIUM | LOW | P1 |
| Photo upload (optional) | MEDIUM | MEDIUM | P1 |
| "Contact initiated" counter (DF-12) | MEDIUM | LOW | P1 |
| Admin report queue UI | MEDIUM | MEDIUM | P2 |
| Saved profiles | LOW | MEDIUM | P2 |
| Skill match serendipity (DF-1) | HIGH | HIGH | P2 (data-dependent) |
| Seasonal tags | LOW | MEDIUM | P3 |
| Nearby-county grouping | MEDIUM | MEDIUM | P2 |
| In-app chat | HIGH | HIGH | Barter Tools milestone |
| Ratings / reviews | HIGH | HIGH | Barter Tools milestone |
| Time-bank ledger | HIGH | HIGH | Barter Tools milestone |

---

## 11. Competitor Snapshot (how we compare)

| Feature | hOurworld | TimeBanks.org | Simbi | Nextdoor | Craigslist Barter | Existing `index.html` | Georgia Barter v1 |
|---------|-----------|---------------|-------|----------|-------------------|---------------------|-------------------|
| Scope | Worldwide, 400+ banks | Worldwide, per-community | Worldwide | Worldwide, geo-locked | Worldwide by city | Georgia, 11 seed listings | Georgia-only |
| Auth | Email login | Per-bank | Social link required | Address-verified | Anonymous | Netlify form only | Supabase SSO + magic link |
| Trust floor | Membership org approval | Per-bank vouching | Social graph ID verify | Postcard address verify | None | None | Email verify + honor county |
| Dual skills list (offer/want) | Yes | Yes | Yes | Partial | Free-text | Yes | Yes (SB-1) |
| Ledger / credits | Yes | Yes | Yes (50 free) | No | No | No | No (deferred) |
| Messaging | In-platform | In-platform | In-platform | In-platform | Off-platform | Off-platform (public) | Relay email (v1), in-app later |
| Reviews / ratings | Yes | Yes | Yes | Yes | No | No | No (deferred) |
| Photo on profile | Optional | Optional | Required-ish | Required | Optional | Not in form | Optional, prompted |
| Category taxonomy | Generic | Generic | Generic | Generic | Very loose | 6 categories | 10 Georgia-curated categories |
| Social-first origin | No | No | No | No | No | Yes (TikTok) | Yes (inherits index.html's TikTok community) |
| Geographic gate | Per-bank | Per-bank | None | Required (address) | City | None | County honor system |

**Competitive thesis:** Georgia Barter doesn't win on feature breadth — hOurworld has 5x more built in. It wins on (a) Georgia-only density, (b) TikTok-native community with 1,400+ seed audience, (c) clean directory UX vs. utilitarian timebank software, (d) no friction of credit systems or ledgers. These are all attainable in v1.

---

## 12. Open Questions for Requirements Step

1. **Photo behavior:** Required after signup (prompted)? Or genuinely optional forever? Recommend "optional, prompted on first dashboard visit."
2. **Multi-skill limit:** Cap at 5 skills offered, 5 wanted? Or unlimited? Recommend soft cap of 5 to force clarity.
3. **Admin email for reports:** Whose inbox? Single admin or team alias?
4. **Seed listings migration:** Do we have permission from the 11 existing `index.html` members? Or do we treat the rebuild as a fresh start? Recommend: reach out, offer "founding member" badge, migrate with consent.
5. **"Founding member" badge:** Worth building as a profile flag? Recommend yes — cheap social proof.
6. **Dashboard design:** Show "Profile completion: 3/7" gamification, or keep it clean? Recommend light nudges, no progress bars.
7. **Messaging about the deferred barter tools:** Do we tell members "Credits coming soon"? Recommend no — don't promise what's not built.
8. **Landing page path:** Full rebuild in Next.js at launch, or keep `index.html` on Netlify as the marketing page and put the app on a subdomain? Recommend full rebuild — one codebase, one domain, one source of truth. The Netlify `index.html` can stay briefly as redirect.
9. **Is the contact relay visible to the sender before send?** (i.e. does the sender see "this will email [recipient name] via our relay"?) Recommend yes — transparency reduces "why didn't they get it" support load.
10. **Handling of email bounces from relay:** If recipient's email bounces, do we notify sender? Recommend yes, with option to flag profile as "email appears invalid" (auto-report after 3 bounces).

---

## 13. Quality Gate Self-Check

- [x] Categories are clear — 7 distinct sections mapping to prompt's 7 questions
- [x] Complexity noted (S/M/L) for every feature
- [x] Dependencies identified explicitly and in diagram form (Section 8)
- [x] Anti-features section is substantive — 20 items, each with why-requested / why-not / alternative
- [x] Geography section reflects actual Georgia economy — Atlanta bimodal, homestead culture, all 159 counties, TikTok-native community, 10-category Georgia-curated taxonomy
- [x] v1 recommendation stated for every feature (Include / Defer / Exclude)
- [x] Feeds downstream requirements step — grouped by category as requested

---

## Sources

**Platform analysis:**
- [hOurworld — Time and Talents](https://hourworld.org/_TimeAndTalents.htm)
- [hOurworld International Directory](https://hourworld.org/)
- [TimeBanks.Org](https://www.timebanks.org/)
- [Simbi — Welcome to the Symbiotic Economy](https://simbi.com/)
- [Simbi — How It Works](https://simbi.com/howitworks)
- [Nextdoor — Service provider search](https://help.nextdoor.com/s/article/Search-for-local-service-providers)
- [Nextdoor — Policy Hub](https://about.nextdoor.com/policy/)
- [Craigslist Atlanta Barter](https://atlanta.craigslist.org/search/bar)
- [Craigslist Atlanta Skilled Trade Services](https://atlanta.craigslist.org/search/sks)
- [P2P Foundation Wiki — Timebanking Software Platforms](https://wiki.p2pfoundation.net/Timebanking_Software_Platforms)

**UX / onboarding:**
- [DesignRush — Search UX Best Practices 2026](https://www.designrush.com/best-designs/websites/trends/search-ux-best-practices)
- [UXPin — Advanced Search UX 2026](https://www.uxpin.com/studio/blog/advanced-search-ux/)
- [Pencil & Paper — Empty States UX](https://www.pencilandpaper.io/articles/empty-states)
- [Andrew Chen — Cold Start for Social Products](https://andrewchen.com/how-to-solve-the-cold-start-problem-for-social-products/)
- [Unusual VC — Solving the Cold Start Problem](https://field-guide.unusual.vc/field-guide-consumer/solving-the-cold-start-problem)
- [10Web — Instant-Start Onboarding Fixes TTV](https://10web.io/blog/how-instant-start-onboarding-fixes-ttv/)
- [Carbon Design System — Empty States Pattern](https://carbondesignsystem.com/patterns/empty-states-pattern/)

**Trust & safety:**
- [ActiveFence — What is Trust and Safety](https://www.activefence.com/what-is-trust-and-safety/)
- [Mail7 — Disposable Email Abuse Prevention](https://mail7.app/blog/disposable-email-abuse-prevention-developers-guide)
- [Traceable — Intelligent Rate Limiting](https://www.traceable.ai/blog-post/intelligent-rate-limiting-for-api-abuse-prevention)
- [Foiwe — Trust & Safety Infrastructure](https://www.foiwe.com/trust-safety-infrastructure-what-every-platform-needs/)
- [SimpleLogin — Free Email Relay](https://simplelogin.io/email-relay/)

**Georgia context:**
- [Rural Georgia Initiatives — georgia.org](https://georgia.org/rural)
- [Georgia's Rural Center](https://www.ruralga.org/)
- Existing `/Users/ashleyakbar/barterkin/index.html` — seeded community listings with strong TikTok presence, Dallas/Carrollton/South Fulton cluster, food + homestead + beauty + wellness categories dominating

**Internal:**
- `/Users/ashleyakbar/barterkin/.planning/PROJECT.md` — scope, locked decisions, out-of-scope list
- `/Users/ashleyakbar/barterkin/EXPLORE.md` — pre-project brief, rejected alternatives, Barter Tools deferred-milestone scope
- `/Users/ashleyakbar/barterkin/index.html` — existing marketing page, design tokens, seeded listings

---

*Feature research for: Georgia Barter — community skills-barter directory, directory-first MVP*
*Researched: 2026-04-17*
*Confidence: MEDIUM-HIGH overall; HIGH on directory UX / competitor features / trust basics, MEDIUM on Georgia-specific economy claims (grounded in existing `index.html` listings + general GA economic knowledge, but not quantitative surveys)*
