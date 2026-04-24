import { ImageResponse } from 'next/og'

export const alt = "Barterkin — Georgia's community skills exchange"
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px',
          background:
            'linear-gradient(180deg, #1e4420 0%, #2d5a27 50%, #3a7032 100%)',
          color: '#eef3e8',
          fontFamily: 'serif',
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            backgroundColor: '#f4f7f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 32,
          }}
        >
          <svg width="56" height="56" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="46" fill="#f4f7f0" stroke="#dfe8d5" strokeWidth="1.5"/>
            <circle cx="50" cy="50" r="42" fill="#eef3e8" opacity="0.5"/>
            <ellipse cx="50" cy="74" rx="8" ry="4" fill="#c4956a" opacity="0.3"/>
            <path d="M50 74 Q50 55 50 42" stroke="#1e4420" strokeWidth="3.5" fill="none" strokeLinecap="round"/>
            <path d="M50 55 Q32 48 26 36 Q32 40 50 46" fill="#3a7032"/>
            <path d="M50 50 Q68 43 74 31 Q68 35 50 41" fill="#c4956a"/>
            <circle cx="50" cy="42" r="3.5" fill="#c4956a"/>
            <circle cx="50" cy="42" r="1.5" fill="#f4f7f0"/>
          </svg>
        </div>
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            letterSpacing: '-2px',
            lineHeight: 1.1,
          }}
        >
          Barterkin
        </div>
        <div
          style={{
            fontSize: 32,
            marginTop: 16,
            opacity: 0.8,
            fontWeight: 400,
          }}
        >
          {"Georgia's community skills exchange"}
        </div>
      </div>
    ),
    size,
  )
}
