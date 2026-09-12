// Statistiques par catégorie dynamique
// Exemple :
// {
//   "VIP": { total: 300, used: 200, unused: 100 },
//   "ADULT": { total: 100, used: 80, unused: 20 }
// }

export interface DynamicCategoryStats {
  [category: string]: {
    total: number
    used: number
    unused: number
  }
}