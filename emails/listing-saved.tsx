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

export interface ListingSavedEmailProps {
  sellerName?: string | null
  saverName?: string | null
  saverUsername?: string | null
  listingTitle: string
  listingUrl: string
  siteUrl: string
}

export function ListingSavedEmail({
  sellerName,
  saverName,
  saverUsername,
  listingTitle,
  listingUrl,
  siteUrl,
}: ListingSavedEmailProps) {
  const displayName = saverName ?? saverUsername ?? 'Someone'
  const previewText = `${displayName} saved your listing "${listingTitle}" on Barterkin`

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
            maxWidth: 560,
            margin: '0 auto',
            backgroundColor: '#ffffff',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Section
            style={{
              backgroundColor: '#1e4420',
              padding: '24px 32px',
              textAlign: 'center',
            }}
          >
            <Text
              style={{
                color: '#ffffff',
                fontFamily: 'Lora, Georgia, serif',
                fontSize: 20,
                fontWeight: 700,
                margin: 0,
              }}
            >
              Barterkin
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: '32px' }}>
            <Heading
              style={{
                color: '#1e4420',
                fontFamily: 'Lora, Georgia, serif',
                fontSize: 22,
                margin: '0 0 16px 0',
              }}
            >
              Someone is interested in your listing{sellerName ? `, ${sellerName}` : ''}
            </Heading>

            <Text
              style={{
                color: '#1e4420',
                fontSize: 15,
                lineHeight: 1.6,
                margin: '0 0 16px 0',
              }}
            >
              <strong>{displayName}</strong> saved your listing <strong>&ldquo;{listingTitle}&rdquo;</strong> to their favorites on Barterkin.
            </Text>

            <Text
              style={{
                color: '#1e4420',
                fontSize: 15,
                lineHeight: 1.6,
                margin: '0 0 24px 0',
              }}
            >
              This means they are interested in trading. Keep your listing fresh and respond quickly when they reach out.
            </Text>

            <Button
              href={listingUrl}
              style={{
                backgroundColor: '#3a7032',
                borderRadius: 8,
                color: '#ffffff',
                display: 'inline-block',
                fontSize: 15,
                fontWeight: 600,
                padding: '12px 24px',
                textDecoration: 'none',
              }}
            >
              View your listing
            </Button>
          </Section>

          <Hr style={{ borderColor: '#e0e8d9', margin: '0 32px' }} />

          {/* Footer */}
          <Section style={{ padding: '24px 32px' }}>
            <Text
              style={{
                color: '#3a7032',
                fontSize: 12,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              You&apos;re receiving this because someone saved your listing on Barterkin.
            </Text>
            <Text
              style={{
                color: '#3a7032',
                fontSize: 12,
                lineHeight: 1.5,
                margin: '8px 0 0 0',
              }}
            >
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

export default ListingSavedEmail
