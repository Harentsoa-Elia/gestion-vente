"use client"

interface IconProps {
  className?: string
  size?: number
}

export const MapPin = ({ className = "", size = 24 }: IconProps) => {
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
        <linearGradient id="pinGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="50%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
        <filter id="pinShadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
        </filter>
      </defs>

      {/* Corps principal du pin */}
      <path
        d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
        fill="url(#pinGradient)"
        stroke="currentColor"
        strokeWidth="1.5"
        filter="url(#pinShadow)"
      />

      {/* Point central */}
      <circle cx="12" cy="10" r="3" fill="white" stroke="currentColor" strokeWidth="1" />

      {/* Point intérieur */}
      <circle cx="12" cy="10" r="1.5" fill="currentColor" />

      {/* Reflet */}
      <path d="M8 7c1-2 3-3 4-3s3 1 4 3c0-1-1-2-4-2s-4 1-4 2z" fill="rgba(255,255,255,0.4)" />

      {/* Ombre au sol */}
      <ellipse cx="12" cy="22" rx="3" ry="1" fill="currentColor" opacity="0.2" />
    </svg>
  )
}
