"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import {
  ArrowLeft,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Info,
  Loader2,
  MailCheck,
  MailWarning,
  MapPin,
  Minus,
  Plus,
  Smartphone,
  Ticket,
} from "lucide-react"
import type { BilletParticipant, Evenement, Lieu, ModePaiement, PaiementLotConfirme, TarifDisponible } from "@/types"
import { cn } from "@/utils"
import { fetchEvenementById } from "@/services/evenementService"
import { fetchLieux } from "@/services/referentielService"
import { fetchParticipantMe } from "@/services/participantService"
import { annulerReservation, fetchMesBillets, fetchTarifs, payerLot, reserverLot } from "@/services/billetterieService"
import { estPasse } from "@/lib/evenements"
import { imageTestEvenement, urlMedia } from "@/lib/media"
import {
  OPERATEURS,
  QUANTITE_MAX,
  ariary,
  dateEvenement,
  erreurTelephone,
  formaterTelephone,
  normaliserTelephone,
  operateur,
  pluriel,
} from "@/lib/billetterie"
import { VerificationEmail } from "@/components/auth/verification-email"
import { CarteBillet } from "@/components/billetterie/carte-billet"

/*
 * Réservation en trois étapes :
 *  1. Billets : tarif et nombre de billets (sans limite autre que les places restantes) -> les places sont gardées 15 minutes ;
 *  2. Paiement : Mobile Money SIMULÉ (MVola, Orange Money, Airtel Money) : aucun opérateur
 *     n'est contacté, le numéro est seulement contrôlé ;
 *  3. Billets : QR codes à l'écran, PDF, et envoi par e-mail.
 * « ?reservations=12,13 » reprend le paiement d'un lot déjà réservé (depuis « Mes billets »).
 */

type Etape = "billets" | "paiement" | "confirmation"

interface Lot {
  ids: number[]
  tarif: string
  prixUnitaire: number
  total: number
  expireLe: number
}

const ETAPES: { cle: Etape; libelle: string }[] = [
  { cle: "billets", libelle: "Billets" },
  { cle: "paiement", libelle: "Paiement" },
  { cle: "confirmation", libelle: "Confirmation" },
]

/** Durée de la simulation « validez sur votre téléphone » */
const DUREE_SIMULATION = 2600

function Etapes({ courante }: { courante: Etape }) {
  const index = ETAPES.findIndex((e) => e.cle === courante)
  return (
    <ol className="flex items-center gap-2 sm:gap-3" aria-label="Étapes de la réservation">
      {ETAPES.map((e, i) => {
        // à la confirmation, toutes les étapes sont terminées
        const faite = i < index || courante === "confirmation"
        const active = i === index && !faite
        return (
          <li key={e.cle} className="flex flex-1 items-center gap-2 sm:gap-3" aria-current={active ? "step" : undefined}>
            <span
              className={cn(
                "grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold",
                faite && "bg-emerald-600 text-white",
                active && "bg-gw-nuit text-white ring-4 ring-gw-lavande",
                !faite && !active && "bg-white text-gw-texte-pale ring-1 ring-gw-bordure",
              )}
            >
              {faite ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn("text-sm font-semibold", active ? "text-gw-nuit" : "text-gw-texte-doux", !active && "hidden sm:inline")}>
              {e.libelle}
            </span>
            {i < ETAPES.length - 1 && <span aria-hidden className={cn("h-0.5 flex-1 rounded", faite ? "bg-emerald-600" : "bg-gw-bordure")} />}
          </li>
        )
      })}
    </ol>
  )
}

function Compteur({ expireLe }: { expireLe: number }) {
  const [reste, setReste] = useState(() => Math.max(0, expireLe - Date.now()))
  useEffect(() => {
    const t = window.setInterval(() => setReste(Math.max(0, expireLe - Date.now())), 1000)
    return () => window.clearInterval(t)
  }, [expireLe])
  const min = Math.floor(reste / 60000)
  const sec = Math.floor((reste % 60000) / 1000)
  if (reste === 0)
    return (
      <p className="flex items-start gap-2 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        Le délai de 15 minutes est dépassé : vos places ne sont plus garanties. Vous pouvez tout de même payer s&apos;il en reste.
      </p>
    )
  return (
    <p className={cn("flex items-center gap-2 rounded-2xl px-4 py-3 text-sm", min < 3 ? "bg-amber-50 text-amber-900" : "bg-gw-fond text-gw-texte")}>
      <Clock className="h-4 w-4 shrink-0" aria-hidden />
      Vos places sont gardées encore
      <strong className="font-mono text-base tabular-nums" aria-live="off">
        {String(min).padStart(2, "0")}:{String(sec).padStart(2, "0")}
      </strong>
    </p>
  )
}

