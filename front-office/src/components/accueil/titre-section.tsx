import Link from "next/link"
import { ArrowRight } from "lucide-react"
import type { ReactNode } from "react"

/** Titre de section du modèle : titre, petite vague rose, lien "voir tout" à droite. */
export function TitreSection({
  id,
  titre,
  description,
  lien,
  children,
}: {
  id: string
  titre: string
  description?: string
  lien?: { href: string; libelle: string }
  children?: ReactNode
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id={id} className="font-titre flex items-center gap-3 text-3xl font-bold tracking-[-0.02em] text-gw-nuit">
            {titre}
            <svg aria-hidden viewBox="0 0 40 10" className="h-2.5 w-10 text-gw-rose">
              <path
                d="M1 5 Q 5.5 0 10 5 T 19 5 T 28 5 T 37 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </h2>
          {description && <p className="mt-2 max-w-xl text-gw-texte-doux">{description}</p>}
        </div>
        {lien && (
          <Link
            href={lien.href}
            className="group inline-flex items-center gap-2 text-sm font-semibold text-gw-nuit hover:text-gw-violet"
          >
            {lien.libelle}
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-gw-lavande text-gw-violet transition-colors group-hover:bg-gw-violet group-hover:text-white">
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </Link>
        )}
      </div>
      {children}
    </div>
  )
}
