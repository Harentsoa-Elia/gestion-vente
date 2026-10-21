"use client"

import { ListeVoirPlus } from "@/components/organisateur/voir-plus"
import { useEffect, useState, type FormEvent } from "react"
import { toast } from "sonner"
import { Loader2, Pencil, Receipt } from "lucide-react"
import type { Facturation, TypeLot } from "@/types"
import { fetchFacturation, modifierFraisHorsLigne } from "@/services/horsLigneService"
import { BadgeType, TYPES_LOT } from "@/components/organisateur/billets-hors-ligne"

/*
 * Facturation (administrateur) : billets hors ligne générés par chaque organisateur
 * et frais payés à la plateforme (frais par billet, payé avant la génération).
 * L'administrateur règle ce frais (0 Ar = génération gratuite) ; chaque lot garde le frais en vigueur
 * le jour de sa génération, donc un changement ne modifie pas les lots déjà générés.
 */

const entier = new Intl.NumberFormat("fr-FR")
const montant = (m: number) => `${entier.format(Math.round(m))} Ar`
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "-")

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
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement...
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <div>
        <h1 className="font-titre text-2xl font-semibold">Facturation</h1>
        <p className="mt-1 max-w-2xl text-sm text-gw-texte-doux dark:text-white/65">
          Billets hors ligne générés par les organisateurs (dépôt-vente, guichet, invitations) et frais payés à la
          plateforme, réglés par Mobile Money avant la génération.
        </p>
      </div>

      <ReglageFrais
        frais={donnees.frais_unitaire}
        modifieLe={donnees.frais_modifie_le}
        onModifie={(frais, le) => setDonnees({ ...donnees, frais_unitaire: frais, frais_modifie_le: le })}
      />

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

/** Carte de réglage du frais par billet hors ligne (administrateur). */
function ReglageFrais({
  frais,
  modifieLe,
  onModifie,
}: {
  frais: number
  modifieLe: string | null
  onModifie: (frais: number, le: string | null) => void
}) {
  const [edition, setEdition] = useState(false)
  const [valeur, setValeur] = useState(String(frais))
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState("")

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault()
    setErreur("")
    const n = Number(valeur.replace(",", "."))
    if (!Number.isFinite(n) || n < 0 || n > 10000) return setErreur("Indiquez un montant entre 0 et 10 000 Ar.")
    setEnvoi(true)
    try {
      const p = await modifierFraisHorsLigne(Math.round(n))
      onModifie(p.frais_par_billet, p.date_modification)
      setEdition(false)
      toast.success(p.frais_par_billet > 0 ? `Nouveau frais : ${montant(p.frais_par_billet)} par billet.` : "Génération des billets hors ligne désormais gratuite.")
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Enregistrement impossible.")
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <section className="gw-carte flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" aria-labelledby="titre-frais">
      <div>
        <h2 id="titre-frais" className="text-sm text-gw-texte-doux dark:text-white/60">
          Frais par billet hors ligne généré
        </h2>
        <p className="font-titre mt-1 text-2xl font-semibold tabular-nums">{frais > 0 ? montant(frais) : "Gratuit"}</p>
        <p className="mt-1 text-xs text-gw-texte-doux dark:text-white/55">
          {modifieLe ? `Modifié le ${date(modifieLe)}. ` : ""}Le changement s&apos;applique aux prochains lots ; les lots déjà générés gardent leur frais.
        </p>
      </div>
      {edition ? (
        <form onSubmit={enregistrer} className="flex flex-col gap-2 sm:items-end">
          <div className="flex items-center gap-2">
            <label htmlFor="frais-billet" className="sr-only">
              Frais par billet en ariary
            </label>
            <input
              id="frais-billet"
              inputMode="numeric"
              autoFocus
              value={valeur}
              onChange={(e) => setValeur(e.target.value.replace(/[^\d.,]/g, ""))}
              className="w-32 rounded-xl border border-gw-bordure bg-white px-3 py-2 text-right text-sm tabular-nums dark:border-white/15 dark:bg-white/5"
            />
            <span className="text-sm text-gw-texte-doux dark:text-white/60">Ar</span>
            <button type="button" onClick={() => { setEdition(false); setErreur("") }} className="rounded-full px-3 py-2 text-sm font-semibold text-gw-texte-doux hover:bg-gw-fond dark:text-white/65 dark:hover:bg-white/10">
              Annuler
            </button>
            <button type="submit" disabled={envoi} className="inline-flex items-center gap-2 rounded-full bg-gw-rose-action px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
              {envoi && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} Enregistrer
            </button>
          </div>
          <p className="text-xs text-gw-texte-pale dark:text-white/45">0 Ar = génération gratuite (aucun paiement demandé).</p>
          {erreur && <p className="text-xs text-gw-rose-action">{erreur}</p>}
        </form>
      ) : (
        <button
          type="button"
          onClick={() => { setValeur(String(Math.round(frais))); setEdition(true) }}
          className="inline-flex items-center gap-2 self-start rounded-full border border-gw-bordure px-4 py-2 text-sm font-semibold text-gw-violet hover:bg-gw-lavande/30 sm:self-center dark:border-white/15 dark:text-gw-lavande dark:hover:bg-white/10"
        >
          <Pencil className="h-4 w-4" aria-hidden /> Modifier le frais
        </button>
      )}
    </section>
  )
}
