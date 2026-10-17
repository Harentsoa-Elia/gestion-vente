import Link from "next/link"
import { ArrowRight, type LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

/** Titre de section : titre suivi d'une petite icône rose propre à la section, lien "voir tout" à droite. */
export function TitreSection({
  id,
  titre,
  description,
  lien,
  icone: Icone,
  children,
}: {
  id: string
  titre: string
  description?: string
  lien?: { href: string; libelle: string }
  /** icône affichée après le titre */
  icone: LucideIcon
  children?: ReactNode
}) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id={id} className="font-titre flex items-center gap-3 text-3xl font-bold tracking-[-0.02em] text-gw-nuit">
            {titre}
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gw-rose-pale text-gw-rose-action">
              <Icone className="h-[18px] w-[18px]" strokeWidth={2.2} aria-hidden />
            </span>
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
