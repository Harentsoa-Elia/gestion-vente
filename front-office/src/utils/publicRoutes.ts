/**
 * Determine si une route appartient au site public (visiteurs / participants)
 * plutot qu'au panneau staff. Utilise pour choisir le bon header dans
 * clientLayout.tsx et pour eviter que la logique de redirection staff
 * (AppHeader) ne s'applique sur les pages publiques.
 */
export function isPublicRoute(pathname: string): boolean {
  if (pathname === "/") return true
  if (pathname.startsWith("/participants")) return true
  if (pathname === "/evenements") return true

  // /evenements/123          -> detail public
  // /evenements/123/reserver -> flux de reservation (participant)
  // /evenements/123/propositions -> interactions publiques
  if (/^\/evenements\/\d+$/.test(pathname)) return true
  if (/^\/evenements\/\d+\/reserver$/.test(pathname)) return true
  if (/^\/evenements\/\d+\/propositions$/.test(pathname)) return true

  return false
}