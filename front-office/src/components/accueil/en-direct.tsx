"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState } from "react"
import { ArrowRight, CalendarClock, MessageCircle, Sparkles, Ticket, Users, Vote } from "lucide-react"
import { API_BASE_URL } from "@/services/apiConfig"
import type { Evenement } from "@/types"
import type { Catalogue } from "@/lib/use-catalogue"
import { dateLongue, heure, ilYa, nombre, t } from "@/lib/i18n"
import { Pastille, type Reaction } from "./boite-reactions"
import { imageTestEvenement, urlMedia } from "@/lib/media"

/*
 * Bloc "En direct" de l'accueil :
 *  - compte à rebours jusqu'au prochain événement ;
 *  - chiffres de la plateforme (billets vendus, participants, événements à venir, réactions),
 *    qui défilent jusqu'à leur valeur quand le bloc apparaît, puis se mettent à jour toutes les 30 s ;
 *  - bandeau "Ça bouge sur guichetweb" : les dernières réactions du public, anonymes.
 * Les chiffres et l'activité viennent des routes /public/chiffres et /public/activite.
 */

interface Chiffres {
  billets_vendus: number
  participants: number
  evenements_a_venir: number
  reactions: number
}

interface Activite {
  type: string
  proposition: string
  evenement_id: number
  evenement: string
  date: string
}

const RAFRAICHISSEMENT = 30_000

async function lire<T>(chemin: string): Promise<T | null> {
  try {
    const r = await fetch(`${API_BASE_URL}${chemin}`, { cache: "no-store" })
    return r.ok ? ((await r.json()) as T) : null
  } catch {
    return null
  }
}

/* ---------- compteur animé ---------- */
function useVisible<T extends Element>() {
  const ref = useRef<T>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || visible) return
    const obs = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [visible])
  return { ref, visible }
}

function Compteur({ valeur, actif }: { valeur: number; actif: boolean }) {
  const [affiche, setAffiche] = useState(0)
  const depart = useRef(0)
  useEffect(() => {
    if (!actif) return
    const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const de = depart.current
    if (reduit || de === valeur) {
      setAffiche(valeur)
      depart.current = valeur
      return
    }
    const duree = de === 0 ? 1600 : 700
    const debut = performance.now()
    let id = 0
    const pas = (maintenant: number) => {
      const p = Math.min(1, (maintenant - debut) / duree)
      const lisse = 1 - Math.pow(1 - p, 3)
      setAffiche(Math.round(de + (valeur - de) * lisse))
      if (p < 1) id = requestAnimationFrame(pas)
      else depart.current = valeur
    }
    id = requestAnimationFrame(pas)
    return () => cancelAnimationFrame(id)
  }, [valeur, actif])
  return <span className="tabular-nums">{nombre(affiche)}</span>
}

/* ---------- compte à rebours ---------- */
function prochainEvenement(aVenir: Evenement[], maintenant: number) {
  return [...aVenir]
    .filter((e) => new Date(e.date_debut).getTime() > maintenant)
    .sort((a, b) => +new Date(a.date_debut) - +new Date(b.date_debut))[0]
}

