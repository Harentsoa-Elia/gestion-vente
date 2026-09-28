"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowLeft, CalendarDays, Clock, Eye, MapPin, Mic2, Shapes, ShieldCheck, Ticket, Users, Vote, type LucideIcon } from "lucide-react"
import { fetchEvenementById } from "@/services/evenementService"
import { fetchTarifs } from "@/services/billetterieService"
import { fetchPropositionsAvecScores } from "@/services/propositionService"
import { fetchCategories, fetchLieux } from "@/services/referentielService"
import type { Categorie, Evenement, Lieu, PropositionAvecScore, PropositionType, TarifDisponible } from "@/types"
import { cn } from "@/utils"
import { estPasse, repereTemporel } from "@/lib/evenements"
import { imageTestEvenement, imageTestProposition, urlMedia } from "@/lib/media"
import { ariary, dateEvenement } from "@/lib/billetterie"
import { BoiteReactions } from "@/components/accueil/boite-reactions"

/*
 * Page publique d'un événement : affiche, informations pratiques, tarifs avec les places
 * restantes et bouton « Réserver » ; plus bas, les propositions ouvertes au vote du public.
 */

type EtatBilletterie =
  | { type: "ouverte"; prixMin: number }
  | { type: "complet" }
  | { type: "sans-tarif" }
  | { type: "terminee" }
  | { type: "non-publiee" }

function etatBilletterie(evenement: Evenement, tarifs: TarifDisponible[]): EtatBilletterie {
  if (estPasse(evenement)) return { type: "terminee" }
  if (evenement.statut_validation !== "valide") return { type: "non-publiee" }
  if (tarifs.length === 0) return { type: "sans-tarif" }
  const ouverts = tarifs.filter((t) => t.restantes == null || t.restantes > 0)
  if (ouverts.length === 0) return { type: "complet" }
  return { type: "ouverte", prixMin: Math.min(...ouverts.map((t) => t.prix)) }
}

function Disponibilite({ tarif }: { tarif: TarifDisponible }) {
  if (tarif.restantes == null) return null
  if (tarif.restantes === 0) return <span className="text-xs font-semibold text-gw-texte-pale">Complet</span>
  if (tarif.restantes <= 20)
    return (
      <span className="text-xs font-semibold text-gw-rose-action">
        {tarif.restantes === 1 ? "Dernière place" : `Plus que ${tarif.restantes} places`}
      </span>
    )
  return <span className="text-xs text-gw-texte-doux">{tarif.restantes.toLocaleString("fr-FR")} places disponibles</span>
}

function CarteBilletterie({ evenement, tarifs, etat }: { evenement: Evenement; tarifs: TarifDisponible[]; etat: EtatBilletterie }) {
  return (
    <section aria-labelledby="titre-billets" className="rounded-3xl bg-white p-6 shadow-[0_24px_48px_-30px_rgba(30,26,60,0.5)] ring-1 ring-gw-bordure">
      <h2 id="titre-billets" className="font-titre flex items-center gap-2 text-xl font-bold text-gw-nuit">
        <Ticket className="h-5 w-5 text-gw-violet" aria-hidden /> Billets
      </h2>

      {tarifs.length > 0 && (
        <ul className="mt-4 divide-y divide-gw-bordure">
          {tarifs.map((t) => {
            const complet = t.restantes === 0
            return (
              <li key={t.id} className={cn("flex items-center justify-between gap-3 py-3", complet && "opacity-60")}>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gw-nuit">{t.nom}</p>
                  <Disponibilite tarif={t} />
                </div>
                <p className={cn("font-titre shrink-0 text-lg font-bold text-gw-nuit", complet && "line-through")}>{ariary(t.prix)}</p>
              </li>
            )
          })}
        </ul>
      )}

      <div className="mt-5">
        {etat.type === "ouverte" ? (
          <>
            <Link
              href={`/evenements/${evenement.id}/reserver`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gw-rose-action font-semibold text-white shadow-[0_12px_24px_-12px_rgba(201,42,122,0.8)] transition-colors hover:bg-gw-rose-action-fonce focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gw-violet"
            >
              Réserver mes billets
            </Link>
            <p className="mt-3 flex items-start gap-2 text-xs text-gw-texte-doux">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              Paiement par MVola, Orange Money ou Airtel Money. Vos billets et leurs QR codes arrivent par e-mail.
            </p>
          </>
        ) : (
          <p className="rounded-2xl bg-gw-fond px-4 py-3 text-sm text-gw-texte">
            {etat.type === "terminee" && "Cet événement est terminé : la billetterie est fermée."}
            {etat.type === "complet" && "Complet : toutes les places ont été vendues."}
            {etat.type === "sans-tarif" && "Les tarifs seront bientôt annoncés. Revenez un peu plus tard."}
            {etat.type === "non-publiee" && "Aperçu : cet événement n'est pas encore publié, la billetterie n'est pas ouverte."}
          </p>
        )}
      </div>
    </section>
  )
}

const TYPES_PROPOSITION: Record<PropositionType, { libelle: string; icone: LucideIcon }> = {
  ARTISTE: { libelle: "Artiste", icone: Mic2 },
  LIEU: { libelle: "Lieu", icone: MapPin },
  CATEGORIE: { libelle: "Type d'événement", icone: Shapes },
}

function CarteProposition({ proposition, part }: { proposition: PropositionAvecScore; part: number }) {
  const [score, setScore] = useState(proposition.score)
  const type = TYPES_PROPOSITION[proposition.type]
  const photo = urlMedia(proposition.image_url) ?? imageTestProposition(proposition)
  const [erreurImage, setErreurImage] = useState(false)

  return (
    <article className="overflow-hidden rounded-3xl bg-gw-nuit text-white">
      <div className="relative h-40">
        {photo && !erreurImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" loading="lazy" onError={() => setErreurImage(true)} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="scene absolute inset-0" />
        )}
        <div aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(22,18,46,0.1)_20%,rgba(22,18,46,0.92)_100%)]" />
        <p className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-gw-nuit/75 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
          <type.icone className="h-3.5 w-3.5" aria-hidden /> {type.libelle}
        </p>
        <div className="absolute right-4 bottom-3 left-4 flex items-end justify-between gap-3">
          <h3 className="font-titre line-clamp-2 text-2xl leading-tight font-bold">{proposition.libelle}</h3>
          <p className="font-titre shrink-0 text-3xl font-bold">
            {part}
            <span className="text-lg"> %</span>
          </p>
        </div>
      </div>
      <div className="p-4">
        <p className="mb-3 text-sm text-white/75">
          <span className="font-semibold text-white">{score.toLocaleString("fr-FR")} points</span> · réagissez pour la soutenir
        </p>
        <BoiteReactions propositionId={proposition.id} libelle={proposition.libelle} onScore={(d) => setScore((v) => v + d)} />
      </div>
    </article>
  )
}

