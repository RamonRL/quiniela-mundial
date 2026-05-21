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
    // `inline: "start"` apoya el card activo al borde izquierdo del
    // viewport del scroller. En móvil esto deja la ronda activa
    // perfectamente visible; el resto queda fuera de pantalla hasta
    // que el usuario deslice.
    target.scrollIntoView({ inline: "start", block: "nearest", behavior: "auto" });
  }, [activeIndex]);

  return (
    <div
      ref={containerRef}
      className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
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
