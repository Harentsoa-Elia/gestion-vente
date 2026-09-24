import Link from "next/link"
import { Logo, NOM_PLATEFORME } from "@/components/marque/logo"

const COLONNES = [
  {
    titre: "Découvrir",
    liens: [
      { href: "/evenements", libelle: "Événements à venir" },
      { href: "/evenements?onglet=passes", libelle: "Événements passés" },
      { href: "/#avis", libelle: "Donner mon avis" },
    ],
  },
  {
    titre: "Participants",
    liens: [
      { href: "/participants/login", libelle: "Connexion" },
      { href: "/participants/signup", libelle: "Créer mon compte" },
      { href: "/participants/mes-reservations", libelle: "Mes réservations" },
    ],
  },
  {
    titre: "Organisateurs",
    liens: [
      { href: "/login", libelle: "Espace organisateur" },
      { href: "/login", libelle: "Publier un événement" },
      { href: "/#organiser", libelle: "Comment ça marche ?" },
    ],
  },
]

export function PublicFooter() {
  return (
    <footer className="bg-gw-nuit text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo ton="clair" />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/65">
            Réservez vos billets en ligne et votez pour les artistes et les lieux des prochains événements.
          </p>
        </div>
        {COLONNES.map((c) => (
          <nav key={c.titre} aria-label={c.titre}>
            <p className="font-titre font-semibold">{c.titre}</p>
            <ul className="mt-3 space-y-2">
              {c.liens.map((l) => (
                <li key={l.libelle}>
                  <Link href={l.href} className="text-sm text-white/65 hover:text-white hover:underline">
                    {l.libelle}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 text-xs text-white/50 sm:px-6">
          © {new Date().getFullYear()} {NOM_PLATEFORME}. Tous droits réservés.
        </p>
      </div>
    </footer>
  )
}
