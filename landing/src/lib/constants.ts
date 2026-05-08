export const FRAMES_PATH = '/frames'
export const FRAME_COUNT = 120
export const FRAME_EXT = 'jpg' as const

export const NAV_ITEMS = [
  { label: 'Directory', href: '#directory' },
  { label: 'How It Works', href: '#process' },
  { label: 'Why Barterkin', href: '#why' },
  { label: 'FAQ', href: '#faq' },
]

export const PARTNERS = [
  'Athens-Clarke',
  'Fulton Co.',
  'Chatham Co.',
  'Richmond Co.',
  'Bibb Co.',
  'Muscogee Co.',
]

export const SERVICES = [
  {
    icon: 'Layers',
    title: 'Skills Directory',
    body: 'Browse Georgians listing skills offered and skills wanted — searchable by county, category, and keyword.',
  },
  {
    icon: 'ArrowLeftRight',
    title: 'Direct Barter',
    body: 'Initiate contact through a secure relay. Your email stays private until you both agree to connect.',
  },
  {
    icon: 'MapPin',
    title: 'Georgia-Only',
    body: 'Hyperlocal by design. Every member is county-tagged for neighborhood-level discovery.',
  },
  {
    icon: 'ShieldCheck',
    title: 'Privacy-First',
    body: 'Your email and phone never appear in the directory. All contact is relay-routed from day one.',
  },
  {
    icon: 'Tag',
    title: '10 Categories',
    body: 'Home services, food, tutoring, art, tech, wellness — a Georgia-grown taxonomy built for real trades.',
  },
  {
    icon: 'Star',
    title: 'Founding Member',
    body: 'Join early. Lock in founding member status — a badge marking the people who built this community.',
  },
]

export const REASONS = [
  {
    icon: 'Lock',
    title: 'Fully Private',
    body: 'Contact info is never exposed. Our relay keeps your inbox yours until you choose to share.',
  },
  {
    icon: 'MapPin',
    title: 'Georgia-Rooted',
    body: 'County-level discovery. Find trades close to home, skip the shipping, support your neighbors.',
  },
  {
    icon: 'DollarSign',
    title: 'Zero Cost',
    body: 'No subscription. No listing fee. No commission. Barterkin is free because money is not the point.',
  },
  {
    icon: 'Users',
    title: 'Community-Built',
    body: 'Seeded by real Georgians. Hand-verified launch members, curated categories, no-spam pledge.',
  },
]

export const PROCESS_STEPS = [
  {
    n: '1',
    title: 'Build Your Profile',
    body: 'List skills you offer and skills you want. Add your county, a short bio, and go live in under five minutes.',
  },
  {
    n: '2',
    title: 'Browse the Directory',
    body: 'Filter by category, county, or keyword. Every profile shows skills — never personal contact info.',
  },
  {
    n: '3',
    title: 'Send a Request',
    body: "Click contact. Barterkin relays your message — your email stays private until you both say yes.",
  },
  {
    n: '4',
    title: 'Make the Trade',
    body: 'Negotiate your terms. Cook, fix, teach, create — the directory just makes the intro.',
  },
]

export const STATS = [
  { value: '159', label: 'Georgia Counties' },
  { value: '10', label: 'Skill Categories' },
  { value: '$0', label: 'To Join' },
  { value: '2min', label: 'To First Contact' },
]

export const TESTIMONIALS = [
  {
    quote:
      'I traded guitar lessons for a month of fresh eggs from a farm three miles away. Impossible anywhere else.',
    name: 'Marcus T.',
    role: 'Athens, GA · Music',
  },
  {
    quote:
      'Finally a place where my canning skills are currency. Three trades in the first week of beta.',
    name: 'Priya S.',
    role: 'Decatur, GA · Food & Cooking',
  },
  {
    quote:
      'Fixed a neighbor\'s plumbing in exchange for two months of bookkeeping. Fair by any measure.',
    name: 'James R.',
    role: 'Savannah, GA · Home Services',
  },
  {
    quote:
      'The privacy model sold me. My email is not out there for anyone to scrape.',
    name: 'Lena W.',
    role: 'Augusta, GA · Tutoring',
  },
  {
    quote:
      "Three trades, three genuine friendships. That's what this community is actually about.",
    name: 'Darnell H.',
    role: 'Atlanta, GA · Tech Skills',
  },
  {
    quote:
      'It feels like what the internet was supposed to be — neighbors helping neighbors.',
    name: 'Claire M.',
    role: 'Columbus, GA · Arts & Crafts',
  },
  {
    quote:
      'Bartered graphic design for a year of yoga classes. Best deal since moving to Georgia.',
    name: 'Sofia N.',
    role: 'Marietta, GA · Design',
  },
  {
    quote:
      'My sourdough starter funded three home repairs this season. Bread as currency — it works.',
    name: 'Tom L.',
    role: 'Macon, GA · Baking',
  },
]

export const FAQ_ITEMS = [
  {
    q: 'Is Barterkin really free?',
    a: 'Yes. Creating a profile, browsing the directory, and sending contact requests cost nothing. Community exchange should not have a price tag.',
  },
  {
    q: 'Who can join?',
    a: 'Any Georgia resident. We use an honor-system county selector — no ZIP verification, no ID check. We trust our neighbors.',
  },
  {
    q: 'How does the contact relay work?',
    a: "When you send a request, Barterkin delivers your message to the recipient. Their email is never shown to you, and yours is never shown to them — unless you both explicitly choose to share.",
  },
  {
    q: 'What kinds of trades happen here?',
    a: 'Anything legal and skill-based. Home repair, cooking, tutoring, pet care, music lessons, bookkeeping, design work, farm goods — if you can do it, list it.',
  },
  {
    q: "What if someone doesn't respond?",
    a: "Barterkin makes the introduction. The trade is between you and your neighbor. We don't intermediate disputes or guarantee responses — that's what keeps it human.",
  },
  {
    q: 'When does early access open?',
    a: "We're rolling out by county to keep quality high. Join the waitlist and you'll be first in your county when we open.",
  },
  {
    q: 'Can I list multiple skills?',
    a: "Yes. Your profile has separate 'skills offered' and 'skills wanted' sections. List everything — that's how the best matches happen.",
  },
]

export const FOOTER_LINKS = [
  { label: 'Privacy', href: '/privacy' },
  { label: 'Terms', href: '/terms' },
  { label: 'Contact', href: 'mailto:hello@barterkin.com' },
]
