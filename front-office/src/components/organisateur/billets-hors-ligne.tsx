"use client"

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, Gift, Handshake, Layers, Loader2, Pencil, Phone, Plus, Printer, Store, Ticket, Users, X, type LucideIcon } from "lucide-react"
import type { EvenementLot, LotDetail, LotResume, LotsOrganisateur, ModePaiement, RevendeurFiche, TypeLot } from "@/types"
import { cn } from "@/utils"
import {
  ErreurApi,
  declarerVendus,
  fetchEvenementsLot,
  fetchLot,
  fetchLots,
  fetchRevendeurs,
  genererLot,
  modifierRevendeur,
  reglerLot,
} from "@/services/horsLigneService"
import { OPERATEURS, ariary, erreurTelephone, formaterTelephone, normaliserTelephone } from "@/lib/billetterie"
import { Bouton, Champ, Modale, classeChamp } from "@/components/organisateur/ui"

/*
 * Billets hors ligne : l'organisateur génère des lots de billets vendus ou offerts en dehors du site.
 *  - Dépôt-vente : billets confiés à une entreprise partenaire, sans paiement au départ. Le revendeur
 *    rend l'argent des billets vendus et les invendus, en principe une fois 80 % du lot vendu.
 *  - Guichet : billets que l'organisateur vend lui-même sur place.
 *  - Invitations : billets offerts.
 * Chaque revendeur a sa fiche : il peut recevoir autant de lots que nécessaire, et la fiche réunit
 * ses billets confiés, vendus, rendus et l'argent qu'il doit encore.
 * La plateforme facture un frais fixe par billet, payé par Mobile Money (simulé) avant la génération.
 * Les billets ont un QR code chiffré et se contrôlent à l'entrée comme les billets achetés en ligne ;
 * un billet rendu invendu est annulé et refusé à l'entrée.
 */

export const TYPES_LOT: Record<TypeLot, { libelle: string; aide: string; icone: LucideIcon; classes: string }> = {
  depot: {
    libelle: "Dépôt-vente",
    aide: "Billets confiés à une entreprise partenaire, qui vous rend l'argent des vendus et les invendus.",
    icone: Handshake,
    classes: "bg-gw-lavande/60 text-gw-indigo dark:bg-gw-violet/25 dark:text-gw-lavande",
  },
  guichet: {
    libelle: "Guichet",
    aide: "Billets que vous vendez vous-même sur place ou dans votre point de vente.",
    icone: Store,
    classes: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200",
  },
  invitation: {
    libelle: "Invitations",
    aide: "Billets offerts (partenaires, presse, artistes…) : gratuits pour l'invité.",
    icone: Gift,
    classes: "bg-gw-rose-pale text-gw-rose-action dark:bg-gw-rose/20 dark:text-pink-200",
  },
}

const entier = new Intl.NumberFormat("fr-FR")
/** montant en ariary, « 0 Ar » compris (ariary() affiche « Gratuit » pour un prix nul) */
const montant = (m: number) => `${entier.format(Math.round(m))} Ar`
const dateCourte = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })

export function BadgeType({ type }: { type: TypeLot }) {
  const t = TYPES_LOT[type]
  const Icone = t.icone
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold", t.classes)}>
      <Icone className="h-3.5 w-3.5" aria-hidden />
      {t.libelle}
    </span>
  )
}

/* ---------- page ---------- */

