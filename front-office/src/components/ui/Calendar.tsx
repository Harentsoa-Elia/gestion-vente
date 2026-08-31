"use client"

interface IconProps {
  className?: string
  size?: number
}

export const Calendar = ({ className = "", size = 24 }: IconProps) => {
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
        <linearGradient id="calendarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>

      {/* Corps du calendrier */}
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        ry="2"
        fill="url(#calendarGradient)"
        stroke="currentColor"
        strokeWidth="1.5"
      />

      {/* En-tête du calendrier */}
      <rect x="3" y="4" width="18" height="4" rx="2" ry="2" fill="currentColor" opacity="0.1" />

      {/* Anneaux de reliure */}
      <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />

      {/* Grille du calendrier */}
      <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <line x1="3" y1="13" x2="21" y2="13" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <line x1="3" y1="16" x2="21" y2="16" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />

      <line x1="7" y1="8" x2="7" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <line x1="11" y1="8" x2="11" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <line x1="15" y1="8" x2="15" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
      <line x1="19" y1="8" x2="19" y2="20" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />

      {/* Date mise en évidence */}
      <circle cx="9" cy="14.5" r="1.5" fill="currentColor" opacity="0.8" />

      {/* Petits points pour les autres dates */}
      <circle cx="13" cy="11.5" r="0.5" fill="currentColor" opacity="0.4" />
      <circle cx="17" cy="11.5" r="0.5" fill="currentColor" opacity="0.4" />
      <circle cx="5" cy="17.5" r="0.5" fill="currentColor" opacity="0.4" />
      <circle cx="13" cy="17.5" r="0.5" fill="currentColor" opacity="0.4" />
    </svg>
  )
}
