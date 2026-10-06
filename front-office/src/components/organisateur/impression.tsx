"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Download, ExternalLink, FileText, LayoutGrid, Loader2, Printer, Ticket } from "lucide-react"
import type { FormatImpression, LotDetail, LotResume } from "@/types"
import { cn } from "@/utils"
import { fetchLot, fetchLots, pdfLot, telechargerUrl } from "@/services/horsLigneService"
import { ariary } from "@/lib/billetterie"
import { classeChamp, Bouton } from "@/components/organisateur/ui"
import { ApercuBillet } from "@/components/organisateur/fond-billet"
import { BadgeType } from "@/components/organisateur/billets-hors-ligne"

/*
 * Impression des billets hors ligne : l'organisateur choisit un lot, le format
 * (planche A4 de 18 billets à découper, ou un billet par page A5) et les billets à imprimer
 * (tous, une plage, ou un seul pour une réimpression : le QR code ne change pas).
 * Le PDF s'ouvre dans l'aperçu intégré, d'où on l'imprime ou le télécharge.
 * Les billets annulés (rendus invendus) ne sont jamais imprimés.
 */

type Selection = "tous" | "plage" | "un"

const FORMATS: { id: FormatImpression; titre: string; aide: string; icone: typeof LayoutGrid }[] = [
  { id: "planche", titre: "Planche A4 à découper", aide: "18 billets par page (63 × 44 mm), avec traits de coupe. Idéal pour le guichet et les revendeurs.", icone: LayoutGrid },
  { id: "a5", titre: "Un billet par page (A5)", aide: "Grand format, comme le billet envoyé par e-mail. Idéal pour les invitations.", icone: FileText },
]

const dateLongue = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