export function BilletsHorsLigne() {
  const router = useRouter()
  const [donnees, setDonnees] = useState<LotsOrganisateur | null>(null)
  const [erreur, setErreur] = useState("")
  const [revendeurs, setRevendeurs] = useState<RevendeurFiche[] | null>(null)
  const [vue, setVue] = useState<"lots" | "revendeurs">("lots")
  const [revendeurFiltre, setRevendeurFiltre] = useState<number | null>(null)
  const [edition, setEdition] = useState<RevendeurFiche | null>(null)
  /** null = fermée ; sinon le revendeur présélectionné (ou rien) */
  const [generation, setGeneration] = useState<{ revendeurId?: number } | null>(null)
  const [ventes, setVentes] = useState<LotResume | null>(null)
  const [reglement, setReglement] = useState<LotResume | null>(null)
  const [filtre, setFiltre] = useState<TypeLot | "tous">("tous")

  const charger = useCallback(async () => {
    try {
      const [lots, revs] = await Promise.all([fetchLots(), fetchRevendeurs()])
      setDonnees(lots)
      setRevendeurs(revs)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible.")
    }
  }, [])

  useEffect(() => {
    charger()
  }, [charger])

  const lots = useMemo(
    () =>
      (donnees?.lots ?? []).filter(
        (l) => (filtre === "tous" || l.type === filtre) && (revendeurFiltre === null || l.revendeur_id === revendeurFiltre),
      ),
    [donnees, filtre, revendeurFiltre],
  )

  if (erreur) return <p className="px-4 py-16 text-center text-gw-rose-action lg:px-8">{erreur}</p>
  if (!donnees || !revendeurs) {
    return (
      <div className="flex items-center gap-2 px-4 py-16 text-gw-texte-doux lg:px-8 dark:text-white/60">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement…
      </div>
    )
  }

  const nb = (t: TypeLot) => donnees.lots.filter((l) => l.type === t).length
  const revendeurChoisi = revendeurs.find((r) => r.id === revendeurFiltre)
  const voirLots = (r: RevendeurFiche) => {
    setRevendeurFiltre(r.id)
    setFiltre("depot")
    setVue("lots")
  }

  return (
    <div className="flex flex-col gap-6 px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-titre text-2xl font-semibold">Billets hors ligne</h1>
          <p className="mt-1 max-w-2xl text-sm text-gw-texte-doux dark:text-white/65">
            Générez des billets à confier à un revendeur partenaire, à vendre au guichet ou à offrir. Ils se contrôlent à
            l&apos;entrée comme les billets achetés sur le site.
          </p>
        </div>
        <Bouton onClick={() => setGeneration({})}>
          <Plus className="h-4 w-4" aria-hidden />
          Générer des billets
        </Bouton>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Indicateur libelle="Billets générés" valeur={entier.format(donnees.billets_generes)} aide={`${donnees.lots.length} lot${donnees.lots.length > 1 ? "s" : ""}`} />
        <Indicateur libelle="Frais payés à la plateforme" valeur={montant(donnees.frais_payes)} aide="Total depuis le début" />
        <Indicateur libelle="Frais par billet généré" valeur={montant(donnees.frais_unitaire)} aide={`Dépôt-vente : règlement à ${donnees.seuil_pourcentage} % vendus`} />
      </div>

      <div className="flex gap-1 border-b border-gw-bordure dark:border-gw-bordure-sombre" role="tablist" aria-label="Vue">
        {([
          ["lots", "Lots de billets", Layers, donnees.lots.length],
          ["revendeurs", "Revendeurs", Users, revendeurs.length],
        ] as const).map(([v, libelle, Icone, total]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={vue === v}
            onClick={() => setVue(v)}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              vue === v
                ? "border-gw-rose-action text-gw-nuit dark:text-white"
                : "border-transparent text-gw-texte-doux hover:text-gw-nuit dark:text-white/60 dark:hover:text-white",
            )}
          >
            <Icone className="h-4 w-4" aria-hidden />
            {libelle}
            <span className="rounded-full bg-gw-fond px-2 py-0.5 text-xs dark:bg-white/10">{total}</span>
          </button>
        ))}
      </div>

      {vue === "revendeurs" ? (
        <ListeRevendeurs
          revendeurs={revendeurs}
          onVoirLots={voirLots}
          onNouveauLot={(r) => setGeneration({ revendeurId: r.id })}
          onModifier={setEdition}
          onPremier={() => setGeneration({})}
        />
      ) : (
        <>
          {donnees.lots.length > 0 && (
            <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrer par type">
              {(["tous", "depot", "guichet", "invitation"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={filtre === t}
                  onClick={() => {
                    setFiltre(t)
                    if (t === "guichet" || t === "invitation") setRevendeurFiltre(null)
                  }}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                    filtre === t
                      ? "bg-gw-nuit text-white dark:bg-white dark:text-gw-nuit"
                      : "bg-white text-gw-texte ring-1 ring-gw-bordure hover:ring-gw-violet dark:bg-white/5 dark:text-white/80 dark:ring-white/10",
                  )}
                >
                  {t === "tous" ? "Tous" : TYPES_LOT[t].libelle}
                  <span className="ml-1.5 text-xs opacity-70">{t === "tous" ? donnees.lots.length : nb(t)}</span>
                </button>
              ))}
            </div>
          )}

          {revendeurChoisi && (
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-gw-lavande/30 px-4 py-3 text-sm dark:bg-gw-violet/15">
              <Handshake className="h-4 w-4 text-gw-violet dark:text-gw-lavande" aria-hidden />
              <span>
                Lots confiés à <span className="font-semibold">{revendeurChoisi.nom}</span> : {lots.length}
              </span>
              <button
                type="button"
                onClick={() => setRevendeurFiltre(null)}
                className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 font-semibold text-gw-violet hover:bg-white dark:text-gw-lavande dark:hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" aria-hidden /> Tous les lots
              </button>
            </div>
          )}

          {donnees.lots.length === 0 ? (
            <div className="gw-carte flex flex-col items-center gap-3 px-6 py-14 text-center">
              <Ticket className="h-8 w-8 text-gw-violet dark:text-gw-lavande" aria-hidden />
              <p className="font-titre text-lg font-semibold">Aucun billet hors ligne pour l&apos;instant</p>
              <p className="max-w-md text-sm text-gw-texte-doux dark:text-white/60">
                Générez un premier lot pour un revendeur partenaire, pour votre guichet ou pour vos invités.
              </p>
              <Bouton className="mt-2" onClick={() => setGeneration({})}>
                <Plus className="h-4 w-4" aria-hidden /> Générer des billets
              </Bouton>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {lots.map((l) => (
                <CarteLot key={l.id} lot={l} seuilPct={donnees.seuil_pourcentage} onVentes={() => setVentes(l)} onReglement={() => setReglement(l)} />
              ))}
            </div>
          )}
        </>
      )}

      <ModaleGeneration
        ouverte={generation !== null}
        revendeurInitial={generation?.revendeurId}
        revendeurs={revendeurs}
        fraisUnitaire={donnees.frais_unitaire}
        onFermer={() => setGeneration(null)}
        onGenere={async (lot) => {
          setGeneration(null)
          await charger()
          toast.success(`${lot.quantite} billets générés (lot n° ${lot.id}).`, {
            action: { label: "Imprimer", onClick: () => router.push(`/organisateur/impression?lot=${lot.id}`) },
          })
        }}
      />
      <ModaleRevendeur
        revendeur={edition}
        onFermer={() => setEdition(null)}
        onEnregistre={async () => {
          setEdition(null)
          await charger()
        }}
      />
      <ModaleVentes lot={ventes} onFermer={() => setVentes(null)} onEnregistre={async () => { setVentes(null); await charger() }} />
      <ModaleReglement lot={reglement} seuilPct={donnees.seuil_pourcentage} onFermer={() => setReglement(null)} onRegle={async () => { setReglement(null); await charger() }} />
    </div>
  )
}

