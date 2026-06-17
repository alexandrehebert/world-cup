/* eslint-disable react-refresh/only-export-components */
import { ImageResponse } from 'next/og'

export const dynamic = 'force-static'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }
export const alt = 'World Cup predictions invite'

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #07111f 0%, #111c33 100%)',
          color: '#f4f7fb',
          fontFamily: 'Inter, Arial, sans-serif',
          padding: '56px 64px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 2 }}>FIFA WORLD CUP 2026</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#c5d5f5' }}>Prediction challenge</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 920 }}>
          <div style={{ fontSize: 74, fontWeight: 900, lineHeight: 1.05 }}>Make your World Cup picks</div>
          <div style={{ fontSize: 34, fontWeight: 600, color: '#f4c542', lineHeight: 1.2 }}>
            Join the predictions page and compete with friends.
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#7fe5c5' }}>Pick winners and exact scores</div>
          <div style={{ fontSize: 26, opacity: 0.76 }}>world-cup.hebert.app</div>
        </div>
      </div>
    ),
    size,
  )
}
