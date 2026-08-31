"use client"

interface IconProps {
  className?: string
  size?: number
}

export const Clock = ({ className = "", size = 24 }: IconProps) => {
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
        <linearGradient id="clockGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <filter id="clockShadow">
          <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* Cadran principal */}
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="url(#clockGradient)"
        stroke="currentColor"
        strokeWidth="1.5"
        filter="url(#clockShadow)"
      />

      {/* Marques des heures */}
      <g stroke="currentColor" strokeWidth="1" opacity="0.6">
        <line x1="12" y1="4" x2="12" y2="6" strokeWidth="2" />
        <line x1="12" y1="18" x2="12" y2="20" strokeWidth="2" />
        <line x1="4" y1="12" x2="6" y2="12" strokeWidth="2" />
        <line x1="18" y1="12" x2="20" y2="12" strokeWidth="2" />

        <line x1="6.34" y1="6.34" x2="7.76" y2="7.76" />
        <line x1="17.66" y1="6.34" x2="16.24" y2="7.76" />
        <line x1="6.34" y1="17.66" x2="7.76" y2="16.24" />
        <line x1="17.66" y1="17.66" x2="16.24" y2="16.24" />
      </g>

      {/* Aiguille des heures */}
      <line x1="12" y1="12" x2="12" y2="8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />

      {/* Aiguille des minutes */}
      <line x1="12" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

      {/* Centre de l'horloge */}
      <circle cx="12" cy="12" r="2" fill="currentColor" />

      {/* Reflet sur le cadran */}
      <path d="M6 8c2-3 6-4 6-4s4 1 6 4c-1-4-6-6-6-6s-5 2-6 6z" fill="rgba(255,255,255,0.3)" />
    </svg>
  )
}
