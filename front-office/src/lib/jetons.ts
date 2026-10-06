"use client"

import { API_BASE_URL } from "@/services/apiConfig"

/*
 * Rafraîchissement automatique des jetons (voir backend app/services/session_service.py).
 *
 * Chaque espace (équipe = organisateur/admin, participant) garde deux jetons dans le navigateur :
 *  - le jeton d'accès (JWT, 15 min), envoyé à chaque appel de l'API ;
 *  - le jeton de rafraîchissement (7 jours), qui sert seulement à obtenir un nouveau jeton d'accès.
 *
 * installerRafraichissement() enveloppe window.fetch une seule fois :
 *  - avant un appel, si le jeton d'accès expire dans moins de 30 s, il est d'abord renouvelé ;
 *  - si l'API répond « jeton expiré » malgré tout, le jeton est renouvelé et l'appel relancé une fois.
 * Les services existants (getAuthHeaders, getParticipantAuthHeaders…) n'ont donc rien à changer.
 * Un minuteur renouvelle aussi le jeton un peu avant son expiration tant que la page est ouverte.
 * Entre plusieurs onglets, un verrou (navigator.locks) évite deux rafraîchissements simultanés.
 */

export type Espace = "equipe" | "participant"

const CLES: Record<Espace, { acces: string; rafraichissement: string }> = {
  equipe: { acces: "access_token", rafraichissement: "refresh_token" },
  participant: { acces: "participant_access_token", rafraichissement: "participant_refresh_token" },
}
const ESPACES: Espace[] = ["equipe", "participant"]
/** marge avant l'expiration : en dessous, on renouvelle avant d'appeler l'API */
const MARGE_SECONDES = 30

const lire = (cle: string) => {
  try {
    return localStorage.getItem(cle)
  } catch {
    return null
  }
}

export const lireAcces = (espace: Espace) => lire(CLES[espace].acces)
export const lireRafraichissement = (espace: Espace) => lire(CLES[espace].rafraichissement)

/** Enregistre la réponse de connexion (ou de rafraîchissement) de l'API. */
export function enregistrerSession(espace: Espace, data: { access_token: string; refresh_token?: string | null }) {
  localStorage.setItem(CLES[espace].acces, data.access_token)
  if (data.refresh_token) localStorage.setItem(CLES[espace].rafraichissement, data.refresh_token)
}

export function effacerSession(espace: Espace) {
  localStorage.removeItem(CLES[espace].acces)
  localStorage.removeItem(CLES[espace].rafraichissement)
}

/** Secondes avant l'expiration d'un JWT (négatif s'il est expiré, -Infinity s'il est illisible). */
export function expireDans(jeton: string | null): number {
  if (!jeton) return -Infinity
  try {
    const charge = JSON.parse(atob(jeton.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))
    return typeof charge.expires === "number" ? charge.expires - Date.now() / 1000 : -Infinity
  } catch {
    return -Infinity
  }
}

// fetch d'origine, avant l'enveloppe (sinon le rafraîchissement s'intercepterait lui-même)
let fetchOrigine: typeof fetch | null = null
const appelBrut: typeof fetch = (...args) => (fetchOrigine ?? fetch)(...args)

const enCours: Partial<Record<Espace, Promise<string | null>>> = {}

/**
 * Nouveau jeton d'accès pour cet espace, ou null si la session est terminée
 * (jeton de rafraîchissement absent, expiré ou révoqué : il faut se reconnecter).
 */
export function rafraichir(espace: Espace): Promise<string | null> {
  if (enCours[espace]) return enCours[espace]!
  const accesAvant = lireAcces(espace)
  const tache = async (): Promise<string | null> => {
    // un autre onglet a peut-être déjà renouvelé pendant qu'on attendait le verrou
    const actuel = lireAcces(espace)
    if (actuel && actuel !== accesAvant && expireDans(actuel) > MARGE_SECONDES) return actuel
    const jeton = lireRafraichissement(espace)
    if (!jeton) return null
    let res: Response
    try {
      res = await appelBrut(`${API_BASE_URL}/auth/rafraichir`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: jeton }),
      })
    } catch {
      return null // serveur injoignable : on garde les jetons, on réessaiera
    }
    if (res.status === 401) {
      effacerSession(espace) // session expirée ou révoquée : reconnexion nécessaire
      return null
    }
    if (!res.ok) return null
    const data = await res.json()
    enregistrerSession(espace, data)
    return data.access_token as string
  }
  const verrou = typeof navigator !== "undefined" ? navigator.locks : undefined
  const lance: Promise<string | null> = verrou
    ? (verrou.request(`guichetweb-rafraichir-${espace}`, tache) as unknown as Promise<string | null>)
    : tache()
  const promesse = lance.finally(() => {
    delete enCours[espace]
  })
  enCours[espace] = promesse
  return promesse
}

