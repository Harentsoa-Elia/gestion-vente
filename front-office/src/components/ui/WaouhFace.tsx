"use client"

interface IconProps {
  className?: string
  size?: number
}

/**
 * Icone originale "visage surpris" pour la reaction Waouh.
 * Dessin maison (cercle degrade + yeux + bouche ouverte), pas une copie
 * des icones Facebook et pas un emoji Unicode.
 */
export const WaouhFace = ({ className = "", size = 24 }: IconProps) => {
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
        <linearGradient id="waouhGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="11" fill="url(#waouhGradient)" />
      <path d="M6.5 8.2 Q8 6.8 9.5 8" stroke="#7C4A03" strokeWidth="1" strokeLinecap="round" fill="none" />
      <path d="M14.5 8 Q16 6.8 17.5 8.2" stroke="#7C4A03" strokeWidth="1" strokeLinecap="round" fill="none" />
      <circle cx="8.3" cy="10.8" r="1.7" fill="#3A2409" />
      <circle cx="15.7" cy="10.8" r="1.7" fill="#3A2409" />
      <ellipse cx="12" cy="16.3" rx="2.6" ry="3.1" fill="#7C2D12" />
      <ellipse cx="12" cy="15.2" rx="2.1" ry="1.5" fill="#3A2409" opacity="0.35" />
    </svg>
  )
}