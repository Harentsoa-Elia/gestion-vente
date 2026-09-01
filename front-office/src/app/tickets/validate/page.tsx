// app/tickets/validate/page.tsx
"use client"

import { useEffect, useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { scanTicket } from "@/services"
import type { TicketScanResponse } from "@/types"

// Composant qui contient la logique de validation
function ValidateTicketContent() {
  const searchParams = useSearchParams()
  const ticketId = searchParams.get("id")

  const [scanResult, setScanResult] = useState<TicketScanResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const validateTicket = async () => {
      if (!ticketId) {
        setError("No ticket ID provided in the URL.")
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        const result = await scanTicket(window.location.href)
        setScanResult(result)
      } catch (err: any) {
        console.error("Failed to scan ticket:", err)
        setError(err.message || "An unexpected error occurred during ticket validation.")
      } finally {
        setLoading(false)
      }
    }

    validateTicket()
  }, [ticketId])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Validating Ticket...</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-12 w-12 animate-spin text-gray-500" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Please wait while we check your ticket.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <Card className="w-full max-w-md text-center border-red-500">
          <CardHeader>
            <CardTitle className="text-red-600">Validation Error</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <XCircle className="h-16 w-16 text-red-500" />
            <p className="mt-4 text-lg font-semibold text-red-700">{error}</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Please ensure the QR code is valid and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!scanResult) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Ticket Status</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <p className="text-gray-600 dark:text-gray-400">
              No scan result available.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { is_valid, message, concert_title, ticket_id } = scanResult

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <Card className={`w-full max-w-md text-center ${is_valid ? "border-green-500" : "border-red-500"}`}>
        <CardHeader>
          <CardTitle className={is_valid ? "text-green-600" : "text-red-600"}>
            {is_valid ? "Ticket Valid!" : "Ticket Invalid!"}
          </CardTitle>
          <CardDescription>{message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-6">
          {is_valid ? (
            <CheckCircle className="h-24 w-24 text-green-500" />
          ) : (
            <XCircle className="h-24 w-24 text-red-500" />
          )}
          <h3 className="mt-4 text-2xl font-bold text-gray-800 dark:text-gray-200">
            Concert: {concert_title}
          </h3>
          <p className="mt-2 text-sm text-gray-500">Ticket ID: {ticket_id}</p>
        </CardContent>
      </Card>
    </div>
  )
}

// Page avec Suspense boundary
export default function ValidateTicketPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ValidateTicketContent />
    </Suspense>
  )
}