/**
 * La session de cet espace est-elle utilisable ? Renouvelle le jeton d'accès s'il est expiré
 * (par exemple en revenant sur le site le lendemain). À utiliser avant de rediriger vers la connexion.
 */
export async function assurerSession(espace: Espace): Promise<boolean> {
  if (expireDans(lireAcces(espace)) > MARGE_SECONDES) return true
  if (!lireRafraichissement(espace)) return false
  return (await rafraichir(espace)) !== null
}

/* ---------- enveloppe de fetch ---------- */

function urlDe(entree: RequestInfo | URL): string {
  if (typeof entree === "string") return entree
  if (entree instanceof URL) return entree.href
  return entree.url
}

function jetonEnvoye(entree: RequestInfo | URL, init?: RequestInit): string | null {
  const brut = init?.headers ?? (entree instanceof Request ? entree.headers : undefined)
  if (!brut) return null
  const valeur = brut instanceof Headers ? brut.get("Authorization") : Array.isArray(brut) ? brut.find(([k]) => k.toLowerCase() === "authorization")?.[1] : (brut as Record<string, string>).Authorization ?? (brut as Record<string, string>).authorization
  return valeur?.startsWith("Bearer ") ? valeur.slice(7) : null
}

function avecJeton(entree: RequestInfo | URL, init: RequestInit | undefined, jeton: string): [RequestInfo | URL, RequestInit] {
  const entetes = new Headers(init?.headers ?? (entree instanceof Request ? entree.headers : undefined))
  entetes.set("Authorization", `Bearer ${jeton}`)
  return [entree, { ...init, headers: entetes }]
}

const estApi = (url: string) => {
  const base = API_BASE_URL.startsWith("http") ? API_BASE_URL : new URL(API_BASE_URL, window.location.origin).href
  const complete = url.startsWith("http") ? url : new URL(url, window.location.origin).href
  return complete.startsWith(base) && !complete.includes("/auth/rafraichir")
}

/** À appeler une fois au démarrage du site (ClientLayout). */
export function installerRafraichissement() {
  if (typeof window === "undefined" || fetchOrigine) return
  fetchOrigine = window.fetch.bind(window)
  const origine = fetchOrigine

  window.fetch = async (entree: RequestInfo | URL, init?: RequestInit) => {
    const url = urlDe(entree)
    const jeton = estApi(url) ? jetonEnvoye(entree, init) : null
    const espace = jeton ? ESPACES.find((e) => lireAcces(e) === jeton) : undefined
    if (!jeton || !espace) return origine(entree, init)

    let envoye = jeton
    let [e, i] = [entree, init]
    if (expireDans(jeton) < MARGE_SECONDES) {
      const nouveau = await rafraichir(espace)
      if (nouveau) {
        ;[e, i] = avecJeton(entree, init, nouveau)
        envoye = nouveau
      }
    }
    const res = await origine(e, i)
    if (res.status !== 401 && res.status !== 403) return res

    // « jeton expiré / révoqué » : on renouvelle et on relance une fois
    const detail = await res
      .clone()
      .json()
      .then((d) => (typeof d?.detail === "string" ? d.detail : ""))
      .catch(() => "")
    if (!/expired|revoked|expir/i.test(detail)) return res
    const nouveau = lireAcces(espace) !== envoye && expireDans(lireAcces(espace)) > MARGE_SECONDES ? lireAcces(espace) : await rafraichir(espace)
    if (!nouveau || nouveau === envoye) return res
    return origine(...avecJeton(entree, init, nouveau))
  }

  // renouvellement en avance tant que la page est ouverte (et au retour sur l'onglet)
  const entretenir = () => {
    for (const espace of ESPACES) {
      if (lireRafraichissement(espace) && expireDans(lireAcces(espace)) < 120) void rafraichir(espace)
    }
  }
  window.setInterval(entretenir, 60_000)
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && entretenir())
  entretenir()
}