function CompteARebours({ aVenir, chargement }: { aVenir: Evenement[]; chargement: boolean }) {
  const [maintenant, setMaintenant] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setMaintenant(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const evenement = useMemo(() => prochainEvenement(aVenir, maintenant), [aVenir, maintenant])

  if (chargement) return <div className="h-full min-h-[280px] animate-pulse rounded-3xl bg-gw-nuit/80" />

  if (!evenement)
    return (
      <div className="flex h-full min-h-[280px] flex-col justify-center rounded-3xl bg-gw-nuit p-8 text-white">
        <CalendarClock className="h-8 w-8 text-gw-rose" aria-hidden />
        <p className="font-titre mt-4 text-2xl font-bold">{t("Pas de date annoncée pour le moment")}</p>
        <p className="mt-2 text-white/70">{t("Les prochains événements apparaîtront ici dès leur publication.")}</p>
      </div>
    )

  const debut = new Date(evenement.date_debut)
  const affiche = urlMedia(evenement.image_url) ?? imageTestEvenement(evenement)
  const jour = dateLongue(debut, false)
  const reste = Math.max(0, Math.floor((debut.getTime() - maintenant) / 1000))
  const cases = [
    { valeur: Math.floor(reste / 86400), libelle: t("jours") },
    { valeur: Math.floor((reste % 86400) / 3600), libelle: t("heures") },
    { valeur: Math.floor((reste % 3600) / 60), libelle: t("minutes") },
    { valeur: reste % 60, libelle: t("secondes") },
  ]

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-gw-nuit p-7 text-white sm:p-8 dark:ring-1 dark:ring-white/15">
      {/* affiche de l'événement en fond, fondue dans la couleur nuit */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={affiche} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-luminosity" />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-br from-gw-nuit via-gw-nuit/85 to-gw-nuit/40" />
      <span aria-hidden className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-gw-violet/40 blur-3xl" />
      <span aria-hidden className="absolute -bottom-28 -left-16 h-56 w-56 rounded-full bg-gw-rose-action/30 blur-3xl" />
      <p className="relative inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-white/70 uppercase">
        <CalendarClock className="h-4 w-4 text-gw-rose" aria-hidden />
        {t("Prochain événement dans")}
      </p>
      <div className="relative mt-5 grid grid-cols-4 gap-2 sm:gap-3" role="timer" aria-live="off">
        {cases.map((c) => (
          <div key={c.libelle} className="rounded-2xl bg-white/10 px-1 py-3 text-center ring-1 ring-white/10 backdrop-blur-sm">
            <span key={c.valeur} className="gw-tic font-titre block text-3xl font-bold tabular-nums sm:text-4xl">
              {String(c.valeur).padStart(2, "0")}
            </span>
            <span className="mt-1 block text-[11px] tracking-wide text-white/65 uppercase">{c.libelle}</span>
          </div>
        ))}
      </div>
      <p className="font-titre relative mt-6 line-clamp-2 text-2xl leading-tight font-bold">{evenement.titre}</p>
      <p className="relative mt-1 text-sm text-white/70">
        {t("{jour} à {heure}", { jour: jour.charAt(0).toUpperCase() + jour.slice(1), heure: heure(debut) })}
      </p>
      <div className="relative mt-auto pt-6">
        <Link
          href={`/evenements/${evenement.id}`}
          className="inline-flex items-center gap-2 rounded-full bg-gw-rose-action px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gw-rose-action-fonce"
        >
          {t("Réserver ma place")}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  )
}

/* ---------- bandeau d'activité ---------- */
const VERBES: Record<string, string> = {
  LIKE: "a aimé",
  JADORE: "adore",
  WAOUH: "a dit Waouh pour",
  FAVORI: "a mis en favori",
  COMMENTAIRE: "a commenté",
}

function BandeauActivite({ activites }: { activites: Activite[] }) {
  if (activites.length === 0) return null
  // la liste est répétée deux fois pour un défilement sans fin
  const elements = [...activites, ...activites]
  return (
    <div className="gw-defile-zone relative mt-8 overflow-hidden rounded-full border border-gw-bordure bg-gw-surface py-3">
      <p className="absolute inset-y-0 left-0 z-10 flex items-center gap-2 rounded-full bg-gw-violet pr-5 pl-4 text-sm font-semibold text-white shadow-[8px_0_16px_-6px_rgba(42,26,94,0.35)]">
        <Sparkles className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">{t("Ça bouge sur guichetweb")}</span>
      </p>
      <ul className="gw-defile flex w-max gap-8 pl-[calc(100%-1rem)] sm:pl-60" aria-label={t("Dernières réactions du public")}>
        {elements.map((a, i) => (
          <li key={i} aria-hidden={i >= activites.length} className="flex shrink-0 items-center gap-2 text-sm text-gw-texte">
            {a.type === "COMMENTAIRE" ? (
              <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-gw-violet-pale text-gw-violet">
                <MessageCircle className="h-3 w-3" aria-hidden />
              </span>
            ) : (
              <Pastille type={a.type as Reaction} taille={18} />
            )}
            <span>
              {t("Quelqu'un")} {t(VERBES[a.type] ?? "a réagi à")}{" "}
              <strong className="font-semibold text-gw-encre">{a.proposition}</strong>
            </span>
            <Link href={`/evenements/${a.evenement_id}`} tabIndex={i >= activites.length ? -1 : undefined} className="text-gw-violet hover:underline">
              {a.evenement}
            </Link>
            <span className="text-gw-texte-pale">{ilYa(new Date(a.date))}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- bloc complet ---------- */
export function EnDirect({ catalogue }: { catalogue: Catalogue }) {
  const [chiffres, setChiffres] = useState<Chiffres | null>(null)
  const [activites, setActivites] = useState<Activite[]>([])
  const { ref, visible } = useVisible<HTMLDivElement>()

  useEffect(() => {
    let actif = true
    const charger = async () => {
      const [c, a] = await Promise.all([lire<Chiffres>("/public/chiffres"), lire<Activite[]>("/public/activite?limite=12")])
      if (!actif) return
      if (c) setChiffres(c)
      if (a) setActivites(a)
    }
    charger()
    const id = setInterval(charger, RAFRAICHISSEMENT)
    return () => {
      actif = false
      clearInterval(id)
    }
  }, [])

  const cartes = [
    { icone: Ticket, valeur: chiffres?.billets_vendus ?? 0, libelle: t("billets vendus"), href: "/evenements", action: t("Réserver les miens") },
    { icone: Users, valeur: chiffres?.participants ?? 0, libelle: t("participants inscrits"), href: "/participants/signup", action: t("Les rejoindre") },
    { icone: CalendarClock, valeur: chiffres?.evenements_a_venir ?? 0, libelle: t("événements à venir"), href: "/evenements", action: t("Voir les événements") },
    { icone: Vote, valeur: chiffres?.reactions ?? 0, libelle: t("réactions du public"), href: "/#avis", action: t("Donner mon avis") },
  ]

  return (
    <section id="en-direct" aria-labelledby="en-direct-titre" className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="en-direct-titre" className="font-titre flex items-center gap-3 text-3xl font-bold tracking-[-0.02em] text-gw-encre">
          {t("En direct sur la plateforme")}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gw-rose-pale px-2.5 py-1 text-xs font-semibold tracking-wide text-gw-rose-action uppercase">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gw-rose-action opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-gw-rose-action" />
            </span>
            {t("Live")}
          </span>
        </h2>
        <p className="text-sm text-gw-texte-doux">{t("Mis à jour toutes les 30 secondes")}</p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.05fr_1fr]">
        <CompteARebours aVenir={catalogue.aVenir} chargement={catalogue.chargement} />

        <div ref={ref} className="grid grid-cols-2 gap-4">
          {cartes.map(({ icone: Icone, valeur, libelle, href, action }, i) => (
            <Link
              key={libelle}
              href={href}
              className="group relative overflow-hidden rounded-3xl border border-gw-bordure bg-gw-surface p-5 transition-all hover:-translate-y-1 hover:border-gw-lavande hover:shadow-[0_18px_40px_-24px_rgba(42,26,94,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gw-violet sm:p-6"
            >
              <span
                aria-hidden
                className={`absolute -right-6 -bottom-6 h-24 w-24 rounded-full opacity-60 transition-transform group-hover:scale-125 ${i % 2 ? "bg-gw-rose-pale" : "bg-gw-violet-pale"}`}
              />
              <span className={`relative grid h-11 w-11 place-items-center rounded-2xl text-white ${i % 2 ? "bg-gw-rose-action" : "bg-gw-violet"}`}>
                <Icone className="h-5 w-5" aria-hidden />
              </span>
              <p className="font-titre relative mt-5 text-3xl font-bold text-gw-encre sm:text-4xl">
                {chiffres ? (
                  <Compteur valeur={valeur} actif={visible} />
                ) : (
                  <span aria-hidden className="inline-block h-9 w-24 animate-pulse rounded-lg bg-gw-violet-pale" />
                )}
              </p>
              <p className="relative mt-1 text-sm text-gw-texte-doux">{libelle}</p>
              <p className={`relative mt-3 inline-flex items-center gap-1 text-sm font-semibold ${i % 2 ? "text-gw-rose-action" : "text-gw-violet"}`}>
                {action}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </p>
            </Link>
          ))}
        </div>
      </div>

      <BandeauActivite activites={activites} />
    </section>
  )
}
