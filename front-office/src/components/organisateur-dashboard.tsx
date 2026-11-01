"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, ChevronRight, Sparkles } from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { fetchDashboardOrganisateur, fetchEvenementsPopulaires } from "@/services/dashboardService"
import { fetchUserData } from "@/services/auth.service"
import { fetchAllEvenements } from "@/services/evenementService"
import { fetchStatistiques } from "@/services/statistiquesService"
import type { AuthUser, DashboardOrganisateur, Evenement, EvenementPopulaire, StatEvenement } from "@/types"
import { CalendrierAgenda } from "@/components/organisateur/calendrier-agenda"
import { Anneau } from "@/components/organisateur/anneau"
import { cn } from "@/utils"

/*
 * Tableau de bord de l'organisateur : trois chiffres clés et anneau de remplissage, courbe des ventes,
 * événements populaires (vote du public), mes prochains événements (remplissage et montant vendu,
 * un clic ouvre le tableau de bord de l'événement), puis agenda.
 * Le détail par tarif et les billets hors ligne sont dans le tableau de bord de chaque événement
 * et sur la page "Billets hors ligne". Couleurs guichetweb ; thème clair ou sombre (prop darkMode).
 */

const compact = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 })
const entier = new Intl.NumberFormat("fr-FR")

function salutation() {
  const h = new Date().getHours()
  return h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir"
}

function dansCombien(iso: string): string {
  const jours = Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (jours <= 0) return "Aujourd'hui"
  if (jours === 1) return "Demain"
  return `Dans ${jours} jours`
}

/* ---------- petites briques ---------- */

function TitreCarte({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-titre text-lg font-semibold">{children}</h2>
      {action}
    </div>
  )
}

