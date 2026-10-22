"use client"


import { t } from "@/lib/i18n"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react"
import { ArrowRight, CalendarDays, History, MapPin, Search, Music, Tags, Vote } from "lucide-react"
import type { Categorie, Lieu } from "@/types"
import { cn } from "@/utils"
import { PERIODES, type Periode } from "@/lib/evenements"
import { NOM_PLATEFORME } from "@/components/marque/logo"
import { FondDiaporama, PHOTOS_HERO, useDiaporama } from "./diaporama-hero"
import type { Catalogue } from "@/lib/use-catalogue"
import { CarrouselAffiche } from "./carrousel-affiche"

type Onglet = "a-venir" | "passes"

interface HeroProps {
  lieux: Lieu[]
  categories: Categorie[]
  catalogue: Catalogue
}

function Champ({
  icone: Icone,
  libelle,
  htmlFor,
  children,
  className,
}: {
  icone: typeof Search
  libelle: string
  htmlFor: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3 px-4 py-3", className)}>
      <Icone className="h-5 w-5 shrink-0 text-gw-violet" aria-hidden />
      <div className="min-w-0 flex-1">
        <label htmlFor={htmlFor} className="block text-sm font-semibold text-gw-encre">
          {libelle}
        </label>
        {children}
      </div>
    </div>
  )
}

const styleSaisie =
  "mt-0.5 w-full truncate bg-transparent text-sm text-gw-texte placeholder:text-gw-texte-pale focus:outline-none disabled:text-[#B3A9D9]"

