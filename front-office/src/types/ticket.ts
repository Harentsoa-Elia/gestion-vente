// Ticket
export interface Ticket {
  id: string
  concert_id: number
  is_used: boolean
  qr_code_data: string
  category: string // libre : pas limité à "VIP" | "ADULT" ...
}

// Réponse du scan
export interface TicketScanResponse {
  ticket_id: string
  is_valid: boolean
  message: string
  concert_title: string
  concert_description: string
}

// Statistiques globales
export interface TicketStats {
  total: number
  used: number
  unused: number
}