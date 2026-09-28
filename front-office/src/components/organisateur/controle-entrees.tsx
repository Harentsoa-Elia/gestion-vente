"use client"

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Camera,
  CameraOff,
  CheckCircle2,
  ImageUp,
  Keyboard,
  Loader2,
  RefreshCw,
  ScanLine,
  SwitchCamera,
  Ticket,
  Users,
  XCircle,
} from "lucide-react"
import type { Html5Qrcode } from "html5-qrcode"
import type { EtatEntrees, EvenementControle, ResultatScan } from "@/types"
import { cn } from "@/utils"
import { fetchEtatEntrees, fetchEvenementsControle, scannerBillet } from "@/services/controleEntreeService"
import { Bouton, classeChamp } from "@/components/organisateur/ui"

/*
 * Contrôle des billets à l'entrée.
 *  - choix de l'événement contrôlé ;
 *  - lecture du QR code à la caméra (téléphone ou webcam), par une photo, ou saisie du numéro BLT-… ;
 *  - verdict en grand (vert : entrée autorisée ; rouge : déjà utilisé ou inconnu ; orange : autre événement),
 *    avec un bip et une vibration ;
 *  - compteur des entrées et derniers passages.
 * La caméra n'est autorisée par les navigateurs que sur https:// ou http://localhost.
 */

const ID_LECTEUR = "lecteur-qr"
const ID_FICHIER = "lecteur-qr-fichier"
/** Un même QR code est ignoré tant qu'il reste devant la caméra, et jusqu'à ce délai après sa dernière lecture. */
const DELAI_MEME_CODE = 4000

type EtatCamera = "arretee" | "demarrage" | "active" | "erreur"

interface Verdict extends ResultatScan {
  heure: Date
}

const heure = (iso: string | Date | null | undefined) =>
  iso ? new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""

const dateCourte = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

/** Bip court (valide) ou double bip grave (refusé), et vibration sur téléphone. */
function signaler(ok: boolean) {
  try {
    navigator.vibrate?.(ok ? 80 : [180, 80, 180])
    const Contexte = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Contexte) return
    const ctx = new Contexte()
    const bips = ok ? [{ f: 1046, t: 0, d: 0.12 }] : [{ f: 220, t: 0, d: 0.16 }, { f: 220, t: 0.22, d: 0.16 }]
    for (const b of bips) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = ok ? "sine" : "square"
      osc.frequency.value = b.f
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + b.t)
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + b.t + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + b.t + b.d)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + b.t)
      osc.stop(ctx.currentTime + b.t + b.d + 0.02)
    }
    window.setTimeout(() => ctx.close(), 800)
  } catch {
    // son ou vibration indisponibles : le verdict reste affiché
  }
}

const STYLES_VERDICT = {
  valide: { fond: "bg-emerald-600", icone: CheckCircle2, titre: "Entrée autorisée" },
  deja_utilise: { fond: "bg-red-600", icone: XCircle, titre: "Déjà utilisé" },
  inconnu: { fond: "bg-red-600", icone: XCircle, titre: "Billet inconnu" },
  autre_evenement: { fond: "bg-amber-500", icone: AlertTriangle, titre: "Autre événement" },
} as const

