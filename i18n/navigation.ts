import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * Wrappers de navegación locale-aware. Usa estos `Link`/`useRouter`/… en vez
 * de los de `next/navigation` para que los enlaces conserven el locale activo
 * y respeten el prefijo "as-needed".
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
