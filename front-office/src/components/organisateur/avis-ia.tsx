"use client"

import { useEffect, useState } from "react"
import { BrainCircuit, Frown, Loader2, Meh, Smile, type LucideIcon } from "lucide-react"
import { fetchSentiments } from "@/services/iaService"
import type { Sentiment, SentimentsEvenement } from "@/types/ia"
import { cn } from "@/utils"

const STYLES: Record<Sentiment, { libelle: string; icone: LucideIcon; barre: string; badge: string }> = {
  positif: { libelle: "Positifs", icone: Smile, barre: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  neutre: { libelle: "Neutres", icone: Meh, barre: "bg-slate-400", badge: "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/75" },
  negatif: { libelle: "Négatifs", icone: Frown, barre: "bg-rose-500", badge: "bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300" },
}
const ORDRE: Sentiment[] = ["positif", "neutre", "negatif"]
const pourcent = (x: number) => `${Math.round(x * 100)} %`

/**
 * "Ce que disent les commentaires" : chaque commentaire du public est classé par le module d'IA
 * (positif, neutre ou négatif). Un commentaire positif ajoute 2 points à sa proposition, un négatif en retire 2 ;
 * sous le seuil de confiance, le commentaire est affiché comme incertain et ne compte pas.
 */
export function AvisIA({ evenementId, version }: { evenementId: number; version: number }) {
  const [donnees, setDonnees] = useState<SentimentsEvenement | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    let actif = true
    setDonnees(null)
    setErreur(null)
    fetchSentiments(evenementId)
      .then((d) => actif && setDonnees(d))
      .catch((e) => actif && setErreur(e instanceof Error ? e.message : "Erreur de chargement."))
    return () => {
      actif = false
    }
  }, [evenementId, version])

  const r = donnees?.repartition
  const comptes = r ? r.positif + r.neutre + r.negatif : 0

  return (
    <section className="gw-carte p-5" aria-labelledby="avis-ia-titre">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="avis-ia-titre" className="flex items-center gap-2 font-titre text-lg font-semibold">
            <BrainCircuit className="h-5 w-5 text-gw-violet dark:text-gw-lavande" aria-hidden />
            Ce que disent les commentaires
          </h2>
          <p className="mt-1 text-xs text-gw-texte-doux dark:text-white/60">
            Analyse automatique par intelligence artificielle : un commentaire positif ajoute 2 points à la proposition, un
            commentaire négatif en retire 2.
          </p>
        </div>
        {donnees?.modele && (
          <p className="rounded-full bg-gw-fond px-3 py-1 text-xs text-gw-texte-doux dark:bg-white/10 dark:text-white/70">
            {donnees.modele.modele} · fiabilité mesurée {pourcent(donnees.modele.exactitude_test)}
          </p>
        )}
      </div>

      {erreur && <p className="mt-4 text-sm text-rose-600">{erreur}</p>}
      {!donnees && !erreur && (
        <p className="mt-4 flex items-center gap-2 text-sm text-gw-texte-doux">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Analyse des commentaires...
        </p>
      )}
      {donnees && donnees.total === 0 && (
        <p className="mt-4 text-sm text-gw-texte-doux dark:text-white/60">Aucun commentaire du public pour le moment.</p>
      )}

      {donnees && r && donnees.total > 0 && (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {ORDRE.map((s) => {
              const { libelle, icone: Icone, badge } = STYLES[s]
              return (
                <div key={s} className="rounded-2xl bg-gw-fond px-4 py-3 dark:bg-white/5">
                  <p className="flex items-center gap-2 text-xs text-gw-texte-doux dark:text-white/60">
                    <span className={cn("flex h-6 w-6 items-center justify-center rounded-full", badge)}>
                      <Icone className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    {libelle}
                  </p>
                  <p className="mt-1 font-titre text-2xl font-semibold tabular-nums">
                    {r[s]}
                    <span className="ml-1.5 text-sm font-normal text-gw-texte-doux dark:text-white/60">
                      {comptes ? `${Math.round((r[s] / comptes) * 100)} %` : ""}
                    </span>
                  </p>
                </div>
              )
            })}
          </div>
          <div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-gw-lavande/40 dark:bg-white/10" aria-hidden>
            {ORDRE.map((s) => (
              <div key={s} className={STYLES[s].barre} style={{ width: `${comptes ? (r[s] / comptes) * 100 : 0}%` }} />
            ))}
          </div>
          {r.incertain > 0 && (
            <p className="mt-2 text-xs text-gw-texte-doux dark:text-white/60">
              {r.incertain} commentaire{r.incertain > 1 ? "s" : ""} incertain{r.incertain > 1 ? "s" : ""} (confiance du modèle
              sous {pourcent(donnees.seuil_confiance)}) : affiché{r.incertain > 1 ? "s" : ""} mais sans effet sur les points.
            </p>
          )}

          <h3 className="mt-6 text-sm font-semibold">Derniers commentaires analysés</h3>
          <ul className="mt-3 divide-y divide-gw-lavande/40 dark:divide-white/10">
            {donnees.derniers.map((c, i) => {
              const incertain = c.confiance == null || c.confiance < donnees.seuil_confiance
              const st = c.sentiment ? STYLES[c.sentiment] : null
              return (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{c.texte}</span>
                    <span className="text-xs text-gw-texte-doux dark:text-white/55">sur {c.proposition}</span>
                  </span>
                  {st && (
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                        incertain ? "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" : st.badge,
                      )}
                    >
                      <st.icone className="h-3.5 w-3.5" aria-hidden />
                      {incertain ? "Incertain" : st.libelle.slice(0, -1)} · {pourcent(c.confiance ?? 0)}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
