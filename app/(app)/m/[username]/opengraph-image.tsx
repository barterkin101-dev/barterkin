import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'

export const alt = 'Barterkin Profile'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, username, bio, avatar_url, counties(name)')
    .eq('username', username)
    .maybeSingle()

  const displayName = profile?.display_name ?? profile?.username ?? username
  const bio = profile?.bio ?? ''
  const county = (profile?.counties as { name?: string } | null)?.name ?? 'Georgia'
  const avatarUrl = profile?.avatar_url

  const truncatedBio = bio.length > 200 ? bio.slice(0, 200) + '…' : bio

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px',
          background: 'linear-gradient(180deg, #1e4420 0%, #2d5a27 50%, #3a7032 100%)',
          color: '#eef3e8',
          fontFamily: 'serif',
        }}
      >
        {/* Top row: avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          {/* Avatar circle */}
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '50%',
              backgroundColor: avatarUrl ? 'transparent' : 'rgba(244,247,240,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              border: '3px solid rgba(244,247,240,0.3)',
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                width={120}
                height={120}
                style={{ borderRadius: '50%', objectFit: 'cover' }}
              />
            ) : (
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#eef3e8" strokeWidth="1.5">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
              </svg>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div
              style={{
                fontSize: '56px',
                fontWeight: 700,
                lineHeight: 1.1,
                letterSpacing: '-1px',
              }}
            >
              {displayName}
            </div>
            <div
              style={{
                fontSize: '24px',
                opacity: 0.7,
                fontFamily: 'sans-serif',
              }}
            >
              @{username} · {county}
            </div>
          </div>
        </div>

        {/* Middle: bio */}
        {truncatedBio && (
          <div
            style={{
              fontSize: '28px',
              lineHeight: 1.45,
              opacity: 0.9,
              maxWidth: '900px',
              marginTop: '32px',
              fontFamily: 'sans-serif',
            }}
          >
            {truncatedBio}
          </div>
        )}

        {/* Bottom: brand */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '16px',
            marginTop: 'auto',
          }}
        >
          <svg width="48" height="48" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="46" fill="#f4f7f0" stroke="#dfe8d5" strokeWidth="1.5"/>
            <circle cx="50" cy="50" r="42" fill="#eef3e8" opacity="0.5"/>
            <ellipse cx="50" cy="74" rx="8" ry="4" fill="#c4956a" opacity="0.3"/>
            <path d="M50 74 Q50 55 50 42" stroke="#1e4420" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
            <path d="M50 55 Q32 48 26 36 Q32 40 50 46" fill="#3a7032"/>
            <path d="M50 50 Q68 43 74 31 Q68 35 50 41" fill="#c4956a"/>
            <circle cx="50" cy="42" r="3.5" fill="#c4956a"/>
            <circle cx="50" cy="42" r="1.5" fill="#f4f7f0"/>
          </svg>
          <div style={{ fontSize: '32px', fontWeight: 700 }}>Barterkin</div>
        </div>
      </div>
    ),
    size,
  )
}
