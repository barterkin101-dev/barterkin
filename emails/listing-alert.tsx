import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { AlertListing } from '@/lib/data/saved-searches'

interface ListingAlertEmailProps {
  recipientName: string | null
  headline: string
  listings: AlertListing[]
  browseUrl: string
  siteUrl: string
  unsubscribeUrl: string | null
}

export function ListingAlertEmail({
  recipientName,
  headline,
  listings,
  browseUrl,
  siteUrl,
  unsubscribeUrl,
}: ListingAlertEmailProps) {
  const previewText =
    listings.length === 1
      ? `1 new listing matches your saved search on Barterkin`
      : `${listings.length} new listings match your saved search on Barterkin`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: '#f6f8f3', margin: 0, padding: 0, fontFamily: 'system-ui, sans-serif' }}>
        <Container
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 8,
            margin: '32px auto',
            maxWidth: 600,
            padding: 0,
          }}
        >
          <Section style={{ padding: '32px 32px 16px 32px' }}>
            <Heading
              style={{
                color: '#1e4420',
                fontSize: 22,
                fontFamily: 'Lora, Georgia, serif',
                fontWeight: 700,
                margin: '0 0 8px 0',
              }}
            >
              {headline}
            </Heading>
            <Text style={{ color: '#3a7032', fontSize: 14, lineHeight: 1.5, margin: 0 }}>
              Hi{recipientName ? ` ${recipientName}` : ''},
            </Text>
            <Text style={{ color: '#3a7032', fontSize: 14, lineHeight: 1.5, margin: '8px 0 0 0' }}>
              New listings matching your saved search just dropped on Barterkin. Here&apos;s what we found:
            </Text>
          </Section>

          <Section style={{ padding: '0 32px' }}>
            {listings.map((listing) => (
              <Section
                key={listing.id}
                style={{
                  backgroundColor: '#eef3e8',
                  border: '1px solid #dfe8d5',
                  borderRadius: 6,
                  padding: '16px',
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{
                    color: '#1e4420',
                    fontSize: 18,
                    fontFamily: 'Lora, Georgia, serif',
                    fontWeight: 700,
                    margin: '0 0 8px 0',
                  }}
                >
                  {listing.title}
                </Text>
                <Text style={{ color: '#3a7032', fontSize: 13, margin: '0 0 8px 0' }}>
                  {listing.category_name ?? 'General'} · {listing.county_name ?? 'Georgia'} · by{' '}
                  {listing.seller_display_name ?? listing.seller_username ?? 'Barterkin member'}
                </Text>
                <Text style={{ color: '#1e4420', fontSize: 14, lineHeight: 1.6, margin: '0 0 12px 0' }}>
                  {listing.description.length > 180
                    ? `${listing.description.slice(0, 180)}...`
                    : listing.description}
                </Text>
                <Link
                  href={`${siteUrl}/listings/${listing.id}`}
                  style={{ color: '#c4956a', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                  View listing
                </Link>
              </Section>
            ))}

            <Button
              href={browseUrl}
              style={{
                backgroundColor: '#c4956a',
                color: '#eef3e8',
                padding: '12px 24px',
                borderRadius: 6,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              Browse all matching listings
            </Button>

            <Hr style={{ borderColor: '#dfe8d5', margin: '32px 0 16px 0' }} />

            <Text style={{ color: '#3a7032', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              You&apos;re receiving this because you have email alerts enabled for a saved search on Barterkin.
              {unsubscribeUrl && (
                <>
                  {' '}
                  <a href={unsubscribeUrl} style={{ color: '#c4956a' }}>
                    Unsubscribe
                  </a>
                </>
              )}
            </Text>
            <Text style={{ color: '#3a7032', fontSize: 12, lineHeight: 1.5, margin: '8px 0 0 0' }}>
              Georgia Barter Network ·{' '}
              <a href={siteUrl} style={{ color: '#c4956a' }}>
                {siteUrl.replace(/^https?:\/\//, '')}
              </a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default ListingAlertEmail