function PanneauVerdict({ verdict, enCours }: { verdict: Verdict | null; enCours: boolean }) {
  if (!verdict) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-gw-lavande bg-white/60 p-8 text-center dark:border-white/15 dark:bg-white/5">
        {enCours ? (
          <Loader2 className="h-10 w-10 animate-spin text-gw-violet dark:text-gw-lavande" aria-hidden />
        ) : (
          <ScanLine className="h-10 w-10 text-gw-violet dark:text-gw-lavande" aria-hidden />
        )}
        <p className="font-titre text-xl font-semibold">{enCours ? "Vérification…" : "Prêt à scanner"}</p>
        <p className="max-w-xs text-sm text-gw-texte-doux dark:text-white/60">
          Présentez le QR code du billet devant la caméra, ou saisissez son numéro.
        </p>
      </div>
    )
  }
  const style = STYLES_VERDICT[verdict.statut]
  const Icone = style.icone
  const b = verdict.billet
  return (
    <div className={cn("relative min-h-64 overflow-hidden rounded-3xl p-7 text-white", style.fond)}>
      {enCours && <Loader2 className="absolute top-5 right-5 h-5 w-5 animate-spin text-white/80" aria-hidden />}
      <Icone className="h-14 w-14" strokeWidth={2.2} aria-hidden />
      <p className="font-titre mt-3 text-3xl font-bold tracking-[-0.02em] sm:text-4xl">{style.titre}</p>
      <p className="mt-1 text-white/90">{verdict.message}</p>
      {b && (
        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 rounded-2xl bg-black/15 p-4 text-sm">
          <div className="col-span-2">
            <dt className="text-xs text-white/70">Participant</dt>
            <dd className="font-titre text-xl font-semibold">{b.participant}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/70">Tarif</dt>
            <dd className="font-semibold">{b.categorie}</dd>
          </div>
          <div>
            <dt className="text-xs text-white/70">Billet</dt>
            <dd className="font-mono text-xs font-semibold">{b.numero}</dd>
          </div>
          {verdict.statut === "deja_utilise" && b.date_scan && (
            <div className="col-span-2">
              <dt className="text-xs text-white/70">Premier passage</dt>
              <dd className="font-semibold">
                le {new Date(b.date_scan).toLocaleDateString("fr-FR")} à {heure(b.date_scan)}
              </dd>
            </div>
          )}
        </dl>
      )}
      <p className="mt-4 text-xs text-white/70">Scanné à {heure(verdict.heure)}</p>
    </div>
  )
}

/** Verdict en bandeau sur l'image de la caméra : lisible sans quitter le cadre des yeux (téléphone). */
function BandeauVerdict({ verdict, entres, vendus }: { verdict: Verdict; entres: number; vendus: number }) {
  const style = STYLES_VERDICT[verdict.statut]
  const Icone = style.icone
  return (
    <div
      key={+verdict.heure}
      className={cn("absolute inset-x-3 bottom-3 z-10 flex items-center gap-3 rounded-2xl px-4 py-3 text-white shadow-lg", style.fond)}
      aria-hidden
    >
      <Icone className="h-8 w-8 shrink-0" strokeWidth={2.2} />
      <div className="min-w-0 flex-1">
        <p className="font-titre truncate text-lg leading-tight font-bold">{style.titre}</p>
        <p className="truncate text-sm text-white/90">
          {verdict.billet ? `${verdict.billet.participant} · ${verdict.billet.categorie}` : verdict.message}
        </p>
      </div>
      <p className="shrink-0 text-right text-xs text-white/80 tabular-nums">
        {entres}/{vendus}
        <br />
        entrés
      </p>
    </div>
  )
}

