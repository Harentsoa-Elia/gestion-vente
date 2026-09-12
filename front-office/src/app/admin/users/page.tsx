"use client";

import {
  useEffect,
  useState,
  ReactNode,
  Children,
  cloneElement,
} from "react";
import {
  Eye,
  EyeOff,
  Users as UsersIcon,
  Plus,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  UserPlus,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { API_BASE_URL } from "@/services/apiConfig";

/* ---------- Types ---------- */
interface User {
  id: number;
  fullname: string;
  email: string;
  concert_id: number | null;
}

/* ---------- Modal glass white ---------- */
function Modal({
  isOpen,
  onClose,
  children,
  title,
  icon,
}: {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title: string;
  icon?: ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm px-4">
      <div className="w-full max-w-lg rounded-2xl border border-black/10 bg-white/90 shadow-2xl backdrop-blur-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-4 bg-white/80">
          <div className="flex items-center gap-2">
            {icon && (
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                {icon}
              </span>
            )}
            <h2 className="text-base md:text-lg font-semibold text-slate-900">
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full text-xl leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ---------- Select minimal stylé ---------- */
interface SelectItemProps {
  value: string;
  children: ReactNode;
  className?: string;
  onSelect?: (value: string) => void;
}

function SelectItem({
  value,
  children,
  className = "",
  onSelect,
}: SelectItemProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect?.(value)}
      className={`w-full px-3 py-2.5 text-left text-sm text-slate-900 hover:bg-slate-50 transition ${className}`}
    >
      {children}
    </button>
  );
}

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  placeholder?: string;
}

