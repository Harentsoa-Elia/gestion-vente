"use client"

import { useCallback, useEffect, useState } from "react"
import { Clock, Loader2, RefreshCw, ScanLine, Ticket, TrendingUp, Trophy, Wallet } from "lucide-react"
import type { Evenement, Pilotage, Statistiques } from "@/types"
import { fetchPilotage, fetchStatistiques } from "@/services/statistiquesService"
import { Anneau } from "@/components/organisateur/anneau"
import { cn } from "@/utils"

/*
 * Tableau de bord d'un événement (premier onglet de sa fiche une fois validé) :
 *  - bandeau : billets vendus sur la capacité, entrées scannées, montant des ventes et compte à rebours ;
 *  - remplissage et montant des ventes par tarif (badge "Presque complet" à partir de 85 %) ;
 *  - rythme des ventes des 14 derniers jours, paiements à finaliser, meilleurs acheteurs.
 * Les chiffres viennent de /organisateur/statistiques (un événement) et de /organisateur/evenements/{id}/pilotage.
 * Charte : violet pour les valeurs normales, rose pour ce qui demande de l'attention.
 */

const entier = new Intl.NumberFormat("fr-FR")
const ariary = (n: number) => `${entier.format(Math.round(n))} Ar`
const JOURS_GRAPHIQUE = 14
const SEUIL_PRESQUE_COMPLET = 85
const ACTUALISATION = 30_000

function compteARebours(dateDebut: string, dateFin: string | null): string {
  const maintenant = Date.now()
  const debut = new Date(dateDebut).getTime()
  const fin = dateFin ? new Date(dateFin).getTime() : debut + 6 * 3600_000
  if (maintenant > fin) return "Terminé"
  if (maintenant >= debut) return "En cours"
  const jours = Math.ceil((debut - maintenant) / 86_400_000)
  return jours <= 1 ? "Demain" : `Dans ${jours} jours`
}

function Jauge({ id, valeur, total, libelle, detail }: { id: string; valeur: number; total: number | null; libelle: string; detail: string }) {
  const pct = total ? Math.round((valeur / total) * 100) : 0
  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0">
        <Anneau id={id} pourcentage={pct} taille={128} epaisseur={13} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-titre text-3xl leading-none font-bold">{entier.format(valeur)}</span>
          <span className="mt-1 text-xs text-white/60">/ {total != null ? entier.format(total) : "-"}</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold tracking-[0.14em] text-white/60 uppercase">{libelle}</p>
        <p className="font-titre mt-1 text-3xl font-bold text-gw-rose">{total ? `${pct} %` : "-"}</p>
        <p className="mt-1 text-sm text-white/65">{detail}</p>
      </div>
    </div>
  )
}