export function ControleEntrees() {
  const [evenements, setEvenements] = useState<EvenementControle[]>([])
  const [evenementId, setEvenementId] = useState<number | null>(null)
  const [etat, setEtat] = useState<EtatEntrees | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)

  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [saisie, setSaisie] = useState("")

  const [camera, setCamera] = useState<EtatCamera>("arretee")
  const [erreurCamera, setErreurCamera] = useState<string | null>(null)
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([])
  const [indexCamera, setIndexCamera] = useState(-1) // -1 : caméra arrière par défaut
  const [contexteSur, setContexteSur] = useState(true)

  const lecteur = useRef<Html5Qrcode | null>(null)
  const occupe = useRef(false)
  const dernier = useRef<{ code: string; t: number }>({ code: "", t: 0 })
  const evenementCourant = useRef<number | null>(null)
  const champFichier = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setContexteSur(window.isSecureContext)
    fetchEvenementsControle()
      .then((liste) => {
        setEvenements(liste)
        if (liste.length) setEvenementId(liste[0].id)
      })
      .catch((e) => setErreur(e instanceof Error ? e.message : "Impossible de charger vos événements."))
      .finally(() => setChargement(false))
  }, [])

  const rafraichir = useCallback((id: number) => {
    fetchEtatEntrees(id)
      .then((e) => evenementCourant.current === id && setEtat(e))
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    evenementCourant.current = evenementId
    setVerdict(null)
    setEtat(null)
    if (evenementId != null) rafraichir(evenementId)
  }, [evenementId, rafraichir])

  const traiter = useCallback(
    async (code: string) => {
      const id = evenementCourant.current
      const propre = code.trim()
      if (!propre || id == null || occupe.current) return
      const maintenant = Date.now()
      if (dernier.current.code === propre && maintenant - dernier.current.t < DELAI_MEME_CODE) {
        // toujours devant la caméra : on prolonge, sans revérifier (sinon « Déjà utilisé » remplacerait le vert)
        dernier.current.t = maintenant
        return
      }
      dernier.current = { code: propre, t: maintenant }
      occupe.current = true
      setEnCours(true)
      try {
        const r = await scannerBillet(id, propre)
        setVerdict({ ...r, heure: new Date() })
        signaler(r.statut === "valide")
        setEtat((e) => (e ? { ...e, entres: r.entres, billets_vendus: r.billets_vendus } : e))
        rafraichir(id)
      } catch (e) {
        setVerdict({
          statut: "inconnu",
          message: e instanceof Error ? e.message : "Vérification impossible. Vérifiez la connexion.",
          billet: null,
          evenement_billet: null,
          billets_vendus: 0,
          entres: 0,
          heure: new Date(),
        })
        signaler(false)
      } finally {
        occupe.current = false
        setEnCours(false)
      }
    },
    [rafraichir],
  )

  const arreterCamera = useCallback(async () => {
    const l = lecteur.current
    lecteur.current = null
    if (l) {
      try {
        await l.stop()
        l.clear()
      } catch {
        // déjà arrêtée
      }
    }
    setCamera("arretee")
  }, [])

  const demarrerCamera = useCallback(
    async (index = indexCamera) => {
      setErreurCamera(null)
      setCamera("demarrage")
      await arreterCamera()
      setCamera("demarrage")
      try {
        const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import("html5-qrcode")
        const l = new Html5Qrcode(ID_LECTEUR, { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false })
        lecteur.current = l
        const source = index >= 0 && cameras[index] ? cameras[index].id : { facingMode: "environment" }
        await l.start(
          source,
          {
            fps: 10,
            qrbox: (largeur, hauteur) => {
              const cote = Math.floor(Math.min(largeur, hauteur) * 0.8)
              return { width: cote, height: cote }
            },
          },
          (texte) => void traiter(texte),
          () => undefined,
        )
        setCamera("active")
        if (!cameras.length) {
          Html5Qrcode.getCameras()
            .then((liste) => setCameras(liste.map((c, i) => ({ id: c.id, label: c.label || `Caméra ${i + 1}` }))))
            .catch(() => undefined)
        }
      } catch (e) {
        lecteur.current = null
        const message = String(e instanceof Error ? e.message : e)
        setErreurCamera(
          /NotAllowed|Permission/i.test(message)
            ? "L'accès à la caméra a été refusé. Autorisez-le dans les réglages du navigateur (icône à gauche de l'adresse), puis réessayez."
            : /NotFound|no camera|Requested device not found/i.test(message)
              ? "Aucune caméra détectée sur cet appareil. Importez une photo du QR code ou saisissez le numéro du billet."
              : "La caméra n'a pas pu démarrer. Fermez les autres applications qui l'utilisent, puis réessayez.",
        )
        setCamera("erreur")
      }
    },
    [arreterCamera, cameras, indexCamera, traiter],
  )

  // caméra coupée en quittant la page
  useEffect(() => () => void arreterCamera(), [arreterCamera])

  const changerCamera = () => {
    if (cameras.length < 2) return
    const suivant = (indexCamera + 1) % cameras.length
    setIndexCamera(suivant)
    void demarrerCamera(suivant)
  }

  const lirePhoto = async (fichier: File | undefined) => {
    if (!fichier) return
    try {
      const { Html5Qrcode } = await import("html5-qrcode")
      const l = new Html5Qrcode(ID_FICHIER, { verbose: false })
      const texte = await l.scanFile(fichier, false)
      l.clear()
      dernier.current = { code: "", t: 0 } // une photo est toujours vérifiée
      await traiter(texte)
    } catch {
      setVerdict({
        statut: "inconnu",
        message: "Aucun QR code lisible sur cette image. Essayez une photo plus nette, ou saisissez le numéro.",
        billet: null,
        evenement_billet: null,
        billets_vendus: etat?.billets_vendus ?? 0,
        entres: etat?.entres ?? 0,
        heure: new Date(),
      })
      signaler(false)
    } finally {
      if (champFichier.current) champFichier.current.value = ""
    }
  }

  const valider = async (e: FormEvent) => {
    e.preventDefault()
    dernier.current = { code: "", t: 0 }
    await traiter(saisie)
    setSaisie("")
  }

  if (chargement) {
    return (
      <div className="flex items-center gap-2 px-4 py-16 text-gw-texte-doux lg:px-8 dark:text-white/60">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement…
      </div>
    )
  }

  if (erreur) return <p className="px-4 py-16 text-center text-gw-rose-action lg:px-8">{erreur}</p>

  if (evenements.length === 0) {
    return (
      <div className="px-4 py-6 lg:px-8 lg:py-8">
        <h1 className="font-titre text-2xl font-semibold">Contrôle des entrées</h1>
        <div className="gw-carte mt-6 flex flex-col items-center gap-3 px-6 py-14 text-center">
          <Ticket className="h-8 w-8 text-gw-violet dark:text-gw-lavande" aria-hidden />
          <p className="font-titre text-lg font-semibold">Aucun événement validé pour l&apos;instant</p>
          <p className="max-w-md text-sm text-gw-texte-doux dark:text-white/60">
            Le contrôle des billets s&apos;ouvre dès qu&apos;un de vos événements est validé par l&apos;administrateur.
          </p>
          <Link href="/organisateur/evenements" className="mt-2 text-sm font-semibold text-gw-violet dark:text-gw-lavande">
            Voir mes événements
          </Link>
        </div>
      </div>
    )
  }

  const evenement = evenements.find((e) => e.id === evenementId)
  const vendus = etat?.billets_vendus ?? evenement?.billets_vendus ?? 0
  const entres = etat?.entres ?? evenement?.entres ?? 0
  const pourcentage = vendus ? Math.round((entres / vendus) * 100) : 0

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-titre text-2xl font-semibold">Contrôle des entrées</h1>
          <p className="mt-1 max-w-2xl text-sm text-gw-texte-doux dark:text-white/65">
            Scannez le QR code de chaque billet à l&apos;entrée. Un billet ne peut passer qu&apos;une seule fois.
          </p>
        </div>
        <label className="w-full sm:w-80">
          <span className="mb-1.5 block text-xs font-semibold text-gw-texte-doux dark:text-white/60">Événement contrôlé</span>
          <select value={evenementId ?? ""} onChange={(e) => setEvenementId(Number(e.target.value))} className={classeChamp}>
            {evenements.map((e) => (
              <option key={e.id} value={e.id}>
                {e.titre} · {dateCourte(e.date_debut)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* compteur des entrées */}
      <section className="gw-carte order-last p-5 sm:p-6 lg:order-none" aria-label="Entrées">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-gw-texte-doux dark:text-white/60">
              <Users className="h-4 w-4" aria-hidden /> Personnes entrées
            </p>
            <p className="font-titre mt-1 text-4xl font-bold tabular-nums" aria-live="polite">
              {entres.toLocaleString("fr-FR")}
              <span className="text-xl font-semibold text-gw-texte-doux dark:text-white/50"> / {vendus.toLocaleString("fr-FR")} billets</span>
            </p>
          </div>
          {etat && etat.par_tarif.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {etat.par_tarif.map((t) => (
                <li key={t.nom} className="rounded-full bg-gw-fond px-3 py-1.5 text-xs font-semibold dark:bg-white/10">
                  {t.nom} <span className="tabular-nums text-gw-texte-doux dark:text-white/60">{t.entres}/{t.vendus}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div
          className="mt-4 h-2.5 overflow-hidden rounded-full bg-gw-fond dark:bg-white/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pourcentage}
          aria-label="Part des billets scannés"
        >
          <div className="h-full rounded-full bg-[linear-gradient(90deg,#6C5CE7,#E8479A)] transition-all" style={{ width: `${pourcentage}%` }} />
        </div>
        <p className="mt-2 text-xs text-gw-texte-doux dark:text-white/55">
          {pourcentage} % des billets vendus scannés{evenement?.lieu ? ` · ${evenement.lieu}` : ""}
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* lecture : caméra, photo, saisie */}
        <section className="gw-carte p-5 sm:p-6" aria-labelledby="titre-lecture">
          <h2 id="titre-lecture" className="font-titre flex items-center gap-2 text-lg font-semibold">
            <Camera className="h-5 w-5 text-gw-violet dark:text-gw-lavande" aria-hidden /> Scanner
          </h2>

          {/* la vidéo fixe elle-même sa hauteur (mise en page d'origine de html5-qrcode, la plus sûre sur iPhone) */}
          <div className="relative mt-4 min-h-72 w-full overflow-hidden rounded-2xl bg-gw-nuit">
            <div id={ID_LECTEUR} className="lecteur-qr w-full" />
            {camera === "active" && verdict && <BandeauVerdict verdict={verdict} entres={entres} vendus={vendus} />}
            {camera !== "active" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-white">
                {camera === "demarrage" ? (
                  <>
                    <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                    <p className="text-sm text-white/80">Ouverture de la caméra… autorisez l&apos;accès si le navigateur le demande.</p>
                  </>
                ) : !contexteSur ? (
                  <>
                    <CameraOff className="h-9 w-9 text-white/70" aria-hidden />
                    <p className="max-w-xs text-sm text-white/85">
                      La caméra ne fonctionne que sur une adresse <strong>https://</strong> ou <strong>localhost</strong>. Importez une photo du QR code ou
                      saisissez le numéro du billet.
                    </p>
                  </>
                ) : (
                  <>
                    <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white/10">
                      <ScanLine className="h-8 w-8" aria-hidden />
                    </span>
                    {erreurCamera && <p className="max-w-xs text-sm text-amber-200">{erreurCamera}</p>}
                    <Bouton onClick={() => demarrerCamera()}>
                      <Camera className="h-4 w-4" aria-hidden />
                      {camera === "erreur" ? "Réessayer" : "Démarrer la caméra"}
                    </Bouton>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {camera === "active" && (
              <>
                <Bouton variante="secondaire" onClick={arreterCamera}>
                  <CameraOff className="h-4 w-4" aria-hidden /> Arrêter
                </Bouton>
                {cameras.length > 1 && (
                  <Bouton variante="discret" onClick={changerCamera}>
                    <SwitchCamera className="h-4 w-4" aria-hidden /> Changer de caméra
                  </Bouton>
                )}
              </>
            )}
            <Bouton variante="discret" onClick={() => champFichier.current?.click()}>
              <ImageUp className="h-4 w-4" aria-hidden /> Importer une photo
            </Bouton>
            <input
              ref={champFichier}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => lirePhoto(e.target.files?.[0])}
            />
            <div id={ID_FICHIER} className="hidden" />
          </div>

          <form onSubmit={valider} className="mt-5 border-t border-gw-bordure pt-5 dark:border-white/10">
            <label htmlFor="numero-billet" className="flex items-center gap-2 text-sm font-medium">
              <Keyboard className="h-4 w-4 text-gw-texte-doux dark:text-white/60" aria-hidden /> Saisir le numéro du billet
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="numero-billet"
                value={saisie}
                onChange={(e) => setSaisie(e.target.value.toUpperCase())}
                placeholder="BLT-2CDE8B480B"
                autoComplete="off"
                spellCheck={false}
                className={cn(classeChamp, "font-mono tracking-wide")}
              />
              <Bouton type="submit" disabled={!saisie.trim() || enCours} className="shrink-0">
                Vérifier
              </Bouton>
            </div>
            <p className="mt-1.5 text-xs text-gw-texte-doux dark:text-white/55">Imprimé sous le QR code, sur le billet PDF ou dans l&apos;e-mail.</p>
          </form>
        </section>

        {/* verdict et derniers passages */}
        <div className="space-y-6">
          <div aria-live="assertive" aria-atomic="true">
            <PanneauVerdict verdict={verdict} enCours={enCours} />
          </div>

          <section className="gw-carte p-5 sm:p-6" aria-labelledby="titre-derniers">
            <div className="flex items-center justify-between gap-3">
              <h2 id="titre-derniers" className="font-titre text-lg font-semibold">
                Derniers passages
              </h2>
              {evenementId != null && (
                <button
                  type="button"
                  onClick={() => rafraichir(evenementId)}
                  className="rounded-full p-2 text-gw-texte-doux hover:bg-gw-fond dark:text-white/60 dark:hover:bg-white/10"
                  aria-label="Actualiser"
                  title="Actualiser"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                </button>
              )}
            </div>
            {!etat ? (
              <p className="mt-4 text-sm text-gw-texte-doux dark:text-white/60">Chargement…</p>
            ) : etat.derniers.length === 0 ? (
              <p className="mt-4 text-sm text-gw-texte-doux dark:text-white/60">Personne n&apos;est encore entré.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gw-bordure dark:divide-white/10">
                {etat.derniers.map((b) => (
                  <li key={b.numero} className="flex items-center gap-3 py-2.5">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{b.participant}</span>
                      <span className="block truncate font-mono text-xs text-gw-texte-doux dark:text-white/55">
                        {b.categorie} · {b.numero}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-gw-texte-doux dark:text-white/60">{heure(b.date_scan) || "—"}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
