"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { useEffect, useRef, useState, type FormEvent } from "react"
import {
  Menu,
  X,
  Search,
  LogOut,
  Ticket,
  CalendarDays,
  History,
  Vote,
  LayoutDashboard,
  Megaphone,
  HelpCircle,
} from "lucide-react"
import { Logo } from "@/components/marque/logo"
import {
  getParticipantToken,
  clearParticipantToken,
  fetchParticipantMe,
  logoutParticipant,
} from "@/services/participantService"
import { MenuCompte, type CompteParticipant } from "@/components/menu-compte"
import { useConfirmationDeconnexion } from "@/components/confirmation-deconnexion"
import { accueilSelonRole, type RoleStaff } from "@/lib/role"
import { staffConnecte } from "@/lib/session"
import { assurerSession } from "@/lib/jetons"

/*
 * En-tête du site public, construit sur le modèle de HelloAsso :
 * logo à gauche, recherche, puis un bouton "Menu" qui ouvre un panneau
 * en deux colonnes (un espace par type d'utilisateur), un lien de connexion
 * et un bouton d'action principal.
 */

const ESPACE_PARTICIPANT = [
  { href: "/evenements", libelle: "Événements à venir", icone: CalendarDays },
  { href: "/evenements?onglet=passes", libelle: "Événements passés", icone: History },
  { href: "/#avis", libelle: "Donner mon avis sur les prochains événements", icone: Vote },
  { href: "/participants/mes-reservations", libelle: "Où trouver mon billet ?", icone: Ticket },
]

/** Liens de l'espace organisateur : directs vers l'espace si le compte est déjà connecté. */
const espaceOrganisateur = (role: RoleStaff | null) => [
  {
    href: role ? accueilSelonRole(role) : "/login",
    libelle: role === "admin" ? "Accéder à l'administration" : "Accéder à mon espace organisateur",
    icone: LayoutDashboard,
  },
  { href: lienPublier(role), libelle: "Publier un événement", icone: Megaphone },
  { href: "/#organiser", libelle: "Comment ça marche ?", icone: HelpCircle },
]

/** « Publier un événement » : la liste de ses événements si l'organisateur est connecté. */
const lienPublier = (role: RoleStaff | null) => (role === "organisateur" ? "/organisateur/evenements" : role ? accueilSelonRole(role) : "/login")

