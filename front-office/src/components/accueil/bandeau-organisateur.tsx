import Link from "next/link"
import type { CSSProperties } from "react"
import { QrCode, Vote, BarChart3 } from "lucide-react"

const ATOUTS = [
  { icone: Vote, titre: "Vote du public", texte: "Testez vos artistes et vos lieux avant de fixer la date" },
  { icone: QrCode, titre: "Billets QR code", texte: "Contrôle des entrées depuis un téléphone" },
  { icone: BarChart3, titre: "Suivi des ventes", texte: "Réservations et paiements en temps réel" },
]

/** Bandeau "Need assistance" du modèle, adressé aux organisateurs (comme "Create events" sur Eventbrite). */
export function BandeauOrganisateur() {
  return (
    <section id="organiser" aria-labelledby="organiser-titre" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-8 sm:px-6">
      <div
        className="scene relative overflow-hidden rounded-3xl px-6 py-10 text-white sm:px-10 lg:flex lg:items-center lg:gap-12 lg:py-12"
        style={{ "--accent": "var(--color-gw-violet)" } as CSSProperties}
      >
        <div className="max-w-md">
          <h2 id="organiser-titre" className="font-titre text-3xl font-bold tracking-[-0.02em]">
            Vous organisez un événement ?
          </h2>
          <p className="mt-3 text-white/80">
            Publiez-le, recueillez l&apos;avis du public, puis vendez vos billets au même endroit.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-gw-nuit transition-colors hover:bg-gw-fond"
            >
              Publier un événement
            </Link>
            <Link href="/login" className="text-sm font-semibold text-white/85 underline-offset-4 hover:underline">
              Accéder à mon espace
            </Link>
          </div>
        </div>

        <ul className="mt-10 grid gap-4 sm:grid-cols-3 lg:mt-0 lg:flex-1">
          {ATOUTS.map(({ icone: Icone, titre, texte }) => (
            <li key={titre} className="rounded-2xl bg-white/10 p-4 backdrop-blur-sm">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40">
                <Icone className="h-5 w-5" aria-hidden />
              </span>
              <p className="font-titre mt-3 font-semibold">{titre}</p>
              <p className="mt-1 text-sm text-white/70">{texte}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
