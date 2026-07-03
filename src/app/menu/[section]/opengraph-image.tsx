/* eslint-disable react-refresh/only-export-components */
import { ImageResponse } from 'next/og'
import { getActiveCompetitionProfile } from '../../../competitions'

export const dynamic = 'force-static'
export const contentType = 'image/png'
export const size = { width: 1200, height: 630 }
export const alt = `${getActiveCompetitionProfile().displayName} menu preview`

type MenuImageCopy = { heading: string; subheading: string; accent: string }

const copyBySection: Record<string, MenuImageCopy> = {
  overview: {
    heading: 'Tournament Schedule',
    subheading: 'Track every upcoming fixture and kickoff.',
    accent: '#7fe5c5',
  },
  groups: {
    heading: 'Group Standings',
    subheading: 'Follow points, rankings, and qualification races.',
    accent: '#8ec5ff',
  },
  standings: {
    heading: 'Standings',
    subheading: 'Follow points, rankings, and title race updates.',
    accent: '#8ec5ff',
  },
  teams: {
    heading: 'Tournament Teams',
    subheading: 'Open team details, fixtures, and group context.',
    accent: '#7fe5c5',
  },
  matches: {
    heading: 'Match Center',
    subheading: 'Live scores, status, and fixture details.',
    accent: '#7fe5c5',
  },
  bracket: {
    heading: 'Knockout Bracket',
    subheading: 'From Round of 32 all the way to the final.',
    accent: '#f4c542',
  },
  leaderboard: {
    heading: 'Predictions Leaderboard',
    subheading: 'See who leads the prediction challenge.',
    accent: '#f4c542',
  },
}

export default async function Image({ params }: { params: Promise<{ section: string }> }) {
  const competition = getActiveCompetitionProfile()
  const { section } = await params
  const key = String(section ?? '').trim().toLowerCase()
  const copy = copyBySection[key] ?? {
    heading: competition.displayName,
    subheading: 'Live results, fixtures, groups, and bracket.',
    accent: '#7fe5c5',
  }

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
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: 2 }}>{competition.displayName.toUpperCase()}</div>
          <div style={{ fontSize: 24, fontWeight: 600, color: '#c5d5f5' }}>Dashboard</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 940 }}>
          <div style={{ fontSize: 78, fontWeight: 900, lineHeight: 1.04 }}>{copy.heading}</div>
          <div style={{ fontSize: 34, fontWeight: 600, color: copy.accent, lineHeight: 1.2 }}>{copy.subheading}</div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 30, fontWeight: 700, color: '#7fe5c5' }}>{competition.siteDisplayHost ?? competition.id}</div>
          <div style={{ fontSize: 26, opacity: 0.76 }}>Share this page</div>
        </div>
      </div>
    ),
    size,
  )
}
