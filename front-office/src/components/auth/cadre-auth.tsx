"use client"

import Link from "next/link"
import { useId, useState, type InputHTMLAttributes, type ReactNode } from "react"
import { Eye, EyeOff, Loader2, type LucideIcon } from "lucide-react"
import { Logo } from "@/components/marque/logo"
import { cn } from "@/utils"

/*
 * Mise en page commune des pages de connexion et d'inscription (organisateur et participant).
 *
 * Une carte en deux panneaux :
 * - à gauche, la photo de concert aux couleurs guichetweb, des formes diagonales roses,
 *   le logo et des onglets verticaux ; l'onglet actif est blanc et se prolonge dans le
 *   panneau de droite par deux coins arrondis « creusés » ;
 * - à droite, le formulaire, avec une barre de pied (liens ou boutons Retour / Continuer).
 * Sur téléphone, le panneau photo devient un bandeau en haut et les onglets passent à l'horizontale.
 */

export interface OngletAuth {
  libelle: string
  /** Lien vers une autre page… */
  href?: string
  /** …ou action locale (ex. basculer connexion / inscription sans changer de page) */
  onClick?: () => void
  actif?: boolean
}

export function CadreAuth({
  onglets,
  icone: Icone,
  surtitre,
  titre,
  sousTitre,
  children,
  pied,
  sousEntete = false,
}: {
  onglets: OngletAuth[]
  icone: LucideIcon
  /** Petit texte au-dessus du titre, ex. « Espace organisateur » */
  surtitre?: string
  titre: string
  sousTitre?: ReactNode
  children: ReactNode
  /** Barre en bas de la carte */
  pied?: ReactNode
  /** true quand la page est affichée sous l'en-tête public (55 px) */
  sousEntete?: boolean
}) {
  return (
    <div
      className={cn(
        "relative isolate flex items-center justify-center overflow-hidden bg-gw-fond px-4 py-8 sm:py-12",
        sousEntete ? "min-h-[calc(100dvh-55px)]" : "min-h-dvh",
      )}
    >
      {/* halos de couleur en fond de page */}
      <div aria-hidden className="absolute -top-40 -left-32 -z-10 h-[420px] w-[420px] rounded-full bg-gw-violet/15 blur-3xl" />
      <div aria-hidden className="absolute -right-24 -bottom-40 -z-10 h-[460px] w-[460px] rounded-full bg-gw-rose/15 blur-3xl" />

      <div
        className={cn(
          // --panneau : couleur du panneau de droite, reprise par l'onglet actif et ses coins creusés
          "[--panneau:#ffffff]",
          "grid w-full max-w-[960px] overflow-hidden rounded-[28px] bg-(--panneau) shadow-[0_30px_80px_-30px_rgba(30,26,60,0.45)] md:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]",
        )}
      >
        <PanneauVisuel onglets={onglets} />

        <div className="flex min-w-0 flex-col">
          <div className="flex-1 px-6 pt-8 pb-7 sm:px-10 md:px-12 md:pt-12">
            <div className="mb-7 flex flex-col items-center text-center">
              <span className="mb-4 grid h-16 w-16 place-items-center rounded-full bg-[linear-gradient(135deg,#6C5CE7,#E8479A)] text-white shadow-[0_12px_28px_-10px_rgba(108,92,231,0.8)] ring-4 ring-gw-lavande/60">
                <Icone className="h-7 w-7" aria-hidden />
              </span>
              {surtitre && <p className="text-xs font-semibold tracking-[0.18em] text-gw-rose-action uppercase">{surtitre}</p>}
              <h1 className="mt-1 font-titre text-[28px] leading-tight font-bold text-gw-nuit">{titre}</h1>
              {sousTitre && <p className="mt-2 max-w-sm text-sm text-gw-texte-doux">{sousTitre}</p>}
            </div>
            {children}
          </div>

          {pied && (
            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 border-t border-gw-bordure bg-gw-fond/70 px-6 py-4 text-sm text-gw-texte-doux sm:px-10 md:px-12">
              {pied}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PanneauVisuel({ onglets }: { onglets: OngletAuth[] }) {
  return (
    <div className="relative isolate flex min-h-[210px] flex-col overflow-hidden bg-gw-nuit text-white md:min-h-[600px]">
      {/* photo de concert (même image que le bandeau du tableau de bord) */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/organisateur/bandeau-concert.jpg"
        alt=""
        aria-hidden
        className="absolute inset-0 -z-20 h-full w-full object-cover object-[60%_50%]"
      />
      {/* teinte guichetweb : nuit → violet → rose */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,rgba(30,26,60,0.92)_0%,rgba(108,92,231,0.78)_55%,rgba(201,42,122,0.72)_100%)]"
      />
      {/* formes diagonales, inspirées du modèle */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <span className="absolute -top-16 -left-24 h-44 w-[150%] -rotate-[32deg] rounded-full bg-gw-rose/45 mix-blend-screen" />
        <span className="absolute top-24 -left-40 h-16 w-[140%] -rotate-[32deg] rounded-full bg-white/10" />
        <span className="absolute -bottom-10 -left-10 h-40 w-[130%] -rotate-[32deg] rounded-full bg-gw-rose/40 mix-blend-screen" />
        <span className="absolute bottom-40 left-1/3 hidden h-10 w-[120%] -rotate-[32deg] rounded-full bg-gw-lavande/20 md:block" />
      </div>

      <div className="relative z-10 px-6 pt-6 sm:px-8 md:pt-8">
        <Logo ton="clair" />
      </div>

      <div className="relative z-10 mt-auto hidden px-8 pb-10 md:block md:pr-36">
        <p className="font-titre text-3xl leading-tight font-bold">
          Vos soirées commencent
          <br />
          au <span className="font-script text-4xl font-normal text-gw-lavande">guichet</span>.
        </p>
        <p className="mt-3 max-w-[16rem] text-sm text-white/75">
          Réservez vos billets, votez pour les prochains événements et suivez-les en un seul endroit.
        </p>
      </div>

      <nav
        aria-label="Choix du formulaire"
        className={cn(
          // téléphone : onglets horizontaux collés au bas du bandeau
          "relative z-10 mt-auto flex justify-center gap-1 px-4",
          // ordinateur : onglets verticaux collés au bord droit, au milieu du panneau
          "md:absolute md:top-1/2 md:right-0 md:mt-0 md:-translate-y-1/2 md:flex-col md:gap-2 md:px-0",
        )}
      >
        {onglets.map((o) => (
          <Onglet key={o.libelle} {...o} />
        ))}
      </nav>
    </div>
  )
}

function Onglet({ libelle, href, onClick, actif }: OngletAuth) {
  const classes = cn(
    "relative block px-5 py-3 text-xs font-bold tracking-[0.12em] uppercase transition-colors",
    "rounded-t-2xl md:w-[136px] md:rounded-t-none md:rounded-l-2xl md:py-5 md:pl-6 md:text-left",
    actif ? "bg-(--panneau) text-gw-rose-action" : "text-white/75 hover:bg-white/10 hover:text-white",
  )

  const contenu = (
    <>
      {libelle}
      {actif && (
        <>
          {/* coins creusés : la couleur du panneau déborde en arrondi concave autour de l'onglet actif */}
          <span
            aria-hidden
            className="absolute bottom-0 -left-5 h-5 w-5 bg-[radial-gradient(circle_at_0_0,transparent_19.5px,var(--panneau)_20px)] md:-top-5 md:right-0 md:bottom-auto md:left-auto"
          />
          <span
            aria-hidden
            className="absolute -right-5 bottom-0 h-5 w-5 bg-[radial-gradient(circle_at_100%_0,transparent_19.5px,var(--panneau)_20px)] md:-bottom-5 md:right-0 md:bg-[radial-gradient(circle_at_0_100%,transparent_19.5px,var(--panneau)_20px)]"
          />
        </>
      )}
    </>
  )

  if (href && !actif) {
    return (
      <Link href={href} className={classes}>
        {contenu}
      </Link>
    )
  }
  return (
    <button type="button" onClick={actif ? undefined : onClick} aria-current={actif ? "page" : undefined} className={classes}>
      {contenu}
    </button>
  )
}

/* ---------- champs ---------- */

/** Champ souligné avec icône, comme sur le modèle ; libellé visible au-dessus. */
export function ChampAuth({
  libelle,
  icone: Icone,
  type = "text",
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { libelle: string; icone: LucideIcon }) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const motDePasse = type === "password"

  return (
    <div className={cn("group", className)}>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-gw-texte-doux transition-colors group-focus-within:text-gw-violet">
        {libelle}
      </label>
      <div className="relative">
        <Icone
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-0.5 h-[18px] w-[18px] -translate-y-1/2 text-gw-texte-doux/70 transition-colors group-focus-within:text-gw-violet"
        />
        <input
          id={id}
          type={motDePasse && visible ? "text" : type}
          {...props}
          className={cn(
            "w-full border-0 border-b-2 border-gw-bordure bg-transparent py-2.5 pl-8 text-[15px] text-gw-nuit outline-none transition-colors placeholder:text-gw-texte-doux/60 focus:border-gw-violet",
            motDePasse ? "pr-10" : "pr-1",
          )}
        />
        {motDePasse && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            className="absolute top-1/2 right-0 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-gw-texte-doux hover:bg-gw-fond hover:text-gw-violet"
          >
            {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
          </button>
        )}
      </div>
    </div>
  )
}

/** Choix en boutons côte à côte (ex. genre), comme sur le premier modèle. */
export function ChoixSegmente<T extends string>({
  libelle,
  options,
  valeur,
  onChange,
}: {
  libelle: string
  options: { valeur: T; libelle: string }[]
  valeur: T | ""
  onChange: (v: T) => void
}) {
  const id = useId()
  return (
    <div role="radiogroup" aria-labelledby={id}>
      <p id={id} className="mb-2 text-xs font-semibold text-gw-texte-doux">
        {libelle}
      </p>
      <div className="grid grid-cols-3 gap-2">
        {options.map((o) => {
          const choisi = o.valeur === valeur
          return (
            <button
              key={o.valeur}
              type="button"
              role="radio"
              aria-checked={choisi}
              onClick={() => onChange(o.valeur)}
              className={cn(
                "rounded-xl border-2 px-3 py-2.5 text-sm font-semibold transition-colors",
                choisi
                  ? "border-gw-violet bg-gw-violet text-white shadow-[0_8px_20px_-10px_rgba(108,92,231,0.9)]"
                  : "border-gw-bordure text-gw-nuit hover:border-gw-violet/50 hover:bg-gw-fond",
              )}
            >
              {o.libelle}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ---------- boutons ---------- */

export function BoutonAuth({
  children,
  chargement,
  variante = "plein",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { chargement?: boolean; variante?: "plein" | "contour" }) {
  return (
    <button
      {...props}
      disabled={props.disabled || chargement}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-sm font-bold tracking-wide transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gw-violet disabled:cursor-not-allowed disabled:opacity-60",
        variante === "plein" &&
          "bg-gw-rose-action text-white shadow-[0_14px_30px_-12px_rgba(201,42,122,0.8)] hover:bg-gw-rose-action-fonce",
        variante === "contour" && "border-2 border-gw-bordure text-gw-nuit hover:border-gw-violet hover:text-gw-violet",
        className,
      )}
    >
      {chargement && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function MessageErreur({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p role="alert" className="rounded-xl bg-gw-rose-pale px-4 py-3 text-sm text-gw-rose-action">
      {children}
    </p>
  )
}

export function LienPied({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-gw-violet underline-offset-4 hover:text-gw-rose-action hover:underline">
      {children}
    </Link>
  )
}
