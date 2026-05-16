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

export interface WelcomeEmailProps {
  recipientName?: string | null
  siteUrl: string
  onboardingUrl: string
  listingsNewUrl: string
}

export function WelcomeEmail({
  recipientName,
  siteUrl,
  onboardingUrl,
  listingsNewUrl,
}: WelcomeEmailProps) {
  const previewText = 'Welcome to Barterkin — Georgia\'s community skills exchange'

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
              Welcome to Barterkin{recipientName ? `, ${recipientName}` : ''}!
            </Heading>

            <Text style={{ color: '#1e4420', fontSize: 15, lineHeight: 1.6, margin: '0 0 16px 0' }}>
              You just joined Georgia\'s community skills exchange — a place where neighbors trade 
              goods and services without cash. Haircuts for sourdough, plumbing for produce, 
              tutoring for tailoring — whatever you have to offer, someone nearby needs it.
            </Text>

            <Text style={{ color: '#1e4420', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px 0' }}>
              <strong>Your first quest:</strong> publish a listing and earn <strong>5 credits</strong> 
              instantly. Credits unlock features like boosting your listings and earning badges.
            </Text>

            <Button
              href={listingsNewUrl}
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
              Publish your first listing
            </Button>

            <Text style={{ color: '#1e4420', fontSize: 14, lineHeight: 1.6, margin: '20px 0 0 0' }}>
              Not ready to list yet?{' '}
              <a href={onboardingUrl} style={{ color: '#c4956a' }}>
                Complete your profile
              </a>{' '}
              to help others find you.
            </Text>

            <Hr style={{ borderColor: '#dfe8d5', margin: '32px 0 16px 0' }} />

            <Text style={{ color: '#3a7032', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              You\'re receiving this because you just signed up for Barterkin.
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

export default WelcomeEmail
