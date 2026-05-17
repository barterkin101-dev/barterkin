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

export interface OnboardingAbandonmentEmailProps {
  recipientName?: string | null
  siteUrl: string
  onboardingUrl: string
}

export function OnboardingAbandonmentEmail({
  recipientName,
  siteUrl,
  onboardingUrl,
}: OnboardingAbandonmentEmailProps) {
  const previewText = 'You\'re almost ready to start trading on Barterkin'

  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body
        style={{
          backgroundColor: '#eef3e8',
          fontFamily: 'Inter, Arial, sans-serif',
          margin: 0,
          padding: '24px 0',
        }}
      >
        <Container
          style={{
            maxWidth: 480,
            backgroundColor: '#ffffff',
            borderRadius: 8,
            overflow: 'hidden',
            margin: '0 auto',
          }}
        >
          <Section style={{ padding: '32px 32px 0 32px' }}>
            <Heading
              style={{
                color: '#1e4420',
                fontFamily: 'Lora, Georgia, serif',
                fontSize: 22,
                margin: '0 0 16px 0',
              }}
            >
              You&apos;re almost there{recipientName ? `, ${recipientName}` : ''}
            </Heading>

            <Text style={{ color: '#1e4420', fontSize: 15, lineHeight: 1.6, margin: '0 0 16px 0' }}>
              You signed up for Barterkin — Georgia&apos;s community skills exchange — but we noticed
              you haven&apos;t finished setting up your profile yet.
            </Text>

            <Text style={{ color: '#1e4420', fontSize: 15, lineHeight: 1.6, margin: '0 0 16px 0' }}>
              It only takes a couple of minutes, and once you&apos;re done you can:
            </Text>

            <ul style={{ color: '#1e4420', fontSize: 15, lineHeight: 1.6, margin: '0 0 16px 0', paddingLeft: 20 }}>
              <li>Browse listings from neighbors across Georgia</li>
              <li>Publish your first offer and earn <strong>5 free credits</strong></li>
              <li>Start trading skills, services, and goods</li>
            </ul>

            <Button
              href={onboardingUrl}
              style={{
                backgroundColor: '#c4956a',
                color: '#eef3e8',
                padding: '12px 24px',
                borderRadius: 6,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 500,
                display: 'inline-block',
              }}
            >
              Complete your setup
            </Button>

            <Text style={{ color: '#1e4420', fontSize: 14, lineHeight: 1.6, margin: '20px 0 0 0' }}>
              Questions? Just reply to this email — we read every one.
            </Text>
          </Section>

          <Section style={{ padding: '0 32px 32px 32px' }}>
            <Hr style={{ borderColor: '#dfe8d5', margin: '32px 0 16px 0' }} />

            <Text style={{ color: '#3a7032', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              You&apos;re receiving this because you recently signed up for Barterkin.
            </Text>
            <Text style={{ color: '#3a7032', fontSize: 12, lineHeight: 1.5, margin: '8px 0 0 0' }}>
              Georgia Barter Network /{' '}
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

export default OnboardingAbandonmentEmail
