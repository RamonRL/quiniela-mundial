"use client";

import { useState } from "react";

/**
 * Subtabs de la comparación (modo Completo): Grupos · Bota & Especiales ·
 * Resultados & Goleadores. Todo el contenido lo renderiza el servidor; aquí
 * solo se alterna cuál se ve (sin refetch).
 */
export function CompareTabs({
  tabs,
}: {
  tabs: { id: string; label: string; content: React.ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  return (
    <div className="space-y-5">
      <div className="flex gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        {tabs.map((tab) => {
          const on = tab.id === active;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActive(tab.id)}
              aria-pressed={on}
              className={`flex-1 rounded-lg px-2 py-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition sm:text-xs ${
                on
                  ? "bg-[var(--color-arena)] text-white shadow-[var(--shadow-arena)]"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} hidden={tab.id !== active}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