function Indicateur({ libelle, valeur, aide }: { libelle: string; valeur: string; aide: string }) {
  return (
    <div className="gw-carte p-5">
      <p className="text-sm text-gw-texte-doux dark:text-white/60">{libelle}</p>
      <p className="font-titre mt-1 text-2xl font-semibold tabular-nums">{valeur}</p>
      <p className="mt-0.5 text-xs text-gw-texte-pale dark:text-white/45">{aide}</p>
    </div>
  )
}

/* ---------- revendeurs : une fiche par entreprise partenaire ---------- */

function ListeRevendeurs({
  revendeurs,
  onVoirLots,
  onNouveauLot,
  onModifier,
  onPremier,
}: {
  revendeurs: RevendeurFiche[]
  onVoirLots: (r: RevendeurFiche) => void
  onNouveauLot: (r: RevendeurFiche) => void
  onModifier: (r: RevendeurFiche) => void
  onPremier: () => void
}) {
  if (revendeurs.length === 0) {
    return (
      <div className="gw-carte flex flex-col items-center gap-3 px-6 py-14 text-center">
        <Handshake className="h-8 w-8 text-gw-violet dark:text-gw-lavande" aria-hidden />
        <p className="font-titre text-lg font-semibold">Aucun revendeur pour l&apos;instant</p>
        <p className="max-w-md text-sm text-gw-texte-doux dark:text-white/60">
          Un revendeur est créé au premier lot « Dépôt-vente » que vous lui confiez. Vous pourrez ensuite lui donner autant
          de lots que vous voulez et suivre tout ce qu&apos;il vous doit ici.
        </p>
        <Bouton className="mt-2" onClick={onPremier}>
          <Plus className="h-4 w-4" aria-hidden /> Confier un premier lot
        </Bouton>
      </div>
    )
  }
  const totalDu = revendeurs.reduce((t, r) => t + r.a_encaisser, 0)
  const totalDepot = revendeurs.reduce((t, r) => t + r.en_depot, 0)
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gw-texte-doux dark:text-white/65">
        {revendeurs.length} revendeur{revendeurs.length > 1 ? "s" : ""} · {entier.format(totalDepot)} billet{totalDepot > 1 ? "s" : ""} en dépôt ·{" "}
        <span className="font-semibold text-gw-nuit dark:text-white">{montant(totalDu)}</span> à encaisser
      </p>
      <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {revendeurs.map((r) => (
          <CarteRevendeur key={r.id} revendeur={r} onVoirLots={() => onVoirLots(r)} onNouveauLot={() => onNouveauLot(r)} onModifier={() => onModifier(r)} />
        ))}
      </div>
    </div>
  )
}

function CarteRevendeur({
  revendeur: r,
  onVoirLots,
  onNouveauLot,
  onModifier,
}: {
  revendeur: RevendeurFiche
  onVoirLots: () => void
  onNouveauLot: () => void
  onModifier: () => void
}) {
  const initiales = r.nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0]!.toUpperCase())
    .join("")
  return (
    <article className="gw-carte flex flex-col gap-4 p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gw-lavande/60 font-titre text-sm font-bold text-gw-indigo dark:bg-gw-violet/25 dark:text-gw-lavande" aria-hidden>
          {initiales}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-titre truncate text-lg leading-snug font-semibold">{r.nom}</h2>
          <p className="flex items-center gap-1 truncate text-sm text-gw-texte-doux dark:text-white/60">
            {r.contact ? (
              <>
                <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden /> {r.contact}
              </>
            ) : (
              "Aucun contact"
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={onModifier}
          aria-label={`Modifier ${r.nom}`}
          title="Modifier le nom ou le contact"
          className="rounded-full p-2 text-gw-texte-doux hover:bg-gw-fond hover:text-gw-violet dark:text-white/55 dark:hover:bg-white/10"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        <span className="rounded-full bg-gw-fond px-2.5 py-0.5 dark:bg-white/10">
          {r.lots} lot{r.lots > 1 ? "s" : ""}
          {r.lots_en_cours > 0 && ` · ${r.lots_en_cours} en cours`}
        </span>
        {r.lots_a_regler > 0 && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/30">
            {r.lots_a_regler} lot{r.lots_a_regler > 1 ? "s" : ""} à régler
          </span>
        )}
      </div>

      <dl className="grid grid-cols-4 gap-2 rounded-2xl bg-gw-fond p-3 text-center text-xs dark:bg-white/5">
        {(
          [
            ["Confiés", r.billets_confies],
            ["Vendus", r.vendus],
            ["En dépôt", r.en_depot],
            ["Rendus", r.rendus],
          ] as const
        ).map(([libelle, valeur]) => (
          <div key={libelle}>
            <dt className="text-gw-texte-doux dark:text-white/55">{libelle}</dt>
            <dd className="font-titre text-base font-semibold tabular-nums">{entier.format(valeur)}</dd>
          </div>
        ))}
      </dl>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-gw-texte-doux dark:text-white/60">À encaisser</p>
          <p className="font-titre text-lg font-semibold tabular-nums">{montant(r.a_encaisser)}</p>
        </div>
        <div>
          <p className="text-gw-texte-doux dark:text-white/60">Déjà réglé</p>
          <p className="font-titre text-lg font-semibold tabular-nums">{montant(r.deja_regle)}</p>
        </div>
      </div>

      <div className="mt-auto flex flex-wrap gap-2">
        <Bouton onClick={onNouveauLot}>
          <Plus className="h-4 w-4" aria-hidden /> Nouveau lot
        </Bouton>
        <Bouton variante="secondaire" onClick={onVoirLots}>
          Voir ses lots
        </Bouton>
      </div>
      {r.dernier_lot && <p className="-mt-2 text-xs text-gw-texte-pale dark:text-white/45">Dernier lot le {dateCourte(r.dernier_lot)}</p>}
    </article>
  )
}

