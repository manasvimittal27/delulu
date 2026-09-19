import type { ReactElement } from 'react'

const SHAPES: Record<string, (color: string) => ReactElement> = {
  blob: (c) => (
    <path d="M50 15c18 0 32 12 32 30s-15 33-32 33-32-15-32-33 14-30 32-30z" fill={c} />
  ),
  cat_sunglasses: (c) => (
    <g>
      <circle cx="50" cy="55" r="30" fill={c} />
      <path d="M25 35 L35 20 L45 35 Z" fill={c} />
      <path d="M75 35 L65 20 L55 35 Z" fill={c} />
      <rect x="30" y="48" width="40" height="12" rx="6" fill="#12101A" />
    </g>
  ),
  alien: (c) => (
    <g>
      <ellipse cx="50" cy="50" rx="26" ry="34" fill={c} />
      <ellipse cx="40" cy="48" rx="7" ry="10" fill="#12101A" />
      <ellipse cx="60" cy="48" rx="7" ry="10" fill="#12101A" />
    </g>
  ),
  mushroom: (c) => (
    <g>
      <path d="M20 45a30 22 0 0 1 60 0Z" fill={c} />
      <rect x="38" y="45" width="24" height="32" rx="8" fill="#F7F4EC" />
    </g>
  ),
  chai_cup: (c) => (
    <g>
      <rect x="28" y="35" width="40" height="35" rx="6" fill={c} />
      <path d="M68 42c12-4 16 14 2 16" stroke={c} strokeWidth="5" fill="none" />
    </g>
  ),
  disco_ball: (c) => (
    <g>
      <circle cx="50" cy="50" r="30" fill={c} />
      {Array.from({ length: 5 }).map((_, i) => (
        <line key={i} x1="20" y1={35 + i * 8} x2="80" y2={35 + i * 8} stroke="#12101A" strokeWidth="1.5" />
      ))}
    </g>
  ),
  frog_bucket_hat: (c) => (
    <g>
      <ellipse cx="50" cy="55" rx="28" ry="24" fill={c} />
      <circle cx="35" cy="35" r="8" fill={c} />
      <circle cx="65" cy="35" r="8" fill={c} />
      <rect x="20" y="20" width="60" height="10" rx="5" fill="#12101A" />
    </g>
  ),
  ghost: (c) => (
    <path d="M22 80V45a28 28 0 0 1 56 0v35l-9-8-9 8-9-8-9 8-9-8-9 8Z" fill={c} />
  ),
  robot: (c) => (
    <g>
      <rect x="24" y="30" width="52" height="44" rx="10" fill={c} />
      <circle cx="40" cy="52" r="5" fill="#12101A" />
      <circle cx="60" cy="52" r="5" fill="#12101A" />
      <rect x="45" y="14" width="10" height="14" fill={c} />
    </g>
  ),
  panda: (c) => (
    <g>
      <circle cx="50" cy="52" r="30" fill="#F7F4EC" />
      <circle cx="30" cy="28" r="10" fill={c} />
      <circle cx="70" cy="28" r="10" fill={c} />
      <ellipse cx="38" cy="52" rx="7" ry="9" fill={c} />
      <ellipse cx="62" cy="52" rx="7" ry="9" fill={c} />
    </g>
  ),
  fox: (c) => (
    <g>
      <path d="M20 60 L35 25 L50 55 L65 25 L80 60 Z" fill={c} />
      <circle cx="50" cy="60" r="20" fill={c} />
    </g>
  ),
  owl: (c) => (
    <g>
      <ellipse cx="50" cy="55" rx="28" ry="30" fill={c} />
      <circle cx="38" cy="48" r="11" fill="#F7F4EC" />
      <circle cx="62" cy="48" r="11" fill="#F7F4EC" />
      <circle cx="38" cy="48" r="4" fill="#12101A" />
      <circle cx="62" cy="48" r="4" fill="#12101A" />
    </g>
  ),
  cactus: (c) => (
    <g>
      <rect x="42" y="25" width="16" height="55" rx="8" fill={c} />
      <rect x="24" y="40" width="14" height="26" rx="7" fill={c} />
      <rect x="62" y="35" width="14" height="26" rx="7" fill={c} />
    </g>
  ),
}

const FALLBACK_PALETTE = ['#A78BFA', '#FF5DA2', '#C4F542', '#FF8A3D', '#5CC8FF']

function fallbackShape(id: string, color: string) {
  const seed = id.split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)
  const variant = seed % 4
  if (variant === 0) return <circle cx="50" cy="50" r="32" fill={color} />
  if (variant === 1) return <rect x="20" y="20" width="60" height="60" rx="18" fill={color} />
  if (variant === 2) return <polygon points="50,15 85,75 15,75" fill={color} />
  return <ellipse cx="50" cy="50" rx="32" ry="26" fill={color} />
}

export function AvatarIcon({ avatarId, color = '#A78BFA', size = 48 }: { avatarId: string; color?: string; size?: number }) {
  const renderer = SHAPES[avatarId]
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className="rounded-full bg-surface-2">
      {renderer ? renderer(color) : fallbackShape(avatarId, color)}
    </svg>
  )
}

export const AVATAR_COLORS = FALLBACK_PALETTE
