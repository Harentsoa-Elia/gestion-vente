"use client"

interface IconProps {
  className?: string
  size?: number
}

export const Crown = ({ className = "", size = 24 }: IconProps) => {
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
        <linearGradient id="crownGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>

      {/* Base de la couronne */}
      <path
        d="M5 16h14l-1 4H6l-1-4z"
        fill="url(#crownGradient)"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Pointes de la couronne */}
      <path
        d="M5 16l2-8 3 4 2-6 2 6 3-4 2 8"
        fill="url(#crownGradient)"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Joyaux décoratifs */}
      <circle cx="12" cy="8" r="1.5" fill="#ef4444" />
      <circle cx="8" cy="12" r="1" fill="#3b82f6" />
      <circle cx="16" cy="12" r="1" fill="#10b981" />

      {/* Reflets */}
      <path d="M7 16l1-4 1 1-1 3h-1z" fill="rgba(255,255,255,0.3)" />
      <path d="M12 4l-1 4 1 1 1-4-1-1z" fill="rgba(255,255,255,0.4)" />
    </svg>
  )
}
