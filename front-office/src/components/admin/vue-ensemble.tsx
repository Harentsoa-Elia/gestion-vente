"use client"

import { ListeVoirPlus } from "@/components/organisateur/voir-plus"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowRight, CalendarPlus, CalendarRange, CheckCircle2, Loader2, RefreshCw, ScanLine, ShieldCheck, Ticket, UserCog, UserPlus, Users, type LucideIcon } from "lucide-react"
import { Anneau } from "@/components/organisateur/anneau"
import type { ActiviteAdmin, VueEnsemble as Donnees } from "@/types"
import { cn } from "@/utils"
import { fetchVueEnsemble } from "@/services/administrationService"
import { StyleGraphiques } from "@/lib/couleurs-graphiques"

/*
 * Vue d'ensemble de l'administrateur (supervision) : chiffres de toute la plateforme,
 * événements à valider, ventes des 30 derniers jours, événements les plus vendus
 * et activité récente (ventes, inscriptions, événements créés, entrées scannées).
 * Même style que l'espace organisateur : bandeau violet nuit, pastilles d'icônes, dégradé violet -> rose.
 */

const entier = new Intl.NumberFormat("fr-FR")
const ariary = (n: number) => `${entier.format(Math.round(n))} Ar`
const jourCourt = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "")
const jourLong = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })

