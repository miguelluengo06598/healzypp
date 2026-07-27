"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { useAuthModal } from "@/components/auth/AuthModalContext";
import { clearSessionCookie } from "@/lib/auth-cookie";
import { SITE_NAME } from "@/lib/site";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerClose,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ShoppingBag,
  Ticket,
  UserCircle,
  LogOut,
  X,
} from "lucide-react";

type User = {
  id: string;
  email?: string;
  user_metadata?: { full_name?: string; name?: string; avatar_url?: string };
} | null;

function getInitial(name?: string) {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
}

function getDisplayName(user: User) {
  if (!user) return "";
  const meta = user.user_metadata;
  return meta?.full_name || meta?.name || user.email?.split("@")[0] || "Usuario";
}

export default function UserMenu() {
  const { openAuth } = useAuthModal();
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detectar mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Obtener sesión inicial
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // Escuchar cambios de auth
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  // Cerrar al hacer click fuera
  useEffect(() => {
    if (!open || isMobile) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, isMobile]);

  // Cerrar al presionar Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    clearSessionCookie();
    setOpen(false);
  }, []);

  const avatarUrl = user?.user_metadata?.avatar_url;
  const displayName = getDisplayName(user);
  const initial = getInitial(displayName);
  const isLoggedIn = !!user;

  const menuContent = (
    <div className="flex flex-col">
      {isLoggedIn ? (
        <>
          <div className="px-4 py-3">
            <p className="text-base font-medium text-gray-900">
              Hola, {displayName}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{user?.email}</p>
          </div>
          <Separator />
          <nav className="flex flex-col py-2">
            <Link
              href="/account/orders"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <ShoppingBag className="w-4 h-4 text-gray-400" />
              Mis pedidos
            </Link>
            <Link
              href="/account/coupons"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <Ticket className="w-4 h-4 text-gray-400" />
              Mis cupones
            </Link>
            <Link
              href="/account/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
            >
              <UserCircle className="w-4 h-4 text-gray-400" />
              Mis datos
            </Link>
          </nav>
          <Separator />
          <div className="p-2">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
            >
              <LogOut className="w-4 h-4" />
              Cerrar sesión
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="px-4 py-3">
            <p className="text-base font-medium text-gray-900">Bienvenido</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Accede para gestionar tu cuenta
            </p>
          </div>
          <Separator />
          <div className="flex flex-col gap-2 p-3">
            <Button
              className="w-full rounded-xl h-10"
              onClick={() => {
                setOpen(false);
                openAuth("login");
              }}
            >
              Iniciar sesión
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-xl h-10"
              onClick={() => {
                setOpen(false);
                openAuth("register");
              }}
            >
              Crear cuenta
            </Button>
          </div>
        </>
      )}
    </div>
  );

  // Trigger button (icon)
  const triggerButton = (
    <button
      onClick={() => setOpen((s) => !s)}
      className="relative p-1 rounded-full transition hover:bg-gray-100 focus:outline-none"
      aria-label="Mi cuenta"
      title="Mi cuenta"
    >
      {isLoggedIn ? (
        <div className="relative">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt="avatar"
              width={28}
              height={28}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-black text-white text-xs font-semibold flex items-center justify-center">
              {initial}
            </div>
          )}
          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
        </div>
      ) : (
        <Image
          priority
          src="/icons/user.svg"
          width={22}
          height={22}
          alt="user"
        />
      )}
    </button>
  );

  if (loading) {
    return (
      <div className="p-1">
        <div className="w-7 h-7 rounded-full bg-gray-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {triggerButton}

      {/* Desktop dropdown */}
      {!isMobile && open && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
          {menuContent}
        </div>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="rounded-t-[20px]">
            <DrawerHeader className="relative pb-2">
              <DrawerClose className="absolute right-4 top-4 rounded-full w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition">
                <X className="w-4 h-4" />
              </DrawerClose>
              <DrawerTitle className="sr-only">Menú de cuenta</DrawerTitle>
              <DrawerDescription className="sr-only">
                {`Opciones de tu cuenta de ${SITE_NAME}`}
              </DrawerDescription>
            </DrawerHeader>
            {menuContent}
            <div className="h-4" />
          </DrawerContent>
        </Drawer>
      )}
    </div>
  );
}