function Squelette() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6" aria-busy="true" aria-label="Chargement de l'événement">
      <div className="aspect-[2/1] max-h-[26rem] w-full animate-pulse rounded-3xl bg-gw-bordure" />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-3">
          <div className="h-8 w-2/3 animate-pulse rounded bg-gw-bordure" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-gw-bordure" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-gw-bordure" />
        </div>
        <div className="h-64 animate-pulse rounded-3xl bg-gw-bordure" />
      </div>
    </div>
  )
}

export function EvenementDetail({ evenementId }: { evenementId: number }) {
  const [evenement, setEvenement] = useState<Evenement | null>(null)
  const [tarifs, setTarifs] = useState<TarifDisponible[]>([])
  const [lieu, setLieu] = useState<Lieu>()
  const [categorie, setCategorie] = useState<Categorie>()
  const [propositions, setPropositions] = useState<PropositionAvecScore[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [erreurImage, setErreurImage] = useState(false)

  useEffect(() => {
    let actif = true
    Promise.allSettled([
      fetchEvenementById(evenementId),
      fetchTarifs(evenementId),
      fetchLieux(),
      fetchCategories(),
      fetchPropositionsAvecScores(evenementId),
    ]).then(([ev, ta, li, ca, pr]) => {
      if (!actif) return
      if (ev.status !== "fulfilled") {
        setErreur("Cet événement est introuvable. Il a peut-être été retiré.")
        setChargement(false)
        return
      }
      const e = ev.value
      setEvenement(e)
      if (ta.status === "fulfilled") setTarifs(ta.value)
      if (li.status === "fulfilled") setLieu(li.value.find((l) => l.id === e.lieu_id))
      if (ca.status === "fulfilled") setCategorie(ca.value.find((c) => c.id === e.categorie_id))
      if (pr.status === "fulfilled") setPropositions([...pr.value].sort((a, b) => b.score - a.score))
      setChargement(false)
    })
    return () => {
      actif = false
    }
  }, [evenementId])

  // part des points de chaque proposition parmi celles du même type
  const parts = useMemo(() => {
    const totaux = new Map<PropositionType, number>()
    for (const p of propositions) totaux.set(p.type, (totaux.get(p.type) ?? 0) + p.score)
    return new Map(propositions.map((p) => [p.id, totaux.get(p.type) ? Math.round((p.score / totaux.get(p.type)!) * 100) : 0]))
  }, [propositions])

  if (chargement) return <Squelette />

  if (erreur || !evenement) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <p className="font-titre text-2xl font-bold text-gw-nuit">Événement introuvable</p>
        <p className="mt-2 text-gw-texte-doux">{erreur}</p>
        <Link href="/evenements" className="mt-6 inline-flex items-center gap-2 font-semibold text-gw-violet hover:text-gw-rose-action">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Voir tous les événements
        </Link>
      </div>
    )
  }

  const etat = etatBilletterie(evenement, tarifs)
  const passe = etat.type === "terminee"
  const repere = passe ? null : repereTemporel(evenement)
  const affiche = urlMedia(evenement.image_url) ?? imageTestEvenement(evenement)
  const lieuTexte = lieu ? [lieu.nom, lieu.adresse, lieu.ville].filter(Boolean).join(", ") : null
  const duree =
    evenement.date_fin && new Date(evenement.date_fin).toDateString() === new Date(evenement.date_debut).toDateString()
      ? `Jusqu'à ${new Date(evenement.date_fin).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ")}`
      : evenement.date_fin
        ? `Jusqu'au ${dateEvenement(evenement.date_fin).toLowerCase()}`
        : null

  return (
    <div className="pb-28 lg:pb-16">
      {/* bandeau : affiche sur fond flouté de la même image */}
      <div className="relative overflow-hidden bg-gw-nuit">
        {!erreurImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={affiche} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-40 blur-2xl" />
        )}
        <div className="relative mx-auto max-w-6xl px-4 pt-6 pb-8 sm:px-6">
          <Link href="/evenements" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/85 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Tous les événements
          </Link>
          <div className="mt-4 aspect-[2/1] max-h-[28rem] w-full overflow-hidden rounded-3xl bg-gw-nuit shadow-[0_30px_60px_-30px_rgba(0,0,0,0.7)]">
            {!erreurImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={affiche} alt={`Affiche : ${evenement.titre}`} onError={() => setErreurImage(true)} className={cn("h-full w-full object-cover", passe && "grayscale")} />
            ) : (
              <div className="scene h-full w-full" />
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 pt-8 sm:px-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {categorie && <span className="rounded-full bg-gw-lavande/60 px-3 py-1 text-xs font-semibold text-gw-nuit">{categorie.nom}</span>}
            {repere && <span className="text-sm font-semibold text-gw-rose-action">{repere}</span>}
            {passe && <span className="rounded-full bg-gw-nuit px-3 py-1 text-xs font-semibold text-white">Terminé</span>}
          </div>
          <h1 className="font-titre mt-3 text-4xl leading-[1.05] font-bold tracking-[-0.03em] text-gw-nuit sm:text-5xl">{evenement.titre}</h1>

          <ul className="mt-6 space-y-3 text-gw-texte">
            <li className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gw-fond text-gw-violet">
                <CalendarDays className="h-5 w-5" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold text-gw-nuit">{dateEvenement(evenement.date_debut)}</span>
                {duree && <span className="text-sm text-gw-texte-doux">{duree}</span>}
              </span>
            </li>
            {lieuTexte && (
              <li className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gw-fond text-gw-violet">
                  <MapPin className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-semibold text-gw-nuit">{lieu?.nom}</span>
                  <span className="text-sm text-gw-texte-doux">{[lieu?.adresse, lieu?.ville, lieu?.region].filter(Boolean).join(", ")}</span>
                </span>
              </li>
            )}
            {evenement.capacite != null && (
              <li className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gw-fond text-gw-violet">
                  <Users className="h-5 w-5" aria-hidden />
                </span>
                <span className="font-semibold text-gw-nuit">{evenement.capacite.toLocaleString("fr-FR")} places au total</span>
              </li>
            )}
          </ul>

          {evenement.description && (
            <section className="mt-10" aria-labelledby="titre-apropos">
              <h2 id="titre-apropos" className="font-titre text-2xl font-bold text-gw-nuit">
                À propos
              </h2>
              <p className="mt-3 leading-relaxed whitespace-pre-line text-gw-texte">{evenement.description}</p>
            </section>
          )}

          {!!evenement.nombre_vues && (
            <p className="mt-6 flex items-center gap-1.5 text-sm text-gw-texte-doux">
              <Eye className="h-4 w-4" aria-hidden /> {evenement.nombre_vues.toLocaleString("fr-FR")} vues
              <Clock className="ml-3 h-4 w-4" aria-hidden /> Publié le {new Date(evenement.date_creation).toLocaleDateString("fr-FR")}
            </p>
          )}

          {propositions.length > 0 && (
            <section className="mt-12" aria-labelledby="titre-vote">
              <h2 id="titre-vote" className="font-titre flex items-center gap-2 text-2xl font-bold text-gw-nuit">
                <Vote className="h-6 w-6 text-gw-rose" aria-hidden /> Le public donne son avis
              </h2>
              <p className="mt-2 text-gw-texte-doux">
                L&apos;organisateur hésite encore. Réagissez aux propositions : les plus soutenues l&apos;aideront à décider.
              </p>
              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {propositions.map((p) => (
                  <CarteProposition key={p.id} proposition={p} part={parts.get(p.id) ?? 0} />
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <CarteBilletterie evenement={evenement} tarifs={tarifs} etat={etat} />
        </aside>
      </div>

      {/* mobile : barre de réservation toujours visible */}
      {etat.type === "ouverte" && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-gw-bordure bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
          <p className="text-sm text-gw-texte-doux">
            À partir de <span className="font-titre block text-lg font-bold text-gw-nuit">{ariary(etat.prixMin)}</span>
          </p>
          <Link
            href={`/evenements/${evenement.id}/reserver`}
            className="inline-flex h-11 items-center rounded-full bg-gw-rose-action px-6 font-semibold text-white hover:bg-gw-rose-action-fonce"
          >
            Réserver
          </Link>
        </div>
      )}
    </div>
  )
}