export function Hero({ lieux, categories, catalogue }: HeroProps) {
  const router = useRouter()
  const [onglet, setOnglet] = useState<Onglet>("a-venir")
  const [q, setQ] = useState("")
  const [lieu, setLieu] = useState("")
  const [periode, setPeriode] = useState<Periode>("tout")
  const [categorie, setCategorie] = useState("")
  const diaporama = useDiaporama(PHOTOS_HERO.length)

  const rechercher = (e: FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (onglet === "passes") params.set("onglet", "passes")
    if (q.trim()) params.set("q", q.trim())
    if (lieu) params.set("lieu", lieu)
    if (categorie) params.set("categorie", categorie)
    if (onglet === "a-venir" && periode !== "tout") params.set("periode", periode)
    const chaine = params.toString()
    router.push(chaine ? `/evenements?${chaine}` : "/evenements")
  }

  const onglets = [
    { id: "a-venir" as const, libelle: t("À venir"), icone: CalendarDays },
    { id: "passes" as const, libelle: t("Passés"), icone: History },
  ]

  return (
    <section aria-labelledby="hero-titre" className="relative">
      {/* fond : photos en fondu enchaîné (le fond "scène" reste visible pendant le chargement) */}
      <div className="scene relative overflow-hidden" style={{ "--accent": "var(--color-gw-rose)" } as CSSProperties}>
        <FondDiaporama {...diaporama} />
        {/* mode jour : voile clair à gauche et texte foncé ; mode nuit : voile sombre et texte blanc */}
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/0 dark:from-[#1D1245]/90 dark:via-[#1D1245]/55 dark:to-[#1D1245]/10" />

        <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-40 sm:px-6 sm:pt-20 sm:pb-48 lg:pb-52">

          <p className="gw-entree inline-flex items-center gap-2 rounded-full bg-gw-violet/10 px-3.5 py-1.5 text-sm font-medium text-gw-encre backdrop-blur-sm dark:bg-white/15 dark:text-white">
            <Music className="h-4 w-4 text-gw-rose-action dark:text-[#F59BC7]" aria-hidden />{t("Concerts, cabarets, sport et soirées")}</p>

          <h1
            id="hero-titre"
            style={{ animationDelay: "120ms" }}
            className="gw-entree font-titre mt-5 max-w-2xl text-[2.6rem] leading-[1.05] font-bold tracking-[-0.03em] text-gw-encre sm:text-6xl dark:text-white"
          >{t("Trouvez votre prochaine")}{" "}
            <span className="font-script inline-block pr-2 text-[1.15em] font-normal tracking-normal text-gw-rose-action dark:text-[#F59BC7]">{t("sortie")}</span>{" "}{t("sur")}{" "}{NOM_PLATEFORME}
          </h1>
          <p style={{ animationDelay: "260ms" }} className="gw-entree mt-5 max-w-md text-lg leading-relaxed text-gw-texte dark:text-white/85">{t("Réservez vos billets en quelques clics, et votez pour les artistes, les lieux et les événements que vous voulez voir.")}</p>

          <div style={{ animationDelay: "400ms" }} className="gw-entree mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              href="/evenements"
              className="inline-flex items-center gap-3 rounded-full bg-gw-rose-action py-2 pr-2 pl-6 font-semibold text-white transition-colors hover:bg-gw-rose-action-fonce focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >{t("Voir les événements")}<span className="flex h-8 w-8 items-center justify-center rounded-full bg-gw-surface text-gw-rose-action">
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
            <span aria-hidden className="hidden h-8 w-px bg-gw-encre/20 sm:block dark:bg-white/30" />
            <Link
              href="#avis"
              className="group inline-flex items-center gap-3 font-semibold text-gw-encre focus-visible:outline-2 dark:text-white focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gw-violet text-white transition-transform group-hover:scale-105 dark:bg-white dark:text-gw-violet">
                <Vote className="h-5 w-5" aria-hidden />
              </span>{t("Donner mon avis")}</Link>
          </div>

          <div style={{ animationDelay: "300ms" }} className="gw-entree xl:absolute xl:top-10 xl:right-6 xl:w-[580px]">
            <CarrouselAffiche catalogue={catalogue} />
          </div>
        </div>
      </div>

      {/* bord arrondi blanc qui remonte sous la barre de recherche, comme le modèle */}
      <div aria-hidden className="relative -mt-12 h-12 rounded-t-[3rem] bg-gw-surface" />

      {/* barre de recherche à onglets, à cheval sur le hero */}
      <div className="relative mx-auto -mt-32 max-w-6xl px-4 sm:-mt-36 sm:px-6">
        <form
          onSubmit={rechercher}
          role="search"
          aria-label={t("Rechercher des événements")}
          className="rounded-2xl bg-gw-surface shadow-[0_2px_4px_rgba(42,26,94,0.06),0_24px_48px_-20px_rgba(42,26,94,0.35)]"
        >
          <div role="tablist" aria-label={t("Période")} className="flex gap-1 border-b border-gw-bordure px-3 pt-2">
            {onglets.map(({ id, libelle, icone: Icone }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={onglet === id}
                onClick={() => setOnglet(id)}
                className={cn(
                  "-mb-px flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                  onglet === id
                    ? "border-gw-violet text-gw-violet"
                    : "border-transparent text-gw-texte-doux hover:text-gw-encre",
                )}
              >
                <Icone className="h-4 w-4" aria-hidden />
                {libelle}
              </button>
            ))}
            <Link
              href="#avis"
              className="-mb-px ml-auto hidden items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-gw-texte-doux hover:text-gw-encre sm:flex"
            >
              <Vote className="h-4 w-4" aria-hidden />{t("En préparation")}</Link>
          </div>

          <div className="grid grid-cols-1 divide-y divide-gw-bordure p-2 md:grid-cols-[1.3fr_1.1fr_1.1fr_1fr_auto] md:divide-x md:divide-y-0 md:items-center">
            <Champ icone={Search} libelle={t("Quoi ?")} htmlFor="recherche-q">
              <input
                id="recherche-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("Artiste, titre de l'événement...")}
                className={styleSaisie}
              />
            </Champ>
            <Champ icone={MapPin} libelle={t("Où ?")} htmlFor="recherche-lieu">
              <select id="recherche-lieu" value={lieu} onChange={(e) => setLieu(e.target.value)} className={styleSaisie}>
                <option value="">{t("Tous les lieux")}</option>
                {lieux.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.ville ? `${l.nom} (${l.ville})` : l.nom}
                  </option>
                ))}
              </select>
            </Champ>
            <Champ icone={CalendarDays} libelle={t("Quand ?")} htmlFor="recherche-periode">
              <select
                id="recherche-periode"
                value={periode}
                disabled={onglet === "passes"}
                onChange={(e) => setPeriode(e.target.value as Periode)}
                className={styleSaisie}
              >
                {PERIODES.map((p) => (
                  <option key={p.valeur} value={p.valeur}>
                    {t(p.libelle)}
                  </option>
                ))}
              </select>
            </Champ>
            <Champ icone={Tags} libelle={t("Catégorie")} htmlFor="recherche-categorie">
              <select
                id="recherche-categorie"
                value={categorie}
                onChange={(e) => setCategorie(e.target.value)}
                className={styleSaisie}
              >
                <option value="">{t("Toutes")}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
              </select>
            </Champ>
            <div className="p-2">
              <button
                type="submit"
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gw-violet px-6 font-semibold text-white transition-colors hover:bg-gw-violet-fonce focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gw-violet"
              >
                <Search className="h-4 w-4" aria-hidden />{t("Rechercher")}</button>
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}