function Vide({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-gw-texte-doux dark:text-white/60">{children}</p>
}

/** Petit motif de barres, décoratif, comme sur les cartes du modèle. */
function MotifBarres() {
  return (
    <svg viewBox="0 0 36 28" className="h-8 w-10 shrink-0" aria-hidden>
      <defs>
        <linearGradient id="motif-barres" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E8479A" />
          <stop offset="1" stopColor="#6C5CE7" />
        </linearGradient>
      </defs>
      {[10, 18, 13, 24, 16].map((h, i) => (
        <rect key={i} x={i * 7.5} y={28 - h} width="4" height={h} rx="2" fill="url(#motif-barres)" />
      ))}
    </svg>
  )
}

function CarteChiffre({ valeur, libelle, titre }: { valeur: string; libelle: string; titre?: string }) {
  return (
    <div className="gw-carte flex flex-col justify-between gap-3 p-5" title={titre}>
      <MotifBarres />
      <div>
        <p className="font-titre text-2xl leading-none font-semibold whitespace-nowrap">{valeur}</p>
        <p className="mt-1.5 text-sm text-gw-texte-doux dark:text-white/65">{libelle}</p>
      </div>
    </div>
  )
}

/** Props injectées par Recharts dans une info-bulle personnalisée. */
interface InfoBulleProps {
  active?: boolean
  payload?: { value?: number | string }[]
  label?: string | number
}

function InfoBulleVentes({ active, payload, label }: InfoBulleProps) {
  if (!active || !payload?.length) return null
  const n = Number(payload[0].value ?? 0)
  return (
    <div className="rounded-full bg-[linear-gradient(135deg,#6C5CE7,#C92A7A)] px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
      {label} : {entier.format(n)} billet{n > 1 ? "s" : ""}
    </div>
  )
}

/* ---------- tableau de bord ---------- */

interface OrganisateurDashboardProps {
  darkMode?: boolean
}

export function OrganisateurDashboard({ darkMode = false }: OrganisateurDashboardProps) {
  const [data, setData] = useState<DashboardOrganisateur | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [evenements, setEvenements] = useState<Evenement[]>([])
  const [populaires, setPopulaires] = useState<EvenementPopulaire[]>([])
  const [statsEvenements, setStatsEvenements] = useState<StatEvenement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // la photo changée depuis la fenêtre "Mon profil" s'affiche aussitôt
  useEffect(() => {
    const maj = (e: Event) => setUser((e as CustomEvent<AuthUser>).detail)
    window.addEventListener("gw-compte-equipe", maj)
    return () => window.removeEventListener("gw-compte-equipe", maj)
  }, [])

  useEffect(() => {
    Promise.allSettled([fetchDashboardOrganisateur(), fetchUserData(), fetchAllEvenements(), fetchEvenementsPopulaires(), fetchStatistiques()])
      .then(([d, u, e, p, s]) => {
        if (d.status === "rejected") {
          setError(d.reason instanceof Error ? d.reason.message : "Erreur de chargement du tableau de bord.")
          return
        }
        setData(d.value)
        const utilisateur = u.status === "fulfilled" ? u.value : null
        setUser(utilisateur)
        // /evenements/all renvoie les événements de tous les organisateurs : on garde les siens
        if (e.status === "fulfilled") {
          setEvenements(utilisateur ? e.value.filter((x) => x.organisateur_id === utilisateur.id) : e.value)
        }
        if (p.status === "fulfilled") setPopulaires(p.value)
        if (s.status === "fulfilled") setStatsEvenements(s.value.evenements)
      })
      .finally(() => setLoading(false))
  }, [])

  const ventes = useMemo(
    () =>
      (data?.ventes_par_jour ?? []).map((v) => ({
        jour: new Date(v.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }),
        ventes: v.nombre,
      })),
    [data],
  )

  if (loading) {
    return (
      <div className="grid gap-6 px-4 py-8 lg:px-8" aria-busy>
        <div className="h-40 animate-pulse rounded-3xl bg-gw-surface/70 dark:bg-white/5" />
        <div className="grid gap-6 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-gw-surface/70 dark:bg-white/5" />
          ))}
        </div>
      </div>
    )
  }
  if (error) return <p className="px-8 py-16 text-center text-gw-rose-action">{error}</p>
  if (!data) return null

  const prenom = user?.fullname?.split(" ")[0]
  const maintenant = Date.now()
  const aVenir = evenements.filter((e) => new Date(e.date_debut).getTime() >= maintenant)
  const totalVentes = ventes.reduce((s, v) => s + v.ventes, 0)
  const prochains = statsEvenements
    .filter((e) => new Date(e.date_debut).getTime() >= maintenant)
    .sort((a, b) => +new Date(a.date_debut) - +new Date(b.date_debut))
    .slice(0, 5)

  const axe = darkMode ? "rgba(255,255,255,0.55)" : "#6B5F99"
  const grille = darkMode ? "rgba(255,255,255,0.08)" : "#EBE6FA"
  const piste = darkMode ? "rgba(255,255,255,0.06)" : "#F6F4FC"

  return (
    <div className="grid gap-6 px-4 py-6 lg:px-8 lg:py-8 2xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-sm text-gw-texte-doux dark:text-white/65">
              {salutation()}
              {prenom ? `, ${prenom}` : ""} :{" "}
              {aVenir.length > 0 ? `${aVenir.length} événement${aVenir.length > 1 ? "s" : ""} à venir` : "aucun événement à venir"}
            </p>
            <h1 className="font-titre mt-1 text-2xl font-semibold">Tableau de bord</h1>
          </div>
          <p className="text-sm first-letter:uppercase text-gw-texte-doux dark:text-white/60">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* trois chiffres clés */}
          <div className="grid gap-4 sm:grid-cols-3 md:col-span-2">
            <CarteChiffre valeur={entier.format(data.evenements_publies)} libelle="Événements publiés" />
            <CarteChiffre valeur={entier.format(data.billets_vendus)} libelle="Billets vendus" />
            <CarteChiffre
              valeur={`${compact.format(data.recettes_totales)} Ar`}
              libelle="Montant des ventes"
              titre={`${entier.format(data.recettes_totales)} Ar`}
            />
          </div>

          {/* anneau de remplissage */}
          <section className="gw-carte flex flex-wrap items-center justify-center gap-4 p-5">
            <div className="relative shrink-0">
              <Anneau pourcentage={data.taux_remplissage_moyen} id="anneau-remplissage" taille={88} epaisseur={10} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-titre text-lg font-semibold">{Math.round(data.taux_remplissage_moyen)} %</span>
                <span className="text-[10px] text-gw-texte-doux dark:text-white/60">remplissage</span>
              </div>
            </div>
            {/* légende de l'anneau (information, pas des boutons) : même encre pour les deux lignes */}
            <div className="min-w-0 space-y-2 text-xs text-gw-texte dark:text-white/75">
              <p className="flex items-center gap-2 whitespace-nowrap">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[linear-gradient(135deg,#6C5CE7,#E8479A)]" aria-hidden />
                Places vendues
                <span className="ml-auto pl-3 font-semibold tabular-nums text-gw-encre dark:text-white">{Math.round(data.taux_remplissage_moyen)} %</span>
              </p>
              <p className="flex items-center gap-2 whitespace-nowrap">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-gw-lavande dark:bg-white/20" aria-hidden />
                Places libres
                <span className="ml-auto pl-3 font-semibold tabular-nums text-gw-encre dark:text-white">{100 - Math.round(data.taux_remplissage_moyen)} %</span>
              </p>
              <Link
                href="/organisateur/reservations"
                className="inline-flex items-center gap-1 pt-1 text-xs font-semibold text-gw-violet hover:underline dark:text-gw-lavande"
              >
                Réservations <ArrowRight className="h-3 w-3" aria-hidden />
              </Link>
            </div>
          </section>

          {/* courbe des ventes */}
          <section className="gw-carte p-5 md:col-span-2">
            <TitreCarte
              action={
                <span className="rounded-full bg-gw-fond px-3 py-1 text-xs font-semibold text-gw-violet dark:bg-white/10 dark:text-white">
                  {entier.format(totalVentes)} billets sur la période
                </span>
              }
            >
              Ventes de billets
            </TitreCarte>
            {ventes.length === 0 ? (
              <Vide>Pas encore de ventes à afficher.</Vide>
            ) : (
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ventes} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ventes-trait" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0" stopColor="#6C5CE7" />
                        <stop offset="1" stopColor="#E8479A" />
                      </linearGradient>
                      <linearGradient id="ventes-aire" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#E8479A" stopOpacity={darkMode ? 0.35 : 0.25} />
                        <stop offset="1" stopColor="#6C5CE7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={grille} />
                    <XAxis dataKey="jour" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: axe }} minTickGap={18} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: axe }} />
                    <Tooltip content={<InfoBulleVentes />} cursor={{ stroke: "#E8479A", strokeDasharray: "4 4" }} />
                    <Area
                      type="monotone"
                      dataKey="ventes"
                      stroke="url(#ventes-trait)"
                      strokeWidth={3}
                      fill="url(#ventes-aire)"
                      activeDot={{ r: 6, fill: "#E8479A", stroke: darkMode ? "#2B1F5C" : "#FFFFFF", strokeWidth: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* événements populaires */}
          <section className="gw-carte p-5 md:row-span-2">
            <TitreCarte>Événements populaires</TitreCarte>
            <p className="mt-1 text-xs text-gw-texte-doux dark:text-white/60">Classés selon les réactions du public.</p>
            {populaires.length === 0 ? (
              <Vide>Aucune réaction du public pour l&apos;instant.</Vide>
            ) : (
              <ol className="mt-4 space-y-3">
                {populaires.slice(0, 6).map((e, i) => (
                  <li key={e.id}>
                    <Link
                      href={`/evenements/${e.id}`}
                      target="_blank"
                      className="group flex items-center gap-3 rounded-2xl bg-gw-fond p-3 transition-colors hover:bg-gw-lavande/50 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <span
                        className={cn(
                          "font-titre flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-white",
                          i === 0 ? "bg-[linear-gradient(135deg,#6C5CE7,#C92A7A)]" : "bg-gw-violet/85",
                        )}
                      >
                        {i === 0 ? <Sparkles className="h-4 w-4" aria-label="Premier" /> : i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 text-sm leading-snug font-semibold">{e.titre}</span>
                        <span className="mt-0.5 block text-xs text-gw-texte-doux dark:text-white/60">
                          {entier.format(e.score_popularite)} pts de popularité
                        </span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-gw-texte-doux transition-transform group-hover:translate-x-0.5 dark:text-white/50" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {/* mes prochains événements : un clic ouvre le tableau de bord de l'événement */}
          <section className="gw-carte p-5 md:col-span-2">
            <TitreCarte
              action={
                <Link href="/organisateur/evenements" className="inline-flex items-center gap-1 text-xs font-semibold text-gw-violet hover:underline dark:text-gw-lavande">
                  Tous mes événements <ArrowRight className="h-3 w-3" aria-hidden />
                </Link>
              }
            >
              Mes prochains événements
            </TitreCarte>
            {prochains.length === 0 ? (
              <Vide>Aucun événement à venir en vente.</Vide>
            ) : (
              <ul className="mt-4 space-y-3">
                {prochains.map((e, i) => {
                  const d = new Date(e.date_debut)
                  const pct = e.taux_remplissage != null ? Math.round(e.taux_remplissage) : null
                  return (
                    <li key={e.id}>
                      <Link
                        href={`/organisateur/evenements/${e.id}`}
                        className="group flex items-center gap-4 rounded-2xl bg-gw-fond p-3 transition-colors hover:bg-gw-lavande/50 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        <span
                          className={cn(
                            "font-titre flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl leading-none text-white",
                            i === 0 ? "bg-[linear-gradient(135deg,#6C5CE7,#C92A7A)]" : "bg-gw-violet/85",
                          )}
                        >
                          <span className="text-base font-semibold">{d.getDate()}</span>
                          <span className="text-[9px] font-semibold uppercase">{d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", "")}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{e.titre}</span>
                          <span className="mt-1.5 flex items-center gap-3">
                            <span className="h-2 flex-1 rounded-full" style={{ background: piste }}>
                              <span
                                className="block h-full rounded-full"
                                style={{ width: `${Math.max(3, pct ?? 0)}%`, background: i === 0 ? "linear-gradient(90deg,#6C5CE7,#E8479A)" : darkMode ? "#8B7CF5" : "#B5A8F5" }}
                              />
                            </span>
                            <span className="w-24 shrink-0 text-xs text-gw-texte-doux dark:text-white/60">{pct != null ? `${pct} % rempli` : "capacité libre"}</span>
                          </span>
                          <span className="mt-1 block text-xs text-gw-texte-doux dark:text-white/60">
                            {dansCombien(e.date_debut)} · {entier.format(e.vendus)} billets · {entier.format(Math.round(e.recettes))} Ar
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-gw-texte-doux transition-transform group-hover:translate-x-0.5 dark:text-white/50" aria-hidden />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* colonne de droite : agenda (le profil et les notifications sont dans la barre du haut et le menu) */}
      <aside className="grid content-start gap-6 md:grid-cols-2 2xl:grid-cols-1">
        <CalendrierAgenda evenements={evenements} />
      </aside>
    </div>
  )
}
