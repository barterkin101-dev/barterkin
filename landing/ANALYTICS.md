# Landing Page Analytics

## PostHog Setup

1. Copy `.env.example` to `.env.local` and fill in your PostHog key:
   ```
   cp .env.example .env.local
   ```

2. For production builds on Netlify, set these environment variables in the Netlify dashboard:
   - `VITE_POSTHOG_KEY` — your PostHog project API key
   - `VITE_POSTHOG_HOST` — your PostHog host (default: https://us.i.posthog.com)

## Tracked Events

| Event | Location | Properties |
|-------|----------|------------|
| `signup_clicked` | navbar_desktop, navbar_mobile, hero_primary, cta_footer_primary | — |
| `signin_clicked` | footer_bar | — |
| `directory_clicked` | hero_secondary, counties_section | — |
| `guidelines_clicked` | cta_footer_secondary | — |
| `founding_cta_clicked` | founding_member_section | — |
| `pageview` | auto | — |
| `landing_hero_variant_viewed` | Hero component mount | `variant` (control or URL param) |
| `pageleave` | auto | — |