function ilYa(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return "à l'instant"
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`
  if (s < 7 * 86400) return `il y a ${Math.floor(s / 86400)} j`
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
}

const ACTIVITE: Record<ActiviteAdmin["type"], { icone: LucideIcon; fond: string }> = {
  vente: { icone: Ticket, fond: "bg-gw-violet/12 text-gw-violet dark:bg-white/10 dark:text-gw-lavande" },
  inscription: { icone: UserPlus, fond: "bg-gw-lavande text-gw-violet-fonce dark:bg-gw-violet/15 dark:text-gw-lavande" },
  evenement: { icone: CalendarPlus, fond: "bg-gw-rose-pale text-gw-rose-action dark:bg-gw-rose/15 dark:text-gw-rose" },
  entree: { icone: ScanLine, fond: "bg-gw-lavande text-gw-violet-fonce dark:bg-gw-violet/15 dark:text-gw-lavande" },
}

const STATUTS = [
  { cle: "valide", libelle: "Publiés", point: "bg-gw-violet" },
  { cle: "en_attente_validation", libelle: "À valider", point: "bg-gw-rose-action" },
  { cle: "brouillon", libelle: "Brouillons", point: "bg-gw-lavande dark:bg-white/40" },
  { cle: "rejete", libelle: "Rejetés", point: "bg-gw-rose-pale dark:bg-gw-rose/40" },
]

function Tuile({ icone: Icone, libelle, valeur, detail, lien, rose = false }: { icone: LucideIcon; libelle: string; valeur: string; detail?: string; lien?: string; rose?: boolean }) {
  const contenu = (
    <>
      <p className="flex items-center gap-2 text-xs text-gw-texte-doux sm:text-sm dark:text-white/60">
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-xl",
            rose ? "bg-gw-rose-pale text-gw-rose-action dark:bg-gw-rose/15 dark:text-gw-rose" : "bg-gw-violet-pale text-gw-violet dark:bg-white/10 dark:text-gw-lavande",
          )}
        >
          <Icone className="h-4 w-4" aria-hidden />
        </span>
        {libelle}
      </p>
      <p className="font-titre mt-3 text-2xl font-bold whitespace-nowrap tabular-nums sm:text-3xl xl:text-[1.65rem]">{valeur}</p>
      {detail && <p className="mt-1 text-xs text-gw-texte-doux dark:text-white/55">{detail}</p>}
    </>
  )
  return lien ? (
    <Link href={lien} className="gw-carte block p-4 transition-transform hover:-translate-y-0.5 hover:ring-2 hover:ring-gw-lavande sm:p-5 dark:hover:ring-white/15">
      {contenu}
    </Link>
  ) : (
    <div className="gw-carte p-4 sm:p-5">{contenu}</div>
  )
}

function InfoBulle({ active, payload }: { active?: boolean; payload?: { payload: { date: string; billets: number; montant: number } }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="rounded-xl bg-gw-surface px-3 py-2 text-xs shadow-lg ring-1 ring-gw-bordure dark:bg-gw-carte-sombre dark:ring-white/10">
      <p className="font-semibold text-gw-encre first-letter:uppercase dark:text-white">{jourLong(p.date)}</p>
      <p className="mt-1 font-semibold text-gw-encre dark:text-white">
        {entier.format(p.billets)} billet{p.billets > 1 ? "s" : ""}
      </p>
      <p className="text-gw-texte-doux dark:text-white/60">{ariary(p.montant)}</p>
    </div>
  )
}

export function VueEnsemble() {
  const [d, setD] = useState<Donnees | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)

  const charger = () => {
    setChargement(true)
    fetchVueEnsemble()
      .then((x) => {
        setD(x)
        setErreur(null)
      })
      .catch((e) => setErreur(e instanceof Error ? e.message : "Impossible de charger la vue d'ensemble."))
      .finally(() => setChargement(false))
  }
  useEffect(charger, [])

  if (!d && chargement) {
    return (
      <div className="flex items-center gap-2 px-4 py-16 text-gw-texte-doux lg:px-8 dark:text-white/60">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement...
      </div>
    )
  }
  if (!d) return <p className="px-4 py-16 text-center text-gw-rose-action lg:px-8">{erreur}</p>

  const aValider = d.evenements["en_attente_validation"] ?? 0
  const totalEvenements = Object.values(d.evenements).reduce((s, n) => s + n, 0)
  const ventes30 = d.ventes_30_jours.reduce((s, v) => s + v.billets, 0)
  const maxTop = Math.max(...d.top_evenements.map((e) => e.vendus), 0)
  const tauxEntrees = d.billets_vendus ? Math.round((d.entrees / d.billets_vendus) * 100) : 0

  return (
    <div className="gw-stats space-y-6 px-4 py-6 lg:px-8 lg:py-8">
      <StyleGraphiques />
      {/* bandeau : toute la plateforme en un coup d'oeil, et ce qui attend l'administrateur */}
      <section className="relative overflow-hidden rounded-3xl bg-gw-nuit p-6 text-white sm:p-8 dark:ring-1 dark:ring-white/10" aria-labelledby="vue-titre">
        <span aria-hidden className="absolute -top-28 -right-24 h-72 w-72 rounded-full bg-gw-violet/40 blur-3xl" />
        <span aria-hidden className="absolute -bottom-36 left-1/4 h-64 w-64 rounded-full bg-gw-rose-action/25 blur-3xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.16em] text-white/60 uppercase">Administration</p>
            <h1 id="vue-titre" className="font-titre mt-1 text-3xl font-bold">Vue d&apos;ensemble</h1>
            <p className="mt-1 max-w-xl text-sm text-white/70">Toute l&apos;activité de guichetweb : comptes, événements, ventes et entrées.</p>
          </div>
          <button
            type="button"
            onClick={charger}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", chargement && "animate-spin")} aria-hidden /> Actualiser
          </button>
        </div>

        <div className="relative mt-7 grid gap-6 lg:grid-cols-[1.2fr_1fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-white/60 uppercase">Montant des ventes</p>
            <p className="font-titre mt-1 text-4xl font-bold">{ariary(d.total_ventes)}</p>
            <p className="mt-1 text-sm text-white/65">
              {entier.format(d.billets_vendus)} billets vendus, dont {entier.format(ventes30)} ces 30 derniers jours
            </p>
          </div>
          <div className="flex items-center gap-4 lg:border-l lg:border-white/15 lg:pl-6">
            <div className="relative shrink-0">
              <Anneau id="admin-entrees" pourcentage={tauxEntrees} taille={96} epaisseur={11} />
              <span className="font-titre absolute inset-0 grid place-items-center text-xl font-bold">{tauxEntrees} %</span>
            </div>
            <div>
              <p className="text-xs font-semibold tracking-[0.14em] text-white/60 uppercase">Entrées scannées</p>
              <p className="mt-1 text-sm text-white/75">
                {entier.format(d.entrees)} sur {entier.format(d.billets_vendus)} billets
              </p>
            </div>
          </div>
          {aValider > 0 ? (
            <Link
              href="/admin/evenements"
              className="group flex items-center gap-4 rounded-2xl bg-white/10 p-4 transition-colors hover:bg-white/15"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gw-rose-action">
                <ShieldCheck className="h-6 w-6" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="font-titre block font-semibold">
                  {aValider} événement{aValider > 1 ? "s attendent" : " attend"} votre validation
                </span>
                <span className="text-xs text-white/70">Vérifiez, puis publiez ou demandez une correction.</span>
              </span>
              <ArrowRight className="h-5 w-5 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ) : (
            <div className="flex items-center gap-4 rounded-2xl bg-white/10 p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gw-violet">
                <CheckCircle2 className="h-6 w-6" aria-hidden />
              </span>
              <span>
                <span className="font-titre block font-semibold">Tout est à jour</span>
                <span className="text-xs text-white/70">Aucun événement n&apos;attend votre validation.</span>
              </span>
            </div>
          )}
        </div>
      </section>

      {/* comptes et événements : le travail de l'administrateur (les ventes sont dans le bandeau) */}
      <div className="grid gap-3 sm:grid-cols-3 sm:gap-4">
        <Tuile icone={Users} libelle="Participants" valeur={entier.format(d.participants)} detail={`${entier.format(d.participants_verifies)} e-mails confirmés`} lien="/admin/utilisateurs?onglet=participants" />
        <Tuile
          rose
          icone={UserCog}
          libelle="Équipe"
          valeur={entier.format(d.organisateurs)}
          detail={
            d.organisateurs_suspendus
              ? `${entier.format(d.organisateurs - d.organisateurs_suspendus)} actifs, ${d.organisateurs_suspendus} suspendu${d.organisateurs_suspendus > 1 ? "s" : ""}`
              : "tous les comptes sont actifs"
          }
          lien="/admin/utilisateurs"
        />
        <Tuile icone={CalendarRange} libelle="Événements publiés" valeur={entier.format(d.evenements["valide"] ?? 0)} detail={`${entier.format(totalEvenements)} au total`} lien="/admin/evenements" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="gw-carte flex flex-col p-5 sm:p-6 lg:col-span-2" aria-label="Ventes des 30 derniers jours">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="font-titre text-lg font-semibold">Ventes des 30 derniers jours</h2>
              <p className="mt-0.5 mb-4 text-xs text-gw-texte-doux dark:text-white/55">Billets payés par jour, tous événements confondus</p>
            </div>
            <span className="rounded-full bg-gw-fond px-3 py-1 text-xs font-semibold text-gw-violet dark:bg-white/10 dark:text-white">
              {entier.format(ventes30)} billets
            </span>
          </div>
          {ventes30 === 0 ? (
            <p className="py-16 text-center text-sm text-gw-texte-doux dark:text-white/55">Aucune vente ces 30 derniers jours.</p>
          ) : (
            <div className="h-60 lg:h-auto lg:min-h-60 lg:flex-1" role="img" aria-label={`${ventes30} billets vendus ces 30 derniers jours`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.ventes_30_jours} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--stat-grille)" />
                  <XAxis dataKey="date" tickFormatter={jourCourt} tick={{ fill: "var(--stat-axe)", fontSize: 11 }} axisLine={{ stroke: "var(--stat-grille)" }} tickLine={false} minTickGap={20} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--stat-axe)", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip cursor={{ fill: "var(--stat-piste)", opacity: 0.6 }} content={<InfoBulle />} />
                  <defs>
                    <linearGradient id="admin-barres" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#E8479A" />
                      <stop offset="1" stopColor="#6C5CE7" />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="billets" fill="url(#admin-barres)" radius={[6, 6, 0, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="gw-carte p-5 sm:p-6" aria-label="Événements">
          <h2 className="font-titre text-lg font-semibold">Événements</h2>
          <ul className="mt-4 grid grid-cols-2 gap-3">
            {STATUTS.map((s) => (
              <li key={s.cle} className="rounded-2xl bg-gw-fond p-3 dark:bg-white/5">
                <p className="flex items-center gap-1.5 text-xs text-gw-texte-doux dark:text-white/55">
                  <span className={cn("h-2 w-2 rounded-full", s.point)} aria-hidden />
                  {s.libelle}
                </p>
                <p className="font-titre text-2xl font-bold">{entier.format(d.evenements[s.cle] ?? 0)}</p>
              </li>
            ))}
          </ul>
          <h3 className="mt-6 text-sm font-semibold">Les plus vendus</h3>
          {d.top_evenements.length === 0 ? (
            <p className="mt-2 text-sm text-gw-texte-doux dark:text-white/55">Aucune vente pour l&apos;instant.</p>
          ) : (
            <ListeVoirPlus elements={d.top_evenements}>
              {(topPage) => (
            <ul className="mt-3 space-y-3">
              {topPage.map((e) => {
                const premier = e.vendus === maxTop
                return (
                  <li key={e.id} className="flex items-center gap-3">
                    <span
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold",
                        premier ? "bg-[linear-gradient(135deg,#6C5CE7,#C92A7A)] text-white" : "bg-gw-violet-pale text-gw-violet dark:bg-white/10 dark:text-white",
                      )}
                    >
                      {d.top_evenements.indexOf(e) + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                        <Link href={`/evenements/${e.id}`} className="truncate hover:text-gw-violet dark:hover:text-gw-lavande">
                          {e.titre}
                        </Link>
                        <span className="shrink-0 font-semibold tabular-nums">{entier.format(e.vendus)}</span>
                      </span>
                      <span className="block h-2 rounded-full bg-gw-fond dark:bg-white/10">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${maxTop ? Math.max((e.vendus / maxTop) * 100, 3) : 0}%`,
                            background: premier ? "linear-gradient(90deg,#6C5CE7,#E8479A)" : "var(--stat-1)",
                          }}
                        />
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
              )}
            </ListeVoirPlus>
          )}
        </section>
      </div>

      <section className="gw-carte p-5 sm:p-6" aria-label="Activité récente">
        <h2 className="font-titre text-lg font-semibold">Activité récente</h2>
        <p className="mt-0.5 text-xs text-gw-texte-doux dark:text-white/55">Ventes, inscriptions, événements créés et entrées scannées</p>
        {d.activite.length === 0 ? (
          <p className="py-10 text-center text-sm text-gw-texte-doux dark:text-white/55">Rien pour l&apos;instant.</p>
        ) : (
          <ListeVoirPlus elements={d.activite}>
            {(activitePage) => (
          <ol className="mt-4 divide-y divide-gw-bordure dark:divide-white/10">
            {activitePage.map((a, k) => {
              const style = ACTIVITE[a.type]
              const Icone = style.icone
              const texte = <span className="text-sm">{a.texte}</span>
              return (
                <li key={k} className="flex items-center gap-3 py-3">
                  <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-xl", style.fond)}>
                    <Icone className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    {a.lien ? (
                      <Link href={a.lien} className="hover:text-gw-violet dark:hover:text-gw-lavande">
                        {texte}
                      </Link>
                    ) : (
                      texte
                    )}
                  </span>
                  <time dateTime={a.date} className="shrink-0 text-xs text-gw-texte-doux dark:text-white/55" title={new Date(a.date).toLocaleString("fr-FR")}>
                    {ilYa(a.date)}
                  </time>
                </li>
              )
            })}
          </ol>
            )}
          </ListeVoirPlus>
        )}
      </section>
    </div>
  )
}
