import { flushSync } from "react-dom"

/**
 * Change de thème avec une animation : le nouveau thème s'ouvre en cercle à partir du bouton cliqué
 * (API View Transitions du navigateur). Sans cette API, ou si l'utilisateur préfère réduire les animations,
 * le thème change simplement, sans animation.
 */
export function changerThemeAnime(changer: () => void, origine?: { x: number; y: number }) {
  const doc = document as Document & { startViewTransition?: (f: () => void) => { ready: Promise<void> } }
  const reduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (!doc.startViewTransition || reduit) {
    changer()
    return
  }
  const x = origine?.x ?? window.innerWidth / 2
  const y = origine?.y ?? 0
  const rayon = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  const transition = doc.startViewTransition(() => flushSync(changer))
  transition.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rayon}px at ${x}px ${y}px)`] },
      { duration: 650, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
    )
  })
}

/** Centre de l'élément cliqué, point de départ du cercle */
export const centreDe = (el: Element) => {
  const r = el.getBoundingClientRect()
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}
