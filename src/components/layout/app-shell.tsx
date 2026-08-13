"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  ClipboardCheck,
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
import { useState, useTransition } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { setDemoOrgAction } from "@/app/actions/org";
import { cn } from "@/lib/utils";
import type { Employee, Organization } from "@/types";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/agent", label: "Ask Travel Agent", icon: MessageSquareText },
  { href: "/trips", label: "Trips", icon: Plane },
  { href: "/approvals", label: "Manager Approvals", icon: ClipboardCheck },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/policy", label: "Company Policy", icon: Shield },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/profile", label: "Profile", icon: UserRound },
] as const;

export function AppShell({
  children,
  organization,
  employee,
  orgBlurb,
  orgs,
}: {
  children: React.ReactNode;
  organization: Organization;
  employee: Employee;
  orgBlurb: string;
  orgs: Array<{ id: string; name: string; blurb: string }>;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const initials = employee.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  function onOrgChange(orgId: string) {
    startTransition(async () => {
      await setDemoOrgAction(orgId);
      router.refresh();
      setOpen(false);
    });
  }

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
                ? "bg-white/10 text-white ring-1 ring-white/10"
                : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200",
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
    <div className="mt-auto space-y-3 border-t border-white/8 px-3 py-4">
      <div className="rounded-xl px-3 py-2.5">
        <div className="mb-2 flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-300 ring-1 ring-sky-400/20">
            <Building2 className="size-3.5" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-zinc-100">
              {organization.name}
            </p>
            <p className="truncate text-xs text-zinc-500">{orgBlurb}</p>
          </div>
        </div>
        <label className="sr-only" htmlFor="demo-org-switcher">
          Switch organization
        </label>
        <select
          id="demo-org-switcher"
          className="w-full rounded-lg border border-white/10 bg-zinc-950 px-2.5 py-1.5 text-sm text-zinc-200 disabled:opacity-60"
          value={organization._id}
          disabled={pending}
          onChange={(e) => onOrgChange(e.target.value)}
        >
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center gap-3 rounded-xl px-3 py-2">
        <Avatar className="size-8">
          <AvatarFallback className="bg-sky-500/20 text-xs font-semibold text-sky-200">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-zinc-100">
            {employee.name}
          </p>
          <p className="truncate text-xs text-zinc-500">
            {employee.homeAirport} · {employee.title}
          </p>
        </div>
        <Link href="/settings" onClick={() => setOpen(false)}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Settings"
            className="text-zinc-500 hover:text-zinc-200"
          >
            <Settings className="size-4" />
          </Button>
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[var(--canvas)] text-foreground">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-white/8 bg-[var(--sidebar-canvas)] md:flex">
        <div className="px-5 pt-6 pb-2">
          <p className="font-heading text-xs font-semibold tracking-[0.22em] text-sky-300/80 uppercase">
            Expense Agent
          </p>
          <p className="mt-1 font-heading text-lg font-semibold tracking-tight text-white">
            Travel
          </p>
        </div>
        {nav}
        {footer}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="relative flex h-full w-72 flex-col border-r border-white/8 bg-[var(--sidebar-canvas)] shadow-xl">
            <div className="flex items-center justify-between px-4 pt-4">
              <p className="font-heading font-semibold text-white">
                Expense Agent
              </p>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
                className="text-zinc-400"
              >
                <X className="size-4" />
              </Button>
            </div>
            <Separator className="mt-3 bg-white/8" />
            {nav}
            {footer}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-white/8 bg-[var(--canvas)]/90 px-4 py-3 backdrop-blur md:hidden">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="text-zinc-300"
          >
            <Menu className="size-4" />
          </Button>
          <p className="truncate text-sm font-semibold text-zinc-100">
            {organization.name}
          </p>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