function ModaleRevendeur({ revendeur, onFermer, onEnregistre }: { revendeur: RevendeurFiche | null; onFermer: () => void; onEnregistre: () => void }) {
  const [nom, setNom] = useState("")
  const [contact, setContact] = useState("")
  const [envoi, setEnvoi] = useState(false)
  useEffect(() => {
    if (revendeur) {
      setNom(revendeur.nom)
      setContact(revendeur.contact ?? "")
    }
  }, [revendeur])
  const enregistrer = async (e: FormEvent) => {
    e.preventDefault()
    if (!revendeur) return
    if (!nom.trim()) return toast.error("Le nom du revendeur est obligatoire.")
    setEnvoi(true)
    try {
      await modifierRevendeur(revendeur.id, { nom: nom.trim(), contact: contact.trim() })
      toast.success("Revendeur mis à jour.")
      onEnregistre()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible.")
    } finally {
      setEnvoi(false)
    }
  }
  return (
    <Modale ouverte={revendeur !== null} titre="Modifier le revendeur" onFermer={onFermer}>
      <form onSubmit={enregistrer} className="space-y-4">
        <Champ libelle="Entreprise partenaire" requis>
          {(id) => <input id={id} className={classeChamp} value={nom} onChange={(e) => setNom(e.target.value)} maxLength={120} />}
        </Champ>
        <Champ libelle="Contact" aide="Téléphone ou e-mail (facultatif)">
          {(id) => <input id={id} className={classeChamp} value={contact} onChange={(e) => setContact(e.target.value)} maxLength={120} placeholder="034 12 345 67" />}
        </Champ>
        <p className="text-xs text-gw-texte-pale dark:text-white/45">Les lots déjà générés gardent le nom imprimé au moment de leur création.</p>
        <div className="flex justify-end gap-2">
          <Bouton type="button" variante="discret" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" chargement={envoi}>
            Enregistrer
          </Bouton>
        </div>
      </form>
    </Modale>
  )
}

/* ---------- carte d'un lot ---------- */