export function Impression() {
  const params = useSearchParams()
  const [lots, setLots] = useState<LotResume[] | null>(null)
  const [lotId, setLotId] = useState<number | null>(null)
  const [detail, setDetail] = useState<LotDetail | null>(null)
  const [format, setFormat] = useState<FormatImpression>("planche")
  const [selection, setSelection] = useState<Selection>("tous")
  const [de, setDe] = useState("1")
  const [a, setA] = useState("")
  const [position, setPosition] = useState(1)
  const [pdf, setPdf] = useState<{ url: string; nom: string } | null>(null)
  const [preparation, setPreparation] = useState(false)
  const [erreur, setErreur] = useState("")
  const apercu = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    fetchLots()
      .then((d) => {
        setLots(d.lots)
        const demande = Number(params.get("lot"))
        setLotId(d.lots.some((l) => l.id === demande) ? demande : d.lots[0]?.id ?? null)
      })
      .catch((e) => setErreur(e instanceof Error ? e.message : "Chargement impossible."))
  }, [params])

  useEffect(() => {
    setDetail(null)
    setPdf((p) => {
      if (p) URL.revokeObjectURL(p.url)
      return null
    })
    if (!lotId) return
    fetchLot(lotId).then((d) => {
      setDetail(d)
      setDe("1")
      setA(String(d.quantite))
      setPosition(d.billets.findIndex((b) => !b.annule) + 1 || 1)
      setFormat(d.type === "invitation" ? "a5" : "planche")
    })
  }, [lotId])

  // libère le PDF précédent quand on quitte la page
  useEffect(
    () => () => {
      if (pdf) URL.revokeObjectURL(pdf.url)
    },
    [pdf],
  )

  const plage = useMemo((): { de?: number; a?: number } => {
    if (!detail || selection === "tous") return {}
    if (selection === "un") return { de: position, a: position }
    return { de: Math.max(1, Number(de) || 1), a: Math.min(detail.quantite, Number(a) || detail.quantite) }
  }, [detail, selection, de, a, position])

  const nbImprimes = useMemo(() => {
    if (!detail) return 0
    const debut = plage.de ?? 1
    const fin = plage.a ?? detail.quantite
    return detail.billets.slice(debut - 1, fin).filter((b) => !b.annule).length
  }, [detail, plage])

  const preparer = useCallback(async () => {
    if (!detail) return null
    setPreparation(true)
    try {
      const fichier = await pdfLot(detail.id, { format, ...plage })
      setPdf((p) => {
        if (p) URL.revokeObjectURL(p.url)
        return fichier
      })
      return fichier
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Le PDF n'a pas pu être préparé.")
      return null
    } finally {
      setPreparation(false)
    }
  }, [detail, format, plage])

  // un changement de réglage rend l'aperçu obsolète
  useEffect(() => {
    setPdf((p) => {
      if (p) URL.revokeObjectURL(p.url)
      return null
    })
  }, [format, plage])

  if (erreur) return <p className="px-4 py-16 text-center text-gw-rose-action lg:px-8">{erreur}</p>
  if (!lots) {
    return (
      <div className="flex items-center gap-2 px-4 py-16 text-gw-texte-doux lg:px-8 dark:text-white/60">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement…
      </div>
    )
  }
  if (lots.length === 0) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8">
        <h1 className="font-titre text-2xl font-semibold">Impression</h1>
        <div className="gw-carte mt-6 flex flex-col items-center gap-3 px-6 py-14 text-center">
          <Printer className="h-8 w-8 text-gw-violet dark:text-gw-lavande" aria-hidden />
          <p className="font-titre text-lg font-semibold">Aucun billet à imprimer</p>
          <p className="max-w-md text-sm text-gw-texte-doux dark:text-white/60">
            Générez d&apos;abord un lot de billets hors ligne (dépôt-vente, guichet ou invitations).
          </p>
          <Link href="/organisateur/billets-hors-ligne" className="mt-2 text-sm font-semibold text-gw-violet dark:text-gw-lavande">
            Générer des billets
          </Link>
        </div>
      </div>
    )
  }

  const lot = lots.find((l) => l.id === lotId)
  const porteur = lot?.type === "depot" ? `Vendu par ${lot.revendeur_nom}` : lot?.type === "guichet" ? "Vente au guichet" : "Invitation"

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <div>
        <h1 className="font-titre text-2xl font-semibold">Impression</h1>
        <p className="mt-1 max-w-2xl text-sm text-gw-texte-doux dark:text-white/65">
          Imprimez vos billets hors ligne en quelques clics : choisissez le lot, le format et les billets, puis lancez
          l&apos;impression depuis l&apos;aperçu.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          {/* 1. lot */}
          <section className="gw-carte p-5 sm:p-6" aria-labelledby="etape-lot">
            <h2 id="etape-lot" className="font-titre text-lg font-semibold">
              1. Lot de billets
            </h2>
            <select className={cn(classeChamp, "mt-3")} value={lotId ?? ""} onChange={(e) => setLotId(Number(e.target.value))} aria-label="Lot à imprimer">
              {lots.map((l) => (
                <option key={l.id} value={l.id}>
                  Lot n° {l.id} · {l.type_libelle} · {l.evenement_titre} · {l.categorie_nom} ({l.quantite - l.annules} billets)
                </option>
              ))}
            </select>
            {lot && (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-gw-texte-doux dark:text-white/60">
                <BadgeType type={lot.type} />
                <span>{dateLongue(lot.evenement_date)}</span>
                {lot.annules > 0 && <span>· {lot.annules} annulé{lot.annules > 1 ? "s" : ""}, non imprimé{lot.annules > 1 ? "s" : ""}</span>}
              </div>
            )}
          </section>

          {/* 2. format */}
          <section className="gw-carte p-5 sm:p-6" aria-labelledby="etape-format">
            <h2 id="etape-format" className="font-titre text-lg font-semibold">
              2. Format
            </h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {FORMATS.map((f) => {
                const Icone = f.icone
                return (
                  <label
                    key={f.id}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-2xl border p-4 transition-colors",
                      format === f.id ? "border-gw-violet bg-gw-lavande/30 dark:bg-gw-violet/20" : "border-gw-bordure hover:border-gw-violet/50 dark:border-gw-bordure-sombre",
                    )}
                  >
                    <input type="radio" name="format" className="sr-only" checked={format === f.id} onChange={() => setFormat(f.id)} />
                    <Icone className="mt-0.5 h-5 w-5 shrink-0 text-gw-violet dark:text-gw-lavande" aria-hidden />
                    <span>
                      <span className="block text-sm font-semibold">{f.titre}</span>
                      <span className="block text-xs text-gw-texte-doux dark:text-white/60">{f.aide}</span>
                    </span>
                  </label>
                )
              })}
            </div>
          </section>

          {/* 3. billets */}
          <section className="gw-carte p-5 sm:p-6" aria-labelledby="etape-billets">
            <h2 id="etape-billets" className="font-titre text-lg font-semibold">
              3. Billets à imprimer
            </h2>
            {!detail ? (
              <Loader2 className="mt-4 h-5 w-5 animate-spin text-gw-violet" aria-hidden />
            ) : (
              <div className="mt-3 space-y-3 text-sm">
                <label className="flex items-center gap-2">
                  <input type="radio" name="sel" checked={selection === "tous"} onChange={() => setSelection("tous")} className="accent-gw-violet" />
                  Tout le lot ({detail.quantite - detail.annules} billets)
                </label>
                <label className="flex flex-wrap items-center gap-2">
                  <input type="radio" name="sel" checked={selection === "plage"} onChange={() => setSelection("plage")} className="accent-gw-violet" />
                  Du billet
                  <input type="number" min={1} max={detail.quantite} value={de} onFocus={() => setSelection("plage")} onChange={(e) => setDe(e.target.value)} className={cn(classeChamp, "w-20 py-1.5")} aria-label="Premier billet" />
                  au
                  <input type="number" min={1} max={detail.quantite} value={a} onFocus={() => setSelection("plage")} onChange={(e) => setA(e.target.value)} className={cn(classeChamp, "w-20 py-1.5")} aria-label="Dernier billet" />
                </label>
                <label className="flex flex-wrap items-center gap-2">
                  <input type="radio" name="sel" checked={selection === "un"} onChange={() => setSelection("un")} className="accent-gw-violet" />
                  Réimprimer un billet
                  <select value={position} onFocus={() => setSelection("un")} onChange={(e) => setPosition(Number(e.target.value))} className={cn(classeChamp, "w-auto py-1.5 font-mono text-xs")} aria-label="Billet à réimprimer">
                    {detail.billets.map((b, i) =>
                      b.annule ? null : (
                        <option key={b.numero} value={i + 1}>
                          {i + 1}. {b.numero}
                          {b.utilise ? " (déjà utilisé)" : ""}
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <p className="text-xs text-gw-texte-doux dark:text-white/55">
                  Une réimpression garde le même QR code : le premier billet scanné à l&apos;entrée reste le seul accepté.
                </p>
              </div>
            )}
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <Bouton variante={pdf ? "secondaire" : "principal"} onClick={preparer} chargement={preparation} disabled={!detail || nbImprimes === 0}>
              <FileText className="h-4 w-4" aria-hidden />
              Préparer {nbImprimes} billet{nbImprimes > 1 ? "s" : ""}
              {format === "planche" ? ` (${Math.ceil(nbImprimes / 18)} page${Math.ceil(nbImprimes / 18) > 1 ? "s" : ""})` : ""}
            </Bouton>
            {pdf && (
              <>
                <Bouton
                  onClick={() => {
                    // impression directe depuis l'aperçu ; sinon, « Ouvrir pour imprimer »
                    try {
                      apercu.current?.contentWindow?.focus()
                      apercu.current?.contentWindow?.print()
                    } catch {
                      window.open(pdf.url, "_blank")
                    }
                  }}
                >
                  <Printer className="h-4 w-4" aria-hidden /> Imprimer
                </Bouton>
                <a
                  href={pdf.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gw-violet/40 px-4 py-2.5 text-sm font-semibold text-gw-violet hover:bg-gw-violet hover:text-white dark:border-white/30 dark:text-white"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden /> Ouvrir pour imprimer
                </a>
                <Bouton variante="secondaire" onClick={() => telechargerUrl(pdf.url, pdf.nom)}>
                  <Download className="h-4 w-4" aria-hidden /> Télécharger
                </Bouton>
              </>
            )}
          </div>

          {pdf && (
            <section className="gw-carte overflow-hidden p-2" aria-label="Aperçu du PDF">
              <iframe ref={apercu} src={pdf.url} title="Aperçu des billets à imprimer" className="h-[70vh] w-full rounded-xl bg-white" />
            </section>
          )}
        </div>

        {/* aperçu et conseils */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <section className="gw-carte p-5" aria-label="Aperçu d'un billet">
            <h2 className="font-titre text-base font-semibold">Aperçu d&apos;un billet</h2>
            {lot && (
              <>
                <ApercuBillet
                  className="mt-3"
                  fond={lot.fond_url}
                  evenement={lot.evenement_titre}
                  date={new Date(lot.evenement_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  tarif={lot.categorie_nom}
                  prix={lot.type === "invitation" ? "Invitation" : ariary(lot.prix_unitaire)}
                  porteur={porteur}
                />
                <p className="mt-3 text-xs text-gw-texte-doux dark:text-white/60">
                  {lot.fond_source === "tarif"
                    ? `Fond du tarif « ${lot.categorie_nom} ».`
                    : lot.fond_source === "type"
                      ? "Fond du type d'événement, choisi par l'administrateur."
                      : "Aucun fond : design guichetweb."}{" "}
                  <Link href={`/organisateur/evenements/${lot.evenement_id}`} className="font-semibold text-gw-violet dark:text-gw-lavande">
                    {lot.fond_source === "tarif" ? "Changer le fond" : "Ajouter un fond au tarif"}
                  </Link>
                </p>
              </>
            )}
          </section>
          <section className="gw-carte p-5 text-sm" aria-label="Conseils d'impression">
            <h2 className="font-titre flex items-center gap-2 text-base font-semibold">
              <Ticket className="h-4 w-4 text-gw-violet dark:text-gw-lavande" aria-hidden /> Bien imprimer
            </h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-gw-texte-doux dark:text-white/65">
              <li>Imprimez à la taille réelle (100 %), sans « ajuster à la page ».</li>
              <li>Papier A4 ; un papier épais (160 g ou plus) rend les billets plus solides.</li>
              <li>Découpez en suivant les pointillés de la planche.</li>
              <li>Ne photocopiez pas un billet : la copie aurait le même QR code et serait refusée après le premier passage.</li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}
