import { ImageResponse } from 'next/og'
import { getListingById } from '@/lib/data/listings'

export const alt = 'Barterkin Listing'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const listing = await getListingById(id)

  const title = listing?.title ?? 'Barterkin Listing'
  const description = listing?.description ?? ''
  const category = listing?.categories?.name ?? ''
  const county = listing?.counties?.name ?? 'Georgia'
  const condition = listing?.condition ?? ''
  const seller = listing?.profiles?.display_name ?? listing?.profiles?.username ?? ''

  const truncatedDesc = description.length > 180 ? description.slice(0, 180) + '…' : description

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
        {/* Top: category + location badges */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {category && (
            <span
              style={{
                backgroundColor: 'rgba(244,247,240,0.15)',
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: '18px',
                fontWeight: 500,
                border: '1px solid rgba(244,247,240,0.25)',
              }}
            >
              {category}
            </span>
          )}
          {county && (
            <span
              style={{
                backgroundColor: 'rgba(244,247,240,0.15)',
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: '18px',
                fontWeight: 500,
                border: '1px solid rgba(244,247,240,0.25)',
              }}
            >
              {county}
            </span>
          )}
          {condition && (
            <span
              style={{
                backgroundColor: 'rgba(244,247,240,0.15)',
                padding: '8px 16px',
                borderRadius: '9999px',
                fontSize: '18px',
                fontWeight: 500,
                border: '1px solid rgba(244,247,240,0.25)',
              }}
            >
              {condition}
            </span>
          )}
        </div>

        {/* Middle: title + description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '24px' }}>
          <div
            style={{
              fontSize: '56px',
              fontWeight: 700,
              lineHeight: 1.15,
              letterSpacing: '-1px',
              maxWidth: '900px',
            }}
          >
            {title}
          </div>
          {truncatedDesc && (
            <div
              style={{
                fontSize: '26px',
                opacity: 0.85,
                lineHeight: 1.4,
                maxWidth: '900px',
                fontFamily: 'sans-serif',
              }}
            >
              {truncatedDesc}
            </div>
          )}
        </div>

        {/* Bottom: seller + brand */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            marginTop: 'auto',
          }}
        >
          {seller && (
            <div style={{ fontSize: '22px', opacity: 0.7, fontFamily: 'sans-serif' }}>
              Listed by {seller}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
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
      </div>
    ),
    size,
  )
}
