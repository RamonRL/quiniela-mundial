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
  fullName: "Ramón Romero",
  /** DNI con letra. Obligatorio en el Aviso Legal (LSSI Art. 10). */
  dni: "TODO: tu DNI con letra (p.ej. 00000000X)",
  /** Domicilio postal — calle, número, código postal, ciudad. Si usas
   * apartado de correos: `Apartado de Correos 1234, 08001 Barcelona`. */
  address: "TODO: tu domicilio postal completo",
  city: "TODO: ciudad",
  province: "TODO: provincia",
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
