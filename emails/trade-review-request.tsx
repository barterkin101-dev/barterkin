import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Section,
  Text,
} from '@react-email/components'

export interface TradeReviewRequestEmailProps {
  recipientDisplayName: string
  otherDisplayName: string
  reviewUrl: string
  siteUrl: string
}

export function TradeReviewRequestEmail({
  recipientDisplayName,
  otherDisplayName,
  reviewUrl,
  siteUrl,
}: TradeReviewRequestEmailProps) {
  return (
    <Html lang="en">
      <Head />
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
                marginBottom: 16,
              }}
            >
              Your trade with {otherDisplayName} is complete
            </Heading>

            <Text style={{ color: '#1e4420', fontSize: 15, lineHeight: 1.6 }}>
              {recipientDisplayName}, leave a quick review while the trade is still fresh. Reviews
              help build trust and give Barterkin more real social proof.
            </Text>

            <Button
              href={reviewUrl}
              style={{
                backgroundColor: '#c4956a',
                color: '#eef3e8',
                padding: '12px 24px',
                borderRadius: 6,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
                marginTop: 8,
              }}
            >
              Leave a Review
            </Button>

            <Hr style={{ borderColor: '#dfe8d5', margin: '32px 0 16px 0' }} />

            <Text style={{ color: '#3a7032', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
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

export default TradeReviewRequestEmail
