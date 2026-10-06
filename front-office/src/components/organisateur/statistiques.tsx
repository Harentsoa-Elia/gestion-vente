"use client"

import { ListeVoirPlus } from "@/components/organisateur/voir-plus"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import Link from "next/link"
import { BarChart3, Flame, Loader2, ScanLine, Ticket, TicketPlus, Users, Wallet } from "lucide-react"
import type { Statistiques as Stats } from "@/types"
import { cn } from "@/utils"
import { fetchStatistiques } from "@/services/statistiquesService"
import { classeChamp } from "@/components/organisateur/ui"
import { StyleGraphiques } from "@/lib/couleurs-graphiques"

/*
 * Statistiques de l'organisateur (cahier des charges, « Dashboard organisateur ») :
 *  - indicateurs : billets vendus, total des ventes, remplissage, entrées, acheteurs ;
 *  - ventes par jour (billets ou montant, un seul axe à la fois) ;
 *  - entrées : scannés / pas encore entrés / places restantes ;
 *  - public : répartition femmes / hommes et tranches d'âge des acheteurs ;
 *  - ventes par tarif, remplissage par événement, événements les plus populaires ;
 *  - billets hors ligne (dépôt-vente, guichet, invitations) : inclus dans les indicateurs,
 *    détaillés dans leur propre carte (vendus, encore chez le revendeur, non scannés, à encaisser).
 * Couleurs : variables --stat-* de lib/couleurs-graphiques.ts.
 */