function CarteLot({ lot, seuilPct, onVentes, onReglement }: { lot: LotResume; seuilPct: number; onVentes: () => void; onReglement: () => void }) {
  const regle = lot.statut === "regle"
  const valables = lot.quantite - lot.annules
  const pctVendus = Math.min(100, Math.round((lot.vendus / lot.quantite) * 100))
  return (
    <article className="gw-carte flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <BadgeType type={lot.type} />
        <span className="text-xs font-semibold text-gw-texte-doux dark:text-white/55">Lot n° {lot.id}</span>
        <span
          className={cn(
            "ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold",
            regle
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-400/10 dark:text-emerald-200 dark:ring-emerald-400/30"
              : "bg-gw-fond text-gw-texte ring-1 ring-gw-bordure dark:bg-white/10 dark:text-white/80 dark:ring-white/15",
          )}
        >
          {regle ? "Réglé" : "En cours"}
        </span>
      </div>

      <div>
        <h2 className="font-titre text-lg leading-snug font-semibold">{lot.evenement_titre}</h2>
        <p className="text-sm text-gw-texte-doux dark:text-white/60">
          {lot.categorie_nom} · {lot.type === "invitation" ? "offert" : ariary(lot.prix_unitaire)} · {entier.format(lot.quantite)} billets ·
          événement le {dateCourte(lot.evenement_date)}
        </p>
        {lot.type === "depot" && (
          <p className="mt-1 text-sm">
            <span className="text-gw-texte-doux dark:text-white/60">Revendeur : </span>
            <span className="font-semibold">{lot.revendeur_nom}</span>
            {lot.revendeur_contact && <span className="text-gw-texte-doux dark:text-white/60"> · {lot.revendeur_contact}</span>}
          </p>
        )}
      </div>

      {lot.type === "invitation" ? (
        <p className="text-sm">
          <span className="font-semibold tabular-nums">{lot.utilises}</span>
          <span className="text-gw-texte-doux dark:text-white/60"> invité{lot.utilises > 1 ? "s" : ""} entré{lot.utilises > 1 ? "s" : ""} sur {valables}</span>
        </p>
      ) : (
        <div>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span>
              <span className="font-semibold tabular-nums">{lot.vendus}</span>
              <span className="text-gw-texte-doux dark:text-white/60"> vendus sur {lot.quantite}</span>
            </span>
            <span className="font-semibold tabular-nums">{montant(regle ? lot.montant_regle ?? 0 : lot.montant_attendu)}</span>
          </div>
          <div className="relative mt-2 h-2.5 rounded-full bg-gw-fond dark:bg-white/10" role="progressbar" aria-valuenow={pctVendus} aria-valuemin={0} aria-valuemax={100} aria-label="Billets vendus">
            <div
              className={cn("h-full rounded-full", lot.seuil_atteint || regle ? "bg-emerald-500" : "bg-gradient-to-r from-gw-violet to-gw-rose")}
              style={{ width: `${pctVendus}%` }}
            />
            {lot.type === "depot" && (
              <span className="absolute -top-1 h-4.5 w-0.5 rounded bg-gw-nuit/70 dark:bg-white/70" style={{ left: `${seuilPct}%` }} title={`Seuil de ${seuilPct} %`} />
            )}
          </div>
          <p className="mt-1.5 text-xs text-gw-texte-doux dark:text-white/55">
            {regle
              ? `Réglé le ${dateCourte(lot.date_reglement!)} : ${lot.vendus} vendus encaissés, ${lot.annules} invendus annulés.`
              : lot.type === "depot"
                ? lot.seuil_atteint
                  ? `Seuil de ${seuilPct} % atteint : vous pouvez demander le règlement au revendeur.`
                  : `Règlement à partir de ${lot.seuil} billets vendus (${seuilPct} %).`
                : "Montant encaissé au guichet, selon les ventes déclarées."}
          </p>
        </div>
      )}

      <dl className="grid grid-cols-3 gap-3 rounded-2xl bg-gw-fond p-3 text-center text-xs dark:bg-white/5">
        <div>
          <dt className="text-gw-texte-doux dark:text-white/55">Entrés</dt>
          <dd className="font-titre text-base font-semibold tabular-nums">{lot.utilises}</dd>
        </div>
        <div>
          <dt className="text-gw-texte-doux dark:text-white/55">Annulés</dt>
          <dd className="font-titre text-base font-semibold tabular-nums">{lot.annules}</dd>
        </div>
        <div>
          <dt className="text-gw-texte-doux dark:text-white/55">Frais payés</dt>
          <dd className="font-titre text-base font-semibold tabular-nums">{montant(lot.montant_frais)}</dd>
        </div>
      </dl>

      <div className="mt-auto flex flex-wrap gap-2">
        <Link
          href={`/organisateur/impression?lot=${lot.id}`}
          className="inline-flex items-center gap-2 rounded-full border border-gw-violet/40 px-4 py-2 text-sm font-semibold text-gw-violet hover:bg-gw-violet hover:text-white dark:border-white/30 dark:text-white dark:hover:bg-white/10"
        >
          <Printer className="h-4 w-4" aria-hidden /> Imprimer
        </Link>
        {!regle && lot.type !== "invitation" && (
          <Bouton variante="secondaire" onClick={onVentes}>
            Ventes déclarées
          </Bouton>
        )}
        {!regle && (
          <Bouton variante={lot.seuil_atteint || lot.type !== "depot" ? "principal" : "discret"} onClick={onReglement}>
            {lot.type === "invitation" ? "Clôturer" : "Régler"}
          </Bouton>
        )}
      </div>
    </article>
  )
}

/* ---------- génération : choix, frais, paiement ---------- */

const NOUVEAU = "nouveau"

