"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Globe2, Lightbulb, ScrollText, ServerCog } from "lucide-react";
import { cn } from "@/lib/utils";

type IconKey = "activity" | "globe" | "lightbulb" | "server" | "scroll";

const ICON_MAP = {
  activity: Activity,
  globe: Globe2,
  lightbulb: Lightbulb,
  server: ServerCog,
  scroll: ScrollText,
} as const;

type Item = { href: string; label: string; icon: IconKey };

export function MonitoringTabs({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Tabs de monitoreo"
      className="-mx-1 flex gap-1 overflow-x-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1"
    >
      {items.map((item) => {
        const Icon = ICON_MAP[item.icon];
        // "/admin/monitoreo" sólo cuando coincide exactamente; el resto activa
        // por prefijo.
        const active =
          item.href === "/admin/monitoreo"
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition",
              active
                ? "bg-[color-mix(in_oklch,var(--color-arena)_14%,transparent)] text-[var(--color-arena)]"
                : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]",
            )}
          >
            <Icon className="size-3.5" />
            <span className="whitespace-nowrap">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
