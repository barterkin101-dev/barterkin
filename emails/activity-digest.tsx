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

export interface ActivityDigestEmailProps {
  recipientName?: string | null
  messagesCount: number
  profileViews: number
  listingSaves: number
  newMembers: number
  messagesUrl: string
  profileUrl: string
  listingsUrl: string
  directoryUrl: string
  siteUrl: string
  unsubscribeUrl?: string
}

export function ActivityDigestEmail({
  recipientName,
  messagesCount,
  profileViews,
  listingSaves,
  newMembers,
  messagesUrl,
  profileUrl,
  listingsUrl,
  directoryUrl,
  siteUrl,
  unsubscribeUrl,
}: ActivityDigestEmailProps) {
  const hasActivity = messagesCount > 0 || profileViews > 0 || listingSaves > 0 || newMembers > 0
  const previewText = hasActivity
    ? `Your weekly Barterkin activity: ${messagesCount} new messages, ${profileViews} profile views`
    : 'Your weekly Barterkin activity digest'

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
              Your weekly activity
            </Heading>

            <Text style={{ color: '#1e4420', fontSize: 15, lineHeight: 1.6, margin: '0 0 24px 0' }}>
              {recipientName ? `${recipientName}, here's` : "Here's"} what happened on Barterkin this week.
            </Text>

            {hasActivity ? (
              <>
                <Section
                  style={{
                    backgroundColor: '#eef3e8',
                    border: '1px solid #dfe8d5',
                    borderRadius: 6,
                    padding: '20px',
                    marginBottom: 24,
                  }}
                >
                  {messagesCount > 0 && (
                    <Text style={{ color: '#1e4420', fontSize: 15, margin: '0 0 12px 0' }}>
                      <strong style={{ color: '#2d5a27', fontSize: 20 }}>{messagesCount}</strong>{' '}
                      new message{messagesCount === 1 ? '' : 's'} received
                    </Text>
                  )}
                  {profileViews > 0 && (
                    <Text style={{ color: '#1e4420', fontSize: 15, margin: '0 0 12px 0' }}>
                      <strong style={{ color: '#2d5a27', fontSize: 20 }}>{profileViews}</strong>{' '}
                      profile view{profileViews === 1 ? '' : 's'} this week
                    </Text>
                  )}
                  {listingSaves > 0 && (
                    <Text style={{ color: '#1e4420', fontSize: 15, margin: '0 0 12px 0' }}>
                      <strong style={{ color: '#2d5a27', fontSize: 20 }}>{listingSaves}</strong>{' '}
                      listing save{listingSaves === 1 ? '' : 's'} on your items
                    </Text>
                  )}
                  {newMembers > 0 && (
                    <Text style={{ color: '#1e4420', fontSize: 15, margin: 0 }}>
                      <strong style={{ color: '#2d5a27', fontSize: 20 }}>{newMembers}</strong>{' '}
                      new member{newMembers === 1 ? '' : 's'} joined your county
                    </Text>
                  )}
                </Section>

                <Section style={{ marginBottom: 24 }}>
                  {messagesCount > 0 && (
                    <Button
                      href={messagesUrl}
                      style={{
                        backgroundColor: '#c4956a',
                        color: '#eef3e8',
                        padding: '12px 24px',
                        borderRadius: 6,
                        textDecoration: 'none',
                        fontSize: 14,
                        fontWeight: 500,
                        display: 'inline-block',
                        marginBottom: 12,
                      }}
                    >
                      Check your messages
                    </Button>
                  )}
                  {profileViews > 0 && (
                    <Button
                      href={profileUrl}
                      style={{
                        backgroundColor: '#c4956a',
                        color: '#eef3e8',
                        padding: '12px 24px',
                        borderRadius: 6,
                        textDecoration: 'none',
                        fontSize: 14,
                        fontWeight: 500,
                        display: 'inline-block',
                        marginBottom: 12,
                      }}
                    >
                      View your profile
                    </Button>
                  )}
                  {newMembers > 0 && (
                    <Button
                      href={directoryUrl}
                      style={{
                        backgroundColor: '#c4956a',
                        color: '#eef3e8',
                        padding: '12px 24px',
                        borderRadius: 6,
                        textDecoration: 'none',
                        fontSize: 14,
                        fontWeight: 500,
                        display: 'inline-block',
                        marginBottom: 12,
                      }}
                    >
                      Browse new members
                    </Button>
                  )}
                </Section>
              </>
            ) : (
              <Section
                style={{
                  backgroundColor: '#eef3e8',
                  border: '1px solid #dfe8d5',
                  borderRadius: 6,
                  padding: '20px',
                  marginBottom: 24,
                }}
              >
                <Text style={{ color: '#1e4420', fontSize: 15, margin: '0 0 12px 0' }}>
                  No new activity this week — but the community is growing!
                </Text>
                <Button
                  href={listingsUrl}
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
                  Browse fresh listings
                </Button>
              </Section>
            )}

            <Hr style={{ borderColor: '#dfe8d5', margin: '32px 0 16px 0' }} />

            <Text style={{ color: '#3a7032', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              You&apos;re receiving this because weekly activity digest emails are enabled on your Barterkin profile.
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

export default ActivityDigestEmail
