"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { ArrowRight, CalendarPlus, CalendarRange, Loader2, RefreshCw, ScanLine, ShieldCheck, Ticket, UserPlus, Users, Wallet, type LucideIcon } from "lucide-react"
import type { ActiviteAdmin, VueEnsemble as Donnees } from "@/types"
import { cn } from "@/utils"
import { fetchVueEnsemble } from "@/services/administrationService"
import { StyleGraphiques } from "@/lib/couleurs-graphiques"

/*
 * Vue d'ensemble de l'administrateur (supervision) : chiffres de toute la plateforme,
 * événements à valider, ventes des 30 derniers jours, événements les plus vendus
 * et activité récente (ventes, inscriptions, événements créés, entrées scannées).
 */

const entier = new Intl.NumberFormat("fr-FR")
const ariary = (n: number) => `${entier.format(Math.round(n))} Ar`
const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} M Ar` : n >= 10_000 ? `${entier.format(Math.round(n / 1000))} k Ar` : ariary(n)
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
  inscription: { icone: UserPlus, fond: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300" },
  evenement: { icone: CalendarPlus, fond: "bg-gw-rose-pale text-gw-rose-action dark:bg-gw-rose/15 dark:text-gw-rose" },
  entree: { icone: ScanLine, fond: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300" },
}

const STATUTS = [
  { cle: "valide", libelle: "Publiés" },
  { cle: "en_attente_validation", libelle: "À valider" },
  { cle: "brouillon", libelle: "Brouillons" },
  { cle: "rejete", libelle: "Rejetés" },
]

function Tuile({ icone: Icone, libelle, valeur, detail, lien }: { icone: LucideIcon; libelle: string; valeur: string; detail?: string; lien?: string }) {
  const contenu = (
    <>
      <p className="flex items-center gap-2 text-xs text-gw-texte-doux sm:text-sm dark:text-white/60">
        <Icone className="h-4 w-4" aria-hidden /> {libelle}
      </p>
      <p className="font-titre mt-2 text-2xl font-bold whitespace-nowrap sm:text-3xl xl:text-[1.65rem]">{valeur}</p>
      {detail && <p className="mt-1 text-xs text-gw-texte-doux dark:text-white/55">{detail}</p>}
    </>
  )
  return lien ? (
    <Link href={lien} className="gw-carte block p-4 transition-shadow hover:ring-2 hover:ring-gw-lavande sm:p-5 dark:hover:ring-white/15">
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
    <div className="rounded-xl bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-gw-bordure dark:bg-gw-carte-sombre dark:ring-white/10">
      <p className="font-semibold text-gw-nuit first-letter:uppercase dark:text-white">{jourLong(p.date)}</p>
      <p className="mt-1 font-semibold text-gw-nuit dark:text-white">
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
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement…
      </div>
    )
  }
  if (!d) return <p className="px-4 py-16 text-center text-gw-rose-action lg:px-8">{erreur}</p>

  const aValider = d.evenements["en_attente_validation"] ?? 0
  const totalEvenements = Object.values(d.evenements).reduce((s, n) => s + n, 0)
  const ventes30 = d.ventes_30_jours.reduce((s, v) => s + v.billets, 0)
  const maxTop = Math.max(...d.top_evenements.map((e) => e.vendus), 0)

  return (
    <div className="gw-stats space-y-6 px-4 py-6 lg:px-8 lg:py-8">
      <StyleGraphiques />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-titre text-2xl font-semibold">Vue d&apos;ensemble</h1>
          <p className="mt-1 max-w-2xl text-sm text-gw-texte-doux dark:text-white/65">Toute l&apos;activité de guichetweb : comptes, événements, ventes et entrées.</p>
        </div>
        <button
          type="button"
          onClick={charger}
          className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-gw-violet hover:bg-white dark:text-gw-lavande dark:hover:bg-white/10"
        >
          <RefreshCw className={cn("h-4 w-4", chargement && "animate-spin")} aria-hidden /> Actualiser
        </button>
      </div>

      {aValider > 0 && (
        <Link
          href="/admin/evenements"
          className="flex items-center gap-4 rounded-3xl bg-gw-nuit p-5 text-white transition-colors hover:bg-gw-indigo sm:p-6 dark:bg-white/10 dark:hover:bg-white/15"
        >
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gw-rose-action">
            <ShieldCheck className="h-6 w-6" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-titre block text-lg font-semibold">
              {aValider} événement{aValider > 1 ? "s attendent" : " attend"} votre validation
            </span>
            <span className="text-sm text-white/75">Vérifiez les informations, puis publiez-les ou demandez une correction.</span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0" aria-hidden />
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Tuile icone={Users} libelle="Participants" valeur={entier.format(d.participants)} detail={`${entier.format(d.participants_verifies)} e-mails confirmés`} lien="/admin/utilisateurs?onglet=participants" />
        <Tuile
          icone={Users}
          libelle="Équipe"
          valeur={entier.format(d.organisateurs)}
          detail={d.organisateurs_suspendus ? `dont ${d.organisateurs_suspendus} suspendu${d.organisateurs_suspendus > 1 ? "s" : ""}` : "organisateurs et administrateurs"}
          lien="/admin/utilisateurs"
        />
        <Tuile icone={CalendarRange} libelle="Événements publiés" valeur={entier.format(d.evenements["valide"] ?? 0)} detail={`${entier.format(totalEvenements)} au total`} lien="/admin/evenements" />
        <Tuile icone={Ticket} libelle="Billets vendus" valeur={entier.format(d.billets_vendus)} detail={`${entier.format(ventes30)} ces 30 derniers jours`} />
        <Tuile icone={Wallet} libelle="Total des ventes" valeur={compact(d.total_ventes)} detail={ariary(d.total_ventes)} />
        <Tuile icone={ScanLine} libelle="Entrées scannées" valeur={entier.format(d.entrees)} detail={d.billets_vendus ? `${Math.round((d.entrees / d.billets_vendus) * 100)} % des billets` : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="gw-carte p-5 sm:p-6 lg:col-span-2" aria-label="Ventes des 30 derniers jours">
          <h2 className="font-titre text-lg font-semibold">Ventes des 30 derniers jours</h2>
          <p className="mt-0.5 mb-4 text-xs text-gw-texte-doux dark:text-white/55">Billets payés par jour, tous événements confondus</p>
          {ventes30 === 0 ? (
            <p className="py-16 text-center text-sm text-gw-texte-doux dark:text-white/55">Aucune vente ces 30 derniers jours.</p>
          ) : (
            <div className="h-60" role="img" aria-label={`${ventes30} billets vendus ces 30 derniers jours`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.ventes_30_jours} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--stat-grille)" />
                  <XAxis dataKey="date" tickFormatter={jourCourt} tick={{ fill: "var(--stat-axe)", fontSize: 11 }} axisLine={{ stroke: "var(--stat-grille)" }} tickLine={false} minTickGap={20} />
                  <YAxis allowDecimals={false} tick={{ fill: "var(--stat-axe)", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
                  <Tooltip cursor={{ fill: "var(--stat-piste)", opacity: 0.6 }} content={<InfoBulle />} />
                  <Bar dataKey="billets" fill="var(--stat-1)" radius={[4, 4, 0, 0]} maxBarSize={18} />
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
                <p className="text-xs text-gw-texte-doux dark:text-white/55">{s.libelle}</p>
                <p className="font-titre text-2xl font-bold">{entier.format(d.evenements[s.cle] ?? 0)}</p>
              </li>
            ))}
          </ul>
          <h3 className="mt-6 text-sm font-semibold">Les plus vendus</h3>
          {d.top_evenements.length === 0 ? (
            <p className="mt-2 text-sm text-gw-texte-doux dark:text-white/55">Aucune vente pour l&apos;instant.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {d.top_evenements.map((e) => (
                <li key={e.id}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <Link href={`/evenements/${e.id}`} className="truncate hover:text-gw-violet dark:hover:text-gw-lavande">
                      {e.titre}
                    </Link>
                    <span className="shrink-0 font-semibold tabular-nums">{entier.format(e.vendus)}</span>
                  </div>
                  <span className="block h-2 rounded-r-[4px]" style={{ width: `${maxTop ? Math.max((e.vendus / maxTop) * 100, 3) : 0}%`, backgroundColor: "var(--stat-1)" }} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="gw-carte p-5 sm:p-6" aria-label="Activité récente">
        <h2 className="font-titre text-lg font-semibold">Activité récente</h2>
        <p className="mt-0.5 text-xs text-gw-texte-doux dark:text-white/55">Ventes, inscriptions, événements créés et entrées scannées</p>
        {d.activite.length === 0 ? (
          <p className="py-10 text-center text-sm text-gw-texte-doux dark:text-white/55">Rien pour l&apos;instant.</p>
        ) : (
          <ol className="mt-4 divide-y divide-gw-bordure dark:divide-white/10">
            {d.activite.map((a, k) => {
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
      </section>
    </div>
  )
}
