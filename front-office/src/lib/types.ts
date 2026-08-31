// =============================
// 🎵 Concert
// =============================
export interface Concert {
  id: number
  title: string
  description: string
  price_vip: number
  price_adult: number
  price_child: number
  code: string
}

// =============================
// 🎟️ Ticket
// =============================
export interface Ticket {
  id: string
  concert_id: number
  is_used: boolean
  qr_code_data: string
  category: string // 🔹 devient libre : pas limité à "VIP" | "ADULT" ...
}

// =============================
// 🔍 Réponse du scan
// =============================
export interface TicketScanResponse {
  ticket_id: string
  is_valid: boolean
  message: string
  concert_title: string
  concert_description: string
}

// =============================
// 📊 Statistiques globales
// =============================
export interface TicketStats {
  total: number
  used: number
  unused: number
}

// =============================
// 📈 Statistiques par catégorie dynamique
// =============================
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

// =============================
// 💰 Montants calculés localement (manuel)
// =============================
export interface CategoryAmount {
  label: string
  used: number
  price: number
  total: number
}
