import Link from "next/link"
import { cn } from "@/utils"

/**
 * Nom de la plateforme : "guichet" + "web".
 * Le guichet est l'endroit où l'on achète son billet ; ici, il est en ligne.
 * Le nom fait écho à billetweb, la référence choisie pour le logotype.
 * Pour changer de nom : modifier cette constante ET le découpage du logotype plus bas.
 */
export const NOM_PLATEFORME = "guichetweb"

interface LogoProps {
  /** "sombre" : texte foncé sur fond clair ; "clair" : texte blanc sur fond foncé */
  ton?: "sombre" | "clair"
  className?: string
}

/**
 * Logotype en minuscules, dans l'esprit de billetweb.
 * Le point du i est remplacé par un petit carré rose, comme un ticket poinçonné.
 * C'est un lien vers la page d'accueil.
 */
export function Logo({ ton = "sombre", className }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label={`${NOM_PLATEFORME}, retour à l'accueil`}
      className={cn(
        "font-titre inline-flex items-baseline rounded-md text-[1.6rem] font-semibold leading-none tracking-[-0.04em] outline-offset-4 focus-visible:outline-2 focus-visible:outline-gw-violet",
        ton === "sombre" ? "text-gw-nuit" : "text-white",
        className,
      )}
    >
      <span aria-hidden className="inline-flex items-baseline">
        gu
        <span className="relative">
          ı
          <span className="absolute left-1/2 top-[0.02em] h-[0.2em] w-[0.2em] -translate-x-1/2 rotate-12 rounded-[0.05em] bg-gw-rose" />
        </span>
        chetweb
      </span>
    </Link>
  )
}