export function PublicHeader() {
  const pathname = usePathname()
  const router = useRouter()

  const [menuOuvert, setMenuOuvert] = useState(false)
  const [rechercheMobile, setRechercheMobile] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [participantName, setParticipantName] = useState<string | null>(null)
  const [compte, setCompte] = useState<CompteParticipant | null>(null)
  const [loadingParticipant, setLoadingParticipant] = useState(true)
  const [recherche, setRecherche] = useState("")
  /** organisateur ou administrateur déjà connecté : on lui propose de revenir à son espace sans se reconnecter */
  const [roleStaff, setRoleStaff] = useState<RoleStaff | null>(null)
  const panneauRef = useRef<HTMLDivElement>(null)
  const boutonMenuRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Session : relue à chaque changement de page, au retour sur l'onglet et quand un autre onglet
  // se connecte ou se déconnecte. Sans cela, l'en-tête gardait « Connexion » après une connexion
  // faite sans recharger la page (ou dans un autre onglet).
  useEffect(() => {
    if (!isMounted) return
    let actif = true
    const lireSession = async () => {
      // jetons expirés renouvelés d'abord (retour sur le site après une pause)
      const [role, participant] = await Promise.all([staffConnecte(), assurerSession("participant")])
      if (!actif) return
      setRoleStaff(role)
      const token = participant ? getParticipantToken() : null
      if (!token) {
        setParticipantName(null)
        setCompte(null)
        setLoadingParticipant(false)
        return
      }
      fetchParticipantMe()
        .then((participant) => {
          if (!actif) return
          setParticipantName(`${participant.prenom} ${participant.nom}`.trim())
          setCompte(participant)
        })
        .catch((e) => {
          if (!actif) return
          // serveur injoignable : on garde la session ; jeton refusé ou expiré : on le retire
          if (e instanceof TypeError) return
          clearParticipantToken()
          setParticipantName(null)
          setCompte(null)
        })
        .finally(() => actif && setLoadingParticipant(false))
    }
    void lireSession()
    const surStockage = (e: StorageEvent) => {
      // un simple renouvellement de jeton (même compte) ne change rien à l'affichage
      if (e.key === null || ((e.key === "access_token" || e.key === "participant_access_token") && (!e.oldValue || !e.newValue))) void lireSession()
    }
    const surFocus = () => void lireSession()
    window.addEventListener("storage", surStockage)
    window.addEventListener("focus", surFocus)
    return () => {
      actif = false
      window.removeEventListener("storage", surStockage)
      window.removeEventListener("focus", surFocus)
    }
  }, [isMounted, pathname])

  // Fermer le menu quand on change de page
  useEffect(() => {
    setMenuOuvert(false)
    setRechercheMobile(false)
  }, [pathname])

  // Fermer le menu avec Échap ou par un clic à l'extérieur
  useEffect(() => {
    if (!menuOuvert) return
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOuvert(false)
        boutonMenuRef.current?.focus()
      }
    }
    const surClic = (e: MouseEvent) => {
      const cible = e.target as Node
      if (!panneauRef.current?.contains(cible) && !boutonMenuRef.current?.contains(cible)) setMenuOuvert(false)
    }
    document.addEventListener("keydown", surTouche)
    document.addEventListener("mousedown", surClic)
    return () => {
      document.removeEventListener("keydown", surTouche)
      document.removeEventListener("mousedown", surClic)
    }
  }, [menuOuvert])

  const handleLogout = async () => {
    try {
      await logoutParticipant()
    } catch {
      // le token est peut-etre deja expire/invalide, on nettoie quand meme localement
    }
    clearParticipantToken()
    setParticipantName(null)
    setCompte(null)
    setMenuOuvert(false)
    router.push("/")
  }

  // « Se déconnecter ? » avant de quitter le compte (Annuler / Se déconnecter)
  const { demander: demanderDeconnexion, fenetre: confirmationDeconnexion } = useConfirmationDeconnexion(handleLogout, participantName)

  const lancerRecherche = (e: FormEvent) => {
    e.preventDefault()
    const q = recherche.trim()
    router.push(q ? `/evenements?q=${encodeURIComponent(q)}` : "/evenements")
  }

  if (!isMounted) return <div className="h-16 border-b border-gw-bordure bg-white" />

  const champRecherche = (
    <form role="search" onSubmit={lancerRecherche} className="relative w-full">
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-gw-texte-doux"
        aria-hidden
      />
      <input
        type="search"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher un événement"
        aria-label="Rechercher un événement"
        className="h-10 w-full rounded-full border border-gw-bordure bg-gw-fond pr-4 pl-10 text-sm text-gw-nuit placeholder:text-gw-texte-pale focus:border-gw-violet focus:bg-white focus:outline-none"
      />
    </form>
  )

  const lienMenu =
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-gw-texte hover:bg-gw-fond hover:text-gw-nuit focus-visible:outline-2 focus-visible:outline-gw-violet"

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gw-bordure bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:gap-6 sm:px-6">
        <Logo />

        <div className="hidden max-w-sm flex-1 md:block">{champRecherche}</div>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            onClick={() => setRechercheMobile((v) => !v)}
            aria-label="Rechercher"
            aria-expanded={rechercheMobile}
            className="flex h-10 w-10 items-center justify-center rounded-full text-gw-nuit hover:bg-gw-fond md:hidden"
          >
            <Search className="h-5 w-5" />
          </button>

          <button
            ref={boutonMenuRef}
            type="button"
            onClick={() => setMenuOuvert((v) => !v)}
            aria-expanded={menuOuvert}
            aria-controls="menu-principal"
            className="flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-gw-nuit hover:bg-gw-fond focus-visible:outline-2 focus-visible:outline-gw-violet"
          >
            {menuOuvert ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            <span className="hidden sm:inline">Menu</span>
          </button>

          {roleStaff && (
            <Link
              href={accueilSelonRole(roleStaff)}
              className={
                compte
                  ? "hidden h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-gw-nuit hover:bg-gw-fond lg:flex"
                  : "flex h-10 items-center gap-2 rounded-full px-3 text-sm font-semibold text-gw-nuit hover:bg-gw-fond"
              }
              title="Vous êtes déjà connecté : retour direct à votre espace"
            >
              <LayoutDashboard className="h-4 w-4 text-gw-rose" aria-hidden />
              <span className="hidden sm:inline">{roleStaff === "admin" ? "Administration" : "Mon espace"}</span>
            </Link>
          )}

          {!loadingParticipant &&
            (compte ? (
              // clic sur le nom : Mes réservations, confirmation de l'e-mail, Déconnexion
              <MenuCompte compte={compte} onDeconnexion={demanderDeconnexion} />
            ) : roleStaff ? null : (
              <Link
                href="/participants/login"
                className="hidden h-10 items-center rounded-full px-3 text-sm font-semibold text-gw-nuit hover:bg-gw-fond sm:flex"
              >
                Connexion
              </Link>
            ))}

          <Link
            href={lienPublier(roleStaff)}
            className="hidden h-10 items-center rounded-full bg-gw-rose-action px-5 text-sm font-semibold text-white transition-colors hover:bg-gw-rose-action-fonce focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gw-rose lg:flex"
          >
            Publier un événement
          </Link>
        </div>
      </div>

      {rechercheMobile && <div className="border-t border-gw-bordure px-4 py-3 md:hidden">{champRecherche}</div>}

      {/* Panneau du menu : deux espaces, comme sur HelloAsso */}
      {menuOuvert && (
        <div
          id="menu-principal"
          ref={panneauRef}
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-gw-bordure bg-white shadow-[0_24px_48px_-24px_rgba(30,26,60,0.35)]"
        >
          <nav
            aria-label="Menu principal"
            className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-2 md:gap-12"
          >
            <div>
              <p className="font-titre text-lg font-semibold text-gw-nuit">Espace participant</p>
              <ul className="mt-3 space-y-1">
                {ESPACE_PARTICIPANT.map(({ href, libelle, icone: Icone }) => (
                  <li key={libelle}>
                    <Link href={href} onClick={() => setMenuOuvert(false)} className={lienMenu}>
                      <Icone className="h-4 w-4 text-gw-violet" aria-hidden />
                      {libelle}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex flex-wrap gap-2 border-t border-gw-bordure pt-4">
                {participantName ? (
                  <>
                    <Link
                      href="/participants/mes-reservations"
                      className="rounded-full bg-gw-fond px-4 py-2 text-sm font-semibold text-gw-nuit"
                    >
                      Mes réservations
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOuvert(false)
                        demanderDeconnexion()
                      }}
                      className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-gw-texte hover:bg-gw-fond"
                    >
                      <LogOut className="h-4 w-4" aria-hidden />
                      Déconnexion
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/participants/login"
                      className="rounded-full bg-gw-fond px-4 py-2 text-sm font-semibold text-gw-nuit"
                    >
                      Connexion
                    </Link>
                    <Link
                      href="/participants/signup"
                      className="rounded-full border border-gw-violet px-4 py-2 text-sm font-semibold text-gw-violet"
                    >
                      Créer mon compte
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="md:border-l md:border-gw-bordure md:pl-12">
              <p className="font-titre text-lg font-semibold text-gw-nuit">Espace organisateur</p>
              <ul className="mt-3 space-y-1">
                {espaceOrganisateur(roleStaff).map(({ href, libelle, icone: Icone }) => (
                  <li key={libelle}>
                    <Link href={href} onClick={() => setMenuOuvert(false)} className={lienMenu}>
                      <Icone className="h-4 w-4 text-gw-rose" aria-hidden />
                      {libelle}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </nav>
        </div>
      )}
      {confirmationDeconnexion}
    </header>
  )
}
