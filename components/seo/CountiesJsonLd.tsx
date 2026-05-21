import type { CountyStat } from '@/lib/data/counties-public'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.barterkin.com'

interface CountiesJsonLdProps {
  counties: CountyStat[]
  totalMembers: number
  totalListings: number
}

export function CountiesJsonLd({ counties, totalMembers, totalListings }: CountiesJsonLdProps) {
  const activeCounties = counties.filter((c) => c.memberCount > 0 || c.listingCount > 0)

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Georgia Counties — Barterkin',
    description: `Browse ${totalMembers} members and ${totalListings} listings across ${counties.length} Georgia counties on Barterkin.`,
    url: `${SITE_URL}/counties`,
    itemListElement: activeCounties.map((county, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: county.name,
      url: `${SITE_URL}/directory?county=${county.fips}`,
      item: {
        '@type': 'Place',
        name: county.name,
        containedInPlace: {
          '@type': 'State',
          name: 'Georgia',
          containedInPlace: {
            '@type': 'Country',
            name: 'United States',
          },
        },
      },
    })),
  }

  const cleanData = JSON.parse(JSON.stringify(structuredData))

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanData) }}
    />
  )
}
