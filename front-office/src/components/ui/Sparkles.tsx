"use client"

interface IconProps {
  className?: string
  size?: number
}

export const Sparkles = ({ className = "", size = 24 }: IconProps) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="sparkleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="sparkleGlow">
          <feGaussianBlur stdDeviation="1" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grande étoile principale */}
      <g filter="url(#sparkleGlow)">
        <path
          d="M12 3l1.5 3h3l-2.5 2 1 3-3-1.5L9 11l1-3-2.5-2h3L12 3z"
          fill="url(#sparkleGradient)"
          stroke="currentColor"
          strokeWidth="0.5"
        />
      </g>

      {/* Petites étoiles */}
      <g filter="url(#sparkleGlow)">
        <path
          d="M6 8l0.5 1h1l-0.8 0.6 0.3 1-0.8-0.6L5.4 10.6l0.3-1L5 9h1L6 8z"
          fill="url(#sparkleGradient)"
          stroke="currentColor"
          strokeWidth="0.3"
        />

        <path
          d="M18 6l0.5 1h1l-0.8 0.6 0.3 1-0.8-0.6L17.4 8.6l0.3-1L17 7h1L18 6z"
          fill="url(#sparkleGradient)"
          stroke="currentColor"
          strokeWidth="0.3"
        />

        <path
          d="M7 18l0.5 1h1l-0.8 0.6 0.3 1-0.8-0.6L6.4 20.6l0.3-1L6 19h1L7 18z"
          fill="url(#sparkleGradient)"
          stroke="currentColor"
          strokeWidth="0.3"
        />

        <path
          d="M19 16l0.5 1h1l-0.8 0.6 0.3 1-0.8-0.6L18.4 18.6l0.3-1L18 17h1L19 16z"
          fill="url(#sparkleGradient)"
          stroke="currentColor"
          strokeWidth="0.3"
        />
      </g>

      {/* Points brillants */}
      <circle cx="4" cy="4" r="1" fill="#fbbf24" opacity="0.8" filter="url(#sparkleGlow)" />
      <circle cx="20" cy="20" r="1" fill="#f59e0b" opacity="0.8" filter="url(#sparkleGlow)" />
      <circle cx="3" cy="15" r="0.5" fill="#fbbf24" opacity="0.6" />
      <circle cx="21" cy="9" r="0.5" fill="#f59e0b" opacity="0.6" />
    </svg>
  )
}