function ModaleGeneration({
  ouverte,
  revendeurInitial,
  revendeurs,
  fraisUnitaire,
  onFermer,
  onGenere,
}: {
  ouverte: boolean
  revendeurInitial?: number
  revendeurs: RevendeurFiche[]
  fraisUnitaire: number
  onFermer: () => void
  onGenere: (lot: LotDetail) => void
}) {
  const [evenements, setEvenements] = useState<EvenementLot[] | null>(null)
  const [type, setType] = useState<TypeLot>("depot")
  const [evenementId, setEvenementId] = useState<number | null>(null)
  const [tarifId, setTarifId] = useState<number | null>(null)
  const [quantite, setQuantite] = useState("10")
  /** id du revendeur choisi dans la liste, ou NOUVEAU pour en créer un */
  const [choixRevendeur, setChoixRevendeur] = useState<string>(NOUVEAU)
  const [revendeur, setRevendeur] = useState("")
  const [contact, setContact] = useState("")
  const [mode, setMode] = useState<ModePaiement>("mvola")
  const [telephone, setTelephone] = useState("")
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState("")

  useEffect(() => {
    if (!ouverte) return
    setErreur("")
    setTelephone("")
    if (revendeurInitial) {
      setType("depot")
      setChoixRevendeur(String(revendeurInitial))
    } else {
      setChoixRevendeur((c) => (c !== NOUVEAU && revendeurs.some((r) => String(r.id) === c) ? c : revendeurs[0] ? String(revendeurs[0].id) : NOUVEAU))
    }
    fetchEvenementsLot()
      .then((evs) => {
        setEvenements(evs)
        const premier = evs.find((e) => e.tarifs.length > 0)
        setEvenementId((id) => (id && evs.some((e) => e.id === id) ? id : premier?.id ?? null))
      })
      .catch((e) => setErreur(e instanceof Error ? e.message : "Chargement impossible."))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ouverte])

  const evenement = evenements?.find((e) => e.id === evenementId)
  useEffect(() => {
    if (evenement && !evenement.tarifs.some((t) => t.id === tarifId && t.restantes !== 0))
      setTarifId((evenement.tarifs.find((t) => t.restantes !== 0) ?? evenement.tarifs[0])?.id ?? null)
  }, [evenement, tarifId])
  const tarif = evenement?.tarifs.find((t) => t.id === tarifId)

  const n = Math.max(0, Math.floor(Number(quantite) || 0))
  const max = Math.min(500, tarif?.restantes ?? 500)
  const frais = n * fraisUnitaire
  const erreurTel = telephone ? erreurTelephone(mode, telephone) : null
  const nouveauRevendeur = choixRevendeur === NOUVEAU
  const revendeurExistant = revendeurs.find((r) => String(r.id) === choixRevendeur)

  const soumettre = async (e: FormEvent) => {
    e.preventDefault()
    setErreur("")
    if (!evenement || !tarif) return setErreur("Choisissez un événement et un tarif.")
    if (n < 1 || n > max) return setErreur(`La quantité va de 1 à ${max}.`)
    if (type === "depot" && nouveauRevendeur && !revendeur.trim()) return setErreur("Indiquez l'entreprise partenaire.")
    const errTel = erreurTelephone(mode, telephone)
    if (errTel) return setErreur(errTel)
    setEnvoi(true)
    try {
      const lot = await genererLot({
        type,
        evenement_id: evenement.id,
        categorie_billet_id: tarif.id,
        quantite: n,
        revendeur_id: type === "depot" && !nouveauRevendeur ? revendeurExistant?.id : undefined,
        revendeur_nom: type === "depot" && nouveauRevendeur ? revendeur.trim() : undefined,
        revendeur_contact: type === "depot" && nouveauRevendeur ? contact.trim() || undefined : undefined,
        mode_paiement: mode,
        telephone: normaliserTelephone(telephone),
      })
      onGenere(lot)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La génération a échoué.")
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Modale ouverte={ouverte} titre="Générer des billets" onFermer={onFermer} large>
      {!evenements ? (
        <div className="flex items-center gap-2 py-8 text-gw-texte-doux">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement…
        </div>
      ) : evenements.length === 0 ? (
        <p className="text-sm text-gw-texte-doux dark:text-white/65">
          Aucun événement validé et à venir. Les billets hors ligne se génèrent pour un événement validé par
          l&apos;administrateur, avec au moins un tarif.
        </p>
      ) : (
        <form onSubmit={soumettre} className="space-y-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Usage des billets</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(TYPES_LOT) as TypeLot[]).map((t) => {
                const info = TYPES_LOT[t]
                const Icone = info.icone
                return (
                  <label
                    key={t}
                    className={cn(
                      "flex cursor-pointer flex-col gap-1 rounded-2xl border p-3 text-sm transition-colors",
                      type === t ? "border-gw-violet bg-gw-lavande/30 dark:bg-gw-violet/20" : "border-gw-bordure hover:border-gw-violet/50 dark:border-gw-bordure-sombre",
                    )}
                  >
                    <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Icone className="h-4 w-4 text-gw-violet dark:text-gw-lavande" aria-hidden /> {info.libelle}
                    </span>
                    <span className="text-xs text-gw-texte-doux dark:text-white/60">{info.aide}</span>
                  </label>
                )
              })}
            </div>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <Champ libelle="Événement" requis>
              {(id) => (
                <select id={id} className={classeChamp} value={evenementId ?? ""} onChange={(e) => setEvenementId(Number(e.target.value))}>
                  {evenements.map((e) => (
                    <option key={e.id} value={e.id} disabled={e.tarifs.length === 0}>
                      {e.titre} · {dateCourte(e.date_debut)}
                      {e.tarifs.length === 0 ? " (aucun tarif)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </Champ>
            <Champ libelle="Tarif" requis aide={tarif ? (tarif.restantes == null ? "Places illimitées" : `${entier.format(tarif.restantes)} places restantes`) : undefined}>
              {(id) => (
                <select id={id} className={classeChamp} value={tarifId ?? ""} onChange={(e) => setTarifId(Number(e.target.value))}>
                  {evenement?.tarifs.map((t) => (
                    <option key={t.id} value={t.id} disabled={t.restantes === 0}>
                      {t.nom} · {ariary(t.prix)}
                      {t.restantes === 0 ? " (complet)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </Champ>
            <Champ libelle="Nombre de billets" requis aide={`De 1 à ${entier.format(max)}`}>
              {(id) => (
                <input id={id} type="number" inputMode="numeric" min={1} max={max} className={classeChamp} value={quantite} onChange={(e) => setQuantite(e.target.value)} />
              )}
            </Champ>
            {type === "depot" && (
              <Champ
                libelle="Revendeur"
                requis
                aide={
                  revendeurExistant
                    ? `${revendeurExistant.lots} lot${revendeurExistant.lots > 1 ? "s" : ""} déjà confié${revendeurExistant.lots > 1 ? "s" : ""} · ${entier.format(revendeurExistant.en_depot)} billets en dépôt`
                    : "Il aura sa fiche dans l'onglet Revendeurs."
                }
              >
                {(id) => (
                  <select id={id} className={classeChamp} value={choixRevendeur} onChange={(e) => setChoixRevendeur(e.target.value)}>
                    {revendeurs.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nom}
                      </option>
                    ))}
                    <option value={NOUVEAU}>+ Nouveau revendeur…</option>
                  </select>
                )}
              </Champ>
            )}
            {type === "depot" && nouveauRevendeur && (
              <Champ libelle="Nom de l'entreprise partenaire" requis>
                {(id) => <input id={id} className={classeChamp} value={revendeur} onChange={(e) => setRevendeur(e.target.value)} placeholder="Ex. Librairie Mixte" maxLength={120} />}
              </Champ>
            )}
            {type === "depot" && nouveauRevendeur && (
              <Champ libelle="Contact du revendeur" aide="Téléphone ou e-mail (facultatif)">
                {(id) => <input id={id} className={classeChamp} value={contact} onChange={(e) => setContact(e.target.value)} placeholder="034 12 345 67" maxLength={120} />}
              </Champ>
            )}
          </div>

          <div className="rounded-2xl bg-gw-fond p-4 text-sm dark:bg-white/5">
            <div className="flex justify-between gap-3">
              <span className="text-gw-texte-doux dark:text-white/60">
                Frais de la plateforme : {entier.format(n)} × {montant(fraisUnitaire)}
              </span>
              <span className="font-titre text-lg font-semibold tabular-nums">{montant(frais)}</span>
            </div>
            {tarif && type !== "invitation" && n > 0 && (
              <p className="mt-1 text-xs text-gw-texte-doux dark:text-white/55">
                Valeur des billets à la vente : {montant(n * tarif.prix)}
                {type === "depot" ? " — à encaisser auprès du revendeur au règlement." : "."}
              </p>
            )}
          </div>

          <fieldset>
            <legend className="mb-2 text-sm font-medium">Payer les frais par Mobile Money</legend>
            <div className="flex flex-wrap gap-2">
              {OPERATEURS.map((o) => (
                <button
                  key={o.mode}
                  type="button"
                  onClick={() => setMode(o.mode)}
                  aria-pressed={mode === o.mode}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold",
                    mode === o.mode ? "border-gw-violet ring-2 ring-gw-violet/25" : "border-gw-bordure dark:border-gw-bordure-sombre",
                  )}
                >
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: o.couleur }} aria-hidden />
                  {o.nom}
                </button>
              ))}
            </div>
            <input
              className={cn(classeChamp, "mt-3 sm:w-64")}
              inputMode="tel"
              aria-label={`Numéro ${OPERATEURS.find((o) => o.mode === mode)?.nom}`}
              placeholder={OPERATEURS.find((o) => o.mode === mode)?.exemple}
              value={formaterTelephone(telephone)}
              onChange={(e) => setTelephone(e.target.value)}
            />
            {erreurTel && telephone.replace(/\D/g, "").length >= 10 && <p className="mt-1 text-xs text-gw-rose-action">{erreurTel}</p>}
            <p className="mt-1 text-xs text-gw-texte-pale dark:text-white/45">Paiement simulé : aucun montant n&apos;est réellement débité.</p>
          </fieldset>

          {erreur && <p className="rounded-xl bg-gw-rose-pale px-4 py-3 text-sm text-gw-rose-action dark:bg-gw-rose/15 dark:text-pink-200">{erreur}</p>}

          <div className="flex justify-end gap-2">
            <Bouton type="button" variante="discret" onClick={onFermer}>
              Annuler
            </Bouton>
            <Bouton type="submit" chargement={envoi} disabled={!tarif || n < 1}>
              Payer {montant(frais)} et générer
            </Bouton>
          </div>
        </form>
      )}
    </Modale>
  )
}

/* ---------- ventes déclarées par le revendeur ---------- */

function ModaleVentes({ lot, onFermer, onEnregistre }: { lot: LotResume | null; onFermer: () => void; onEnregistre: () => void }) {
  const [valeur, setValeur] = useState("")
  const [envoi, setEnvoi] = useState(false)
  useEffect(() => {
    if (lot) setValeur(String(lot.vendus))
  }, [lot])
  const enregistrer = async (e: FormEvent) => {
    e.preventDefault()
    if (!lot) return
    setEnvoi(true)
    try {
      await declarerVendus(lot.id, Math.floor(Number(valeur) || 0))
      toast.success("Ventes enregistrées.")
      onEnregistre()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Enregistrement impossible.")
    } finally {
      setEnvoi(false)
    }
  }
  return (
    <Modale ouverte={lot !== null} titre="Billets vendus déclarés" onFermer={onFermer}>
      {lot && (
        <form onSubmit={enregistrer} className="space-y-4">
          <p className="text-sm text-gw-texte-doux dark:text-white/65">
            {lot.type === "depot" ? `Nombre de billets que ${lot.revendeur_nom} déclare avoir vendus` : "Nombre de billets vendus au guichet"}, sur{" "}
            {lot.quantite}. Les billets déjà passés à l&apos;entrée ({lot.utilises}) comptent forcément comme vendus.
          </p>
          <Champ libelle="Billets vendus" requis>
            {(id) => (
              <input id={id} type="number" min={lot.utilises} max={lot.quantite} className={classeChamp} value={valeur} onChange={(e) => setValeur(e.target.value)} />
            )}
          </Champ>
          <div className="flex justify-end gap-2">
            <Bouton type="button" variante="discret" onClick={onFermer}>
              Annuler
            </Bouton>
            <Bouton type="submit" chargement={envoi}>
              Enregistrer
            </Bouton>
          </div>
        </form>
      )}
    </Modale>
  )
}

/* ---------- règlement : invendus rendus, argent encaissé ---------- */

function ModaleReglement({
  lot,
  seuilPct,
  onFermer,
  onRegle,
}: {
  lot: LotResume | null
  seuilPct: number
  onFermer: () => void
  onRegle: () => void
}) {
  const [detail, setDetail] = useState<LotDetail | null>(null)
  const [invendus, setInvendus] = useState<Set<string>>(new Set())
  const [forcer, setForcer] = useState(false)
  const [envoi, setEnvoi] = useState(false)

  useEffect(() => {
    setDetail(null)
    setForcer(false)
    if (!lot) return
    fetchLot(lot.id).then((d) => {
      setDetail(d)
      // par défaut : les derniers billets non vendus d'après les ventes déclarées
      const libres = d.billets.filter((b) => !b.utilise && !b.annule)
      const aRendre = Math.max(0, d.quantite - d.annules - d.vendus)
      setInvendus(new Set(lot.type === "invitation" ? [] : libres.slice(libres.length - Math.min(aRendre, libres.length)).map((b) => b.numero)))
    })
  }, [lot])

  if (!lot) return null
  const libres = detail?.billets.filter((b) => !b.utilise && !b.annule) ?? []
  const vendus = lot.quantite - lot.annules - invendus.size
  const sousSeuil = lot.type === "depot" && vendus < lot.seuil
  const basculer = (numero: string) =>
    setInvendus((s) => {
      const n = new Set(s)
      if (n.has(numero)) n.delete(numero)
      else n.add(numero)
      return n
    })

  const regler = async () => {
    setEnvoi(true)
    try {
      await reglerLot(lot.id, [...invendus], forcer)
      toast.success(lot.type === "invitation" ? "Lot clôturé." : `Lot réglé : ${montant(vendus * lot.prix_unitaire)} à encaisser.`)
      onRegle()
    } catch (e) {
      if (e instanceof ErreurApi && e.statut === 409) setForcer(false)
      toast.error(e instanceof Error ? e.message.replace(/^SEUIL_NON_ATTEINT:\s*/, "") : "Règlement impossible.")
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Modale ouverte titre={lot.type === "invitation" ? "Clôturer les invitations" : "Règlement du lot"} onFermer={onFermer} large>
      {!detail ? (
        <div className="flex items-center gap-2 py-8 text-gw-texte-doux">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement…
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gw-texte-doux dark:text-white/65">
            {lot.type === "invitation"
              ? "Cochez les invitations non distribuées : elles seront annulées et refusées à l'entrée."
              : `Cochez les billets que ${lot.type === "depot" ? "le revendeur vous rend" : "vous n'avez pas vendus"} : ils seront annulés et refusés à l'entrée. Les autres sont comptés comme vendus.`}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              <span className="font-semibold">{invendus.size}</span> {lot.type === "invitation" ? "à annuler" : "rendus invendus"} sur {libres.length} non utilisés
            </span>
            <span className="flex gap-2">
              <button type="button" className="font-semibold text-gw-violet dark:text-gw-lavande" onClick={() => setInvendus(new Set(libres.map((b) => b.numero)))}>
                Tout cocher
              </button>
              <button type="button" className="font-semibold text-gw-violet dark:text-gw-lavande" onClick={() => setInvendus(new Set())}>
                Aucun
              </button>
            </span>
          </div>
          <ul className="grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto rounded-2xl bg-gw-fond p-2 sm:grid-cols-3 dark:bg-white/5">
            {detail.billets.map((b, i) => (
              <li key={b.numero}>
                <label
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-2.5 py-1.5 font-mono text-xs",
                    b.utilise || b.annule ? "text-gw-texte-pale line-through dark:text-white/35" : "cursor-pointer bg-white dark:bg-white/5",
                  )}
                  title={b.utilise ? "Déjà passé à l'entrée" : b.annule ? "Déjà annulé" : undefined}
                >
                  <input type="checkbox" disabled={b.utilise || b.annule} checked={invendus.has(b.numero)} onChange={() => basculer(b.numero)} className="accent-gw-rose-action" />
                  <span className="text-gw-texte-pale">{i + 1}.</span> {b.numero}
                </label>
              </li>
            ))}
          </ul>
          {lot.type !== "invitation" && (
            <div className="flex items-center justify-between rounded-2xl border border-gw-bordure p-4 dark:border-gw-bordure-sombre">
              <span className="text-sm">
                <span className="font-semibold">{vendus}</span> billets vendus × {ariary(lot.prix_unitaire)}
              </span>
              <span className="font-titre text-xl font-semibold tabular-nums">{montant(vendus * lot.prix_unitaire)}</span>
            </div>
          )}
          {sousSeuil && (
            <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <div>
                <p>
                  Le revendeur n&apos;a vendu que {vendus} billets : le seuil de {seuilPct} % ({lot.seuil} billets) n&apos;est pas atteint.
                </p>
                <label className="mt-2 flex items-center gap-2 font-semibold">
                  <input type="checkbox" checked={forcer} onChange={(e) => setForcer(e.target.checked)} className="accent-gw-rose-action" />
                  Régler quand même (par exemple, l&apos;événement est passé)
                </label>
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Bouton variante="discret" onClick={onFermer}>
              Annuler
            </Bouton>
            <Bouton onClick={regler} chargement={envoi} disabled={sousSeuil && !forcer}>
              {lot.type === "invitation" ? "Clôturer" : "Confirmer le règlement"}
            </Bouton>
          </div>
        </div>
      )}
    </Modale>
  )
}
