export interface Notification {
  id: number
  message: string
  lu: boolean
  date_creation: string
  reservation_id: number | null
}

export interface NotificationCount {
  non_lues: number
}