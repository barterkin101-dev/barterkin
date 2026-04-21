import { Html, Head, Body, Container, Heading, Text, Section, Hr, Link } from '@react-email/components'

export interface ReportAdminNotifyEmailProps {
  reporterDisplayName: string
  reporterEmail: string
  reporterUsername: string
  targetDisplayName: string
  targetUsername: string
  targetProfileUrl: string
  reason: 'harassment' | 'spam' | 'off-topic' | 'impersonation' | 'other'
  note?: string
  reportId: string
  createdAt: string
}

export function ReportAdminNotifyEmail({
  reporterDisplayName,
  reporterEmail,
  reporterUsername,
  targetDisplayName,
  targetUsername,
  targetProfileUrl,
  reason,
  note,
  reportId,
  createdAt,
}: ReportAdminNotifyEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Body style={{ backgroundColor: '#eef3e8', fontFamily: 'Inter, Arial, sans-serif', margin: 0, padding: '32px 16px' }}>
        <Container style={{ maxWidth: 600, margin: '0 auto', backgroundColor: '#f4f7f0', borderRadius: 8, padding: 0, overflow: 'hidden', border: '1px solid #dfe8d5' }}>
          <Section style={{ backgroundColor: '#2d5a27', padding: '20px 32px' }}>
            <Heading style={{ color: '#eef3e8', fontFamily: 'Lora, Georgia, serif', fontSize: 20, margin: 0 }}>
              New Report — Barterkin
            </Heading>
          </Section>

          <Section style={{ padding: '24px 32px' }}>
            <Text style={{ color: '#1e4420', fontSize: 14, margin: '0 0 16px 0' }}>
              <strong>Reason:</strong> {reason}
            </Text>
            <Text style={{ color: '#1e4420', fontSize: 14, margin: '0 0 16px 0' }}>
              <strong>Report ID:</strong>{' '}
              <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', fontSize: 13 }}>{reportId}</span>
            </Text>
            <Text style={{ color: '#1e4420', fontSize: 14, margin: '0 0 16px 0' }}>
              <strong>Submitted:</strong> {createdAt}
            </Text>

            <Hr style={{ borderColor: '#dfe8d5', margin: '16px 0' }} />

            <Text style={{ color: '#1e4420', fontSize: 14, margin: '0 0 8px 0' }}>
              <strong>Target:</strong> {targetDisplayName} (@{targetUsername})
            </Text>
            <Text style={{ color: '#3a7032', fontSize: 13, margin: '0 0 16px 0' }}>
              <Link href={targetProfileUrl} style={{ color: '#c4956a' }}>{targetProfileUrl}</Link>
            </Text>

            <Text style={{ color: '#1e4420', fontSize: 14, margin: '0 0 8px 0' }}>
              <strong>Reporter:</strong> {reporterDisplayName} (@{reporterUsername})
            </Text>
            <Text style={{ color: '#3a7032', fontSize: 13, margin: '0 0 16px 0' }}>
              {reporterEmail}
            </Text>

            {note && note.trim().length > 0 && (
              <>
                <Hr style={{ borderColor: '#dfe8d5', margin: '16px 0' }} />
                <Text style={{ color: '#1e4420', fontSize: 14, margin: '0 0 8px 0' }}>
                  <strong>Reporter&apos;s note:</strong>
                </Text>
                <Section style={{ borderLeft: '3px solid #c4956a', padding: '8px 16px', backgroundColor: '#eef3e8' }}>
                  <Text style={{ color: '#1e4420', fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0 }}>
                    {note}
                  </Text>
                </Section>
              </>
            )}

            <Hr style={{ borderColor: '#dfe8d5', margin: '24px 0 16px 0' }} />

            <Text style={{ color: '#3a7032', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
              Review in Supabase Studio:{' '}
              <code>SELECT * FROM public.reports WHERE id = &apos;{reportId}&apos;;</code>
            </Text>
            <Text style={{ color: '#3a7032', fontSize: 12, lineHeight: 1.5, margin: '8px 0 0 0' }}>
              To action:{' '}
              <code>UPDATE public.profiles SET banned = true WHERE id = &apos;&lt;target-profile-id&gt;&apos;;</code>{' '}
              (TRUST-04)
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export default ReportAdminNotifyEmail
