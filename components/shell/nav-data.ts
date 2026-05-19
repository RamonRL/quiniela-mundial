import {
  BarChart3,
  CalendarDays,
  CircleUser,
  ClipboardList,
  Flag,
  Gamepad2,
  HelpCircle,
  Home,
  ListOrdered,
  Mail,
  MapPin,
  MessagesSquare,
  Newspaper,
  Settings2,
  Swords,
  Target,
  Trophy,
  Users,
  UsersRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
  group: "main" | "predicciones" | "social" | "ayuda";
  primaryMobile?: boolean;
  /** Si true, el item solo se muestra a usuarios con sesión activa. */
  requiresAuth?: boolean;
};

type BuildOptions = {
  /**
   * Si la liga activa del usuario es privada, mostramos el item "Mi
   * Quiniela" (gestión de la liga: miembros, código, invite link). En la
   * pública no tiene sentido — no hay nada que gestionar.
   */
  showMyLeague?: boolean;
  /**
   * Sesión activa. Si false (visitante público), filtramos los items con
   * requiresAuth y reordenamos los primarios de la barra inferior móvil
   * (Inicio, Calendario, Grupos) para que el visitante tenga atajos al
   * contenido público.
   */
  isAuthenticated?: boolean;
};

export function buildNavItems(myId: string, opts: BuildOptions = {}): NavItem[] {
  const isAuthed = opts.isAuthenticated !== false;
  const all: NavItem[] = [
    {
      // Visitante → landing pública. Autenticado → dashboard de su liga.
      href: isAuthed ? "/dashboard" : "/",
      label: "Inicio",
      icon: Home,
      group: "main",
      primaryMobile: true,
    },
    {
      href: "/calendario",
      label: "Calendario",
      icon: CalendarDays,
      group: "main",
      // Para visitantes lo sacamos a la barra inferior — sin sesión no
      // hay predicciones que mostrar como atajo rápido, así que damos
      // protagonismo al contenido del torneo.
      primaryMobile: !isAuthed,
    },
    {
      href: "/grupos",
      label: "Grupos",
      icon: Users,
      group: "main",
      primaryMobile: !isAuthed,
    },
    { href: "/bracket", label: "Bracket", icon: Swords, group: "main" },
    { href: "/goleadores", label: "Goleadores", icon: Target, group: "main" },
    { href: "/noticias", label: "Noticias", icon: Newspaper, group: "main" },
    {
      href: "/estadisticas",
      label: "Estadísticas",
      icon: BarChart3,
      group: "main",
      requiresAuth: true,
    },
    {
      href: "/predicciones",
      label: "Mis predicciones",
      mobileLabel: "Predicciones",
      icon: ClipboardList,
      group: "predicciones",
      primaryMobile: isAuthed,
      requiresAuth: true,
    },
    {
      href: `/ranking/${myId}`,
      label: "Mis resultados",
      icon: CircleUser,
      group: "predicciones",
      requiresAuth: true,
    },
  ];
  if (opts.showMyLeague) {
    all.push({
      href: "/mi-quiniela",
      label: "Mi Quiniela",
      icon: UsersRound,
      group: "predicciones",
      requiresAuth: true,
    });
  }
  all.push({
    href: "/ranking",
    label: "Ranking",
    icon: ListOrdered,
    group: "social",
    primaryMobile: isAuthed,
    requiresAuth: true,
  });
  // Comparar solo tiene sentido en quinielas privadas (la pública es
  // demasiado masiva como para que comparar predicción a predicción
  // aporte algo). Reusamos el mismo flag que filtra "Mi Quiniela".
  if (opts.showMyLeague) {
    all.push({
      href: "/comparar",
      label: "Comparar",
      icon: Trophy,
      group: "social",
      requiresAuth: true,
    });
  }
  all.push({
    href: "/chat",
    label: "Chat",
    icon: MessagesSquare,
    group: "social",
    requiresAuth: true,
  });
  // Minijuegos — visibles a todos. La ruta vive en (public)/minijuegos y
  // permite jugar como invitado tras introducir un apodo. Sin requiresAuth.
  all.push({
    href: "/minijuegos",
    label: "Minijuegos",
    icon: Gamepad2,
    group: "social",
  });
  // Selecciones y Sedes son páginas SEO orientadas a visitantes (alta
  // intención de búsqueda: "selecciones mundial 2026", "estadios mundial").
  // El logueado tiene atajos directos desde /equipos/[code] y /partido/[id],
  // así que las sacamos de su navegación para no saturarle el menú.
  if (!isAuthed) {
    all.push(
      { href: "/equipos", label: "Selecciones", icon: Flag, group: "main" },
      { href: "/sedes", label: "Sedes", icon: MapPin, group: "main" },
    );
  }
  // Ayuda — públicas para que también las indexen Googlebot y compañía.
  // FAQ tiene su propio FAQPageLD; Contacto contiene la presentación del
  // creador, email y redes sociales.
  all.push(
    {
      href: "/faq",
      label: "FAQs",
      icon: HelpCircle,
      group: "ayuda",
    },
    {
      href: "/contacto",
      label: "Contacto",
      icon: Mail,
      group: "ayuda",
    },
  );
  if (!isAuthed) {
    return all.filter((it) => !it.requiresAuth);
  }
  return all;
}

export const ADMIN_NAV: NavItem[] = [
  { href: "/admin", label: "Admin", icon: Settings2, group: "main" },
];
