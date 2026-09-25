"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react"
import { ArrowRight, CalendarDays, History, MapPin, Search, Shapes, Sparkles, Vote } from "lucide-react"
import type { Categorie, Lieu } from "@/types"
import { cn } from "@/utils"
import { PERIODES, type Periode } from "@/lib/evenements"
import { NOM_PLATEFORME } from "@/components/marque/logo"
import { FondDiaporama, PHOTOS_HERO, PileHero, useDiaporama } from "./diaporama-hero"

type Onglet = "a-venir" | "passes"

interface HeroProps {
  lieux: Lieu[]
  categories: Categorie[]
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
        <label htmlFor={htmlFor} className="block text-sm font-semibold text-gw-nuit">
          {libelle}
        </label>
        {children}
      </div>
    </div>
  )
}

const styleSaisie =
  "mt-0.5 w-full truncate bg-transparent text-sm text-gw-texte placeholder:text-gw-texte-pale focus:outline-none disabled:text-[#B5B1C7]"

export function Hero({ lieux, categories }: HeroProps) {
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
    { id: "a-venir" as const, libelle: "À venir", icone: CalendarDays },
    { id: "passes" as const, libelle: "Passés", icone: History },
  ]

  return (
    <section aria-labelledby="hero-titre" className="relative">
      {/* fond : photos en fondu enchaîné (le fond « scène » reste visible pendant le chargement) */}
      <div className="scene relative overflow-hidden" style={{ "--accent": "var(--color-gw-rose)" } as CSSProperties}>
        <FondDiaporama {...diaporama} />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-[#16122E]/90 via-[#16122E]/55 to-[#16122E]/10" />

        <div className="relative mx-auto max-w-7xl px-4 pt-14 pb-40 sm:px-6 sm:pt-20 sm:pb-48 lg:pb-52">
          <PileHero {...diaporama} />

          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-[#F59BC7]" aria-hidden />
            Concerts, cabarets, sport et soirées
          </p>

          <h1
            id="hero-titre"
            className="font-titre mt-5 max-w-2xl text-[2.6rem] leading-[1.05] font-bold tracking-[-0.03em] text-white sm:text-6xl"
          >
            Trouvez votre prochaine{" "}
            <span className="font-script inline-block pr-2 text-[1.15em] font-normal tracking-normal text-[#F59BC7]">
              sortie
            </span>{" "}
            sur {NOM_PLATEFORME}
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-white/85">
            Réservez vos billets en quelques clics, et votez pour les artistes que vous voulez voir.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
            <Link
              href="/evenements"
              className="inline-flex items-center gap-3 rounded-full bg-gw-rose-action py-2 pr-2 pl-6 font-semibold text-white transition-colors hover:bg-gw-rose-action-fonce focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              Voir les événements
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-gw-rose-action">
                <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </Link>
            <span aria-hidden className="hidden h-8 w-px bg-white/30 sm:block" />
            <Link
              href="#avis"
              className="group inline-flex items-center gap-3 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-gw-violet transition-transform group-hover:scale-105">
                <Vote className="h-5 w-5" aria-hidden />
              </span>
              Donner mon avis
            </Link>
          </div>
        </div>
      </div>

      {/* bord arrondi blanc qui remonte sous la barre de recherche, comme le modèle */}
      <div aria-hidden className="relative -mt-12 h-12 rounded-t-[3rem] bg-white" />

      {/* barre de recherche à onglets, à cheval sur le hero */}
      <div className="relative mx-auto -mt-32 max-w-6xl px-4 sm:-mt-36 sm:px-6">
        <form
          onSubmit={rechercher}
          role="search"
          aria-label="Rechercher des événements"
          className="rounded-2xl bg-white shadow-[0_2px_4px_rgba(30,26,60,0.06),0_24px_48px_-20px_rgba(30,26,60,0.35)]"
        >
          <div role="tablist" aria-label="Période" className="flex gap-1 border-b border-gw-bordure px-3 pt-2">
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
                    : "border-transparent text-gw-texte-doux hover:text-gw-nuit",
                )}
              >
                <Icone className="h-4 w-4" aria-hidden />
                {libelle}
              </button>
            ))}
            <Link
              href="#avis"
              className="-mb-px ml-auto hidden items-center gap-2 border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-gw-texte-doux hover:text-gw-nuit sm:flex"
            >
              <Vote className="h-4 w-4" aria-hidden />
              En préparation
            </Link>
          </div>

          <div className="grid grid-cols-1 divide-y divide-gw-bordure p-2 md:grid-cols-[1.3fr_1.1fr_1.1fr_1fr_auto] md:divide-x md:divide-y-0 md:items-center">
            <Champ icone={Search} libelle="Quoi ?" htmlFor="recherche-q">
              <input
                id="recherche-q"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Artiste, titre de l'événement…"
                className={styleSaisie}
              />
            </Champ>
            <Champ icone={MapPin} libelle="Où ?" htmlFor="recherche-lieu">
              <select id="recherche-lieu" value={lieu} onChange={(e) => setLieu(e.target.value)} className={styleSaisie}>
                <option value="">Tous les lieux</option>
                {lieux.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.ville ? `${l.nom} (${l.ville})` : l.nom}
                  </option>
                ))}
              </select>
            </Champ>
            <Champ icone={CalendarDays} libelle="Quand ?" htmlFor="recherche-periode">
              <select
                id="recherche-periode"
                value={periode}
                disabled={onglet === "passes"}
                onChange={(e) => setPeriode(e.target.value as Periode)}
                className={styleSaisie}
              >
                {PERIODES.map((p) => (
                  <option key={p.valeur} value={p.valeur}>
                    {p.libelle}
                  </option>
                ))}
              </select>
            </Champ>
            <Champ icone={Shapes} libelle="Catégorie" htmlFor="recherche-categorie">
              <select
                id="recherche-categorie"
                value={categorie}
                onChange={(e) => setCategorie(e.target.value)}
                className={styleSaisie}
              >
                <option value="">Toutes</option>
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
                <Search className="h-4 w-4" aria-hidden />
                Rechercher
              </button>
            </div>
          </div>
        </form>
      </div>
    </section>
  )
}
