/**
 * Datos legales del titular del sitio. Centralizado aquí para que
 * `aviso-legal`, `privacidad`, `cookies` y `terminos` los pinchen
 * desde un solo sitio. Editar este archivo es lo único que hace falta
 * para mantener el cumplimiento al día.
 *
 * Recomendación sobre el domicilio: si no quieres exponer tu domicilio
 * personal, da de alta un Apartado de Correos en Correos.es
 * (~50€/año) y úsalo aquí. Cumple LSSI sin sacrificar privacidad.
 *
 * Última revisión: 21 de mayo de 2026.
 */

export const LEGAL_OWNER = {
  fullName: "Ramón Romero León",
  /** DNI con letra. Obligatorio en el Aviso Legal (LSSI Art. 10). */
  dni: "48093526C",
  /** Domicilio postal — calle, número, código postal, ciudad. */
  address: "Calle Vista Alegre 57, Cornellá de Llobregat, Barcelona",
  city: "Cornellá de Llobregat",
  province: "Barcelona",
  country: "España",
  email: "admin@quinielamundial.es",
  /** Handles públicos de las redes que SÍ están activas (Instagram
   * quedó suspendida y no se menciona). */
  social: {
    tiktok: { handle: "@quinielamundial", url: "https://tiktok.com/@quinielamundial" },
    x: { handle: "@QMundial2026", url: "https://x.com/QMundial2026" },
  },
} as const;

/** Fecha de última actualización legal — actualízala cuando edites cualquiera de las cuatro páginas. */
export const LEGAL_LAST_UPDATED = "21 de mayo de 2026";

export const LEGAL_LINKS = [
  { href: "/aviso-legal", label: "Aviso legal" },
  { href: "/privacidad", label: "Política de privacidad" },
  { href: "/cookies", label: "Política de cookies" },
  { href: "/terminos", label: "Términos de uso" },
] as const;
