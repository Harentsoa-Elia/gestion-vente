"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react"
import type { Evenement } from "@/types"
import { cn } from "@/utils"

/*
 * « Mon agenda » : calendrier du mois (jours avec événement marqués d'un point rose)
 * et, en dessous, les événements du jour choisi sur une ligne de temps,
 * à la manière du bloc « My tasks » du modèle.
 */

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
const cleJour = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

export function CalendrierAgenda({ evenements }: { evenements: Evenement[] }) {
  const aujourdhui = new Date()
  const [mois, setMois] = useState(new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1))
  const [jourChoisi, setJourChoisi] = useState(aujourdhui)

  const parJour = useMemo(() => {
    const m = new Map<string, Evenement[]>()
    for (const e of evenements) {
      const k = cleJour(new Date(e.date_debut))
      m.set(k, [...(m.get(k) ?? []), e])
    }
    return m
  }, [evenements])

  // grille du mois, semaines commençant le lundi
  const cases = useMemo(() => {
    const premier = new Date(mois)
    const decalage = (premier.getDay() + 6) % 7
    const debut = new Date(premier)
    debut.setDate(premier.getDate() - decalage)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(debut)
      d.setDate(debut.getDate() + i)
      return d
    })
  }, [mois])
  // n'afficher la 6e semaine que si elle contient des jours du mois
  const semaines = cases[35].getMonth() === mois.getMonth() ? 6 : 5

  const duJour = (parJour.get(cleJour(jourChoisi)) ?? []).sort(
    (a, b) => +new Date(a.date_debut) - +new Date(b.date_debut),
  )

  const changerMois = (delta: number) => setMois((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1))

  return (
    <section aria-labelledby="agenda-titre" className="gw-carte self-start p-5">
      <div className="flex items-center justify-between">
        <h2 id="agenda-titre" className="font-titre text-lg font-semibold">
          Mon agenda
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => changerMois(-1)}
            aria-label="Mois précédent"
            className="rounded-full p-1.5 text-gw-texte-doux hover:bg-gw-fond dark:text-white/70 dark:hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => changerMois(1)}
            aria-label="Mois suivant"
            className="rounded-full p-1.5 text-gw-texte-doux hover:bg-gw-fond dark:text-white/70 dark:hover:bg-white/10"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mt-1 text-sm capitalize text-gw-texte-doux dark:text-white/60">
        {mois.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
      </p>

      <div role="grid" aria-label="Calendrier" className="mt-4 grid grid-cols-7 gap-y-1 text-center text-xs">
        {JOURS.map((j) => (
          <span key={j} role="columnheader" className="pb-1 text-gw-texte-doux dark:text-white/50">
            {j}
          </span>
        ))}
        {cases.slice(0, semaines * 7).map((d) => {
          const k = cleJour(d)
          const horsMois = d.getMonth() !== mois.getMonth()
          const choisi = k === cleJour(jourChoisi)
          const estAujourdhui = k === cleJour(aujourdhui)
          const avecEvenement = parJour.has(k)
          return (
            <button
              key={k}
              type="button"
              role="gridcell"
              aria-selected={choisi}
              aria-label={`${d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}${avecEvenement ? `, ${parJour.get(k)!.length} événement(s)` : ""}`}
              onClick={() => setJourChoisi(d)}
              className={cn(
                "relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[13px] tabular-nums transition-colors",
                choisi
                  ? "bg-[linear-gradient(135deg,#6C5CE7,#C92A7A)] font-semibold text-white"
                  : estAujourdhui
                    ? "font-semibold text-gw-violet ring-1 ring-gw-violet dark:text-white dark:ring-white/60"
                    : horsMois
                      ? "text-gw-texte-doux/50 dark:text-white/25"
                      : "hover:bg-gw-fond dark:hover:bg-white/10",
              )}
            >
              {d.getDate()}
              {avecEvenement && !choisi && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-gw-rose" aria-hidden />
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-5 border-t border-gw-bordure pt-4 dark:border-gw-bordure-sombre">
        <p className="text-sm font-semibold capitalize">
          {jourChoisi.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        {duJour.length === 0 ? (
          <p className="mt-3 flex items-center gap-2 text-sm text-gw-texte-doux dark:text-white/60">
            <CalendarDays className="h-4 w-4" aria-hidden />
            Aucun événement ce jour-là.
          </p>
        ) : (
          <ol className="mt-3 space-y-3">
            {duJour.map((e) => (
              <li key={e.id} className="grid grid-cols-[3rem_1fr] items-center gap-2">
                <time dateTime={e.date_debut} className="text-xs tabular-nums text-gw-texte-doux dark:text-white/60">
                  {new Date(e.date_debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </time>
                <Link
                  href={`/evenements/${e.id}`}
                  target="_blank"
                  className="flex items-center gap-2 rounded-xl border border-gw-lavande bg-gw-fond px-3 py-2 transition-colors hover:border-gw-violet dark:border-gw-bordure-sombre dark:bg-white/5 dark:hover:border-white/40"
                >
                  <span className="h-6 w-1 shrink-0 rounded-full bg-[linear-gradient(180deg,#6C5CE7,#E8479A)]" aria-hidden />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{e.titre}</span>
                    {e.capacite != null && (
                      <span className="block text-xs text-gw-texte-doux dark:text-white/60">
                        {e.capacite.toLocaleString("fr-FR")} places
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
