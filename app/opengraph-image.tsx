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