const entier = new Intl.NumberFormat("fr-FR")
const ariary = (n: number) => `${entier.format(Math.round(n))} Ar`
const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M Ar` : n >= 10_000 ? `${entier.format(Math.round(n / 1000))} k Ar` : ariary(n)
const pourcent = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0)
const jourCourt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "")
const jourLong = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })

const COULEUR_GENRE: Record<string, string> = {
  Femmes: "var(--stat-1)",
  Hommes: "var(--stat-2)",
  Autre: "var(--stat-3)",
  "Non précisé": "var(--stat-neutre)",
}

function Carte({ titre, sousTitre, action, children, className }: { titre: string; sousTitre?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("gw-carte p-5 sm:p-6", className)} aria-label={titre}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-titre text-lg font-semibold">{titre}</h2>
          {sousTitre && <p className="mt-0.5 text-xs text-gw-texte-doux dark:text-white/55">{sousTitre}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Tuile({ icone: Icone, libelle, valeur, detail }: { icone: typeof Ticket; libelle: string; valeur: string; detail?: string }) {
  return (
    <div className="gw-carte p-4 sm:p-5">
      <p className="flex items-center gap-2 text-xs text-gw-texte-doux sm:text-sm dark:text-white/60">
        <Icone className="h-4 w-4" aria-hidden /> {libelle}
      </p>
      <p className="font-titre mt-2 text-2xl font-bold sm:text-3xl">{valeur}</p>
      {detail && <p className="mt-1 text-xs text-gw-texte-doux dark:text-white/55">{detail}</p>}
    </div>
  )
}

/** Barre horizontale simple (valeur au bout), pour les listes courtes. */
function LigneBarre({ libelle, valeur, max, texte, couleur = "var(--stat-1)" }: { libelle: string; valeur: number; max: number; texte: string; couleur?: string }) {
  const largeur = max ? Math.max((valeur / max) * 100, valeur ? 2 : 0) : 0
  return (
    <li className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
      <span className="truncate text-gw-texte dark:text-white/80" title={libelle}>
        {libelle}
      </span>
      <span className="h-3 rounded-r-[4px] bg-transparent">
        <span className="block h-full rounded-r-[4px]" style={{ width: `${largeur}%`, backgroundColor: couleur }} />
      </span>
      <span className="text-right font-semibold tabular-nums">{texte}</span>
    </li>
  )
}

/** Jauge : remplissage d'un événement (piste = étape claire du même violet). */
function Jauge({ valeur }: { valeur: number }) {
  return (
    <span className="block h-2.5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--stat-piste)" }}>
      <span className="block h-full rounded-full" style={{ width: `${Math.min(valeur, 100)}%`, backgroundColor: "var(--stat-1)" }} />
    </span>
  )
}

function InfoBulle({ active, payload, mesure }: { active?: boolean; payload?: { payload: { date: string; billets: number; montant: number } }[]; mesure: "billets" | "montant" }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-gw-bordure dark:bg-gw-carte-sombre dark:ring-white/10">
      <p className="font-semibold text-gw-nuit first-letter:uppercase dark:text-white">{jourLong(p.date)}</p>
      <p className={cn("mt-1", mesure === "billets" ? "font-semibold text-gw-nuit dark:text-white" : "text-gw-texte-doux dark:text-white/60")}>
        {entier.format(p.billets)} billet{p.billets > 1 ? "s" : ""}
      </p>
      <p className={cn(mesure === "montant" ? "font-semibold text-gw-nuit dark:text-white" : "text-gw-texte-doux dark:text-white/60")}>{ariary(p.montant)}</p>
    </div>
  )
}

export function Statistiques() {
  const [evenementId, setEvenementId] = useState<number | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [evenementsListe, setEvenementsListe] = useState<Stats["evenements"]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [mesure, setMesure] = useState<"billets" | "montant">("billets")

  useEffect(() => {
    let actif = true
    setChargement(true)
    fetchStatistiques(evenementId)
      .then((s) => {
        if (!actif) return
        setStats(s)
        setErreur(null)
        if (evenementId == null) setEvenementsListe(s.evenements)
      })
      .catch((e) => actif && setErreur(e instanceof Error ? e.message : "Impossible de charger les statistiques."))
      .finally(() => actif && setChargement(false))
    return () => {
      actif = false
    }
  }, [evenementId])

  const totalGenres = useMemo(() => stats?.genres.reduce((s, g) => s + g.nombre, 0) ?? 0, [stats])

  if (!stats && chargement) {
    return (
      <div className="flex items-center gap-2 px-4 py-16 text-gw-texte-doux lg:px-8 dark:text-white/60">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement des statistiques…
      </div>
    )
  }
  if (erreur && !stats) return <p className="px-4 py-16 text-center text-gw-rose-action lg:px-8">{erreur}</p>
  if (!stats) return null

  const i = stats.indicateurs
  const unSeul = evenementId != null
  const aucunEvenement = evenementsListe.length === 0 && !unSeul
  const maxAge = Math.max(...stats.tranches_age.map((t) => t.nombre), 0)
  const maxTarif = Math.max(...stats.par_tarif.map((t) => t.vendus), 0)
  const populaires = [...stats.evenements].sort((a, b) => b.score_popularite - a.score_popularite).slice(0, 5)
  const maxScore = Math.max(...populaires.map((e) => e.score_popularite), 0)
  // entrées : scannés, vendus pas encore entrés, places restantes (si la capacité est connue)
  const restantes = i.places_restantes ?? 0
  const hl = stats.hors_ligne
  // billets valables : vendus en ligne et hors ligne, invitations et billets en dépôt compris
  const valables = i.entres + i.non_scannes
  const baseEntrees = i.entres + i.non_scannes + restantes
  const segments = [
    { libelle: "Entrés (scannés)", nombre: i.entres, couleur: "var(--stat-1)" },
    { libelle: "Pas encore entrés", nombre: i.non_scannes, couleur: "var(--stat-clair)" },
    ...(i.places_restantes != null ? [{ libelle: "Places restantes", nombre: restantes, couleur: "var(--stat-piste)" }] : []),
  ]

  return (
    <div className={cn("gw-stats space-y-6 px-4 py-6 lg:px-8 lg:py-8", chargement && "opacity-70 transition-opacity")}>
      <StyleGraphiques />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-titre text-2xl font-semibold">Statistiques</h1>
          <p className="mt-1 max-w-2xl text-sm text-gw-texte-doux dark:text-white/65">
            Ventes, entrées et public de vos événements publiés. Les chiffres sont mis à jour à chaque vente et à chaque scan.
          </p>
        </div>
        <label className="w-full sm:w-80">
          <span className="mb-1.5 block text-xs font-semibold text-gw-texte-doux dark:text-white/60">Événement</span>
          <select value={evenementId ?? ""} onChange={(e) => setEvenementId(e.target.value ? Number(e.target.value) : null)} className={classeChamp}>
            <option value="">Tous mes événements</option>
            {evenementsListe.map((e) => (
              <option key={e.id} value={e.id}>
                {e.titre}
              </option>
            ))}
          </select>
        </label>
      </div>

      {aucunEvenement ? (
        <div className="gw-carte flex flex-col items-center gap-3 px-6 py-14 text-center">
          <BarChart3 className="h-8 w-8 text-gw-violet dark:text-gw-lavande" aria-hidden />
          <p className="font-titre text-lg font-semibold">Pas encore de statistiques</p>
          <p className="max-w-md text-sm text-gw-texte-doux dark:text-white/60">Elles apparaîtront dès qu&apos;un de vos événements sera validé et mis en vente.</p>
        </div>
      ) : (
        <>
          {/* indicateurs */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5 [&>*:last-child]:col-span-2 xl:[&>*:last-child]:col-span-1">
            <Tuile
              icone={Ticket}
              libelle="Billets vendus"
              valeur={entier.format(i.billets_vendus)}
              detail={i.en_attente ? `+ ${i.en_attente} réservation${i.en_attente > 1 ? "s" : ""} en attente de paiement` : undefined}
            />
            <Tuile icone={Wallet} libelle="Total des ventes" valeur={compact(i.recettes)} detail={ariary(i.recettes)} />
            <Tuile
              icone={BarChart3}
              libelle="Taux de remplissage"
              valeur={i.taux_remplissage != null ? `${entier.format(i.taux_remplissage)} %` : "—"}
              detail={i.places_restantes != null ? `${entier.format(i.places_restantes)} places restantes sur ${entier.format(i.capacite ?? 0)}` : "Capacité non renseignée"}
            />
            <Tuile
              icone={ScanLine}
              libelle="Entrées"
              valeur={`${entier.format(i.entres)} / ${entier.format(valables)}`}
              detail={`${pourcent(i.entres, valables)} % des billets scannés${hl.emis ? ", hors ligne compris" : ""}`}
            />
            <Tuile icone={Users} libelle="Acheteurs" valeur={entier.format(i.participants)} detail="Personnes ayant payé au moins un billet" />
          </div>

          {hl.emis > 0 && (
            <Carte
              titre="Billets hors ligne"
              sousTitre="Dépôt-vente, guichet et invitations : déjà comptés dans les indicateurs ci-dessus (ventes, remplissage, entrées)"
              action={
                <Link href="/organisateur/billets-hors-ligne" className="text-sm font-semibold text-gw-violet dark:text-gw-lavande">
                  Gérer les lots
                </Link>
              }
            >
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
                {[
                  { l: "Billets émis", v: entier.format(hl.emis), d: "non annulés" },
                  { l: "Vendus", v: entier.format(hl.vendus), d: "réglés ou déclarés" },
                  { l: "Pas encore vendus", v: entier.format(hl.en_depot), d: "chez le revendeur ou au guichet" },
                  { l: "Invitations", v: entier.format(hl.invitations), d: "billets offerts" },
                  { l: "Non scannés", v: entier.format(hl.non_scannes), d: `${entier.format(hl.entres)} déjà entrés` },
                  { l: "Ventes hors ligne", v: compact(hl.recettes), d: hl.a_encaisser ? `dont ${ariary(hl.a_encaisser)} à encaisser` : "tout est réglé" },
                ].map((x) => (
                  <div key={x.l} className="rounded-2xl bg-gw-fond p-3 dark:bg-white/5">
                    <dt className="text-xs text-gw-texte-doux dark:text-white/60">{x.l}</dt>
                    <dd className="font-titre mt-1 text-xl font-bold tabular-nums">{x.v}</dd>
                    <dd className="text-[11px] text-gw-texte-doux dark:text-white/50">{x.d}</dd>
                  </div>
                ))}
              </dl>
              <ul className="mt-5 space-y-3">
                {hl.par_type.map((t) => (
                  <li key={t.type}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 font-semibold">
                        <TicketPlus className="h-4 w-4 text-gw-violet dark:text-gw-lavande" aria-hidden /> {t.libelle}
                      </span>
                      <span className="text-xs text-gw-texte-doux tabular-nums dark:text-white/60">
                        {t.type === "invitation"
                          ? `${entier.format(t.emis)} offertes · ${entier.format(t.entres)} entrées`
                          : `${entier.format(t.vendus)} vendus / ${entier.format(t.emis)} · ${entier.format(t.entres)} entrés · ${entier.format(t.emis - t.entres)} non scannés`}
                      </span>
                    </div>
                    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-gw-fond dark:bg-white/10" role="img" aria-label={`${t.libelle} : ${t.entres} entrés sur ${t.emis}`}>
                      <span className="h-full" style={{ width: `${pourcent(t.entres, t.emis)}%`, background: "var(--stat-1)" }} />
                      {t.type !== "invitation" && (
                        <span className="h-full" style={{ width: `${pourcent(Math.max(t.vendus - t.entres, 0), t.emis)}%`, background: "var(--stat-clair)" }} />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-gw-texte-doux dark:text-white/55">
                Barre : entrés (foncé), vendus pas encore entrés (clair), reste en dépôt ou non distribué (fond).
              </p>
            </Carte>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            {/* ventes par jour */}
            <Carte
              className="lg:col-span-2"
              titre="Ventes par jour"
              sousTitre="Jour du paiement, heure de Madagascar"
              action={
                <div role="tablist" aria-label="Mesure" className="inline-flex rounded-full bg-gw-fond p-1 text-xs font-semibold dark:bg-white/10">
                  {(["billets", "montant"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      role="tab"
                      aria-selected={mesure === m}
                      onClick={() => setMesure(m)}
                      className={cn("rounded-full px-3 py-1.5", mesure === m ? "bg-white text-gw-nuit shadow-sm dark:bg-gw-nuit dark:text-white" : "text-gw-texte-doux dark:text-white/60")}
                    >
                      {m === "billets" ? "Billets" : "Montant"}
                    </button>
                  ))}
                </div>
              }
            >
              {stats.ventes_par_jour.length === 0 ? (
                <p className="py-16 text-center text-sm text-gw-texte-doux dark:text-white/55">Aucune vente pour l&apos;instant.</p>
              ) : (
                <>
                  <div className="h-64" role="img" aria-label={`Ventes par jour, ${mesure === "billets" ? "en billets" : "en ariary"}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.ventes_par_jour} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke="var(--stat-grille)" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={jourCourt}
                          tick={{ fill: "var(--stat-axe)", fontSize: 11 }}
                          axisLine={{ stroke: "var(--stat-grille)" }}
                          tickLine={false}
                          minTickGap={16}
                        />
                        <YAxis
                          allowDecimals={false}
                          tickFormatter={(v: number) => (mesure === "montant" ? compact(v).replace(" Ar", "") : entier.format(v))}
                          tick={{ fill: "var(--stat-axe)", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          width={48}
                        />
                        <Tooltip cursor={{ fill: "var(--stat-piste)", opacity: 0.6 }} content={<InfoBulle mesure={mesure} />} />
                        <Bar dataKey={mesure} fill="var(--stat-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-xs font-semibold text-gw-violet dark:text-gw-lavande">Voir le tableau</summary>
                    <table className="mt-2 w-full text-left text-xs">
                      <thead className="text-gw-texte-doux dark:text-white/55">
                        <tr>
                          <th className="py-1 font-medium">Jour</th>
                          <th className="py-1 text-right font-medium">Billets</th>
                          <th className="py-1 text-right font-medium">Montant</th>
                        </tr>
                      </thead>
                      <tbody className="tabular-nums">
                        {stats.ventes_par_jour
                          .filter((v) => v.billets > 0)
                          .map((v) => (
                            <tr key={v.date} className="border-t border-gw-bordure dark:border-white/10">
                              <td className="py-1 first-letter:uppercase">{jourLong(v.date)}</td>
                              <td className="py-1 text-right">{entier.format(v.billets)}</td>
                              <td className="py-1 text-right">{ariary(v.montant)}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </details>
                </>
              )}
            </Carte>

            {/* entrées */}
            <Carte titre="Réservations et entrées" sousTitre="Billets vendus, scannés à l'entrée et places restantes">
              {baseEntrees === 0 ? (
                <p className="py-10 text-center text-sm text-gw-texte-doux dark:text-white/55">Aucun billet vendu pour l&apos;instant.</p>
              ) : (
                <>
                  <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={segments.map((s) => `${s.libelle} : ${s.nombre}`).join(", ")}>
                    {segments
                      .filter((s) => s.nombre > 0)
                      .map((s) => (
                        <span key={s.libelle} title={`${s.libelle} : ${entier.format(s.nombre)}`} style={{ flexGrow: s.nombre, backgroundColor: s.couleur }} />
                      ))}
                  </div>
                  <ul className="mt-5 space-y-3 text-sm">
                    {segments.map((s) => (
                      <li key={s.libelle} className="flex items-center gap-3">
                        <span aria-hidden className="h-3 w-3 shrink-0 rounded-[3px]" style={{ backgroundColor: s.couleur }} />
                        <span className="flex-1 text-gw-texte dark:text-white/80">{s.libelle}</span>
                        <span className="font-semibold tabular-nums">{entier.format(s.nombre)}</span>
                        <span className="w-10 text-right text-xs text-gw-texte-doux tabular-nums dark:text-white/55">{pourcent(s.nombre, baseEntrees)} %</span>
                      </li>
                    ))}
                  </ul>
                  {i.places_restantes == null && (
                    <p className="mt-4 text-xs text-gw-texte-doux dark:text-white/55">
                      Renseignez la capacité de l&apos;événement (ou un quota par tarif) pour voir les places restantes.
                    </p>
                  )}
                </>
              )}
            </Carte>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* public */}
            <Carte titre="Public" sousTitre={`${entier.format(i.participants)} acheteur${i.participants > 1 ? "s" : ""} (une personne peut acheter pour plusieurs)`}>
              {totalGenres === 0 ? (
                <p className="py-10 text-center text-sm text-gw-texte-doux dark:text-white/55">Pas encore d&apos;acheteurs.</p>
              ) : (
                <>
                  <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={stats.genres.map((g) => `${g.libelle} : ${g.nombre}`).join(", ")}>
                    {stats.genres.map((g) => (
                      <span key={g.libelle} title={`${g.libelle} : ${g.nombre}`} style={{ flexGrow: g.nombre, backgroundColor: COULEUR_GENRE[g.libelle] }} />
                    ))}
                  </div>
                  <ul className="mt-5 space-y-3 text-sm">
                    {stats.genres.map((g) => (
                      <li key={g.libelle} className="flex items-center gap-3">
                        <span aria-hidden className="h-3 w-3 shrink-0 rounded-[3px]" style={{ backgroundColor: COULEUR_GENRE[g.libelle] }} />
                        <span className="flex-1 text-gw-texte dark:text-white/80">{g.libelle}</span>
                        <span className="font-semibold tabular-nums">{entier.format(g.nombre)}</span>
                        <span className="w-10 text-right text-xs text-gw-texte-doux tabular-nums dark:text-white/55">{pourcent(g.nombre, totalGenres)} %</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </Carte>

            <Carte titre="Tranches d'âge" sousTitre="Âge des acheteurs aujourd'hui">
              {maxAge === 0 ? (
                <p className="py-10 text-center text-sm text-gw-texte-doux dark:text-white/55">Pas encore d&apos;acheteurs.</p>
              ) : (
                <ul className="space-y-3">
                  {stats.tranches_age.map((t) => (
                    <LigneBarre
                      key={t.libelle}
                      libelle={t.libelle}
                      valeur={t.nombre}
                      max={maxAge}
                      texte={entier.format(t.nombre)}
                      couleur={t.libelle === "Âge non précisé" ? "var(--stat-neutre)" : undefined}
                    />
                  ))}
                </ul>
              )}
            </Carte>

            <Carte titre="Ventes par tarif">
              {stats.par_tarif.length === 0 ? (
                <p className="py-10 text-center text-sm text-gw-texte-doux dark:text-white/55">Aucune vente pour l&apos;instant.</p>
              ) : (
                <ListeVoirPlus elements={stats.par_tarif}>
                  {(tarifs) => (
                <>
                  <ul className="space-y-3">
                    {tarifs.map((t) => (
                      <LigneBarre key={t.nom} libelle={t.nom} valeur={t.vendus} max={maxTarif} texte={entier.format(t.vendus)} />
                    ))}
                  </ul>
                  <table className="mt-5 w-full text-left text-xs">
                    <thead className="text-gw-texte-doux dark:text-white/55">
                      <tr>
                        <th className="py-1 font-medium">Tarif</th>
                        <th className="py-1 text-right font-medium">Montant</th>
                      </tr>
                    </thead>
                    <tbody className="tabular-nums">
                      {tarifs.map((t) => (
                        <tr key={t.nom} className="border-t border-gw-bordure dark:border-white/10">
                          <td className="py-1">{t.nom}</td>
                          <td className="py-1 text-right">{ariary(t.montant)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
                  )}
                </ListeVoirPlus>
              )}
            </Carte>
          </div>

          {!unSeul && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Carte titre="Remplissage par événement" sousTitre="Places occupées (en ligne, hors ligne et invitations) par rapport à la capacité">
                <ListeVoirPlus elements={stats.evenements}>
                  {(evenementsVisibles) => (
                <ul className="space-y-4">
                  {evenementsVisibles.map((e) => (
                    <li key={e.id}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
                        <button type="button" onClick={() => setEvenementId(e.id)} className="truncate text-left font-semibold hover:text-gw-violet dark:hover:text-gw-lavande">
                          {e.titre}
                        </button>
                        <span className="shrink-0 text-xs text-gw-texte-doux tabular-nums dark:text-white/60">
                          {`${entier.format(e.vendus)} vendus${e.capacite ? ` · ${entier.format(e.capacite)} places` : ""} · `}
                          <strong className="text-gw-nuit dark:text-white">{e.taux_remplissage != null ? `${entier.format(e.taux_remplissage)} %` : "capacité ?"}</strong>
                        </span>
                      </div>
                      <Jauge valeur={e.taux_remplissage ?? 0} />
                    </li>
                  ))}
                </ul>
                  )}
                </ListeVoirPlus>
              </Carte>

              <Carte titre="Événements les plus populaires" sousTitre="Points des réactions du public aux propositions (J'aime 1, Waouh 2, Favori 2, J'adore 3)">
                {maxScore === 0 ? (
                  <p className="py-10 text-center text-sm text-gw-texte-doux dark:text-white/55">Pas encore de réactions du public.</p>
                ) : (
                  <ul className="space-y-3">
                    {populaires.map((e) => (
                      <LigneBarre key={e.id} libelle={e.titre} valeur={e.score_popularite} max={maxScore} texte={`${entier.format(e.score_popularite)} pts`} couleur="var(--stat-2)" />
                    ))}
                  </ul>
                )}
                <p className="mt-4 flex items-center gap-1.5 text-xs text-gw-texte-doux dark:text-white/55">
                  <Flame className="h-3.5 w-3.5" aria-hidden /> Les propositions les plus soutenues sont détaillées dans Recommandations.
                </p>
              </Carte>
            </div>
          )}
        </>
      )}
    </div>
  )
}
