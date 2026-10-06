"use client"

import { ListeVoirPlus } from "@/components/organisateur/voir-plus"
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { BadgeCheck, Ban, CalendarDays, ChevronRight, KeyRound, Loader2, Mail, MailWarning, Phone, RotateCcw, Search, ShieldCheck, Ticket, Trash2, UserPlus, UserRound, Wallet, X } from "lucide-react"
import type { CompteEquipe, ParticipantAdmin } from "@/types"
import { cn } from "@/utils"
import {
  creerCompteEquipe,
  fetchComptesEquipe,
  fetchParticipantsAdmin,
  modifierCompteEquipe,
  modifierParticipantAdmin,
  supprimerCompteEquipe,
} from "@/services/administrationService"
import { Bouton, Champ, Modale, classeChamp } from "@/components/organisateur/ui"

/*
 * Utilisateurs (administrateur) :
 *  - Équipe : organisateurs et administrateurs ; créer un compte, changer le rôle,
 *    suspendre / réactiver (la connexion est alors refusée), supprimer un compte sans événement ;
 *  - Participants : liste compacte (nom, statut) ; tout le reste dans le panneau « Détails »,
 *    d'où l'on peut aussi suspendre / réactiver.
 */

type Onglet = "equipe" | "participants"
const entier = new Intl.NumberFormat("fr-FR")
const ariary = (n: number) => `${entier.format(Math.round(n))} Ar`
const normaliser = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

function age(naissance: string | null) {
  if (!naissance) return null
  const d = new Date(naissance)
  const a = new Date()
  return a.getFullYear() - d.getFullYear() - (a < new Date(a.getFullYear(), d.getMonth(), d.getDate()) ? 1 : 0)
}

function genreCourt(g: string | null) {
  const x = (g ?? "").toLowerCase()
  return x.startsWith("f") ? "Femme" : x.startsWith("m") || x.startsWith("h") ? "Homme" : x ? "Autre" : "—"
}

function BadgeStatut({ actif }: { actif: boolean }) {
  return actif ? (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300">Actif</span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800 dark:bg-red-400/15 dark:text-red-300">
      <Ban className="h-3 w-3" aria-hidden /> Suspendu
    </span>
  )
}

function motDePasseAleatoire() {
  const lettres = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  const t = new Uint32Array(10)
  crypto.getRandomValues(t)
  return Array.from(t, (n) => lettres[n % lettres.length]).join("")
}

