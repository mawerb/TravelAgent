"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Home,
  Lightbulb,
  Menu,
  MessageSquareText,
  Plane,
  Receipt,
  Settings,
  Shield,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/agent", label: "Ask Travel Agent", icon: MessageSquareText },
  { href: "/trips", label: "Trips", icon: Plane },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/policy", label: "Company Policy", icon: Shield },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/"
            ? pathname === "/"
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-white text-foreground shadow-sm ring-1 ring-black/5"
                : "text-muted-foreground hover:bg-white/60 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-auto space-y-3 border-t border-black/5 px-3 py-4">
      <button
        type="button"
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-white/70"
      >
        <div className="flex size-8 items-center justify-center rounded-lg bg-stone-900 text-white">
          <Building2 className="size-3.5" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-medium">Acme Technologies</p>
          <p className="truncate text-xs text-muted-foreground">
            Organization
          </p>
        </div>
      </button>
      <div className="flex items-center gap-3 rounded-xl px-3 py-2">
        <Avatar className="size-8">
          <AvatarFallback className="bg-emerald-100 text-emerald-800 text-xs font-semibold">
            AM
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">Alex Morgan</p>
          <p className="truncate text-xs text-muted-foreground">SFO · Engineer</p>
        </div>
        <Link href="/settings" onClick={() => setOpen(false)}>
          <Button variant="ghost" size="icon-sm" aria-label="Settings">
            <Settings className="size-4" />
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[var(--canvas)] text-foreground">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-black/5 bg-[var(--sidebar-canvas)] md:flex">
        <div className="px-5 pt-6 pb-2">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Acme Travel
          </p>
          <p className="mt-1 text-lg font-semibold tracking-tight">
            Expense Agent
          </p>
        </div>
        {nav}
        {footer}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-72 flex-col bg-[var(--sidebar-canvas)] shadow-xl">
            <div className="flex items-center justify-between px-4 pt-4">
              <p className="font-semibold">Acme Travel</p>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            <Separator className="mt-3" />
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-black/5 bg-[var(--canvas)]/90 px-4 py-3 backdrop-blur md:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </Button>
          <p className="text-sm font-semibold">Acme Travel</p>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
