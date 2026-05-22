"use client";

import { useEffect, useRef } from "react";

/**
 * Wrapper con snap horizontal: en móvil solo cabe un card, así que
 * al renderizar scrolleamos hasta la ronda "activa" para que el
 * usuario la vea sin tener que deslizar. En desktop los 3 cards
 * caben enteros, así que el scroll es un no-op.
 *
 * También oculta la scrollbar (estética del proyecto) sin perder
 * el comportamiento — el usuario puede seguir deslizando.
 */
export function RoundsStripScroller({
  activeIndex,
  children,
}: {
  activeIndex: number;
  children: React.ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const target = container.children[activeIndex] as HTMLElement | undefined;
    if (!target) return;
    // Scroll HORIZONTAL puro del contenedor del slider, sin tocar el
    // eje vertical de la ventana. Usar `target.scrollIntoView` con
    // `block: "nearest"` arrastraba el viewport entero hacia abajo
    // si el slider no estaba completamente visible al entrar a
    // /dashboard. `container.scrollTo({ left })` mueve solo la barra
    // horizontal del propio scroller.
    const left = target.offsetLeft - container.offsetLeft;
    container.scrollTo({ left, behavior: "auto" });
  }, [activeIndex]);

  return (
    // py-2 da aire vertical para que el hover-lift (translate -2px) y la
    // sombra arena no se corten por arriba/abajo. Sin ese padding el
    // overflow-x:auto fuerza al eje Y a 'auto' también y los pixeles
    // que se elevan al pasar por encima del card quedan clipeados.
    <div
      ref={containerRef}
      className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <div
              key={i}
              className="w-[85%] flex-none snap-start sm:w-[calc((100%-1.5rem)/3)]"
            >
              {child}
            </div>
          ))
        : children}
    </div>
  );
}
