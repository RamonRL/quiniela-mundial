"use client";

import { useState, type ReactNode } from "react";

type Tab = { id: string; label: string; content: ReactNode };

/**
 * Subtabs de /mi-quiniela (solo premium): INFO / BRANDING / FUNCIONALIDADES.
 * Renderiza todos los paneles (server-rendered) y oculta los inactivos con
 * `hidden` para no perder estado ni re-pedir datos al cambiar de tab.
 */
export function LeagueTabs({ tabs, defaultTab }: { tabs: Tab[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  return (
    <div className="space-y-6">
      <div
        role="tablist"
        className="flex justify-center gap-1 border-b border-[var(--color-border)]"
      >
        {tabs.map((tab) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={selected}
              onClick={() => setActive(tab.id)}
              className={`relative -mb-px px-4 py-3 font-mono text-[0.72rem] uppercase tracking-[0.2em] transition sm:px-5 ${
                selected
                  ? "text-[var(--color-arena)]"
                  : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
              }`}
            >
              {tab.label}
              {selected ? (
                <span
                  aria-hidden
                  className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--color-arena)]"
                />
              ) : null}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} role="tabpanel" hidden={tab.id !== active}>
          {tab.content}
        </div>
      ))}
    </div>
  );
}
