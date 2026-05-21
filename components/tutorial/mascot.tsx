"use client";

/**
 * Mascota del tutorial: un balón con dos ojitos peekando bajo el
 * pentágono central. Personaje minimalista que aporta carácter sin
 * imágenes externas — todo SVG inline.
 *
 * Dos tonos de animación, controlados desde el card:
 *   - `idle`: rebote vertical suave continuo (estado default).
 *   - `wiggle`: rotación pendular rápida — se activa solo en el paso
 *     final mientras explota el confeti.
 *
 * Decoración pura → `aria-hidden`.
 */
export function TutorialMascot({ tone = "idle" }: { tone?: "idle" | "wiggle" }) {
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 size-9 sm:size-11 ${
        tone === "wiggle"
          ? "tutorial-mascot-wiggle"
          : "tutorial-mascot-idle"
      }`}
    >
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="size-full"
      >
        {/* Cuerpo del balón */}
        <circle cx="50" cy="50" r="46" fill="#fafafa" stroke="#0e1014" strokeWidth="3" />
        {/* Pentágono central */}
        <polygon points="50,28 62,38 58,52 42,52 38,38" fill="#0e1014" />
        {/* Costuras del balón hacia el borde */}
        <line x1="50" y1="28" x2="50" y2="8" stroke="#0e1014" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="62" y1="38" x2="78" y2="33" stroke="#0e1014" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="38" y1="38" x2="22" y2="33" stroke="#0e1014" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="58" y1="52" x2="68" y2="70" stroke="#0e1014" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="42" y1="52" x2="32" y2="70" stroke="#0e1014" strokeWidth="2.5" strokeLinecap="round" />
        {/* Ojos */}
        <ellipse cx="42" cy="70" rx="4" ry="5.5" fill="#0e1014" />
        <ellipse cx="58" cy="70" rx="4" ry="5.5" fill="#0e1014" />
        {/* Brillo de los ojos */}
        <circle cx="43.2" cy="68" r="1.4" fill="#fafafa" />
        <circle cx="59.2" cy="68" r="1.4" fill="#fafafa" />
      </svg>
    </span>
  );
}