function ModaleNouveauCompte({ ouverte, onFermer, onCree }: { ouverte: boolean; onFermer: () => void; onCree: () => void }) {
  const [fullname, setFullname] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [role, setRole] = useState<"organisateur" | "admin">("organisateur")
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState("")

  useEffect(() => {
    if (ouverte) {
      setFullname("")
      setEmail("")
      setPassword(motDePasseAleatoire())
      setRole("organisateur")
      setErreur("")
    }
  }, [ouverte])

  const creer = async (e: FormEvent) => {
    e.preventDefault()
    setEnvoi(true)
    setErreur("")
    try {
      const r = await creerCompteEquipe({ fullname: fullname.trim(), email: email.trim(), password, role })
      toast.success(`${r.message} Communiquez-lui son mot de passe provisoire.`)
      onCree()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : "Le compte n'a pas été créé.")
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Modale ouverte={ouverte} titre="Nouveau compte de l'équipe" onFermer={onFermer}>
      <form onSubmit={creer} className="space-y-4">
        <Champ libelle="Nom complet" requis>
          {(id) => <input id={id} required minLength={2} value={fullname} onChange={(e) => setFullname(e.target.value)} className={classeChamp} placeholder="Ex. Rakoto Hery" />}
        </Champ>
        <Champ libelle="Adresse e-mail" requis>
          {(id) => <input id={id} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={classeChamp} placeholder="nom@exemple.mg" />}
        </Champ>
        <Champ libelle="Mot de passe provisoire" requis aide="La personne pourra le changer avec « Mot de passe oublié ».">
          {(id) => (
            <div className="flex gap-2">
              <input id={id} required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className={cn(classeChamp, "font-mono")} />
              <Bouton type="button" variante="discret" onClick={() => setPassword(motDePasseAleatoire())} title="Générer un autre mot de passe" aria-label="Générer un autre mot de passe">
                <KeyRound className="h-4 w-4" aria-hidden />
              </Bouton>
            </div>
          )}
        </Champ>
        <Champ libelle="Rôle">
          {(id) => (
            <select id={id} value={role} onChange={(e) => setRole(e.target.value as "organisateur" | "admin")} className={classeChamp}>
              <option value="organisateur">Organisateur : crée et vend ses événements</option>
              <option value="admin">Administrateur : valide les événements, gère les comptes</option>
            </select>
          )}
        </Champ>
        {erreur && (
          <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-400/10 dark:text-red-300">
            {erreur}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Bouton type="button" variante="discret" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" chargement={envoi}>
            Créer le compte
          </Bouton>
        </div>
      </form>
    </Modale>
  )
}

interface Confirmation {
  titre: string
  texte: string
  libelle: string
  danger?: boolean
  /** Fenêtre d'information seulement (pas de bouton d'action) */
  sansAction?: boolean
  action: () => Promise<{ message: string }>
}

export function AdminUtilisateurs() {
  const router = useRouter()
  const params = useSearchParams()
  const onglet: Onglet = params.get("onglet") === "participants" ? "participants" : "equipe"
  const [equipe, setEquipe] = useState<CompteEquipe[]>([])
  const [participants, setParticipants] = useState<ParticipantAdmin[]>([])
  const [chargement, setChargement] = useState(true)
  const [recherche, setRecherche] = useState("")
  const [creation, setCreation] = useState(false)
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [moi, setMoi] = useState<number | null>(null)
  /** participant ouvert dans le panneau « Détails » */
  const [detailId, setDetailId] = useState<number | null>(null)

  const charger = useCallback(() => {
    Promise.allSettled([fetchComptesEquipe(), fetchParticipantsAdmin()])
      .then(([e, p]) => {
        if (e.status === "fulfilled") setEquipe(e.value)
        if (p.status === "fulfilled") setParticipants(p.value)
        if (e.status === "rejected") toast.error(e.reason instanceof Error ? e.reason.message : "Chargement impossible.")
      })
      .finally(() => setChargement(false))
  }, [])

  useEffect(() => {
    charger()
    // identifiant du compte connecté (pour ne pas proposer de se suspendre soi-même)
    try {
      const jeton = localStorage.getItem("access_token")
      if (jeton) setMoi(JSON.parse(atob(jeton.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).user_id ?? null)
    } catch {
      setMoi(null)
    }
  }, [charger])

  const terme = normaliser(recherche.trim())
  const equipeFiltree = useMemo(() => equipe.filter((u) => !terme || normaliser(`${u.fullname} ${u.email}`).includes(terme)), [equipe, terme])
  const participantsFiltres = useMemo(
    () => participants.filter((p) => !terme || normaliser(`${p.prenom} ${p.nom} ${p.email} ${p.telephone ?? ""}`).includes(terme)),
    [participants, terme],
  )

  const changerOnglet = (o: Onglet) => {
    setRecherche("")
    router.replace(o === "participants" ? "/admin/utilisateurs?onglet=participants" : "/admin/utilisateurs", { scroll: false })
  }

  const confirmer = async () => {
    if (!confirmation) return
    setEnvoi(true)
    try {
      const r = await confirmation.action()
      toast.success(r.message)
      setConfirmation(null)
      charger()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "L'action n'a pas abouti.")
    } finally {
      setEnvoi(false)
    }
  }

  const demanderStatut = (p: ParticipantAdmin) => {
    const actif = p.statut !== "suspendu"
    setConfirmation({
      titre: actif ? `Suspendre ${p.prenom} ${p.nom} ?` : `Réactiver ${p.prenom} ${p.nom} ?`,
      texte: actif
        ? "La connexion sera refusée. Ses billets déjà payés restent valables à l'entrée."
        : "La personne pourra de nouveau se connecter et réserver.",
      libelle: actif ? "Suspendre" : "Réactiver",
      danger: actif,
      action: () => modifierParticipantAdmin(p.id, actif ? "suspendu" : "actif"),
    })
  }
  const detail = participants.find((p) => p.id === detailId) ?? null

  const action = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40"

  return (
    <div className="space-y-6 px-4 py-6 lg:px-8 lg:py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-titre text-2xl font-semibold">Utilisateurs</h1>
          <p className="mt-1 max-w-2xl text-sm text-gw-texte-doux dark:text-white/65">
            Comptes de l&apos;équipe (organisateurs, administrateurs) et participants. Un compte suspendu ne peut plus se connecter.
          </p>
        </div>
        {onglet === "equipe" && (
          <Bouton onClick={() => setCreation(true)}>
            <UserPlus className="h-4 w-4" aria-hidden /> Nouveau compte
          </Bouton>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Type de compte" className="inline-flex rounded-full bg-white p-1 dark:bg-white/5">
          {(
            [
              ["equipe", "Équipe", equipe.length],
              ["participants", "Participants", participants.length],
            ] as const
          ).map(([cle, libelle, n]) => (
            <button
              key={cle}
              type="button"
              role="tab"
              aria-selected={onglet === cle}
              onClick={() => changerOnglet(cle)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                onglet === cle ? "bg-gw-nuit text-white dark:bg-white dark:text-gw-nuit" : "text-gw-texte-doux hover:text-gw-nuit dark:text-white/65 dark:hover:text-white",
              )}
            >
              {libelle} <span className="ml-1 opacity-70">{n}</span>
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Rechercher</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gw-texte-pale" aria-hidden />
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Nom, e-mail…" className={cn(classeChamp, "pl-9")} />
        </label>
      </div>

      {chargement ? (
        <p className="flex items-center gap-2 py-10 text-gw-texte-doux dark:text-white/60">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Chargement…
        </p>
      ) : onglet === "equipe" ? (
        <div className="gw-carte overflow-x-auto">
          <ListeVoirPlus elements={equipeFiltree} classePagination="mt-0 px-5 pb-3">
            {(equipePage) => (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs text-gw-texte-doux dark:text-white/55">
              <tr className="border-b border-gw-bordure dark:border-white/10">
                <th className="px-5 py-3 font-medium">Nom</th>
                <th className="px-3 py-3 font-medium">Rôle</th>
                <th className="px-3 py-3 font-medium">Statut</th>
                <th className="px-3 py-3 text-right font-medium">Événements</th>
                <th className="px-3 py-3 text-right font-medium">Billets vendus</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {equipePage.map((u) => {
                const soiMeme = u.id === moi
                return (
                  <tr key={u.id} className="border-b border-gw-bordure last:border-0 dark:border-white/10">
                    <td className="px-5 py-3">
                      <p className="font-semibold">
                        {u.fullname} {soiMeme && <span className="text-xs font-normal text-gw-texte-doux dark:text-white/55">(vous)</span>}
                      </p>
                      <p className="text-xs text-gw-texte-doux dark:text-white/55">{u.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      {u.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gw-nuit px-2.5 py-0.5 text-xs font-semibold text-white dark:bg-white dark:text-gw-nuit">
                          <ShieldCheck className="h-3 w-3" aria-hidden /> Administrateur
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-gw-lavande/60 px-2.5 py-0.5 text-xs font-semibold text-gw-nuit dark:bg-white/10 dark:text-white">Organisateur</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <BadgeStatut actif={u.actif} />
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {u.evenements}
                      {u.evenements > 0 && (
                        <span className="block text-xs text-gw-texte-doux dark:text-white/55">
                          {u.evenements_valides} publié{u.evenements_valides > 1 ? "s" : ""}
                          {u.evenements_en_attente ? ` · ${u.evenements_en_attente} à valider` : ""}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {entier.format(u.billets_vendus)}
                      {u.total_ventes > 0 && <span className="block text-xs text-gw-texte-doux dark:text-white/55">{ariary(u.total_ventes)}</span>}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          disabled={soiMeme}
                          className={cn(action, "text-gw-violet hover:bg-gw-fond dark:text-gw-lavande dark:hover:bg-white/10")}
                          onClick={() => {
                            const nouveau = u.role === "admin" ? "organisateur" : "admin"
                            setConfirmation({
                              titre: nouveau === "admin" ? "Nommer administrateur ?" : "Retirer les droits d'administrateur ?",
                              texte:
                                nouveau === "admin"
                                  ? `${u.fullname} pourra valider les événements et gérer tous les comptes. Il n'aura plus d'espace organisateur.`
                                  : `${u.fullname} redeviendra organisateur et n'aura plus accès à l'administration.`,
                              libelle: nouveau === "admin" ? "Nommer administrateur" : "Rendre organisateur",
                              action: () => modifierCompteEquipe(u.id, { role: nouveau }),
                            })
                          }}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> {u.role === "admin" ? "Rendre organisateur" : "Nommer admin"}
                        </button>
                        <button
                          type="button"
                          disabled={soiMeme}
                          className={cn(action, u.actif ? "text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-400/10" : "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-400/10")}
                          onClick={() =>
                            setConfirmation({
                              titre: u.actif ? `Suspendre ${u.fullname} ?` : `Réactiver ${u.fullname} ?`,
                              texte: u.actif
                                ? "La connexion sera refusée tant que le compte est suspendu. Ses événements et ses ventes sont conservés."
                                : "La personne pourra de nouveau se connecter.",
                              libelle: u.actif ? "Suspendre" : "Réactiver",
                              danger: u.actif,
                              action: () => modifierCompteEquipe(u.id, { actif: !u.actif }),
                            })
                          }
                        >
                          {u.actif ? <Ban className="h-3.5 w-3.5" aria-hidden /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden />}
                          {u.actif ? "Suspendre" : "Réactiver"}
                        </button>
                        <button
                          type="button"
                          disabled={soiMeme}
                          title={u.evenements > 0 ? "Suppression impossible : ce compte a des événements" : "Supprimer le compte"}
                          aria-label={`Supprimer le compte de ${u.fullname}`}
                          className={cn(action, "text-gw-texte-doux hover:bg-red-50 hover:text-red-700 dark:text-white/55 dark:hover:bg-red-400/10", u.evenements > 0 && "opacity-50")}
                          onClick={() =>
                            setConfirmation(
                              u.evenements > 0
                                ? {
                                    titre: "Suppression impossible",
                                    texte: `${u.fullname} a ${u.evenements} événement${u.evenements > 1 ? "s" : ""} : supprimer son compte effacerait l'historique des ventes. ${
                                      u.actif ? "Suspendez-le plutôt : il ne pourra plus se connecter, et ses événements et ses ventes sont conservés." : "Son compte est déjà suspendu."
                                    }`,
                                    libelle: "Suspendre le compte",
                                    danger: true,
                                    sansAction: !u.actif,
                                    action: () => modifierCompteEquipe(u.id, { actif: false }),
                                  }
                                : {
                                    titre: `Supprimer le compte de ${u.fullname} ?`,
                                    texte: "Cette action est définitive.",
                                    libelle: "Supprimer",
                                    danger: true,
                                    action: () => supprimerCompteEquipe(u.id),
                                  },
                            )
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
            )}
          </ListeVoirPlus>
          {equipeFiltree.length === 0 && <p className="px-5 py-10 text-center text-sm text-gw-texte-doux dark:text-white/55">Aucun compte ne correspond.</p>}
        </div>
      ) : (
        <div className="gw-carte overflow-x-auto">
          <ListeVoirPlus elements={participantsFiltres} classePagination="mt-0 px-5 pb-3">
            {(participantsPage) => (
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-gw-texte-doux dark:text-white/55">
              <tr className="border-b border-gw-bordure dark:border-white/10">
                <th className="px-5 py-3 font-medium">Participant</th>
                <th className="px-3 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {participantsPage.map((p) => {
                const actif = p.statut !== "suspendu"
                return (
                  <tr
                    key={p.id}
                    onClick={() => setDetailId(p.id)}
                    className={cn(
                      "cursor-pointer border-b border-gw-bordure transition-colors last:border-0 hover:bg-gw-fond dark:border-white/10 dark:hover:bg-white/5",
                      detailId === p.id && "bg-gw-lavande/30 dark:bg-white/10",
                    )}
                  >
                    <td className="px-5 py-3">
                      <p className="flex items-center gap-2 font-semibold">
                        <UserRound className="h-4 w-4 shrink-0 text-gw-texte-pale" aria-hidden />
                        {p.prenom} {p.nom}
                      </p>
                      {p.telephone && <p className="pl-6 text-xs text-gw-texte-doux dark:text-white/55">{p.telephone}</p>}
                    </td>
                    <td className="px-3 py-3">
                      <BadgeStatut actif={actif} />
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setDetailId(p.id)}
                          className={cn(action, "text-gw-violet hover:bg-gw-lavande/40 dark:text-gw-lavande dark:hover:bg-white/10")}
                        >
                          Détails <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={cn(action, actif ? "text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-400/10" : "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-400/10")}
                          onClick={() => demanderStatut(p)}
                        >
                          {actif ? <Ban className="h-3.5 w-3.5" aria-hidden /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden />}
                          <span className="hidden sm:inline">{actif ? "Suspendre" : "Réactiver"}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
            )}
          </ListeVoirPlus>
          {participantsFiltres.length === 0 && <p className="px-5 py-10 text-center text-sm text-gw-texte-doux dark:text-white/55">Aucun participant ne correspond.</p>}
        </div>
      )}

      <ModaleNouveauCompte
        ouverte={creation}
        onFermer={() => setCreation(false)}
        onCree={() => {
          setCreation(false)
          charger()
        }}
      />

      <PanneauParticipant participant={detail} onFermer={() => setDetailId(null)} onStatut={demanderStatut} />

      <Modale ouverte={!!confirmation} titre={confirmation?.titre ?? ""} onFermer={() => setConfirmation(null)}>
        <p className="text-sm text-gw-texte dark:text-white/75">{confirmation?.texte}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Bouton variante="discret" onClick={() => setConfirmation(null)}>
            {confirmation?.sansAction ? "Fermer" : "Annuler"}
          </Bouton>
          {!confirmation?.sansAction && (
            <Bouton variante={confirmation?.danger ? "danger" : "principal"} chargement={envoi} onClick={confirmer}>
              {confirmation?.libelle}
            </Bouton>
          )}
        </div>
      </Modale>
    </div>
  )
}

/* ---------- panneau « Détails » d'un participant ---------- */

function PanneauParticipant({
  participant: p,
  onFermer,
  onStatut,
}: {
  participant: ParticipantAdmin | null
  onFermer: () => void
  onStatut: (p: ParticipantAdmin) => void
}) {
  useEffect(() => {
    if (!p) return
    const echap = (e: KeyboardEvent) => e.key === "Escape" && onFermer()
    window.addEventListener("keydown", echap)
    return () => window.removeEventListener("keydown", echap)
  }, [p, onFermer])

  if (!p) return null
  const actif = p.statut !== "suspendu"
  const a = age(p.date_naissance)
  const initiales = `${p.prenom[0] ?? ""}${p.nom[0] ?? ""}`.toUpperCase() || "?"
  const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—")

  const Ligne = ({ icone: Icone, libelle, children }: { icone: typeof Mail; libelle: string; children: React.ReactNode }) => (
    <div className="flex gap-3 py-3">
      <Icone className="mt-0.5 h-4 w-4 shrink-0 text-gw-violet dark:text-gw-lavande" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gw-texte-doux dark:text-white/55">{libelle}</p>
        <div className="mt-0.5 text-sm break-words">{children}</div>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="dialog" aria-modal="true" aria-label={`Détails de ${p.prenom} ${p.nom}`}>
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-gw-nuit/40 backdrop-blur-[1px]" onClick={onFermer} />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white text-gw-nuit shadow-2xl dark:bg-gw-carte-sombre dark:text-white">
        <div className="flex items-start gap-4 border-b border-gw-bordure p-6 dark:border-white/10">
          <span className="font-titre flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#6C5CE7,#C92A7A)] text-lg font-semibold text-white">
            {initiales}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-titre truncate text-xl font-semibold">
              {p.prenom} {p.nom}
            </h2>
            <div className="mt-1.5">
              <BadgeStatut actif={actif} />
            </div>
          </div>
          <button type="button" onClick={onFermer} aria-label="Fermer" className="rounded-full p-1.5 text-gw-texte-doux hover:bg-gw-fond dark:text-white/60 dark:hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          {/* achats en premier : ce que l'admin cherche le plus souvent */}
          <div className="grid grid-cols-2 gap-3 py-5">
            <div className="rounded-2xl bg-gw-fond p-4 dark:bg-white/5">
              <p className="flex items-center gap-1.5 text-xs text-gw-texte-doux dark:text-white/55">
                <Ticket className="h-3.5 w-3.5" aria-hidden /> Billets achetés
              </p>
              <p className="font-titre mt-1 text-2xl font-semibold tabular-nums">{entier.format(p.billets)}</p>
            </div>
            <div className="rounded-2xl bg-gw-fond p-4 dark:bg-white/5">
              <p className="flex items-center gap-1.5 text-xs text-gw-texte-doux dark:text-white/55">
                <Wallet className="h-3.5 w-3.5" aria-hidden /> Total dépensé
              </p>
              <p className="font-titre mt-1 text-2xl font-semibold tabular-nums">{ariary(p.total_depense)}</p>
            </div>
          </div>

          <div className="divide-y divide-gw-bordure dark:divide-white/10">
            <Ligne icone={Mail} libelle="E-mail">
              {p.email}
              <span className="mt-0.5 block">
                {p.email_verifie ? (
                  <span className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300">
                    <BadgeCheck className="h-3.5 w-3.5" aria-hidden /> adresse confirmée
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                    <MailWarning className="h-3.5 w-3.5" aria-hidden /> adresse non confirmée
                  </span>
                )}
              </span>
            </Ligne>
            <Ligne icone={Phone} libelle="Téléphone">
              {p.telephone ?? "—"}
            </Ligne>
            <Ligne icone={UserRound} libelle="Genre et âge">
              {genreCourt(p.genre)}
              {a != null ? ` · ${a} ans` : ""}
              {p.date_naissance && <span className="block text-xs text-gw-texte-doux dark:text-white/55">né(e) le {date(p.date_naissance)}</span>}
            </Ligne>
            <Ligne icone={CalendarDays} libelle="Inscrit le">
              {date(p.date_creation)}
            </Ligne>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gw-bordure p-4 dark:border-white/10">
          <Bouton variante="discret" onClick={onFermer}>
            Fermer
          </Bouton>
          <Bouton variante={actif ? "danger" : "principal"} onClick={() => onStatut(p)}>
            {actif ? <Ban className="h-4 w-4" aria-hidden /> : <RotateCcw className="h-4 w-4" aria-hidden />}
            {actif ? "Suspendre le compte" : "Réactiver le compte"}
          </Bouton>
        </div>
      </aside>
    </div>
  )
}
