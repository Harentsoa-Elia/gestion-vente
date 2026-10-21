/*
 * Couleurs des graphiques (statistiques de l'organisateur, vue d'ensemble de l'administrateur).
 * Palette vérifiée pour le daltonisme et le contraste, sur la carte blanche et sur la carte
 * sombre (#2b1f5c) de l'espace organisateur. Définie ici plutôt que dans globals.css pour être
 * toujours chargée avec la page : entourer le contenu de la classe "gw-stats".
 */
const COULEURS = `
.gw-stats {
  --stat-1: #6c5ce7;
  --stat-2: #e8479a;
  --stat-3: #2a1a5e;
  --stat-neutre: #b3a9d9;
  --stat-clair: #b9b0f5;
  --stat-piste: #ebe6fa;
  --stat-grille: #ebe6fa;
  --stat-axe: #6b5f99;
}
.dark .gw-stats {
  --stat-1: #9085e9;
  --stat-2: #e8479a;
  --stat-3: #ddd6f5;
  --stat-neutre: #8f86b5;
  --stat-clair: #5d52b8;
  --stat-piste: #3d2f7a;
  --stat-grille: #3d2f7a;
  --stat-axe: #b3a9d9;
}
`

export function StyleGraphiques() {
  return <style>{COULEURS}</style>
}
