"use client";

// usePathname de next-intl: sin prefijo de locale, para que la detección
// del item activo funcione igual en /en, /fr y /pt que en español.
import { Link, usePathname } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { Menu } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ADMIN_NAV, buildNavItems, type NavItem } from "./nav-data";

// Mismos títulos y orden que la Sidebar PC para que la navegación se sienta
// coherente en cualquier viewport.
// Claves i18n (namespace "nav") por grupo — se traducen en el render.
const GROUP_TITLE: Record<NavItem["group"], string> = {
  main: "group.main",
  predicciones: "group.predicciones",
  social: "group.social",
  ayuda: "group.ayuda",
};
const GROUP_ORDER: NavItem["group"][] = ["main", "predicciones", "social", "ayuda"];

type Props = {
  isAdmin: boolean;
  myId: string;
  pendingCount?: number;
  showMyLeague?: boolean;
  isAuthenticated?: boolean;
};

export function MobileBottomNav({
  isAdmin,
  myId,
  pendingCount = 0,
  showMyLeague = false,
  isAuthenticated = true,
}: Props) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const ts = useTranslations("shell");
  const locale = useLocale();
  // Noticias solo en ES (contenido sin traducir) — fuera del nav en EN/FR/PT.
  const items = buildNavItems(myId, { showMyLeague, isAuthenticated, showNews: locale === "es" });
  const primary = items.filter((i) => i.primaryMobile);
  // El sheet "Más" lista todos los items por grupo, no sólo los que no
  // están en la barra inferior. La duplicación es intencional: el sheet
  // funciona como el sidebar del PC (mismo árbol completo de navegación),
  // y los atajos de la barra siguen siendo el acceso rápido pulgar-friendly.
  const itemsByGroup = GROUP_ORDER.map((g) => ({
    group: g,
    title: t(GROUP_TITLE[g]),
    items: items.filter((i) => i.group === g),
  })).filter((g) => g.items.length > 0);
  const adminItems = isAdmin ? ADMIN_NAV : [];
  const activeHref = pickActiveHref(pathname, [...items, ...ADMIN_NAV]);

  // Sheet de "Más" controlado para poder cerrarlo cuando se navega.
  // Sin esto, el bottom-sheet se queda abierto por encima de la página
  // a la que acabas de saltar.
  const [moreOpen, setMoreOpen] = useState(false);
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  return (
    <nav
      // `fixed bottom-0` ya ancla al borde visible del viewport, por lo que
      // cuando Chrome móvil oculta su URL bar al hacer scroll-down la nav se
      // desliza al nuevo borde inferior. Añadimos `pb-[env(safe-area-inset-bottom)]`
      // para que en iOS la zona de tap quede por encima del home indicator
      // mientras el fondo arena llega hasta la esquina del cristal.
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-[var(--color-border)] bg-[color-mix(in_oklch,var(--color-surface)_92%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      {primary.map((item) => {
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            data-tutorial-id={
              item.href === "/predicciones" ? "nav-predicciones" : undefined
            }
            className={cn(
              "relative flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-mono uppercase tracking-[0.18em] transition",
              active
                ? "text-[var(--color-arena)]"
                : "text-[var(--color-muted-foreground)]",
            )}
          >
            {active ? (
              <span
                aria-hidden
                className="absolute top-0 h-0.5 w-12 rounded-b bg-[var(--color-arena)]"
              />
            ) : null}
            <span className="relative">
              <item.icon className="size-5" />
              {item.href === "/predicciones" && pendingCount > 0 ? (
                <span className="absolute -right-2 -top-1 grid min-w-[1rem] place-items-center rounded-full bg-[var(--color-arena)] px-1 font-mono text-[0.55rem] font-semibold tabular text-white shadow-[var(--shadow-arena)]">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              ) : null}
            </span>
            <span>{t(item.mobileLabel ?? item.label)}</span>
          </Link>
        );
      })}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetTrigger className="flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-mono uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          <Menu className="size-5" />
          <span>{ts("more")}</span>
        </SheetTrigger>
        <SheetContent side="bottom" className="flex h-[80dvh] flex-col rounded-t-xl">
          <SheetHeader>
            <SheetTitle>{ts("navigation")}</SheetTitle>
            <SheetDescription>{ts("allSections")}</SheetDescription>
          </SheetHeader>
          <div className="mt-2 flex-1 space-y-6 overflow-y-auto pr-1">
            {itemsByGroup.map(({ group, title, items }) => (
              <NavGroup
                key={group}
                title={title}
                items={items}
                activeHref={activeHref}
                onSelect={() => setMoreOpen(false)}
              />
            ))}
            {adminItems.length > 0 ? (
              <NavGroup
                title={t("group.admin")}
                items={adminItems}
                activeHref={activeHref}
                onSelect={() => setMoreOpen(false)}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}

function NavGroup({
  title,
  items,
  activeHref,
  onSelect,
}: {
  title: string;
  items: NavItem[];
  activeHref: string | null;
  onSelect: () => void;
}) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <span className="h-px w-3 bg-[var(--color-arena)]" />
        <p className="font-mono text-[0.65rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
          {title}
        </p>
        <span className="h-px flex-1 bg-[var(--color-border)]" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <OverflowLink
            key={item.href}
            item={item}
            active={item.href === activeHref}
            onSelect={onSelect}
          />
        ))}
      </div>
    </section>
  );
}

function OverflowLink({
  item,
  active,
  onSelect,
}: {
  item: NavItem;
  active: boolean;
  onSelect: () => void;
}) {
  const t = useTranslations("nav");
  return (
    <Link
      href={item.href}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-2.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 text-sm font-medium transition",
        active
          ? "border-[var(--color-arena)] text-[var(--color-arena)]"
          : "hover:border-[var(--color-arena)]/40",
      )}
    >
      <item.icon className="size-4" />
      <span>{t(item.label)}</span>
    </Link>
  );
}

// Active route picker — el match más largo gana, así "/ranking/[myId]"
// (Mis resultados) sobreescribe a "/ranking" (Ranking) cuando estamos en
// el propio perfil. Reproducido aquí porque el sidebar usa la misma lógica.
function pickActiveHref(pathname: string, items: NavItem[]): string | null {
  let best: { href: string; len: number } | null = null;
  for (const item of items) {
    const matches =
      item.href === "/dashboard"
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (!matches) continue;
    if (!best || item.href.length > best.len) {
      best = { href: item.href, len: item.href.length };
    }
  }
  return best?.href ?? null;
}
