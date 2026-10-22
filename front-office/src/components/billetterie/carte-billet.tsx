"use client"


import { t, dateSimple, heure } from "@/lib/i18n"
import { useRef, useState, type PointerEvent } from "react"
import QRCode from "react-qr-code"
import { toast } from "sonner"
import { CalendarDays, CheckCircle2, Download, Loader2, MailCheck, MapPin, RotateCcw, ScanLine, Ticket } from "lucide-react"
import type { BilletParticipant } from "@/types"
import { cn } from "@/utils"
import { renvoyerBillet, telechargerBilletPdf } from "@/services/billetterieService"
import { ariary, dateEvenement, operateur } from "@/lib/billetterie"
import { AjoutAgenda } from "@/components/ajout-agenda"

/*
 * Billet électronique à l'écran : talon sombre avec les informations, souche blanche avec
 * le QR code à présenter à l'entrée (le même que sur le PDF et dans l'e-mail).
 * Effet 3D : le billet s'incline en suivant la souris avec un reflet brillant, et le bouton
 * "Mode entrée" le retourne pour montrer au dos un grand QR code, plus facile à scanner.
 */

const INCLINAISON_MAX = 7 // degrés

export function CarteBillet({
  billet,
  numeroDansLot,
  compact = false,
}: {
  billet: BilletParticipant
  /** "Billet 2 sur 3" dans un lot */
  numeroDansLot?: { index: number; total: number }
  /** QR plus petit (liste "Mes billets") */
  compact?: boolean
}) {
  const [occupe, setOccupe] = useState<"pdf" | "email" | null>(null)
  const [retourne, setRetourne] = useState(false)
  const carte = useRef<HTMLDivElement>(null)
  const reflet = useRef<HTMLDivElement>(null)
  const passe = new Date(billet.evenement_date).getTime() < Date.now() - 6 * 3600_000
  const op = operateur(billet.mode_paiement)

  const telecharger = async () => {
    setOccupe("pdf")
    try {
      await telechargerBilletPdf(billet.reservation_id, billet.numero_billet)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("Le billet n'a pas pu être téléchargé."))
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
      toast.error(e instanceof Error ? e.message : t("Le billet n'a pas pu être renvoyé."))
    } finally {
      setOccupe(null)
    }
  }

  // inclinaison du billet sous la souris (désactivée si l'utilisateur préfère réduire les animations)
  const incliner = (e: PointerEvent<HTMLDivElement>) => {
    if (retourne || e.pointerType !== "mouse" || !carte.current) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    carte.current.style.transition = "transform 0.08s linear"
    carte.current.style.transform = `rotateX(${(0.5 - y) * INCLINAISON_MAX}deg) rotateY(${(x - 0.5) * INCLINAISON_MAX * 1.4}deg)`
    if (reflet.current) {
      reflet.current.style.opacity = "1"
      reflet.current.style.background = `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgba(255,255,255,0.28), transparent 45%)`
    }
  }
  const redresser = () => {
    if (!carte.current) return
    carte.current.style.transition = "transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1)"
    carte.current.style.transform = retourne ? "rotateY(180deg)" : ""
    if (reflet.current) reflet.current.style.opacity = "0"
  }
  const retourner = (v: boolean) => {
    setRetourne(v)
    if (carte.current) {
      carte.current.style.transition = "transform 0.7s cubic-bezier(0.2, 0.7, 0.2, 1)"
      carte.current.style.transform = v ? "rotateY(180deg)" : ""
    }
    if (reflet.current) reflet.current.style.opacity = "0"
  }

  const action =
    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-gw-violet disabled:opacity-60"

  return (
    <div className="[perspective:1400px]" onPointerMove={incliner} onPointerLeave={redresser} onKeyDown={(e) => e.key === "Escape" && retourne && retourner(false)}>
    <div ref={carte} className="relative [transform-style:preserve-3d]">
    <article
      aria-hidden={retourne}
      className={cn(
        "relative grid overflow-hidden rounded-3xl [backface-visibility:hidden] bg-gw-surface shadow-[0_24px_48px_-28px_rgba(42,26,94,0.55)] ring-1 ring-gw-bordure sm:grid-cols-[1fr_auto]",
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
            <span className="rounded-full bg-white/12 px-2.5 py-1">{t("Billet")}{" "}{numeroDansLot.index}{" "}{t("sur")}{" "}{numeroDansLot.total}
            </span>
          )}
          {billet.utilise ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-gw-violet/20 px-2.5 py-1 text-gw-lavande">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />{" "}{t("Utilisé à l'entrée")}</span>
          ) : passe ? (
            <span className="rounded-full bg-white/12 px-2.5 py-1 text-white/70">{t("Événement terminé")}</span>
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
            <dt className="text-xs text-white/60">{t("Prix")}</dt>
            <dd className="font-semibold">{ariary(billet.prix)}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/60">{t("Payé avec")}</dt>
            <dd className="font-semibold">{op ? op.nom : "-"}</dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={telecharger} disabled={!!occupe} className={cn(action, "bg-gw-surface text-gw-encre hover:bg-gw-lavande")}>
            {occupe === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Download className="h-3.5 w-3.5" aria-hidden />}{t("Télécharger le PDF")}</button>
          <button type="button" onClick={renvoyer} disabled={!!occupe} className={cn(action, "bg-white/10 text-white hover:bg-white/20")}>
            {occupe === "email" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <MailCheck className="h-3.5 w-3.5" aria-hidden />}{t("Renvoyer par e-mail")}</button>
          {!passe && !billet.utilise && (
            <AjoutAgenda
              variante="sombre"
              evenement={{
                titre: billet.evenement_titre,
                debut: billet.evenement_date,
                lieu: billet.lieu,
                description: t("Billet {numero} ({categorie})", { numero: billet.numero_billet ?? "", categorie: billet.categorie_nom }),
                lien: typeof window !== "undefined" ? `${window.location.origin}/evenements/${billet.evenement_id}` : undefined,
              }}
            />
          )}
          {billet.qr_code && !billet.utilise && !passe && (
            <button type="button" onClick={() => retourner(true)} tabIndex={retourne ? -1 : undefined} className={cn(action, "bg-gw-rose-action text-white hover:bg-gw-rose-action-fonce")}>
              <ScanLine className="h-3.5 w-3.5" aria-hidden />
              {t("Mode entrée")}
            </button>
          )}
        </div>
      </div>

      {/* souche : QR code, séparée par des pointillés et deux encoches */}
      <div className="relative flex flex-col items-center justify-center gap-3 border-t-2 border-dashed border-gw-bordure px-6 py-6 sm:border-t-0 sm:border-l-2 sm:px-7">
        <span aria-hidden className="absolute -top-3 -left-3 h-6 w-6 rounded-full bg-gw-fond sm:-top-3 sm:-left-3" />
        <span aria-hidden className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-gw-fond sm:top-auto sm:-bottom-3 sm:-left-3 sm:right-auto" />
        {billet.qr_code ? (
          <div className={cn("relative rounded-2xl bg-gw-surface p-2", billet.utilise && "opacity-40")}>
            <QRCode value={billet.qr_code} size={compact ? 132 : 168} level="M" aria-label={t("QR code du billet {numero}", { numero: billet.numero_billet ?? "" })} />
          </div>
        ) : null}
        <p className="font-mono text-xs font-semibold tracking-wider text-gw-encre">{billet.numero_billet}</p>
        <p className="max-w-[11rem] text-center text-xs text-gw-texte-doux">
          {billet.utilise
            ? billet.date_scan
              ? t("Scanné à l'entrée le {date} à {heure}.", { date: dateSimple(new Date(billet.date_scan)), heure: heure(new Date(billet.date_scan)) })
              : t("Ce billet a déjà été scanné.")
            : t("Présentez ce QR code à l'entrée, sur votre téléphone ou imprimé.")}
        </p>
      </div>
      {/* reflet brillant qui suit la souris */}
      <div ref={reflet} aria-hidden className="pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300" />
    </article>

    {/* dos du billet : grand QR code pour le contrôle à l'entrée */}
    {billet.qr_code && (
      <section
        aria-hidden={!retourne}
        aria-label={t("Dos du billet")}
        className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-hidden rounded-3xl bg-gw-surface p-5 ring-1 ring-gw-bordure [backface-visibility:hidden] [transform:rotateY(180deg)] sm:flex-row sm:gap-10"
      >
        <div aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-[linear-gradient(90deg,#6C5CE7,#E8479A)]" />
        <div className="shrink-0 rounded-2xl bg-white p-3 ring-1 ring-gw-bordure">
          <QRCode value={billet.qr_code} size={200} level="M" aria-label={t("QR code du billet {numero}", { numero: billet.numero_billet ?? "" })} />
        </div>
        <div className="flex max-w-xs flex-col items-center gap-2 text-center sm:items-start sm:text-left">
          <p className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.16em] text-gw-rose-action uppercase">
            <ScanLine className="h-4 w-4" aria-hidden />
            {t("Présentez ce code à l'entrée")}
          </p>
          <p className="font-titre text-2xl leading-tight font-bold text-gw-encre">{billet.evenement_titre}</p>
          <p className="text-sm text-gw-texte">{dateEvenement(billet.evenement_date)}</p>
          <p className="font-mono text-xs font-semibold tracking-wider text-gw-texte-doux">
            {billet.numero_billet} · {billet.categorie_nom}
          </p>
          <button
            type="button"
            onClick={() => retourner(false)}
            tabIndex={retourne ? undefined : -1}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gw-violet-pale px-4 py-2 text-xs font-semibold text-gw-violet transition-colors hover:bg-gw-lavande"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden />
            {t("Retourner le billet")}
          </button>
        </div>
      </section>
    )}
    </div>
    </div>
  )
}
