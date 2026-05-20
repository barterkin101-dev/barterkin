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

export interface GiftPremiumEmailProps {
  recipientName?: string | null
  purchaserName?: string | null
  redemptionUrl: string
  siteUrl: string
  tierLabel: string
  billingIntervalLabel: string
}

export function GiftPremiumEmail({
  recipientName,
  purchaserName,
  redemptionUrl,
  siteUrl,
  tierLabel,
  billingIntervalLabel,
}: GiftPremiumEmailProps) {
  const previewText = `${purchaserName ?? 'Someone'} gifted you ${tierLabel} on Barterkin`

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
              You&apos;ve been gifted {tierLabel}!
            </Heading>

            <Text style={{ color: '#1e4420', fontSize: 15, lineHeight: 1.6, margin: '0 0 16px 0' }}>
              Hi{recipientName ? ` ${recipientName}` : ''},
            </Text>

            <Text style={{ color: '#1e4420', fontSize: 15, lineHeight: 1.6, margin: '0 0 16px 0' }}>
              {purchaserName ?? 'Someone'} just gifted you a {tierLabel} subscription on Barterkin
              ({billingIntervalLabel}). Click the button below to redeem it and unlock unlimited
              listings, featured placement, and premium perks.
            </Text>

            <Section style={{ textAlign: 'center', margin: '24px 0' }}>
              <Button
                href={redemptionUrl}
                style={{
                  backgroundColor: '#2d5a27',
                  color: '#ffffff',
                  borderRadius: 6,
                  padding: '12px 24px',
                  fontSize: 15,
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-block',
                }}
              >
                Redeem your gift
              </Button>
            </Section>

            <Text style={{ color: '#1e4420', fontSize: 14, lineHeight: 1.6, margin: '0 0 8px 0' }}>
              Or copy and paste this link into your browser:
            </Text>
            <Text style={{ color: '#2d5a27', fontSize: 13, lineHeight: 1.5, margin: '0 0 16px 0', wordBreak: 'break-all' }}>
              <Link href={redemptionUrl} style={{ color: '#2d5a27', textDecoration: 'underline' }}>
                {redemptionUrl}
              </Link>
            </Text>

            <Hr style={{ borderColor: '#dfe8d5', margin: '24px 0' }} />

            <Text style={{ color: '#5a6b4e', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
              If you didn&apos;t expect this gift, you can safely ignore this email. The gift will
              expire if not redeemed within 30 days.
            </Text>
          </Section>
        </Container>

        <Text style={{ color: '#5a6b4e', fontSize: 12, textAlign: 'center', margin: '16px 0 0 0' }}>
          <Link href={siteUrl} style={{ color: '#5a6b4e', textDecoration: 'underline' }}>
            Barterkin
          </Link>{' '}
          — Georgia&apos;s community skills exchange
        </Text>
      </Body>
    </Html>
  )
}
