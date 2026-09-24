/** Anneau de progression en dégradé violet → rose (tableau de bord, recommandations). */
export function Anneau({ pourcentage, taille = 132, epaisseur = 14, id }: { pourcentage: number; taille?: number; epaisseur?: number; id: string }) {
  const r = (taille - epaisseur) / 2
  const c = 2 * Math.PI * r
  const p = Math.max(0, Math.min(100, pourcentage))
  return (
    <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`} className="-rotate-90" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6C5CE7" />
          <stop offset="1" stopColor="#E8479A" />
        </linearGradient>
      </defs>
      <circle cx={taille / 2} cy={taille / 2} r={r} fill="none" strokeWidth={epaisseur} className="stroke-gw-lavande/60 dark:stroke-white/10" />
      {p > 0 && (
        <circle
          cx={taille / 2}
          cy={taille / 2}
          r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={epaisseur}
          strokeLinecap="round"
          strokeDasharray={`${(p / 100) * c} ${c}`}
        />
      )}
    </svg>
  )
}