/** Au-delà, la confirmation renvoie vers « Mes billets » plutôt que d'afficher tous les QR codes. */
const BILLETS_AFFICHES = 10

/** Raccourcis proposés sous le compteur (seulement ceux qui tiennent dans les places restantes). */
const RACCOURCIS = [1, 2, 5, 10, 20, 50, 100]

function ChoixQuantite({ valeur, max, onChange }: { valeur: number; max: number; onChange: (n: number) => void }) {
  // saisie libre : on garde le texte tapé (même vide) et on ne corrige qu'à la sortie du champ
  const [texte, setTexte] = useState(String(valeur))
  useEffect(() => setTexte(String(valeur)), [valeur])
  const bouton =
    "grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-gw-nuit ring-1 ring-gw-bordure hover:ring-gw-violet disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-gw-violet"
  const valider = (t: string) => {
    const n = Math.floor(Number(t))
    if (Number.isFinite(n) && n >= 1) onChange(Math.min(max, n))
    else setTexte(String(valeur))
  }
  const raccourcis = RACCOURCIS.filter((n) => n <= max)
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-2" role="group" aria-label="Nombre de billets">
        <button type="button" className={bouton} onClick={() => onChange(valeur - 1)} disabled={valeur <= 1} aria-label="Un billet de moins">
          <Minus className="h-4 w-4" aria-hidden />
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={max}
          value={texte}
          onChange={(e) => {
            setTexte(e.target.value)
            const n = Math.floor(Number(e.target.value))
            if (e.target.value !== "" && Number.isFinite(n) && n >= 1) onChange(Math.min(max, n))
          }}
          onBlur={(e) => valider(e.target.value)}
          aria-label="Nombre de billets (saisie libre)"
          className="font-titre h-10 w-20 [appearance:textfield] rounded-xl bg-white text-center text-xl font-bold text-gw-nuit tabular-nums ring-1 ring-gw-bordure focus:ring-2 focus:ring-gw-violet focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <button type="button" className={bouton} onClick={() => onChange(valeur + 1)} disabled={valeur >= max} aria-label="Un billet de plus">
          <Plus className="h-4 w-4" aria-hidden />
        </button>
      </div>
      {raccourcis.length > 1 && (
        <div className="flex flex-wrap justify-end gap-1.5" aria-label="Choix rapide">
          {raccourcis.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-pressed={valeur === n}
              className={
                valeur === n
                  ? "rounded-full bg-gw-nuit px-3 py-1 text-xs font-semibold text-white"
                  : "rounded-full bg-white px-3 py-1 text-xs font-semibold text-gw-nuit ring-1 ring-gw-bordure hover:ring-gw-violet"
              }
            >
              {n}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function Recapitulatif({ evenement, lieu, lignes }: { evenement: Evenement; lieu?: Lieu; lignes?: { libelle: string; montant: number }[] }) {
  const [erreurImage, setErreurImage] = useState(false)
  const affiche = urlMedia(evenement.image_url) ?? imageTestEvenement(evenement)
  const total = lignes?.reduce((s, l) => s + l.montant, 0)
  return (
    <div className="overflow-hidden rounded-3xl bg-white ring-1 ring-gw-bordure">
      <div className="aspect-[2/1] bg-gw-nuit">
        {!erreurImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={affiche} alt="" onError={() => setErreurImage(true)} className="h-full w-full object-cover" />
        ) : (
          <div className="scene h-full w-full" />
        )}
      </div>
      <div className="p-5">
        <p className="font-titre text-lg leading-snug font-bold text-gw-nuit">{evenement.titre}</p>
        <p className="mt-2 flex items-start gap-2 text-sm text-gw-texte">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-gw-violet" aria-hidden />
          <span>{dateEvenement(evenement.date_debut)}</span>
        </p>
        {lieu && (
          <p className="mt-1 flex items-start gap-2 text-sm text-gw-texte">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gw-violet" aria-hidden />
            {[lieu.nom, lieu.ville].filter(Boolean).join(", ")}
          </p>
        )}
        {lignes && lignes.length > 0 && (
          <dl className="mt-4 space-y-1.5 border-t border-gw-bordure pt-4 text-sm">
            {lignes.map((l) => (
              <div key={l.libelle} className="flex justify-between gap-3">
                <dt className="text-gw-texte">{l.libelle}</dt>
                <dd className="font-semibold text-gw-nuit">{ariary(l.montant)}</dd>
              </div>
            ))}
            <div className="flex justify-between gap-3 border-t border-gw-bordure pt-2.5 text-base">
              <dt className="font-semibold text-gw-nuit">Total</dt>
              <dd className="font-titre text-xl font-bold text-gw-nuit">{ariary(total ?? 0)}</dd>
            </div>
          </dl>
        )}
      </div>
    </div>
  )
}

const boutonPrincipal =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gw-rose-action px-7 font-semibold text-white shadow-[0_12px_24px_-12px_rgba(201,42,122,0.8)] transition-colors hover:bg-gw-rose-action-fonce focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gw-violet disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"

export default function ReservationFlow({ evenementId }: { evenementId: number }) {
  const router = useRouter()
  const params = useSearchParams()
  const [evenement, setEvenement] = useState<Evenement | null>(null)
  const [lieu, setLieu] = useState<Lieu>()
  const [tarifs, setTarifs] = useState<TarifDisponible[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreurChargement, setErreurChargement] = useState<string | null>(null)
  const [emailVerifie, setEmailVerifie] = useState<boolean | null>(null)
  const [email, setEmail] = useState<string>()

  const [etape, setEtape] = useState<Etape>("billets")
  const [tarifId, setTarifId] = useState<number | null>(null)
  const [quantite, setQuantite] = useState(1)
  const [lot, setLot] = useState<Lot | null>(null)
  const [mode, setMode] = useState<ModePaiement | null>(null)
  const [telephone, setTelephone] = useState("")
  const [telephoneTouche, setTelephoneTouche] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [simulation, setSimulation] = useState(false)
  const [erreur, setErreur] = useState("")
  const [resultat, setResultat] = useState<PaiementLotConfirme | null>(null)
  const haut = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let actif = true
    const ids = (params.get("reservations") ?? "")
      .split(",")
      .map(Number)
      .filter((n) => Number.isInteger(n) && n > 0)
    Promise.allSettled([
      fetchEvenementById(evenementId),
      fetchTarifs(evenementId),
      fetchLieux(),
      fetchParticipantMe(),
      ids.length ? fetchMesBillets() : Promise.resolve([] as BilletParticipant[]),
    ]).then(([ev, ta, li, me, mb]) => {
      if (!actif) return
      if (ev.status !== "fulfilled") {
        setErreurChargement("Cet événement est introuvable.")
        setChargement(false)
        return
      }
      setEvenement(ev.value)
      if (ta.status === "fulfilled") {
        setTarifs(ta.value)
        const premier = ta.value.find((t) => t.restantes == null || t.restantes > 0)
        if (premier) setTarifId(premier.id)
      }
      if (li.status === "fulfilled") setLieu(li.value.find((l) => l.id === ev.value.lieu_id))
      if (me.status === "fulfilled") {
        setEmailVerifie(me.value.email_verifie)
        setEmail(me.value.email)
        // numéro du profil proposé d'office pour le paiement Mobile Money
        if (me.value.telephone) setTelephone((t) => t || me.value.telephone || "")
      } else setEmailVerifie(true) // l'API refusera de toute façon si besoin
      // reprise d'un lot non payé
      if (mb.status === "fulfilled" && ids.length) {
        const enAttente = mb.value.filter((b) => ids.includes(b.reservation_id) && b.statut === "en_attente" && b.evenement_id === evenementId)
        if (enAttente.length) {
          setLot({
            ids: enAttente.map((b) => b.reservation_id),
            tarif: enAttente[0].categorie_nom,
            prixUnitaire: enAttente[0].prix,
            total: enAttente.reduce((s, b) => s + b.prix, 0),
            expireLe: Math.min(...enAttente.map((b) => (b.expire_le ? +new Date(b.expire_le) : Date.now()))),
          })
          setEtape("paiement")
        }
      }
      setChargement(false)
    })
    return () => {
      actif = false
    }
  }, [evenementId, params])

  const tarif = tarifs.find((t) => t.id === tarifId)
  const maxQuantite = Math.min(QUANTITE_MAX, tarif?.restantes ?? QUANTITE_MAX)
  const erreurTel = mode ? erreurTelephone(mode, telephone) : null
  const op = operateur(mode)

  const allerA = (e: Etape) => {
    setEtape(e)
    setErreur("")
    haut.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const lignes = useMemo(() => {
    if (lot) return [{ libelle: `${lot.ids.length} × ${lot.tarif}`, montant: lot.total }]
    if (tarif) return [{ libelle: `${quantite} × ${tarif.nom}`, montant: tarif.prix * quantite }]
    return []
  }, [lot, tarif, quantite])

  const reserver = async () => {
    if (!tarif) return
    setEnvoi(true)
    setErreur("")
    try {
      const r = await reserverLot(evenementId, tarif.id, quantite)
      setLot({
        ids: r.reservations.map((x) => x.id),
        tarif: r.categorie_nom,
        prixUnitaire: tarif.prix,
        total: r.montant_total,
        expireLe: Math.min(...r.reservations.map((x) => +new Date(x.expire_le))),
      })
      allerA("paiement")
    } catch (e) {
      const message = e instanceof Error ? e.message : "La réservation n'a pas abouti."
      if (message.startsWith("EMAIL_NON_VERIFIE")) setEmailVerifie(false)
      else setErreur(message)
      fetchTarifs(evenementId).then(setTarifs).catch(() => undefined)
    } finally {
      setEnvoi(false)
    }
  }

  const payer = async () => {
    setTelephoneTouche(true)
    if (!lot || !mode || erreurTel) return
    setEnvoi(true)
    setErreur("")
    setSimulation(true)
    try {
      // simulation : le temps de « valider sur le téléphone »
      const [r] = await Promise.all([payerLot(lot.ids, mode, normaliserTelephone(telephone)), new Promise((ok) => setTimeout(ok, DUREE_SIMULATION))])
      setResultat(r)
      allerA("confirmation")
      toast.success("Paiement accepté : vos billets sont prêts.")
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le paiement n'a pas abouti.")
    } finally {
      setSimulation(false)
      setEnvoi(false)
    }
  }

  const abandonner = async () => {
    if (!lot) return
    setEnvoi(true)
    try {
      await Promise.all(lot.ids.map((id) => annulerReservation(id)))
      toast.success("Réservation annulée : les places sont libérées.")
    } catch {
      // déjà payée ou supprimée : on revient simplement au choix
    } finally {
      setLot(null)
      setEnvoi(false)
      router.replace(`/evenements/${evenementId}/reserver`)
      fetchTarifs(evenementId).then(setTarifs).catch(() => undefined)
      allerA("billets")
    }
  }

  if (chargement) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-gw-texte-doux">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement de la billetterie…
      </div>
    )
  }

  if (erreurChargement || !evenement) {
    return (
      <div className="py-24 text-center">
        <p className="font-titre text-2xl font-bold text-gw-nuit">{erreurChargement}</p>
        <Link href="/evenements" className="mt-4 inline-block font-semibold text-gw-violet">
          Voir les événements
        </Link>
      </div>
    )
  }

  const fermee = estPasse(evenement) || evenement.statut_validation !== "valide"
  const ouverts = tarifs.filter((t) => t.restantes == null || t.restantes > 0)

  return (
    <div ref={haut} className="scroll-mt-24">
      <Link href={`/evenements/${evenementId}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gw-texte-doux hover:text-gw-nuit">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Retour à l&apos;événement
      </Link>
      <h1 className="font-titre mt-3 text-3xl font-bold tracking-[-0.02em] text-gw-nuit sm:text-4xl">
        {etape === "confirmation" ? "Vos billets" : "Réserver mes billets"}
      </h1>
      <div className="mt-6 max-w-xl">
        <Etapes courante={etape} />
      </div>

      <div className={cn("mt-8 grid gap-8", etape !== "confirmation" && "lg:grid-cols-[1fr_20rem]")}>
        <div className="min-w-0">
          {/* ——— 1. Billets ——— */}
          {etape === "billets" && emailVerifie === false && (
            <section className="rounded-3xl bg-white p-6 ring-1 ring-gw-bordure sm:p-8">
              <p className="mb-6 flex items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <MailWarning className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                Avant de réserver, confirmez votre adresse e-mail : c&apos;est là que vous recevrez vos billets et leurs QR codes.
              </p>
              <VerificationEmail email={email} envoyerAuDemarrage onConfirme={() => setEmailVerifie(true)} />
            </section>
          )}

          {etape === "billets" && emailVerifie !== false && (
            <section className="rounded-3xl bg-white p-6 ring-1 ring-gw-bordure sm:p-8" aria-labelledby="titre-tarifs">
              <h2 id="titre-tarifs" className="font-titre text-xl font-bold text-gw-nuit">
                Choisissez vos billets
              </h2>

              {fermee ? (
                <p className="mt-4 rounded-2xl bg-gw-fond px-4 py-3 text-sm text-gw-texte">La billetterie de cet événement est fermée.</p>
              ) : tarifs.length === 0 ? (
                <p className="mt-4 rounded-2xl bg-gw-fond px-4 py-3 text-sm text-gw-texte">Les tarifs ne sont pas encore annoncés.</p>
              ) : ouverts.length === 0 ? (
                <p className="mt-4 rounded-2xl bg-gw-fond px-4 py-3 text-sm text-gw-texte">Complet : toutes les places ont été vendues.</p>
              ) : (
                <>
                  <div className="mt-5 space-y-3" role="radiogroup" aria-label="Tarif">
                    {tarifs.map((t) => {
                      const complet = t.restantes === 0
                      const choisi = t.id === tarifId
                      return (
                        <div
                          key={t.id}
                          className={cn(
                            "rounded-2xl p-4 ring-1 transition-shadow",
                            choisi ? "bg-gw-fond ring-2 ring-gw-violet" : "ring-gw-bordure",
                            complet && "opacity-55",
                          )}
                        >
                          <button
                            type="button"
                            role="radio"
                            aria-checked={choisi}
                            disabled={complet}
                            onClick={() => {
                              setTarifId(t.id)
                              setQuantite((q) => Math.min(q, Math.min(QUANTITE_MAX, t.restantes ?? QUANTITE_MAX)))
                            }}
                            className="flex w-full items-center gap-4 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gw-violet disabled:cursor-not-allowed"
                          >
                            <span
                              aria-hidden
                              className={cn("grid h-5 w-5 shrink-0 place-items-center rounded-full ring-2", choisi ? "bg-gw-violet ring-gw-violet" : "ring-gw-texte-pale")}
                            >
                              {choisi && <span className="h-2 w-2 rounded-full bg-white" />}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block font-semibold text-gw-nuit">{t.nom}</span>
                              <span className={cn("text-xs", t.restantes != null && t.restantes <= 20 ? "font-semibold text-gw-rose-action" : "text-gw-texte-doux")}>
                                {complet
                                  ? "Complet"
                                  : t.restantes == null
                                    ? "Disponible"
                                    : t.restantes === 1
                                      ? "Dernière place"
                                      : `${t.restantes.toLocaleString("fr-FR")} places restantes`}
                              </span>
                            </span>
                            <span className="font-titre text-lg font-bold text-gw-nuit">{ariary(t.prix)}</span>
                          </button>
                          {choisi && (
                            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gw-bordure pt-4">
                              <span className="text-sm text-gw-texte">
                                Nombre de billets{" "}
                                <span className="text-gw-texte-doux">
                                  ({t.restantes == null ? "sans limite" : `${t.restantes.toLocaleString("fr-FR")} place${t.restantes > 1 ? "s" : ""} restante${t.restantes > 1 ? "s" : ""}`})
                                </span>
                              </span>
                              <ChoixQuantite valeur={quantite} max={maxQuantite} onChange={(n) => setQuantite(Math.max(1, Math.min(maxQuantite, n)))} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {erreur && (
                    <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                      {erreur}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                    <p className="flex items-center gap-2 text-sm text-gw-texte-doux">
                      <Info className="h-4 w-4" aria-hidden /> Un billet et un QR code par personne.
                    </p>
                    <button type="button" onClick={reserver} disabled={!tarif || envoi} className={boutonPrincipal}>
                      {envoi && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                      Continuer vers le paiement
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {/* ——— 2. Paiement ——— */}
          {etape === "paiement" && lot && (
            <section className="relative rounded-3xl bg-white p-6 ring-1 ring-gw-bordure sm:p-8" aria-labelledby="titre-paiement">
              <h2 id="titre-paiement" className="font-titre text-xl font-bold text-gw-nuit">
                Payer par Mobile Money
              </h2>
              <div className="mt-4">
                <Compteur expireLe={lot.expireLe} />
              </div>

              <fieldset className="mt-6">
                <legend className="mb-3 text-sm font-semibold text-gw-nuit">Opérateur</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                  {OPERATEURS.map((o) => {
                    const choisi = mode === o.mode
                    return (
                      <label
                        key={o.mode}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-2xl p-3.5 ring-1 transition-shadow has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gw-violet",
                          choisi ? "bg-gw-fond ring-2 ring-gw-violet" : "ring-gw-bordure hover:ring-gw-lavande",
                        )}
                      >
                        <input
                          type="radio"
                          name="operateur"
                          value={o.mode}
                          checked={choisi}
                          onChange={() => setMode(o.mode)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-[11px] leading-none font-extrabold"
                          style={{ backgroundColor: o.couleur, color: o.texte }}
                        >
                          {o.nom
                            .split(" ")
                            .map((m) => m[0])
                            .join("")}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-gw-nuit">{o.nom}</span>
                          <span className="text-xs text-gw-texte-doux">{o.prefixes.join(" · ")}</span>
                        </span>
                        {choisi && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-gw-violet" aria-hidden />}
                      </label>
                    )
                  })}
                </div>
              </fieldset>

              {mode && op && (
                <div className="mt-6">
                  <label htmlFor="telephone" className="text-sm font-semibold text-gw-nuit">
                    Numéro {op.nom}
                  </label>
                  <div
                    className={cn(
                      "mt-2 flex h-12 items-center overflow-hidden rounded-2xl bg-gw-fond ring-1 focus-within:bg-white focus-within:ring-2",
                      telephoneTouche && erreurTel ? "ring-gw-rose-action focus-within:ring-gw-rose-action" : "ring-gw-bordure focus-within:ring-gw-violet",
                    )}
                  >
                    <span className="flex h-full items-center gap-1.5 border-r border-gw-bordure px-3 text-sm font-semibold text-gw-texte-doux">
                      <Smartphone className="h-4 w-4" aria-hidden /> +261
                    </span>
                    <input
                      id="telephone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder={op.exemple}
                      value={telephone}
                      onChange={(e) => setTelephone(formaterTelephone(e.target.value))}
                      onBlur={() => setTelephoneTouche(true)}
                      aria-invalid={telephoneTouche && !!erreurTel}
                      aria-describedby="aide-telephone"
                      className="h-full min-w-0 flex-1 bg-transparent px-3 font-mono text-base tracking-wide text-gw-nuit outline-none"
                    />
                  </div>
                  <p id="aide-telephone" className={cn("mt-2 text-xs", telephoneTouche && erreurTel ? "text-gw-rose-action" : "text-gw-texte-doux")}>
                    {telephoneTouche && erreurTel ? erreurTel : `La demande de paiement sera envoyée sur ce numéro.`}
                  </p>
                </div>
              )}

              <p className="mt-6 flex items-start gap-2 rounded-2xl border border-dashed border-gw-lavande bg-gw-fond/60 px-4 py-3 text-xs text-gw-texte">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-gw-violet" aria-hidden />
                <span>
                  <strong className="font-semibold text-gw-nuit">Paiement simulé.</strong> Aucun opérateur n&apos;est contacté et aucun montant n&apos;est débité : le
                  paiement est accepté dès que le numéro correspond à l&apos;opérateur choisi.
                </span>
              </p>

              {erreur && (
                <p role="alert" className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erreur}
                </p>
              )}

              <div className="mt-6 flex flex-wrap-reverse items-center justify-between gap-4">
                <button type="button" onClick={abandonner} disabled={envoi} className="text-sm font-semibold text-gw-texte-doux hover:text-gw-rose-action disabled:opacity-50">
                  Annuler la réservation
                </button>
                <button type="button" onClick={payer} disabled={!mode || envoi} className={boutonPrincipal}>
                  {envoi && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Payer {ariary(lot.total)}
                </button>
              </div>

              {/* simulation : demande envoyée sur le téléphone */}
              {simulation && op && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-white/90 p-6 backdrop-blur-sm" role="status" aria-live="polite">
                  <div className="max-w-xs text-center">
                    <span
                      className="mx-auto grid h-16 w-16 place-items-center rounded-2xl text-sm font-extrabold"
                      style={{ backgroundColor: op.couleur, color: op.texte }}
                      aria-hidden
                    >
                      <Smartphone className="h-7 w-7" />
                    </span>
                    <p className="font-titre mt-4 text-lg font-bold text-gw-nuit">Validez sur votre téléphone</p>
                    <p className="mt-1 text-sm text-gw-texte">
                      Demande de paiement {op.nom} de <strong>{ariary(lot.total)}</strong> envoyée au{" "}
                      <span className="font-mono whitespace-nowrap">{formaterTelephone(telephone)}</span>.
                    </p>
                    <p className="mt-4 inline-flex items-center gap-2 text-xs text-gw-texte-doux">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> En attente de confirmation (simulation)…
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* ——— 3. Confirmation ——— */}
          {etape === "confirmation" && resultat && (
            <section aria-labelledby="titre-confirmation">
              <div className="flex flex-col gap-5 rounded-3xl bg-emerald-50 p-6 ring-1 ring-emerald-200 sm:flex-row sm:items-center sm:p-8">
                <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
                  <Check className="h-7 w-7" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 id="titre-confirmation" className="font-titre text-2xl font-bold text-emerald-950">
                    Paiement accepté
                  </h2>
                  <p className="mt-1 text-sm text-emerald-900">
                    {ariary(resultat.montant_total)} payés avec {operateur(resultat.mode_paiement)?.nom} · référence{" "}
                    <span className="font-mono font-semibold">{resultat.reference}</span>
                  </p>
                  <p className="mt-2 flex items-start gap-2 text-sm text-emerald-900">
                    <MailCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      {resultat.billets.length > 1 ? "Vos billets ont été envoyés" : "Votre billet a été envoyé"} à <strong>{resultat.email}</strong> (PDF
                      en pièce jointe). Pensez à regarder dans les indésirables.
                    </span>
                  </p>
                </div>
              </div>

              <h3 className="font-titre mt-10 flex items-center gap-2 text-xl font-bold text-gw-nuit">
                <Ticket className="h-5 w-5 text-gw-violet" aria-hidden /> {pluriel(resultat.billets.length, "billet")}
              </h3>
              <div className="mt-4 space-y-6">
                {resultat.billets.slice(0, BILLETS_AFFICHES).map((b, i) => (
                  <CarteBillet key={b.reservation_id} billet={b} numeroDansLot={{ index: i + 1, total: resultat.billets.length }} />
                ))}
              </div>

              {resultat.billets.length > BILLETS_AFFICHES && (
                <p className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-gw-texte ring-1 ring-gw-bordure">
                  … et {resultat.billets.length - BILLETS_AFFICHES} autres billets, tous dans votre e-mail et dans « Mes billets ».
                </p>
              )}

              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/participants/mes-reservations" className={boutonPrincipal}>
                  Voir tous mes billets
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    // nouvel achat dans la même session : pas besoin de se reconnecter
                    setResultat(null)
                    setLot(null)
                    setMode(null)
                    setTelephone("")
                    setTelephoneTouche(false)
                    setQuantite(1)
                    router.replace(`/evenements/${evenementId}/reserver`)
                    fetchTarifs(evenementId).then(setTarifs).catch(() => undefined)
                    allerA("billets")
                  }}
                  className="inline-flex h-12 items-center gap-2 rounded-full px-6 font-semibold text-gw-nuit ring-1 ring-gw-bordure hover:bg-white"
                >
                  <Plus className="h-4 w-4" aria-hidden /> Acheter d&apos;autres billets
                </button>
                <Link
                  href={`/evenements/${evenementId}`}
                  className="inline-flex h-12 items-center rounded-full px-6 font-semibold text-gw-nuit ring-1 ring-gw-bordure hover:bg-white"
                >
                  Retour à l&apos;événement
                </Link>
              </div>
            </section>
          )}
        </div>

        {etape !== "confirmation" && (
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Recapitulatif evenement={evenement} lieu={lieu} lignes={emailVerifie === false || fermee ? undefined : lignes} />
          </aside>
        )}
      </div>
    </div>
  )
}
