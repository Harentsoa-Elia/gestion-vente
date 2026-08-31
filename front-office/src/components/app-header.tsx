"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  PlusCircle,
  Ticket,
  Menu,
  ChevronDown,
  LogOut,
  User,
  Trophy,
} from "lucide-react";
import { useState, useEffect } from "react";
import clsx from "clsx";

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [showLionHillSubmenu, setShowLionHillSubmenu] = useState(false);
  const [showRossySubmenu, setShowRossySubmenu] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [userFullname, setUserFullname] = useState("");
  const [concertId, setConcertId] = useState<number | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // ---- NEW : Etat du menu Admin ----
  const [showAdminMenu, setShowAdminMenu] = useState(false);

  const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000/api/v1";

  // ---------------- BASE LINKS ----------------
  const baseLinks = [
    { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
    { href: "/concerts/new", label: "Concerts", icon: PlusCircle },
  ];

  // ---------------- LION HILL ----------------
  const lionHillLinks = [
    { href: "/tickets/cart", label: "Invitation (Mahaleo)" },
    { href: "/tickets/prevente", label: "Billets pré-vente (Lion Hill)" },
    { href: "/tickets/ventelive", label: "Billets vente sur live (Lion Hill)" },
  ];
  const isLionHillActive = lionHillLinks.some((l) =>
    pathname.startsWith(l.href)
  );

  // ---------------- ROSSY ----------------
  const rossyLinks = [

    { href: "/tickets/rossyinvitation", label: "Invitation (Mahaleo - 100M - VIP PRESTIGE)" },
    { href: "/tickets/cart", label: "Invitation (Mahaleo - 50M - VIP)" },
    { href: "/tickets/rossyticket", label: "Simple (Mahaleo - 35M - SIMPLE)" },
     { href: "/tickets/prevente", label: "Spectacle (Mahaleo - 6M)" },
        { href: "/tickets/football", label: "Sortie" },
  ];
  const isRossyActive = rossyLinks.some((l) => pathname.startsWith(l.href));

  // ---------------- MOUNT ----------------
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ---------------- LOAD USER ----------------
  useEffect(() => {
    if (!isMounted) return;

    const token = localStorage.getItem("access_token");
    if (!token) {
      setLoadingUser(false);
      router.push("/login");
      return;
    }

    const fetchUserData = async () => {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUserEmail(payload.user_id || "");

        const response = await fetch(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error("Failed to fetch user data");

        const data = await response.json();

        if (data.fullname) setUserFullname(data.fullname);
        setConcertId(
          typeof data.concert_id !== "undefined" ? data.concert_id : 0
        );
      } catch (error) {
        console.error("User info error:", error);
        localStorage.removeItem("access_token");
        router.push("/login");
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUserData();
  }, [isMounted, router]);

  // ---------------- FILTER LINKS ----------------
  const links = baseLinks.filter((l) => {
    if (concertId !== 0) {
      const restrictedPaths = [
        "/concerts/new",
        "/tickets/generate",
        "/tickets/football",
      ];
      return !restrictedPaths.includes(l.href);
    }
    return true;
  });

  const showLionHillMenu =  concertId === null;
  const showRossyMenu = concertId === 0 || concertId === null;

  // ---------------- ACTIVATE SUBMENUS ----------------
  useEffect(() => {
    if (isLionHillActive) {
      setShowLionHillSubmenu(true);
      setShowRossySubmenu(false);
    } else if (isRossyActive) {
      setShowRossySubmenu(true);
      setShowLionHillSubmenu(false);
    } else {
      setShowLionHillSubmenu(false);
      setShowRossySubmenu(false);
    }
  }, [pathname, isLionHillActive, isRossyActive, isMounted]);

  // ---------------- LOGOUT ----------------
  const handleLogout = async () => {
    const token = localStorage.getItem("access_token");
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Logout API error", error);
    } finally {
      localStorage.removeItem("access_token");
      router.push("/login");
    }
  };

  const hideNavbar = pathname === "/tickets/validate";

  if (!isMounted || hideNavbar) return null;

  return (
    <>
      <header className="no-print bg-blue-900 text-white shadow-md fixed top-0 left-0 w-full z-50">
        <div className="py-4 px-6 flex items-center justify-between gap-4">
          {/* Mobile Hamburger */}
          <Button
            variant="ghost"
            className="sm:hidden text-white hover:bg-blue-800"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Menu className="w-6 h-6" />
          </Button>

          {/* Desktop Nav */}
          <nav className="hidden sm:flex flex-wrap items-center gap-2">
            {links.map(({ href, label, icon: Icon }) => (
              <Button
                key={href}
                asChild
                variant="ghost"
                className={clsx(
                  "text-white flex items-center gap-2 px-3 py-2 rounded-md",
                  pathname === href ? "bg-blue-800" : "hover:bg-blue-700"
                )}
              >
                <Link href={href}>
                  <Icon className="w-4 h-4" /> {label}
                </Link>
              </Button>
            ))}

            {/* Lion Hill */}
            {showLionHillMenu && (
              <div className="relative no-print">
                <Button
                  variant="ghost"
                  className={clsx(
                    "text-white flex items-center gap-2 px-3 py-2 rounded-md",
                    (isLionHillActive || showLionHillSubmenu) && "bg-blue-800"
                  )}
                  onClick={() => {
                    setShowLionHillSubmenu(!showLionHillSubmenu);
                    setShowRossySubmenu(false);
                    setShowAdminMenu(false);
                  }}
                >
                  <Ticket className="w-4 h-4" />
                  Lion Hill
                  <ChevronDown
                    className={clsx(
                      "w-4 h-4 transition-transform",
                      showLionHillSubmenu && "rotate-180"
                    )}
                  />
                </Button>
              </div>
            )}

            {/* Rossy */}
            {showRossyMenu && (
              <div className="relative no-print">
                <Button
                  variant="ghost"
                  className={clsx(
                    "text-white flex items-center gap-2 px-3 py-2 rounded-md",
                    isRossyActive && "bg-blue-800"
                  )}
                  onClick={() => {
                    setShowRossySubmenu(!showRossySubmenu);
                    setShowLionHillSubmenu(false);
                    setShowAdminMenu(false);
                  }}
                >
                  <Ticket className="w-4 h-4" />
                  Mahaleo 2026
                  <ChevronDown
                    className={clsx(
                      "w-4 h-4 transition-transform",
                      showRossySubmenu && "rotate-180"
                    )}
                  />
                </Button>
              </div>
            )}
          </nav>

          {/* RIGHT SIDE — ADMIN + USER */}
          <div className="flex items-center gap-4 ml-auto">
            {/* ---- ADMIN MENU SIMPLE ---- */}
            {concertId === 0 && (
              <Button
                asChild
                variant="ghost"
                className="hidden sm:flex text-white items-center gap-2 px-3 py-2 rounded-md hover:bg-blue-700"
              >
                <Link href="/admin/users">
                  <Trophy className="w-4 h-4 text-yellow-300" />
                  Administration
                </Link>
              </Button>
            )}

            {/* USER INFO */}
            <div className="hidden sm:flex items-center gap-2 text-sm">
              <User className="w-4 h-4" />
              <span>{userFullname || userEmail || "Utilisateur"}</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="flex items-center gap-2 text-white hover:bg-blue-700"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Déconnexion</span>
            </Button>
          </div>
        </div>

        {/* ----- MOBILE MENU ----- */}
        {isOpen && (
          <div className="sm:hidden px-4 pb-4 space-y-1 bg-blue-800 no-print">
            {/* Default links */}
            {links.map(({ href, label, icon: Icon }) => (
              <Button
                key={href}
                asChild
                variant="ghost"
                className={clsx(
                  "w-full justify-start text-white flex gap-2 px-3 py-2",
                  pathname === href ? "bg-blue-700" : "hover:bg-blue-600"
                )}
              >
                <Link href={href}>
                  <Icon className="w-4 h-4" /> {label}
                </Link>
              </Button>
            ))}

            {/* Lion Hill Mobile */}
            {showLionHillMenu && (
              <div className="no-print pt-2 border-t border-blue-600">
                <div className="text-sm px-3 py-2 text-blue-200">Lion Hill</div>
                {lionHillLinks.map(({ href, label }) => (
                  <Button
                    key={href}
                    asChild
                    variant="ghost"
                    className="w-full justify-start text-white pl-6 py-2 hover:bg-blue-600"
                  >
                    <Link href={href}>{label}</Link>
                  </Button>
                ))}
              </div>
            )}

            {/* Rossy Mobile */}
            {showRossyMenu && (
              <div className="no-print pt-2 border-t border-blue-600">
                <div className="text-sm px-3 py-2 text-blue-200">Mahaleo 2026</div>
                {rossyLinks.map(({ href, label }) => (
                  <Button
                    key={href}
                    asChild
                    variant="ghost"
                    className="w-full justify-start text-white pl-6 py-2 hover:bg-blue-600"
                  >
                    <Link href={href}>{label}</Link>
                  </Button>
                ))}
              </div>
            )}

            {/* ---- ADMIN MOBILE SIMPLE ---- */}
            {concertId === 0 && (
              <Button
                asChild
                variant="ghost"
                className="w-full justify-start text-white px-3 py-2 hover:bg-blue-600 border-t border-blue-600"
              >
                <Link href="/admin/users">
                  <Trophy className="w-4 h-4 inline-block mr-2 text-yellow-300" />
                  Administration
                </Link>
              </Button>
            )}
          </div>
        )}
      </header>

      {/* ----- SUBMENUS DESKTOP ----- */}
      <div className="hidden sm:block w-full z-[49] sticky top-[64px]  no-print">
        {showLionHillSubmenu && showLionHillMenu && (
          <div className="bg-gray-700 text-white no-print">
            <div className="py-2 px-6 flex gap-1 flex-wrap">
              {lionHillLinks.map(({ href, label }) => (
                <Button
                  key={href}
                  asChild
                  variant="ghost"
                  className={clsx(
                    "px-3 py-1",
                    pathname.startsWith(href)
                      ? "bg-gray-600"
                      : "hover:bg-gray-600"
                  )}
                >
                  <Link href={href}>{label}</Link>
                </Button>
              ))}
            </div>
          </div>
        )}

        {showRossySubmenu && (
          <div className="bg-gray-200 text-black no-print">
            <div className="py-2 px-6 flex gap-1 flex-wrap">
              {rossyLinks.map(({ href, label }) => (
                <Button
                  key={href}
                  asChild
                  variant="ghost"
                  className={clsx(
                    "px-3 py-1 rounded-md",
                    pathname.startsWith(href)
                      ? "bg-gray-400 font-semibold"
                      : "hover:bg-gray-300"
                  )}
                >
                  <Link href={href}>{label}</Link>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
