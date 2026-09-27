"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { CalendarDays, Clock, Loader2, MapPin, Ticket, TicketX } from "lucide-react"
import type { BilletParticipant } from "@/types"
import { cn } from "@/utils"
import { annulerReservation, fetchMesBillets } from "@/services/billetterieService"
import { ariary, dateEvenement, pluriel } from "@/lib/billetterie"
import { CarteBillet } from "@/components/billetterie/carte-billet"

/*
 * « Mes billets » : réservations à payer (gardées 15 minutes), puis billets payés regroupés
 * par événement, avec leurs QR codes, le PDF et le renvoi par e-mail.
 */

type Onglet = "a-venir" | "passes"

interface Groupe {
  cle: string
  evenementId: number
  titre: string
  date: string
  lieu: string | null
  billets: BilletParticipant[]
}

/** Un événement est « passé » six heures après son début (la date de fin n'est pas renvoyée ici). */
const estPasse = (b: BilletParticipant) => new Date(b.evenement_date).getTime() < Date.now() - 6 * 3600_000

function grouper(billets: BilletParticipant[], cle: (b: BilletParticipant) => string): Groupe[] {
  const groupes = new Map<string, Groupe>()
  for (const b of billets) {
    const k = cle(b)
    if (!groupes.has(k))
      groupes.set(k, { cle: k, evenementId: b.evenement_id, titre: b.evenement_titre, date: b.evenement_date, lieu: b.lieu, billets: [] })
    groupes.get(k)!.billets.push(b)
  }
  return [...groupes.values()]
}

function minutesRestantes(b: BilletParticipant[]) {
  const fin = Math.min(...b.map((x) => (x.expire_le ? +new Date(x.expire_le) : Date.now())))
  return Math.max(0, Math.ceil((fin - Date.now()) / 60000))
}

function EnAttente({ groupe, onAnnule }: { groupe: Groupe; onAnnule: () => void }) {
  const [annulation, setAnnulation] = useState(false)
  const ids = groupe.billets.map((b) => b.reservation_id)
  const total = groupe.billets.reduce((s, b) => s + b.prix, 0)
  const minutes = minutesRestantes(groupe.billets)

  const annuler = async () => {
    setAnnulation(true)
    try {
      await Promise.all(ids.map((id) => annulerReservation(id)))
      toast.success("Réservation annulée.")
      onAnnule()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "L'annulation n'a pas abouti.")
      setAnnulation(false)
    }
  }

  return (
    <li className="flex flex-col gap-4 rounded-2xl bg-white p-5 ring-1 ring-amber-200 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <p className="font-titre truncate text-lg font-bold text-gw-nuit">{groupe.titre}</p>
        <p className="text-sm text-gw-texte">
          {groupe.billets.length} × {groupe.billets[0].categorie_nom} · <strong className="font-semibold">{ariary(total)}</strong>
        </p>
        <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-amber-800">
          <Clock className="h-3.5 w-3.5" aria-hidden />
          {minutes > 0 ? `Places gardées encore ${pluriel(minutes, "minute")}` : "Délai dépassé : places non garanties"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button type="button" onClick={annuler} disabled={annulation} className="text-sm font-semibold text-gw-texte-doux hover:text-gw-rose-action disabled:opacity-50">
          {annulation ? "Annulation…" : "Annuler"}
        </button>
        <Link
          href={`/evenements/${groupe.evenementId}/reserver?reservations=${ids.join(",")}`}
          className="inline-flex h-10 items-center rounded-full bg-gw-rose-action px-5 text-sm font-semibold text-white hover:bg-gw-rose-action-fonce"
        >
          Finaliser le paiement
        </Link>
      </div>
    </li>
  )
}

