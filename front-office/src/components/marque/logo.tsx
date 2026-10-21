"use client"

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
 * Logotype : le nom de la plateforme aux couleurs de la charte.
 * "guichet" en caractères droits, "web" en écriture manuscrite rose, comme une signature.
 * Le point du i est un petit carré rose incliné, comme un ticket poinçonné.
 * C'est un lien vers la page d'accueil.
 */
export function Logo({ ton = "sombre", className }: LogoProps) {
  return (
    <Link
      href="/"
      aria-label={`${NOM_PLATEFORME}, retour à l'accueil`}
      className={cn(
        "inline-flex items-center rounded-md leading-none outline-offset-4 focus-visible:outline-2 focus-visible:outline-gw-violet",
        className,
      )}
    >
      <span aria-hidden className="inline-flex items-baseline">
        <span
          className={cn(
            "font-titre inline-flex items-baseline text-[1.55rem] font-semibold tracking-[-0.04em]",
            ton === "sombre" ? "text-gw-encre" : "text-white",
          )}
        >
          gu
          <span className="relative">
            ı
            <span className="absolute left-1/2 top-[0.02em] h-[0.2em] w-[0.2em] -translate-x-1/2 rotate-12 rounded-[0.05em] bg-gw-rose-action" />
          </span>
          chet
        </span>
        <span
          className={cn(
            "font-script -ml-0.5 -rotate-6 text-[1.85rem] leading-none",
            ton === "sombre" ? "text-gw-rose-action" : "text-gw-rose-pale",
          )}
        >
          web
        </span>
      </span>
    </Link>
  )
}