export function PilotageEvenement({ evenement }: { evenement: Evenement }) {
  const [stats, setStats] = useState<Statistiques | null>(null)
  const [pilotage, setPilotage] = useState<Pilotage | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [actualisation, setActualisation] = useState(false)

  const charger = useCallback(async () => {
    setActualisation(true)
    try {
      const [s, p] = await Promise.all([fetchStatistiques(evenement.id), fetchPilotage(evenement.id)])
      setStats(s)
      setPilotage(p)
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Impossible de charger le tableau de bord.")
    } finally {
      setActualisation(false)
    }
  }, [evenement.id])

  useEffect(() => {
    charger()
    const id = setInterval(charger, ACTUALISATION)
    return () => clearInterval(id)
  }, [charger])

  if (erreur && !stats) return <p className="gw-carte p-6 text-sm text-gw-rose-action">{erreur}</p>
  if (!stats || !pilotage) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-gw-texte-doux dark:text-white/60">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement du tableau de bord...
      </div>
    )
  }

  const ind = stats.indicateurs
  const capacite = ind.capacite
  const restantes = ind.places_restantes
  const potentielle = pilotage.recette_potentielle
  const pctRecette = potentielle ? Math.min(100, Math.round((ind.recettes / potentielle) * 100)) : null

  // 14 derniers jours, jours sans vente compris
  const parDate = new Map(stats.ventes_par_jour.map((v) => [v.date, v.billets]))
  const jours: { date: string; billets: number }[] = []
  const aujourdhui = new Date()
  for (let i = JOURS_GRAPHIQUE - 1; i >= 0; i--) {
    const d = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), aujourdhui.getDate() - i)
    const cle = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    jours.push({ date: cle, billets: parDate.get(cle) ?? 0 })
  }
  const maxJour = Math.max(1, ...jours.map((j) => j.billets))
  const moyenne = jours.reduce((s, j) => s + j.billets, 0) / JOURS_GRAPHIQUE

  return (
    <div className="space-y-6">
      {/* ---------- bandeau ---------- */}
      <section className="relative overflow-hidden rounded-3xl bg-gw-nuit p-6 text-white sm:p-8 dark:ring-1 dark:ring-white/10" aria-label="Résumé de l'événement">
        <span aria-hidden className="absolute -top-28 -right-24 h-72 w-72 rounded-full bg-gw-violet/35 blur-3xl" />
        <span aria-hidden className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-gw-rose-action/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <p className="inline-flex items-center gap-2 text-sm text-white/70">
            <Clock className="h-4 w-4" aria-hidden />
            Mis à jour toutes les 30 secondes
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={charger}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", actualisation && "animate-spin")} aria-hidden />
              Actualiser
            </button>
            <span className="rounded-full bg-gw-rose-action px-3 py-1.5 text-xs font-bold tracking-wide uppercase">
              {compteARebours(evenement.date_debut, evenement.date_fin ?? null)}
            </span>
          </div>
        </div>

        <div className="relative mt-6 grid gap-8 lg:grid-cols-[1fr_1fr_1.1fr] lg:items-center">
          <Jauge
            id="pilotage-vendus"
            valeur={ind.billets_vendus}
            total={capacite}
            libelle="Billets vendus"
            detail={restantes != null ? `${entier.format(restantes)} places restantes` : "Capacité non précisée"}
          />
          <Jauge
            id="pilotage-entrees"
            valeur={ind.entres}
            total={ind.billets_vendus || null}
            libelle="Entrées scannées"
            detail={`${entier.format(ind.non_scannes)} billet${ind.non_scannes > 1 ? "s" : ""} vendu${ind.non_scannes > 1 ? "s" : ""} pas encore scanné${ind.non_scannes > 1 ? "s" : ""}${ind.entres ? "" : " (contrôle le jour J)"}`}
          />
          <div className="lg:border-l lg:border-white/15 lg:pl-8">
            <p className="text-xs font-semibold tracking-[0.14em] text-white/60 uppercase">Montant des ventes</p>
            <p className="font-titre mt-1 text-4xl font-bold">{ariary(ind.recettes)}</p>
            {pctRecette != null && potentielle != null ? (
              <>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pctRecette} aria-valuemin={0} aria-valuemax={100}>
                  <div className="h-full rounded-full bg-[linear-gradient(90deg,#6C5CE7,#E8479A)]" style={{ width: `${pctRecette}%` }} />
                </div>
                <p className="mt-2 text-sm text-white/65">
                  {pctRecette} % du montant possible si tout est vendu ({ariary(potentielle)})
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-white/65">Un tarif est sans limite : pas de montant maximal</p>
            )}
            <p className="mt-4 text-sm text-white/65">
              <span className="font-semibold text-white">{entier.format(ind.participants)}</span> acheteurs ·{" "}
              <span className="font-semibold text-white">{entier.format(ind.en_attente)}</span> réservation{ind.en_attente > 1 ? "s" : ""} en attente
            </p>
          </div>
        </div>
      </section>

      {/* ---------- par tarif ---------- */}
      <section className="gw-carte p-5 sm:p-6" aria-labelledby="pilotage-tarifs">
        <h2 id="pilotage-tarifs" className="font-titre flex items-center gap-2 text-lg font-semibold">
          <Ticket className="h-5 w-5 text-gw-violet dark:text-gw-lavande" aria-hidden />
          Billets par tarif : remplissage et montant des ventes
        </h2>
        {pilotage.tarifs.length === 0 ? (
          <p className="mt-4 text-sm text-gw-texte-doux dark:text-white/60">Aucun tarif pour le moment : ajoutez-en dans l&apos;onglet Billets.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs tracking-wide text-gw-texte-doux uppercase dark:text-white/55">
                  <th className="pb-3 font-semibold">Tarif</th>
                  <th className="pb-3 text-right font-semibold">Prix</th>
                  <th className="pb-3 text-right font-semibold">Vendus</th>
                  <th className="w-[32%] pb-3 pl-6 font-semibold">Remplissage</th>
                  <th className="pb-3 text-right font-semibold">Montant</th>
                  <th className="pb-3 text-right font-semibold">Part</th>
                </tr>
              </thead>
              <tbody>
                {pilotage.tarifs.map((t) => {
                  const pct = t.quota ? Math.min(100, Math.round((t.vendus / t.quota) * 100)) : null
                  const complet = pct != null && pct >= 100
                  const alerte = pct != null && pct >= SEUIL_PRESQUE_COMPLET
                  return (
                    <tr key={t.id} className="border-t border-gw-bordure dark:border-gw-bordure-sombre">
                      <td className="py-3.5">
                        <span className="font-semibold">{t.nom}</span>
                        {alerte && (
                          <span className="ml-2 rounded-full bg-gw-rose-pale px-2 py-0.5 text-[11px] font-bold text-gw-rose-action uppercase dark:bg-gw-rose/15 dark:text-gw-rose">
                            {complet ? "Complet" : "Presque complet"}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-right tabular-nums">{ariary(t.prix)}</td>
                      <td className="py-3.5 text-right font-semibold tabular-nums">
                        {entier.format(t.vendus)}
                        <span className="font-normal text-gw-texte-doux dark:text-white/55"> / {t.quota != null ? entier.format(t.quota) : "illimité"}</span>
                      </td>
                      <td className="py-3.5 pl-6">
                        {pct != null ? (
                          <div className="flex items-center gap-3">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-gw-fond dark:bg-white/10">
                              <div className={cn("h-full rounded-full", alerte ? "bg-gw-rose-action" : "bg-gw-violet")} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={cn("w-10 text-right text-xs font-semibold tabular-nums", alerte && "text-gw-rose-action dark:text-gw-rose")}>{pct} %</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gw-texte-doux dark:text-white/55">sans limite</span>
                        )}
                      </td>
                      <td className="py-3.5 text-right font-semibold tabular-nums">{ariary(t.recettes)}</td>
                      <td className="py-3.5 text-right text-gw-texte-doux tabular-nums dark:text-white/55">{t.part} %</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ---------- rythme, paiements, acheteurs ---------- */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="gw-carte p-5 sm:p-6" aria-labelledby="pilotage-rythme">
          <div className="flex items-baseline justify-between gap-2">
            <h2 id="pilotage-rythme" className="font-titre flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-5 w-5 text-gw-violet dark:text-gw-lavande" aria-hidden />
              Rythme des ventes
            </h2>
            <p className="text-xs text-gw-texte-doux dark:text-white/55">
              moy. <span className="font-semibold text-gw-violet dark:text-gw-lavande">{moyenne.toFixed(1).replace(".", ",")}/jour</span>
            </p>
          </div>
          <div className="mt-5 flex h-36 items-end gap-1.5" role="img" aria-label={`Billets vendus par jour sur les ${JOURS_GRAPHIQUE} derniers jours`}>
            {jours.map((j, i) => {
              const dernier = i === jours.length - 1
              return (
                <div key={j.date} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className={cn("text-[10px] tabular-nums", dernier ? "font-bold text-gw-rose-action dark:text-gw-rose" : "text-gw-texte-doux dark:text-white/55")}>
                    {j.billets || ""}
                  </span>
                  <div
                    className={cn("w-full rounded-t-md", dernier ? "bg-gw-rose-action" : "bg-gw-lavande dark:bg-gw-violet/60")}
                    style={{ height: `${Math.max(4, (j.billets / maxJour) * 100)}px` }}
                  />
                  <span className={cn("text-[10px] tabular-nums", dernier ? "font-bold text-gw-encre dark:text-white" : "text-gw-texte-pale dark:text-white/45")}>
                    {Number(j.date.slice(8))}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-gw-texte-doux dark:text-white/55">14 derniers jours de ventes en ligne ; en rose, aujourd&apos;hui.</p>
          {/* une vente hors ligne (revendeur, guichet) n'a pas de date : elle est comptée dans les totaux, pas dans les barres */}
          <p className="mt-1 text-xs text-gw-texte-doux dark:text-white/55">
            {stats.hors_ligne.vendus > 0 ? (
              <>
                <span className="font-semibold text-gw-violet dark:text-gw-lavande">+ {entier.format(stats.hors_ligne.vendus)}</span> billet
                {stats.hors_ligne.vendus > 1 ? "s" : ""} vendu{stats.hors_ligne.vendus > 1 ? "s" : ""} hors ligne, sans date de vente : comptés dans les totaux.
              </>
            ) : (
              "Aucune vente hors ligne pour cet événement."
            )}
          </p>
        </section>

        <section className="gw-carte p-5 sm:p-6" aria-labelledby="pilotage-attente">
          <h2 id="pilotage-attente" className="font-titre flex items-center gap-2 text-base font-semibold">
            <Wallet className="h-5 w-5 text-gw-violet dark:text-gw-lavande" aria-hidden />
            Paiements à finaliser
            <span className="rounded-full bg-gw-fond px-2 text-xs dark:bg-white/10">{pilotage.en_attente.reduce((s, a) => s + a.billets, 0)}</span>
          </h2>
          {pilotage.en_attente.length === 0 ? (
            <p className="mt-4 text-sm text-gw-texte-doux dark:text-white/60">Aucune réservation en attente de paiement.</p>
          ) : (
            <>
              <ul className="mt-4 space-y-2.5 text-sm">
                {pilotage.en_attente.slice(0, 6).map((a, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-gw-rose-action" aria-hidden />
                      <span className="truncate font-medium">{a.participant}</span>
                    </span>
                    <span className="shrink-0 text-xs text-gw-texte-doux dark:text-white/55">
                      {a.billets} × {a.tarif}
                    </span>
                    <span className="shrink-0 font-semibold tabular-nums">{ariary(a.montant)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-gw-bordure pt-3 text-sm font-semibold text-gw-rose-action dark:border-gw-bordure-sombre dark:text-gw-rose">
                {ariary(pilotage.montant_en_attente)} en attente
              </p>
            </>
          )}
          <p className="mt-3 text-xs text-gw-texte-doux dark:text-white/55">Les places sont gardées 15 minutes, puis libérées si le paiement n&apos;arrive pas.</p>
        </section>

        <section className="gw-carte p-5 sm:p-6" aria-labelledby="pilotage-acheteurs">
          <h2 id="pilotage-acheteurs" className="font-titre flex items-center gap-2 text-base font-semibold">
            <Trophy className="h-5 w-5 text-gw-violet dark:text-gw-lavande" aria-hidden />
            Meilleurs acheteurs
          </h2>
          {pilotage.meilleurs_acheteurs.length === 0 ? (
            <p className="mt-4 text-sm text-gw-texte-doux dark:text-white/60">Pas encore de vente pour cet événement.</p>
          ) : (
            <ol className="mt-4 space-y-3 text-sm">
              {pilotage.meilleurs_acheteurs.map((a, i) => (
                <li key={i} className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                      i === 0 ? "bg-gw-rose-action text-white" : "bg-gw-violet-pale text-gw-violet dark:bg-white/10 dark:text-white",
                    )}
                  >
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{a.participant}</span>
                  <span className="shrink-0 text-xs text-gw-texte-doux dark:text-white/55">
                    {a.billets} billet{a.billets > 1 ? "s" : ""}
                  </span>
                  <span className="w-24 shrink-0 text-right font-semibold tabular-nums">{ariary(a.montant)}</span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-4 flex items-center gap-1.5 text-xs text-gw-texte-doux dark:text-white/55">
            <ScanLine className="h-3.5 w-3.5" aria-hidden /> Billets achetés en ligne pour cet événement.
          </p>
        </section>
      </div>
    </div>
  )
}
