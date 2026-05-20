"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Activity,
  CalendarRange,
  ClipboardCheck,
  Gamepad2,
  Gauge,
  Briefcase,
  Goal,
  MessagesSquare,
  Newspaper,
  Radar,
  ShieldCheck,
  Sliders,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const items: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin", label: "Dashboard", icon: Gauge },
  { href: "/admin/monitoreo", label: "Monitoreo", icon: Radar },
  { href: "/admin/ligas", label: "Ligas", icon: Trophy },
  { href: "/admin/leads", label: "Leads", icon: Briefcase },
  { href: "/admin/usuarios", label: "Usuarios", icon: UserCheck },
  { href: "/admin/selecciones", label: "Selecciones", icon: Users },
  { href: "/admin/jugadores", label: "Jugadores", icon: Goal },
  { href: "/admin/calendario", label: "Calendario", icon: CalendarRange },
  { href: "/admin/partidos", label: "Resultados", icon: ClipboardCheck },
  { href: "/admin/reglas", label: "Reglas de puntuación", icon: Sliders },
  { href: "/admin/especiales", label: "Predicciones especiales", icon: Sparkles },
  { href: "/admin/noticias", label: "Noticias", icon: Newspaper },
  { href: "/admin/operaciones", label: "Operaciones", icon: ShieldCheck },
  { href: "/admin/progreso", label: "Progreso", icon: Activity },
  { href: "/admin/chat", label: "Moderación", icon: MessagesSquare },
  { href: "/admin/minijuegos", label: "Minijuegos", icon: Gamepad2 },
];

function isActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-60 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] lg:block">
      <div className="sticky top-0 flex h-dvh flex-col">
        <div className="flex items-center gap-2 px-4 py-5">
          <span className="grid size-9 place-items-center rounded-md bg-[var(--color-danger)]/15 text-[var(--color-danger)]">
            <ShieldCheck className="size-4" />
          </span>
          <span>
            <span className="block font-display text-lg leading-none">Admin</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
              Panel de control
            </span>
          </span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition",
                  active
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]",
                )}
              >
                <item.icon className="size-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-[var(--color-border)] p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
          >
            <ArrowLeft className="size-3.5" />
            Volver a la app
          </Link>
        </div>
      </div>
    </aside>
  );
}

/**
 * Tira horizontal con scroll para móvil — los 11 items del panel admin
 * caben en una sola línea con scroll-x. Va dentro de la columna interior
 * del layout, justo bajo el AppHeader.
 */
export function AdminMobileNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Secciones de admin"
      className="sticky top-0 z-20 flex gap-2 overflow-x-auto border-b border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-surface)_92%,transparent)] px-4 py-2 backdrop-blur-md lg:hidden"
    >
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition",
              active
                ? "border-[var(--color-arena)] bg-[color-mix(in_oklch,var(--color-arena)_12%,transparent)] text-[var(--color-arena)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]",
            )}
          >
            <item.icon className="size-3.5" />
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}

      {/* Salir del modo admin · separado del resto con un divisor inline
          y estilo discontinuo para que se note que es la salida de la
          tira, no una sección más. */}
      <span className="mx-1 self-center text-[var(--color-border)]">·</span>
      <Link
        href="/dashboard"
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted-foreground)] transition hover:border-[var(--color-arena)]/40 hover:text-[var(--color-foreground)]"
      >
        <ArrowLeft className="size-3.5" />
        <span className="whitespace-nowrap">Volver a la app</span>
      </Link>
    </nav>
  );
}
