/*
 * Illustration du bandeau de bienvenue : une scène avec deux projecteurs,
 * un ticket qui flotte, une petite carte de graphique et des confettis,
 * dans les couleurs guichetweb. Remplace le personnage du modèle uTask.
 * Les encoches du ticket prennent la couleur du texte (currentColor) : donner à
 * l'illustration la couleur du fond de la carte (ex. text-white dark:text-gw-carte-sombre).
 */
export function IllustrationBienvenue({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 190" className={className} aria-hidden>
      <defs>
        <linearGradient id="ib-faisceau-a" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E8479A" stopOpacity="0.55" />
          <stop offset="1" stopColor="#E8479A" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ib-faisceau-b" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6C5CE7" stopOpacity="0.55" />
          <stop offset="1" stopColor="#6C5CE7" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ib-ticket" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6C5CE7" />
          <stop offset="1" stopColor="#C92A7A" />
        </linearGradient>
        <linearGradient id="ib-barre" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E8479A" />
          <stop offset="1" stopColor="#6C5CE7" />
        </linearGradient>
      </defs>

      {/* faisceaux */}
      <path d="M70 0 L20 170 L120 170 Z" fill="url(#ib-faisceau-a)" />
      <path d="M230 0 L180 170 L280 170 Z" fill="url(#ib-faisceau-b)" />

      {/* scène */}
      <ellipse cx="150" cy="172" rx="135" ry="14" fill="#6C5CE7" opacity="0.18" />
      <rect x="40" y="150" width="220" height="22" rx="11" fill="#1E1A3C" />
      <rect x="40" y="150" width="220" height="6" rx="3" fill="#E8479A" opacity="0.8" />

      {/* carte graphique */}
      <g transform="translate(178 58) rotate(6)">
        <rect width="92" height="70" rx="12" fill="#FFFFFF" />
        <rect x="12" y="12" width="36" height="6" rx="3" fill="#D9D2FF" />
        {[22, 34, 16, 42, 30].map((h, i) => (
          <rect key={i} x={14 + i * 14} y={58 - h} width="8" height={h} rx="4" fill="url(#ib-barre)" />
        ))}
      </g>

      {/* ticket */}
      <g transform="translate(58 62) rotate(-10)">
        <rect width="120" height="62" rx="12" fill="url(#ib-ticket)" />
        <line x1="84" y1="6" x2="84" y2="56" stroke="#FFFFFF" strokeOpacity="0.5" strokeWidth="2" strokeDasharray="4 4" />
        <circle cx="84" cy="0" r="7" fill="currentColor" />
        <circle cx="84" cy="62" r="7" fill="currentColor" />
        <rect x="14" y="16" width="52" height="7" rx="3.5" fill="#FFFFFF" />
        <rect x="14" y="30" width="36" height="5" rx="2.5" fill="#FFFFFF" opacity="0.6" />
        <rect x="14" y="42" width="44" height="5" rx="2.5" fill="#FFFFFF" opacity="0.6" />
        <path d="M100 24 l3 6 6 1 -4.5 4.5 1 6 -5.5 -3 -5.5 3 1 -6 -4.5 -4.5 6 -1 z" fill="#FFFFFF" />
      </g>

      {/* confettis, comme les post-it du modèle */}
      <rect x="150" y="22" width="16" height="16" rx="4" fill="#E8479A" transform="rotate(12 158 30)" />
      <rect x="120" y="36" width="12" height="12" rx="3" fill="#D9D2FF" transform="rotate(-14 126 42)" />
      <rect x="262" y="30" width="12" height="12" rx="3" fill="#E8479A" opacity="0.7" transform="rotate(20 268 36)" />
      <circle cx="36" cy="44" r="5" fill="#6C5CE7" />
      <circle cx="286" cy="120" r="4" fill="#C92A7A" />
    </svg>
  )
}
