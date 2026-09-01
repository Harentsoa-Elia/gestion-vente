"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchConcerts, generateTickets, regenerateTickets } from "@/services";
import type { Concert, Ticket } from "@/types";
import { toast } from "sonner";
import {
  Download,
  RefreshCw,
  Sparkles,
  Loader2,
  AlertCircle,
  Ticket as TicketIcon,
  Printer,
  Music4,
  Tag,
  CheckCircle2,
  Hash,
} from "lucide-react";
import VIP from "./VIP";
import AdulteEnfant from "./rossy/carteBille";

export default function TicketGeneratorForm() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [selectedConcertId, setSelectedConcertId] = useState<string | null>(
    null
  );
  const [quantity, setQuantity] = useState<string>("");
  const [category, setCategory] = useState<string>("VENTELIVE");
  const [generatedTickets, setGeneratedTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"generate" | "regenerate">("generate");
  const [ticketIdStart, setTicketIdStart] = useState<string>("");
  const [ticketIdEnd, setTicketIdEnd] = useState<string>("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    const getConcerts = async () => {
      try {
        const data = await fetchConcerts();
        setConcerts(data);
      } catch (err: any) {
        setError(err.message || "Failed to load concerts.");
        toast.error(err.message || "Failed to load concerts.", {
          description: "Please try again later.",
        });
      }
    };
    getConcerts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConcertId) {
      setError("Please select a concert.");
      return;
    }

    if (mode === "generate" && !quantity) {
      setError("Please enter a quantity.");
      return;
    }

    if (mode === "regenerate" && !ticketIdStart) {
      setError("Please enter the ticket ID start for regeneration.");
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedTickets([]);

    try {
      let tickets: Ticket[] = [];
      if (mode === "generate") {
        tickets = await generateTickets(
          Number(selectedConcertId),
          Number(quantity),
          category as "ADULT" | "VIP" | "CHILD" | "PREVENTE"
        );
        toast.success(`${tickets.length} tickets generated.`);
      } else {
        tickets = await regenerateTickets(
          Number(selectedConcertId),
          ticketIdStart,
          ticketIdEnd || undefined
        );
        toast.success(`${tickets.length} tickets regenerated.`);
      }
      setGeneratedTickets(tickets);
    } catch (err: any) {
      setError(err.message || "Operation failed.");
      toast.error(err.message || "Operation failed.");
    } finally {
      setLoading(false);
    }
  };

  const selectedConcert = concerts.find(
    (c) => c.id === Number.parseInt(selectedConcertId || "0")
  );

  return (
    <div className="grid gap-6">
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 2.5mm;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }

          .no-print,
          #sonner-toaster,
          .sonner-toast,
          [data-sonner-toaster] {
            display: none !important;
          }

          .print-page {
            width: calc(210mm - 5mm) !important;
            height: calc(297mm - 5mm) !important;
            display: grid !important;
            grid-template-columns: repeat(4, 1fr);
            grid-template-rows: repeat(4, auto);
            gap: 1mm !important;
            justify-items: center;
            align-items: center;
            page-break-after: always !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .print-page:last-child {
            page-break-after: avoid !important;
          }

          .ticket-wrapper {
            width: 50mm !important;
            height: 43.5mm !important;
            margin: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* ============================= Panneau de contrôle ============================= */}
      <div className="no-print relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-white via-white to-slate-50 p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 opacity-60 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-gradient-to-br from-cyan-100 to-emerald-50 opacity-50 blur-3xl" />

        {/* Header */}
        <div className="relative mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200">
              <TicketIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Générateur billet (Mahaleo)
              </h2>
              <p className="text-sm text-slate-500">
                Créez ou régénérez des billets en quelques clics.
              </p>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="flex-1 gap-2 rounded-xl border-blue-200 bg-blue-50/80 font-semibold text-blue-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-100 hover:shadow-md sm:flex-none"
            >
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
            <Button
              onClick={() => window.print()}
              disabled={isGeneratingPdf || generatedTickets.length === 0}
              className="flex-1 gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 font-bold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:from-emerald-700 hover:to-teal-700 hover:shadow-lg disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-50 sm:flex-none"
            >
              {isGeneratingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Printer className="h-4 w-4" />
              )}
              {isGeneratingPdf ? "Génération..." : "Imprimer"}
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Carte du formulaire */}
        <Card className="relative mx-auto max-w-3xl overflow-hidden rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/60">
          <div className="h-1.5 w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500" />

          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-300 ${
                  mode === "generate"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {mode === "generate" ? (
                  <Sparkles className="h-4 w-4" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </span>
              <CardTitle className="text-lg font-bold text-slate-900">
                {mode === "generate"
                  ? "Générer des billets"
                  : "Régénérer des billets"}
              </CardTitle>
            </div>
            <CardDescription className="pl-10 text-slate-500">
              {mode === "generate"
                ? "Sélectionnez un concert et le nombre de billets à générer."
                : "Sélectionnez un concert et les ID des billets à régénérer."}
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
              {/* --- Mode --- */}
              <div className="space-y-2">
                <Label htmlFor="mode" className="text-sm font-semibold text-slate-700">
                  Mode
                </Label>
                <Select onValueChange={(v) => setMode(v as any)} value={mode}>
                  <SelectTrigger
                    id="mode"
                    className="h-11 w-full rounded-xl border-slate-200 bg-slate-50 transition-all focus:ring-2 focus:ring-emerald-500/40 sm:w-auto"
                  >
                    <SelectValue placeholder="Mode" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-slate-200 bg-white text-slate-900 shadow-lg">
                    <SelectItem
                      value="generate"
                      className="rounded-lg data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        Generate
                      </span>
                    </SelectItem>
                    <SelectItem
                      value="regenerate"
                      className="rounded-lg data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
                    >
                      <span className="flex items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
                        Regenerate
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* --- Sélection du concert --- */}
              <div className="space-y-2">
                <Label
                  htmlFor="concert"
                  className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"
                >
                  <Music4 className="h-3.5 w-3.5 text-slate-400" />
                  Sélectionnez un concert
                </Label>
                <Select
                  onValueChange={setSelectedConcertId}
                  value={selectedConcertId || ""}
                >
                  <SelectTrigger
                    id="concert"
                    disabled={concerts.length === 0}
                    className="h-11 w-full rounded-xl border-slate-200 bg-slate-50 transition-all focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-70"
                  >
                    <SelectValue
                      placeholder={
                        concerts.length === 0
                          ? "Chargement des concerts..."
                          : "Choisir un concert..."
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="max-w-full rounded-xl border border-slate-200 bg-white text-slate-900 shadow-lg">
                    {concerts
                      .filter(
                        (concert) => ![8, 10, 11, 13, 14].includes(concert.id)
                      )
                      .map((concert) => (
                        <SelectItem
                          key={concert.id}
                          value={String(concert.id)}
                          className="rounded-lg data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
                        >
                          <span className="flex items-center gap-2">
                            <span className="font-medium">{concert.title}</span>
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-500">
                              {concert.code}
                            </span>
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>

                {selectedConcert && (
                  <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-sm text-emerald-800">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span className="truncate">
                      <span className="font-semibold">{selectedConcert.title}</span>
                      <span className="mx-1.5 text-emerald-400">•</span>
                      <span className="inline-flex items-center gap-1 text-emerald-700/80">
                        <Hash className="h-3 w-3" />
                        {selectedConcert.code}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {/* --- Champs Generate --- */}
              {mode === "generate" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="quantity" className="text-sm font-semibold text-slate-700">
                      Quantité
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      placeholder="e.g., 100"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="category"
                      className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"
                    >
                      <Tag className="h-3.5 w-3.5 text-slate-400" />
                      Catégorie
                    </Label>
                    <Select onValueChange={setCategory} value={category}>
                      <SelectTrigger
                        id="category"
                        className="h-11 w-full rounded-xl border-slate-200 bg-slate-50 transition-all focus:ring-2 focus:ring-emerald-500/40"
                      >
                        <SelectValue placeholder="Select category..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border border-slate-200 bg-white text-slate-900 shadow-lg">
                        <SelectItem
                          value="VENTELIVE"
                          className="rounded-lg data-[highlighted]:bg-slate-100 data-[highlighted]:text-slate-900"
                        >
                          Vente sur live
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* --- Champs Regenerate --- */}
              {mode === "regenerate" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="ticket-start" className="text-sm font-semibold text-slate-700">
                      ID départ
                    </Label>
                    <Input
                      id="ticket-start"
                      type="text"
                      placeholder="Ex: 101"
                      value={ticketIdStart}
                      onChange={(e) => setTicketIdStart(e.target.value)}
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-all focus-visible:ring-2 focus-visible:ring-amber-500/40"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ticket-end" className="text-sm font-semibold text-slate-700">
                      ID fin (optionnel)
                    </Label>
                    <Input
                      id="ticket-end"
                      type="text"
                      placeholder="Ex: 120"
                      value={ticketIdEnd}
                      onChange={(e) => setTicketIdEnd(e.target.value)}
                      className="h-11 rounded-xl border-slate-200 bg-slate-50 transition-all focus-visible:ring-2 focus-visible:ring-amber-500/40"
                    />
                  </div>
                </div>
              )}

              {error && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-red-500">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {error}
                </p>
              )}

              <div className="justify-center pt-2 text-center">
                <Button
                  type="submit"
                  className={`w-full gap-2 rounded-xl py-2.5 font-semibold text-white shadow-md transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg disabled:pointer-events-none disabled:translate-y-0 sm:w-auto sm:px-8 ${
                    mode === "generate"
                      ? "bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
                      : "bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700"
                  }`}
                  disabled={
                    loading ||
                    !selectedConcertId ||
                    (mode === "generate" && !quantity) ||
                    (mode === "regenerate" && !ticketIdStart)
                  }
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loading
                    ? mode === "generate"
                      ? "Generating..."
                      : "Régénération..."
                    : mode === "generate"
                    ? "Generate Tickets"
                    : "Regenerate Tickets"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* ============================= Bandeau de confirmation ============================= */}
      {generatedTickets.length > 0 && (
        <div className="no-print mx-auto flex w-full max-w-3xl items-center gap-2.5 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm animate-in fade-in-0 slide-in-from-top-1 duration-300">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </span>
          <span>
            {generatedTickets.length} billet{generatedTickets.length > 1 ? "s" : ""}{" "}
            {mode === "regenerate" ? "régénéré" : "généré"}
            {generatedTickets.length > 1 ? "s" : ""} pour{" "}
            <span className="font-semibold">{selectedConcert?.title ?? "ce concert"}</span>.
          </span>
        </div>
      )}

      {category === "VENTELIVE" && generatedTickets.length > 0 ? (
        <VIP
          concerts={concerts}
          generatedTickets={generatedTickets}
          selectedConcertId={selectedConcertId}
        />
      ) : generatedTickets.length > 0 ? (
        <VIP
          concerts={concerts}
          generatedTickets={generatedTickets}
          selectedConcertId={selectedConcertId}
        />
      ) : null}
    </div>
  );
}