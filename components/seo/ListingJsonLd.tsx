import type { ListingRow } from '@/lib/data/listings.types'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.barterkin.com'

interface ListingJsonLdProps {
  listing: ListingRow
}

export function ListingJsonLd({ listing }: ListingJsonLdProps) {
  const imageUrls = listing.images.map((img) => img.url)
  const sellerName = listing.profiles?.display_name ?? listing.profiles?.username ?? 'Barterkin Member'
  const category = listing.categories?.name ?? 'Goods & Services'
  const county = listing.counties?.name ?? 'Georgia'

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description,
    image: imageUrls.length > 0 ? imageUrls : [`${SITE_URL}/opengraph-image`],
    category: category,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      availability: listing.status === 'active' ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      // eslint-disable-next-line react-hooks/purity
      priceValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      url: `${SITE_URL}/listings/${listing.id}`,
      seller: {
        '@type': 'Person',
        name: sellerName,
        url: listing.profiles?.username ? `${SITE_URL}/m/${listing.profiles.username}` : undefined,
      },
      businessFunction: 'http://purl.org/goodrelations/v1#Sell',
      eligibleRegion: {
        '@type': 'State',
        name: county,
        containedInPlace: {
          '@type': 'Country',
          name: 'United States',
        },
      },
    } satisfies Record<string, unknown>,
    itemCondition: listing.condition
      ? `https://schema.org/${conditionToSchemaOrg(listing.condition)}`
      : undefined,
    datePosted: listing.created_at,
    url: `${SITE_URL}/listings/${listing.id}`,
    areaServed: {
      '@type': 'State',
      name: 'Georgia',
      containedInPlace: {
        '@type': 'Country',
        name: 'United States',
      },
    },
  }

  // Remove undefined values
  const cleanData = JSON.parse(JSON.stringify(structuredData))

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanData) }}
    />
  )
}

function conditionToSchemaOrg(condition: string): string {
  const map: Record<string, string> = {
    new: 'NewCondition',
    'like-new': 'NewCondition',
    good: 'UsedCondition',
    fair: 'UsedCondition',
    'for-parts': 'DamagedCondition',
  }
  return map[condition] ?? 'UsedCondition'
}
