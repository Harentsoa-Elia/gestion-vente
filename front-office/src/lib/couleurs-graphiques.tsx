/*
 * Couleurs des graphiques (statistiques de l'organisateur, vue d'ensemble de l'administrateur).
 * Palette vérifiée pour le daltonisme et le contraste, sur la carte blanche et sur la carte
 * sombre (#221d40) de l'espace organisateur. Définie ici plutôt que dans globals.css pour être
 * toujours chargée avec la page : entourer le contenu de la classe 'gw-stats'.
 */
const COULEURS = `
.gw-stats {
  --stat-1: #6c5ce7;
  --stat-2: #e8479a;
  --stat-3: #008300;
  --stat-neutre: #b3afc4;
  --stat-clair: #b9b0f5;
  --stat-piste: #ece8f7;
  --stat-grille: #ece8f7;
  --stat-axe: #6e6987;
}
.dark .gw-stats {
  --stat-1: #9085e9;
  --stat-2: #e8479a;
  --stat-3: #1a9e2a;
  --stat-neutre: #8a84ad;
  --stat-clair: #5d52b8;
  --stat-piste: #3a3366;
  --stat-grille: #3a3366;
  --stat-axe: #a8a3c4;
}
`

export function StyleGraphiques() {
  return <style>{COULEURS}</style>
}
