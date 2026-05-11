import {
  Html,
  Head,
  Body,
  Container,
  Heading,
  Text,
  Button,
  Hr,
  Section,
} from '@react-email/components'

export interface NewMessageEmailProps {
  senderDisplayName: string
  senderUsername: string
  messagePreview: string
  conversationUrl: string
  siteUrl: string
}

export function NewMessageEmail({
  senderDisplayName,
  senderUsername,
  messagePreview,
  conversationUrl,
  siteUrl,
}: NewMessageEmailProps) {
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
            padding: 0,
            overflow: 'hidden',
            border: '1px solid #dfe8d5',
          }}
        >
          {/* Forest-green header */}
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
            <Text
              style={{ color: '#eef3e8', fontSize: 13, margin: '4px 0 0 0' }}
            >
              Georgia Barter Network
            </Text>
          </Section>

          {/* Body */}
          <Section style={{ padding: '32px' }}>
            <Heading
              style={{
                color: '#1e4420',
                fontFamily: 'Lora, Georgia, serif',
                fontSize: 22,
                marginBottom: 16,
              }}
            >
              New message from {senderDisplayName}
            </Heading>

            <Text
              style={{
                color: '#1e4420',
                fontSize: 15,
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              @{senderUsername} sent you a message on Barterkin:
            </Text>

            {/* Quoted message block — clay left-border */}
            <Section
              style={{
                borderLeft: '3px solid #c4956a',
                padding: '8px 16px',
                marginBottom: 24,
                backgroundColor: '#eef3e8',
              }}
            >
              <Text
                style={{
                  color: '#1e4420',
                  fontSize: 15,
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                }}
              >
                {messagePreview}
              </Text>
            </Section>

            <Button
              href={conversationUrl}
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
              Open Conversation
            </Button>

            <Hr style={{ borderColor: '#dfe8d5', margin: '32px 0 16px 0' }} />

            <Text
              style={{
                color: '#3a7032',
                fontSize: 12,
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              You&apos;re receiving this because you have email notifications enabled for messages on Barterkin.
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

export default NewMessageEmail
