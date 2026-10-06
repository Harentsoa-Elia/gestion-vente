"use client"

import { ListeVoirPlus } from "@/components/organisateur/voir-plus"
import { useEffect, useState } from "react"
import { Loader2, Receipt } from "lucide-react"
import type { Facturation, TypeLot } from "@/types"
import { fetchFacturation } from "@/services/horsLigneService"
import { BadgeType, TYPES_LOT } from "@/components/organisateur/billets-hors-ligne"

/*
 * Facturation (administrateur) : billets hors ligne générés par chaque organisateur
 * et frais payés à la plateforme (frais fixe par billet, payé avant la génération).
 */

const entier = new Intl.NumberFormat("fr-FR")
const montant = (m: number) => `${entier.format(Math.round(m))} Ar`
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—")

export function AdminFacturation() {
  const [donnees, setDonnees] = useState<Facturation | null>(null)
  const [erreur, setErreur] = useState("")

  useEffect(() => {
    fetchFacturation()
      .then(setDonnees)
      .catch((e) => setErreur(e instanceof Error ? e.message : "Chargement impossible."))
  }, [])

  if (erreur) return <p className="px-4 py-16 text-center text-gw-rose-action lg:px-8">{erreur}</p>
  if (!donnees) {
    return (
      <div className="flex items-center gap-2 px-4 py-16 text-gw-texte-doux lg:px-8 dark:text-white/60">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement…
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <div>
        <h1 className="font-titre text-2xl font-semibold">Facturation</h1>
        <p className="mt-1 max-w-2xl text-sm text-gw-texte-doux dark:text-white/65">
          Billets hors ligne générés par les organisateurs (dépôt-vente, guichet, invitations) et frais payés à la
          plateforme : {montant(donnees.frais_unitaire)} par billet, réglés par Mobile Money avant la génération.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="gw-carte p-5">
          <p className="text-sm text-gw-texte-doux dark:text-white/60">Frais encaissés</p>
          <p className="font-titre mt-1 text-2xl font-semibold tabular-nums">{montant(donnees.frais_payes)}</p>
        </div>
        <div className="gw-carte p-5">
          <p className="text-sm text-gw-texte-doux dark:text-white/60">Billets générés</p>
          <p className="font-titre mt-1 text-2xl font-semibold tabular-nums">{entier.format(donnees.billets_generes)}</p>
        </div>
        <div className="gw-carte p-5 sm:col-span-2">
          <p className="text-sm text-gw-texte-doux dark:text-white/60">Répartition par usage</p>
          <div className="mt-2 flex flex-wrap gap-3">
            {(Object.keys(TYPES_LOT) as TypeLot[]).map((t) => (
              <span key={t} className="flex items-center gap-2 text-sm">
                <BadgeType type={t} />
                <span className="font-semibold tabular-nums">{entier.format(donnees.par_type[t] ?? 0)}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <section className="gw-carte p-5 sm:p-6" aria-labelledby="titre-orga">
        <h2 id="titre-orga" className="font-titre text-lg font-semibold">
          Par organisateur
        </h2>
        {donnees.organisateurs.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-gw-texte-doux dark:text-white/60">
            <Receipt className="h-7 w-7 text-gw-violet dark:text-gw-lavande" aria-hidden />
            Aucun billet hors ligne généré pour l&apos;instant.
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <ListeVoirPlus elements={donnees.organisateurs}>
              {(organisateursPage) => (
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs text-gw-texte-doux uppercase dark:text-white/55">
                  <th className="pb-2 font-medium">Organisateur</th>
                  <th className="pb-2 text-right font-medium">Lots</th>
                  <th className="pb-2 text-right font-medium">Billets générés</th>
                  <th className="pb-2 text-right font-medium">Frais payés</th>
                  <th className="pb-2 text-right font-medium">Dernier lot</th>
                </tr>
              </thead>
              <tbody>
                {organisateursPage.map((o) => (
                  <tr key={o.organisateur_id} className="border-t border-gw-bordure dark:border-gw-bordure-sombre">
                    <td className="py-3">
                      <p className="font-semibold">{o.nom}</p>
                      <p className="text-xs text-gw-texte-doux dark:text-white/55">{o.email}</p>
                    </td>
                    <td className="py-3 text-right tabular-nums">{o.lots}</td>
                    <td className="py-3 text-right tabular-nums">{entier.format(o.billets_generes)}</td>
                    <td className="py-3 text-right font-semibold tabular-nums">{montant(o.frais_payes)}</td>
                    <td className="py-3 text-right text-gw-texte-doux dark:text-white/60">{date(o.dernier_lot)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
              )}
            </ListeVoirPlus>
          </div>
        )}
      </section>

      {donnees.lots_recents.length > 0 && (
        <section className="gw-carte p-5 sm:p-6" aria-labelledby="titre-lots">
          <h2 id="titre-lots" className="font-titre text-lg font-semibold">
            Derniers lots générés
          </h2>
          <div className="mt-4 overflow-x-auto">
            <ListeVoirPlus elements={donnees.lots_recents}>
              {(lotsPage) => (
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs text-gw-texte-doux uppercase dark:text-white/55">
                  <th className="pb-2 font-medium">Lot</th>
                  <th className="pb-2 font-medium">Événement</th>
                  <th className="pb-2 text-right font-medium">Billets</th>
                  <th className="pb-2 text-right font-medium">Frais</th>
                  <th className="pb-2 pl-6 font-medium">Paiement</th>
                  <th className="pb-2 text-right font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {lotsPage.map((l) => (
                  <tr key={l.id} className="border-t border-gw-bordure dark:border-gw-bordure-sombre">
                    <td className="py-3">
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-gw-texte-doux">n° {l.id}</span> <BadgeType type={l.type} />
                      </span>
                    </td>
                    <td className="py-3">
                      {l.evenement_titre}
                      <span className="text-gw-texte-doux dark:text-white/55"> · {l.categorie_nom}</span>
                    </td>
                    <td className="py-3 text-right tabular-nums">{l.quantite}</td>
                    <td className="py-3 text-right font-semibold tabular-nums">{montant(l.montant_frais)}</td>
                    <td className="py-3 pl-6 font-mono text-xs text-gw-texte-doux dark:text-white/55">{l.reference_paiement}</td>
                    <td className="py-3 text-right text-gw-texte-doux dark:text-white/60">{date(l.date_creation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
              )}
            </ListeVoirPlus>
          </div>
        </section>
      )}
    </div>
  )
}