export function MesReservationsList() {
  const [billets, setBillets] = useState<BilletParticipant[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [onglet, setOnglet] = useState<Onglet>("a-venir")

  const charger = useCallback(() => {
    fetchMesBillets()
      .then((b) => {
        setBillets(b)
        setErreur(null)
      })
      .catch((e) => setErreur(e instanceof Error ? e.message : "Impossible de charger vos billets."))
      .finally(() => setChargement(false))
  }, [])

  useEffect(charger, [charger])

  const { attente, aVenir, passes } = useMemo(() => {
    const payes = billets.filter((b) => b.statut === "confirmee" && b.numero_billet)
    const parDate = (a: Groupe, b: Groupe) => +new Date(a.date) - +new Date(b.date)
    return {
      attente: grouper(
        billets.filter((b) => b.statut === "en_attente" && !estPasse(b)),
        (b) => `${b.evenement_id}-${b.categorie_nom}`,
      ),
      aVenir: grouper(payes.filter((b) => !estPasse(b)), (b) => String(b.evenement_id)).sort(parDate),
      passes: grouper(payes.filter(estPasse), (b) => String(b.evenement_id)).sort((a, b) => parDate(b, a)),
    }
  }, [billets])

  if (chargement) {
    return (
      <p className="flex items-center gap-2 py-16 text-gw-texte-doux">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement de vos billets…
      </p>
    )
  }
  if (erreur) return <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</p>

  const groupes = onglet === "a-venir" ? aVenir : passes
  const onglets: { cle: Onglet; libelle: string; nombre: number }[] = [
    { cle: "a-venir", libelle: "À venir", nombre: aVenir.reduce((s, g) => s + g.billets.length, 0) },
    { cle: "passes", libelle: "Passés", nombre: passes.reduce((s, g) => s + g.billets.length, 0) },
  ]

  return (
    <div>
      {attente.length > 0 && (
        <section aria-labelledby="titre-attente" className="mb-10 rounded-3xl bg-amber-50 p-5 sm:p-6">
          <h2 id="titre-attente" className="font-titre text-lg font-bold text-amber-950">
            Paiement à finaliser
          </h2>
          <p className="mt-1 text-sm text-amber-900">Ces places sont gardées 15 minutes après la réservation, le temps de payer.</p>
          <ul className="mt-4 space-y-3">
            {attente.map((g) => (
              <EnAttente key={g.cle} groupe={g} onAnnule={charger} />
            ))}
          </ul>
        </section>
      )}

      <div role="tablist" aria-label="Période" className="inline-flex rounded-full bg-white p-1 ring-1 ring-gw-bordure">
        {onglets.map((o) => (
          <button
            key={o.cle}
            type="button"
            role="tab"
            aria-selected={onglet === o.cle}
            onClick={() => setOnglet(o.cle)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              onglet === o.cle ? "bg-gw-nuit text-white" : "text-gw-texte-doux hover:text-gw-nuit",
            )}
          >
            {o.libelle} <span className={cn("ml-1 tabular-nums", onglet === o.cle ? "text-white/70" : "text-gw-texte-pale")}>{o.nombre}</span>
          </button>
        ))}
      </div>

      {groupes.length === 0 ? (
        <div className="mt-8 rounded-3xl bg-white px-6 py-14 text-center ring-1 ring-gw-bordure">
          <TicketX className="mx-auto h-10 w-10 text-gw-lavande" aria-hidden />
          <p className="font-titre mt-3 text-xl font-bold text-gw-nuit">{onglet === "a-venir" ? "Aucun billet à venir" : "Aucun événement passé"}</p>
          {onglet === "a-venir" && (
            <>
              <p className="mt-1 text-sm text-gw-texte-doux">Vos billets apparaîtront ici dès le paiement accepté.</p>
              <Link
                href="/evenements"
                className="mt-5 inline-flex h-11 items-center rounded-full bg-gw-rose-action px-6 text-sm font-semibold text-white hover:bg-gw-rose-action-fonce"
              >
                Découvrir les événements
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="mt-8 space-y-12">
          {groupes.map((g) => (
            <section key={g.cle} aria-label={g.titre}>
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/evenements/${g.evenementId}`} className="font-titre text-2xl font-bold text-gw-nuit hover:text-gw-violet">
                    {g.titre}
                  </Link>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gw-texte-doux">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4" aria-hidden /> {dateEvenement(g.date)}
                    </span>
                    {g.lieu && (
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-4 w-4" aria-hidden /> {g.lieu}
                      </span>
                    )}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-semibold text-gw-nuit ring-1 ring-gw-bordure">
                  <Ticket className="h-4 w-4 text-gw-violet" aria-hidden /> {pluriel(g.billets.length, "billet")}
                </span>
              </div>
              <div className="space-y-5">
                {g.billets.map((b, i) => (
                  <CarteBillet key={b.reservation_id} billet={b} compact numeroDansLot={{ index: i + 1, total: g.billets.length }} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
