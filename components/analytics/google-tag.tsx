import Script from "next/script";

/**
 * Etiqueta base de Google (gtag.js) de la cuenta de Google Ads. Sirve para
 * medición general y remarketing. La conversión "Registro" (evento con su
 * `send_to: AW-.../label`) se añadirá aparte cuando se cablee.
 *
 * El ID es público por diseño (viaja al navegador). Configurable por env por
 * si cambia la cuenta; con fallback al ID actual.
 *
 * NOTA RGPD: se carga para todos los visitantes (incl. EEE) sin Consent
 * Mode ni banner de cookies — decisión explícita para arrancar la campaña.
 * Pendiente: añadir Consent Mode v2 + banner de cookies.
 */
const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "AW-18204443409";

export function GoogleTag() {
  if (!GOOGLE_ADS_ID) return null;
  return (
    <>
      <Script
        id="gtag-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GOOGLE_ADS_ID}');`}
      </Script>
    </>
  );
}
