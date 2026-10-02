"use client"

import { useState } from "react"
import QRCode from "react-qr-code"
import { toast } from "sonner"
import { CalendarDays, CheckCircle2, Download, Loader2, MailCheck, MapPin, Ticket } from "lucide-react"
import type { BilletParticipant } from "@/types"
import { cn } from "@/utils"
import { renvoyerBillet, telechargerBilletPdf } from "@/services/billetterieService"
import { ariary, dateEvenement, operateur } from "@/lib/billetterie"

/*
 * Billet électronique à l'écran : talon sombre avec les informations, souche blanche avec
 * le QR code à présenter à l'entrée (le même que sur le PDF et dans l'e-mail).
 */

export function CarteBillet({
  billet,
  numeroDansLot,
  compact = false,
}: {
  billet: BilletParticipant
  /** 'Billet 2 sur 3' dans un lot */
  numeroDansLot?: { index: number; total: number }
  /** QR plus petit (liste 'Mes billets') */
  compact?: boolean
}) {
  const [occupe, setOccupe] = useState<"pdf" | "email" | null>(null)
  const passe = new Date(billet.evenement_date).getTime() < Date.now() - 6 * 3600_000
  const op = operateur(billet.mode_paiement)

  const telecharger = async () => {
    setOccupe("pdf")
    try {
      await telechargerBilletPdf(billet.reservation_id, billet.numero_billet)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Le billet n'a pas pu être téléchargé.")
    } finally {
      setOccupe(null)
    }
  }

  const renvoyer = async () => {
    setOccupe("email")
    try {
      const r = await renvoyerBillet(billet.reservation_id)
      toast.success(r.message)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Le billet n'a pas pu être renvoyé.")
    } finally {
      setOccupe(null)
    }
  }

  const action =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-gw-violet disabled:opacity-60"

  return (
    <article
      className={cn(
        "relative grid overflow-hidden rounded-3xl bg-white shadow-[0_24px_48px_-28px_rgba(30,26,60,0.55)] ring-1 ring-gw-bordure sm:grid-cols-[1fr_auto]",
        (billet.utilise || passe) && "opacity-90",
      )}
    >
      {/* talon : informations */}
      <div className="relative bg-gw-nuit p-6 text-white sm:p-7">
        <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#6C5CE7,#E8479A)]" />
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1">
            <Ticket className="h-3.5 w-3.5" aria-hidden /> {billet.categorie_nom}
          </span>
          {numeroDansLot && numeroDansLot.total > 1 && (
            <span className="rounded-full bg-white/12 px-2.5 py-1">
              Billet {numeroDansLot.index} sur {numeroDansLot.total}
            </span>
          )}
          {billet.utilise ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-1 text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Utilisé à l&apos;entrée
            </span>
          ) : passe ? (
            <span className="rounded-full bg-white/12 px-2.5 py-1 text-white/70">Événement terminé</span>
          ) : null}
        </div>

        <h3 className="font-titre mt-4 text-2xl leading-tight font-bold tracking-[-0.02em]">{billet.evenement_titre}</h3>
        <p className="mt-3 flex items-start gap-2 text-sm text-white/85">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-gw-lavande" aria-hidden />
          <span>{dateEvenement(billet.evenement_date)}</span>
        </p>
        {billet.lieu && (
          <p className="mt-1.5 flex items-start gap-2 text-sm text-white/85">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gw-lavande" aria-hidden />
            {billet.lieu}
          </p>
        )}

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-white/15 pt-4 text-sm">
          <div>
            <dt className="text-xs text-white/60">Prix</dt>
            <dd className="font-semibold">{ariary(billet.prix)}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/60">Payé avec</dt>
            <dd className="font-semibold">{op ? op.nom : "-"}</dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={telecharger} disabled={!!occupe} className={cn(action, "bg-white text-gw-nuit hover:bg-gw-lavande")}>
            {occupe === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Download className="h-3.5 w-3.5" aria-hidden />}
            Télécharger le PDF
          </button>
          <button type="button" onClick={renvoyer} disabled={!!occupe} className={cn(action, "bg-white/10 text-white hover:bg-white/20")}>
            {occupe === "email" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <MailCheck className="h-3.5 w-3.5" aria-hidden />}
            Renvoyer par e-mail
          </button>
        </div>
      </div>

      {/* souche : QR code, séparée par des pointillés et deux encoches */}
      <div className="relative flex flex-col items-center justify-center gap-3 border-t-2 border-dashed border-gw-bordure px-6 py-6 sm:border-t-0 sm:border-l-2 sm:px-7">
        <span aria-hidden className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-gw-fond sm:-top-3 sm:-left-3" />
        <span aria-hidden className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-gw-fond sm:top-auto sm:-bottom-3 sm:-left-3 sm:right-auto" />
        {billet.qr_code ? (
          <div className={cn("relative rounded-2xl bg-white p-2", billet.utilise && "opacity-40")}>
            <QRCode value={billet.qr_code} size={compact ? 132 : 168} level="M" aria-label={`QR code du billet ${billet.numero_billet}`} />
          </div>
        ) : null}
        <p className="font-mono text-xs font-semibold tracking-wider text-gw-nuit">{billet.numero_billet}</p>
        <p className="max-w-[11rem] text-center text-xs text-gw-texte-doux">
          {billet.utilise
            ? billet.date_scan
              ? `Scanné à l'entrée le ${new Date(billet.date_scan).toLocaleDateString("fr-FR")} à ${new Date(billet.date_scan).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}.`
              : "Ce billet a déjà été scanné."
            : "Présentez ce QR code à l'entrée, sur votre téléphone ou imprimé."}
        </p>
      </div>
    </article>
  )
}
