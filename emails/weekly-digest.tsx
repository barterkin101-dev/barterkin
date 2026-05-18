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
import type { DigestListing } from '@/lib/data/digest'

export interface WeeklyDigestEmailProps {
  recipientName?: string | null
  headline: string
  listings: DigestListing[]
  browseUrl: string
  siteUrl: string
  unreadCount?: number
  messagesUrl?: string
  unsubscribeUrl?: string
}

export function WeeklyDigestEmail({
  recipientName,
  headline,
  listings,
  browseUrl,
  siteUrl,
  unreadCount = 0,
  messagesUrl,
  unsubscribeUrl,
}: WeeklyDigestEmailProps) {
  const previewText = unreadCount > 0
    ? `You have ${unreadCount} unread message${unreadCount === 1 ? '' : 's'} and ${listings.length} new listing${listings.length === 1 ? '' : 's'}`
    : `${listings.length} new ${listings.length === 1 ? 'listing' : 'listings'} on Barterkin this week`

  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body
        style={{
          backgroundColor: '#eef3e8',
          fontFamily: 'Inter, Arial, sans-serif',
          margin: 0,
          padding: '32px 16px',
        }}
      >
        <Container
          style={{
            maxWidth: 560,
            margin: '0 auto',
            backgroundColor: '#f4f7f0',
            borderRadius: 8,
            overflow: 'hidden',
            border: '1px solid #dfe8d5',
          }}
        >
          <Section style={{ backgroundColor: '#2d5a27', padding: '24px 32px' }}>
            <Heading
              style={{
                color: '#eef3e8',
                fontFamily: 'Lora, Georgia, serif',
                fontSize: 22,
                margin: 0,
              }}
            >
              Barterkin
            </Heading>
            <Text style={{ color: '#eef3e8', fontSize: 13, margin: '4px 0 0 0' }}>
              Georgia Barter Network
            </Text>
          </Section>

          <Section style={{ padding: '32px' }}>
            <Heading
              style={{
                color: '#1e4420',
                fontFamily: 'Lora, Georgia, serif',
                fontSize: 22,
                margin: '0 0 16px 0',
              }}
            >
              {headline}
            </Heading>

            {unreadCount > 0 && messagesUrl && (
              <Section
                style={{
                  backgroundColor: '#fff8e1',
                  border: '1px solid #ffe082',
                  borderRadius: 6,
                  padding: '16px',
                  marginBottom: 24,
                }}
              >
                <Text
                  style={{
                    color: '#1e4420',
                    fontSize: 16,
                    fontWeight: 600,
                    margin: '0 0 8px 0',
                  }}
                >
                  You have {unreadCount} unread message{unreadCount === 1 ? '' : 's'}
                </Text>
                <Link
                  href={messagesUrl}
                  style={{ color: '#c4956a', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
                >
                  Check your messages →
                </Link>
              </Section>
            )}

            <Text style={{ color: '#1e4420', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px 0' }}>
              {recipientName ? `${recipientName}, here are` : 'Here are'} {listings.length} new{' '}
              {listings.length === 1 ? 'listing' : 'listings'} worth checking this week.
            </Text>

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
              Browse all recent listings
            </Button>

            <Hr style={{ borderColor: '#dfe8d5', margin: '32px 0 16px 0' }} />

            <Text style={{ color: '#3a7032', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              You&apos;re receiving this because weekly digest emails are enabled on your Barterkin profile.
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

export default WeeklyDigestEmail
