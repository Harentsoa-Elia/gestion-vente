"use client";

import React, { useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  X,
  Music,
  ExternalLink,
  Loader2,
  Calendar,
  Users,
  DollarSign,
} from "lucide-react";

/* -------------------------------------
   Types alignés avec backend
--------------------------------------*/
type Concert = {
  id: number;
  title: string;
  description: string;
  code: string;
  price_vip: number | null;
  price_adult: number | null;
  price_child: number | null;
};

type FormState = {
  id: number | null;
  title: string;
  description: string;
  code: string;
};

/* -------------------------------------
   Modal Glass White
--------------------------------------*/
function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-4xl rounded-2xl border border-black/10 bg-white/90 shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 bg-white/80">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="px-6 py-4 border-t border-slate-200/80 bg-slate-50/80 flex justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------
   Composant principal — Thème clair premium
--------------------------------------*/
export default function ConcertForm() {
  const [concerts, setConcerts] = useState<Concert[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  const [search, setSearch] = useState("");

  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Concert | null>(null);

  const [form, setForm] = useState<FormState>({
    id: null,
    title: "",
    description: "",
    code: "",
  });

  /* -------------------------------------
     Charger concerts
  --------------------------------------*/
  const loadConcerts = async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      toast.error("Veuillez vous reconnecter.");
      return;
    }

    try {
      setLoadingList(true);

      const res = await fetch(
        "https://backend-test.itdcmada.mg/api/v1/concerts",
        {
          method: "GET",
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (!res.ok) throw new Error(await res.text());

      const data: Concert[] = await res.json();
      setConcerts(data);
    } catch (err) {
      toast.error("Erreur lors du chargement des concerts.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    loadConcerts();
  }, []);

  /* -------------------------------------
     Modals
  --------------------------------------*/
  const openCreateModal = () => {
    setForm({ id: null, title: "", description: "", code: "" });
    setModalMode("create");
  };

  const openEditModal = (c: Concert) => {
    setForm({
      id: c.id,
      title: c.title,
      description: c.description,
      code: c.code,
    });
    setModalMode("edit");
  };

  const openDeleteModal = (c: Concert) => setDeleteTarget(c);
  const closeFormModal = () => setModalMode(null);
  const closeDeleteModal = () => setDeleteTarget(null);

  /* -------------------------------------
     SAVE
  --------------------------------------*/
  const handleSave = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return toast.error("Token manquant");

    if (!form.title.trim() || !form.description.trim() || !form.code.trim()) {
      return toast.error("Tous les champs sont obligatoires.");
    }

    setLoadingSave(true);

    try {
      const url =
        form.id === null
          ? "https://backend-test.itdcmada.mg/api/v1/concerts"
          : `https://backend-test.itdcmada.mg/api/v1/concerts/${form.id}`;

      const res = await fetch(url, {
        method: form.id === null ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          code: form.code.trim().toUpperCase(),
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      toast.success(
        form.id ? "Concert modifié avec succès" : "Concert créé avec succès"
      );

      closeFormModal();
      loadConcerts();
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement.");
    } finally {
      setLoadingSave(false);
    }
  };

  /* -------------------------------------
     DELETE
  --------------------------------------*/
  const handleDelete = async () => {
    const token = localStorage.getItem("access_token");
    if (!token || !deleteTarget) return;

    setLoadingDelete(true);

    try {
      const res = await fetch(
        `https://backend-test.itdcmada.mg/api/v1/concerts/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: "Bearer " + token,
          },
        }
      );

      if (!res.ok) throw new Error(await res.text());

      toast.success("Concert supprimé.");
      closeDeleteModal();
      loadConcerts();
    } catch (err) {
      toast.error("Erreur lors de la suppression.");
    } finally {
      setLoadingDelete(false);
    }
  };

  /* -------------------------------------
     FILTRE
  --------------------------------------*/
  const filteredConcerts = concerts.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.title.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q)
    );
  });

  /* -------------------------------------
     UI Thème clair glass
  --------------------------------------*/
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-slate-900">
      {/* HEADER */}
      <header className="w-full px-6 pt-6 pb-3">
        <div className="w-full flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/80 border border-slate-200 shadow-sm backdrop-blur">
              <Calendar className="w-7 h-7 text-sky-500" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900">
                Gestion des concerts
              </h1>
              <p className="text-sm sm:text-base text-slate-500 mt-1">
                Interface d’administration événementielle premium
              </p>
            </div>
          </div>

          <Button
            onClick={openCreateModal}
            className="inline-flex items-center justify-center bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white shadow-lg shadow-sky-200 rounded-xl px-5 py-2.5 text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau concert
          </Button>
        </div>
      </header>

      {/* STATISTICS */}
      <div className="w-full px-6 pb-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
          <div className="backdrop-blur-xl bg-white/80 border border-black/5 rounded-2xl p-5 shadow-[0_4px_14px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-100">
                <Music className="w-5 h-5 text-sky-500" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Total concerts
                </p>
                <p className="text-2xl font-semibold text-slate-900">
                  {concerts.length}
                </p>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/80 border border-black/5 rounded-2xl p-5 shadow-[0_4px_14px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-100">
                <Users className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  En ligne (code LIVE)
                </p>
                <p className="text-2xl font-semibold text-slate-900">
                  {concerts.filter((c) => c.code.includes("LIVE")).length}
                </p>
              </div>
            </div>
          </div>

          <div className="backdrop-blur-xl bg-white/80 border border-black/5 rounded-2xl p-5 shadow-[0_4px_14px_rgba(0,0,0,0.06)]">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-100">
                <DollarSign className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Concerts actifs
                </p>
                <p className="text-2xl font-semibold text-slate-900">
                  {concerts.length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENT */}
      <div className="w-full px-6 pb-6 h-[calc(100vh-220px)]">
        <Card className="w-full h-full backdrop-blur-xl bg-white/80 border border-black/5 rounded-3xl shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col overflow-hidden">
          <CardHeader className="border-b border-slate-200/80 px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <CardTitle className="text-lg sm:text-xl font-semibold text-slate-900">
                  Concerts programmés
                </CardTitle>
                <CardDescription className="text-sm text-slate-500">
                  {concerts.length} concert(s) au total dans votre base
                </CardDescription>
              </div>

              <div className="relative w-full lg:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Rechercher un concert..."
                  className="pl-9 pr-3 py-2.5 rounded-xl bg-white/80 border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus-visible:ring-sky-400 focus-visible:border-sky-400"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0 overflow-y-auto">
            <div className="p-5 space-y-3">
              {loadingList ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
                    <p className="text-sm text-slate-500">
                      Chargement des concerts...
                    </p>
                  </div>
                </div>
              ) : filteredConcerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="p-3 rounded-2xl bg-slate-100 mb-3">
                    <Music className="w-7 h-7 text-slate-400" />
                  </div>
                  <h3 className="text-base font-medium text-slate-800 mb-1">
                    {search
                      ? "Aucun concert ne correspond à votre recherche"
                      : "Aucun concert pour le moment"}
                  </h3>
                  <p className="text-sm text-slate-500 max-w-md">
                    {search
                      ? "Essayez avec un autre titre, code ou une partie de la description."
                      : "Créez votre premier concert pour le voir apparaître dans la liste."}
                  </p>
                  {!search && (
                    <Button
                      onClick={openCreateModal}
                      className="mt-4 bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white rounded-xl px-4 py-2 text-sm shadow-md"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Créer un concert
                    </Button>
                  )}
                </div>
              ) : (
                filteredConcerts.map((c) => (
                  <div
                    key={c.id}
                    className="group w-full backdrop-blur-xl bg-white/80 hover:bg-white border border-slate-200/80 rounded-2xl px-5 py-4 shadow-sm hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)] transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                          <h3 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
                            {c.title}
                          </h3>
                          <div className="flex flex-wrap gap-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-medium border border-sky-100">
                              {c.code}
                            </span>
                           
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {c.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 justify-end lg:justify-start">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(c)}
                          className="border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-300 text-xs sm:text-sm rounded-lg"
                        >
                          <Edit3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => openDeleteModal(c)}
                          className="bg-red-500/90 hover:bg-red-600 text-white text-xs sm:text-sm rounded-lg shadow-sm"
                        >
                          <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5" />
                          Supprimer
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MODAL FORMULAIRE */}
      <Modal
        open={modalMode !== null}
        title={modalMode === "edit" ? "Modifier le concert" : "Créer un concert"}
        onClose={closeFormModal}
        footer={
          <>
            <Button
              variant="outline"
              onClick={closeFormModal}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-lg text-sm"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={loadingSave}
              className="inline-flex items-center bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600 text-white rounded-lg px-5 py-2 text-sm font-medium shadow-md disabled:opacity-60"
            >
              {loadingSave ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {modalMode === "edit" ? "Mettre à jour" : "Créer"}
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-800">
              Titre du concert
            </Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="bg-white/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg text-sm focus-visible:ring-sky-400 focus-visible:border-sky-400"
              placeholder="Ex : Nuit du Jazz 2025"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-800">
              Description
            </Label>
            <Textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="bg-white/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg text-sm min-h-[120px] resize-none focus-visible:ring-sky-400 focus-visible:border-sky-400"
              placeholder="Détails du concert, artistes, lieu, horaires..."
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-slate-800">
              Code unique
            </Label>
            <Input
              value={form.code}
              onChange={(e) =>
                setForm({ ...form, code: e.target.value.toUpperCase() })
              }
              className="bg-white/80 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-lg text-sm font-mono tracking-wide focus-visible:ring-sky-400 focus-visible:border-sky-400"
              placeholder="Ex : CONCERT001"
            />
            <p className="text-xs text-slate-500">
              Le code est stocké automatiquement en majuscules.
            </p>
          </div>
        </div>
      </Modal>

      {/* MODAL SUPPRESSION */}
      <Modal
        open={!!deleteTarget}
        title="Confirmer la suppression"
        onClose={closeDeleteModal}
        footer={
          <>
            <Button
              variant="outline"
              onClick={closeDeleteModal}
              className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-lg text-sm"
            >
              Annuler
            </Button>

            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loadingDelete}
              className="inline-flex items-center bg-red-500 hover:bg-red-600 text-white rounded-lg px-5 py-2 text-sm font-medium shadow-md disabled:opacity-60"
            >
              {loadingDelete ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </>
              )}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600 text-center">
          Le concert{" "}
          <span className="font-semibold text-slate-900">
            {deleteTarget?.title}
          </span>{" "}
          ({deleteTarget?.code}) sera définitivement supprimé.
        </p>
      </Modal>
    </div>
  );
}