function Select({ value, onValueChange, children, placeholder }: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);

  const childrenArray = Children.toArray(children) as any[];

  const selectedChild = childrenArray.find(
    (child) => child?.props?.value === value
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition"
      >
        <span className={value ? "text-slate-900" : "text-slate-400"}>
          {value && selectedChild
            ? selectedChild.props.children
            : placeholder || "Sélectionnez..."}
        </span>
        <span className="ml-2 text-xs text-slate-400">▼</span>
      </button>

      {isOpen && (
        <div
          className="
            absolute z-20 mt-1 w-full 
            max-h-[150px]
             overflow-y-auto
            rounded-xl border border-slate-200 
            bg-white/95 backdrop-blur-xl 
            shadow-[0_8px_24px_rgba(15,23,42,0.12)]
          "
        >

          {childrenArray.map((child, idx) =>
            cloneElement(child, {
              key: idx,
              onSelect: (val: string) => {
                onValueChange(val);
                setIsOpen(false);
              },
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Hook concert sécurisé ---------- */
function useConcert(concertId: number | null | undefined) {
  const [concert, setConcert] = useState<{ title: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!concertId || concertId <= 0) {
      setConcert(null);
      setLoading(false);
      return;
    }

    const fetchConcert = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("access_token");
      
        const res = await fetch(`${API_BASE_URL}/concerts/${concertId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setConcert(data);
        } else if (res.status === 404) {
          setConcert(null);
        } else {
          console.error(
            `Erreur lors du chargement du concert ${concertId}: ${res.status}`
          );
        }
      } catch (err) {
        console.error(`Erreur chargement concert ${concertId}:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchConcert();
  }, [concertId]);

  return { concert, loading };
}

/* ---------- Cellule concert ---------- */
function ConcertCell({ concertId }: { concertId: number | null | undefined }) {
  const { concert, loading } = useConcert(concertId);

  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700">
      {loading ? "Chargement..." : concert?.title || "Aucun"}
    </span>
  );
}

/* ---------- Page principale ---------- */
export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Load users error:", err);
      toast.error("Erreur lors du chargement des utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = users.filter(
    (user) =>
      user.fullname
        ?.toLowerCase()
        .includes(searchTerm.trim().toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.trim().toLowerCase())
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-slate-900">
      {/* HEADER */}
      <header className="w-full px-6 pt-6 pb-4">
        <div className="w-full flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-white/80 border border-slate-200 shadow-sm backdrop-blur">
              <UsersIcon className="w-7 h-7 text-slate-900" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-semibold text-slate-900">
                Gestion des utilisateurs
              </h1>
              <p className="text-sm sm:text-base text-slate-500 mt-1">
                Gérez les comptes, les accès et les concerts associés.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <Button
              variant="outline"
              onClick={fetchUsers}
              className="flex items-center gap-1.5 rounded-xl border-slate-200 bg-white/80 px-3 py-2 text-xs md:text-sm text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Actualiser</span>
            </Button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 px-4 py-2 text-xs md:text-sm font-semibold text-white shadow-[0_10px_30px_rgba(56,189,248,0.45)] hover:from-sky-600 hover:to-blue-600"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/10">
                <Plus className="w-4 h-4" />
              </span>
              <span>Nouvel utilisateur</span>
            </Button>
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="w-full px-6 pb-6">
        <Card className="w-full backdrop-blur-xl bg-white/85 border border-black/5 rounded-3xl shadow-[0_8px_24px_rgba(15,23,42,0.08)] flex flex-col overflow-hidden">
          <CardHeader className="border-b border-slate-200/80 px-6 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-slate-900 text-lg sm:text-xl">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-2xl bg-slate-900/5 text-slate-900">
                    <UsersIcon className="w-4 h-4" />
                  </span>
                  Liste des utilisateurs
                </CardTitle>
                <CardDescription className="text-sm text-slate-500 mt-1">
                  {filteredUsers.length} utilisateur(s) trouvé(s) sur{" "}
                  {users.length}
                </CardDescription>
              </div>

              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end w-full md:w-auto">
                <div className="relative w-full md:w-64">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    <Search className="w-4 h-4" />
                  </span>
                  <Input
                    placeholder="Rechercher par nom ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-2.5 rounded-xl bg-white/80 border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus-visible:ring-sky-400/40 focus-visible:border-sky-400"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  <Filter className="w-4 h-4" />
                  <span>Filtres</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="px-6 py-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 animate-pulse">
                    <div className="h-9 w-9 rounded-full bg-slate-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-2/3 rounded bg-slate-100" />
                      <div className="h-3 w-1/3 rounded bg-slate-100" />
                    </div>
                    <div className="h-3 w-20 rounded bg-slate-100 hidden sm:block" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="w-full overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50/80">
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3">Utilisateur</th>
                        <th className="px-4 py-3 hidden md:table-cell">Email</th>
                        <th className="px-4 py-3">Concert</th>
                        <th className="px-4 py-3 hidden sm:table-cell">
                          Statut
                        </th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((user) => (
                        <tr
                          key={user.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          {/* UTILISATEUR */}
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-900 to-slate-700 text-xs font-semibold text-white shadow-sm">
                                {user.fullname?.charAt(0).toUpperCase() || "U"}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-slate-900">
                                  {user.fullname}
                                </p>
                                <p className="truncate text-xs text-slate-500 md:hidden">
                                  {user.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* EMAIL */}
                          <td className="px-4 py-3 align-middle text-slate-700 hidden md:table-cell">
                            {user.email}
                          </td>

                          {/* CONCERT */}
                          <td className="px-4 py-3 align-middle">
                            <ConcertCell concertId={user.concert_id ?? null} />
                          </td>

                          {/* STATUT */}
                          <td className="px-4 py-3 align-middle hidden sm:table-cell">
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-100">
                              Actif
                            </span>
                          </td>

                          {/* ACTIONS */}
                          <td className="px-4 py-3 align-middle">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsEditModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-xl border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Modifier</span>
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 rounded-full p-0 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredUsers.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-300">
                      <UsersIcon className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-medium text-slate-800">
                      Aucun utilisateur trouvé
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm">
                      {searchTerm
                        ? "Essayez de modifier vos critères de recherche."
                        : "Aucun utilisateur pour le moment. Créez-en un nouveau pour ce concert."}
                    </p>
                    <Button
                      onClick={() => setIsCreateModalOpen(true)}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Créer un utilisateur</span>
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* MODAL CRÉATION */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Nouvel utilisateur"
        icon={<UserPlus className="w-4 h-4" />}
      >
        <CreateUserForm
          onSuccess={() => {
            setIsCreateModalOpen(false);
            fetchUsers();
          }}
        />
      </Modal>

      {/* MODAL ÉDITION */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Modifier l'utilisateur"
        icon={<Edit3 className="w-4 h-4" />}
      >
        {selectedUser && (
          <EditUserForm
            user={selectedUser}
            onSuccess={() => {
              setIsEditModalOpen(false);
              fetchUsers();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

/* ---------- Formulaire création utilisateur ---------- */
function CreateUserForm({ onSuccess }: { onSuccess: () => void }) {
  const [fullname, setFullname] = useState("");
  const [email, setEmail] = useState("");
  const [concertId, setConcertId] = useState<string>("");
  const [concerts, setConcerts] = useState<any[]>([]);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchConcerts = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE_URL}/concerts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        const data = await res.json();
        setConcerts(data);
      } catch (err) {
        console.error("Load concerts error:", err);
        toast.error("Erreur lors du chargement des concerts.");
      }
    };
    fetchConcerts();
  }, [API_BASE_URL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const res = await fetch(`${API_BASE_URL}/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullname,
          email,
          password,
          concert_id: concertId || null,
        }),
      });
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      toast.success("Utilisateur créé avec succès.");
      onSuccess();
    } catch (err) {
      console.error("Create user error:", err);
      toast.error("Erreur lors de la création de l'utilisateur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nom complet */}
      <div className="space-y-1.5">
        <Label htmlFor="fullname" className="text-sm font-medium text-slate-800">
          Nom complet
        </Label>
        <Input
          id="fullname"
          value={fullname}
          onChange={(e) => setFullname(e.target.value)}
          required
          className="h-11 px-4 bg-white/90 border-slate-200"
          placeholder="Jean Dupont"
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="email" className="text-sm font-medium text-slate-800">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 px-4 bg-white/90 border-slate-200"
          placeholder="jean.dupont@example.com"
        />
      </div>

      {/* Concert */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-800">Concert</Label>
        <Select
          value={concertId}
          onValueChange={setConcertId}
          placeholder="Sélectionnez un concert"
        >
          {concerts.map((c) => (
            <SelectItem
              key={c.id}
              value={String(c.id)}
              className="cursor-pointer"
            >
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-900">
                  {c.title}
                </span>
                <span className="text-xs text-slate-500">{c.code}</span>
              </div>
            </SelectItem>
          ))}
        </Select>
      </div>

      {/* Mot de passe */}
      <div className="space-y-1.5">
        <Label
          htmlFor="password"
          className="text-sm font-medium text-slate-800"
        >
          Mot de passe
        </Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="h-11 px-4 pr-11 bg-white/90 border-slate-200"
            placeholder="••••••••"
          />
          <button
            type="button"
            className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100 transition"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={
              showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
            }
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Utilisez un mot de passe fort pour sécuriser le compte.
        </p>
      </div>

      {/* Bouton */}
      <Button
        type="submit"
        disabled={loading}
        className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-slate-900 text-sm font-medium text-white shadow-[0_14px_35px_rgba(15,23,42,0.5)] hover:bg-slate-800 disabled:opacity-60 disabled:pointer-events-none"
      >
        {loading ? (
          <>
            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
            Création en cours...
          </>
        ) : (
          "Créer l'utilisateur"
        )}
      </Button>
    </form>
  );
}

/* ---------- Formulaire édition utilisateur ---------- */
function EditUserForm({
  user,
  onSuccess,
}: {
  user: User;
  onSuccess: () => void;
}) {
  const [fullname, setFullname] = useState(user.fullname || "");
  const [email, setEmail] = useState(user.email || "");
  const [concertId, setConcertId] = useState<string>(
    user.concert_id ? String(user.concert_id) : ""
  );
  const [password, setPassword] = useState("");
  const [concerts, setConcerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const fetchConcerts = async () => {
      try {
        const token = localStorage.getItem("access_token");
        const res = await fetch(`${API_BASE_URL}/concerts`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Erreur ${res.status}`);
        const data = await res.json();
        setConcerts(data);
      } catch (err) {
        console.error("Load concerts error:", err);
        toast.error("Erreur lors du chargement des concerts.");
      }
    };
    fetchConcerts();
  }, [API_BASE_URL]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");

      const body: any = {
        fullname,
        email,
        concert_id: concertId || null,
      };
      if (password) {
        body.password = password;
      }

     const res = await fetch(`${API_BASE_URL}/admin/users`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`Erreur ${res.status}`);

      toast.success("Utilisateur mis à jour avec succès.");
      onSuccess();
    } catch (err) {
      console.error("Update user error:", err);
      toast.error("Erreur lors de la mise à jour de l'utilisateur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nom */}
      <div className="space-y-1.5">
        <Label htmlFor="edit-fullname" className="text-sm font-medium text-slate-800">
          Nom complet
        </Label>
        <Input
          id="edit-fullname"
          value={fullname}
          onChange={(e) => setFullname(e.target.value)}
          required
          className="h-11 px-4 bg-white/90 border-slate-200"
        />
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <Label htmlFor="edit-email" className="text-sm font-medium text-slate-800">
          Email
        </Label>
        <Input
          id="edit-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="h-11 px-4 bg-white/90 border-slate-200"
        />
      </div>

      {/* Concert */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-800">Concert</Label>
        <Select
          value={concertId}
          onValueChange={setConcertId}
          placeholder="Sélectionnez un concert"
        >
          {concerts.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-900">
                  {c.title}
                </span>
                <span className="text-xs text-slate-500">{c.code}</span>
              </div>
            </SelectItem>
          ))}
        </Select>
      </div>

      {/* Mot de passe (facultatif) */}
      <div className="space-y-1.5">
        <Label className="text-sm font-medium text-slate-800">
          Mot de passe (laisser vide = inchangé)
        </Label>
        <div className="relative">
          <Input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 px-4 pr-11 bg-white/90 border-slate-200"
            placeholder="••••••••"
          />
          <button
            type="button"
            className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-slate-100"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="mt-4 w-full h-11 rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? "Modification..." : "Mettre à jour"}
      </Button>
    </form>
  );
}
