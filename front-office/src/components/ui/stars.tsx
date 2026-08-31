"use client"

interface IconProps {
  className?: string
  size?: number
  filled?: boolean
}

export const Star = ({ className = "", size = 24, filled = true }: IconProps) => {
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
        <linearGradient id="starGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <filter id="starGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={filled ? "url(#starGradient)" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        filter="url(#starGlow)"
      />

      {/* Reflet intérieur */}
      {filled && <path d="M12 2l2 4 2 1-3 3 1 4-2-1-2 1 1-4-3-3 2-1 2-4z" fill="rgba(255,255,255,0.3)" />}
    </svg>
  )
}
