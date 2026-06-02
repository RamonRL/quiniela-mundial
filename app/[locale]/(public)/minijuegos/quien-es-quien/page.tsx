import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/guards";
import { findGame } from "../_lib/games";
import { loadMyBestScore, loadScoreboard } from "../_lib/scores";
import { MinigameScoreTable } from "../_shared/score-table";
import { QuienEsQuienClient } from "./game-client";

const SLUG = "quien-es-quien";

export const metadata = {
  title: "¿Quién es quién? · Minijuegos",
  description: "Adivina los jugadores del Mundial 2026 en 60 segundos.",
};

export const revalidate = 30;

export default async function QuienEsQuienPage() {
  const game = findGame(SLUG)!;
  const me = await getCurrentUser();
  const myIdentityKey = me?.id ?? null;
  const Icon = game.icon;

  const [rows, myBest] = await Promise.all([
    loadScoreboard(game.gameKey, 50),
    myIdentityKey ? loadMyBestScore(game.gameKey, myIdentityKey) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-8">
      <Link
        href="/minijuegos"
        className="inline-flex items-center gap-1.5 font-mono text-[0.65rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)] transition hover:text-[var(--color-pitch)]"
      >
        <ArrowLeft className="size-3.5" />
        Volver al lobby
      </Link>

      {/* Game header: icono cabinet + tagline + título */}
      <header className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-pitch)] to-transparent"
        />
        <div className="relative flex items-start gap-4">
          <div className="grid size-16 shrink-0 place-items-center rounded-lg border border-[var(--color-pitch)]/30 bg-[color-mix(in_oklch,var(--color-pitch)_4%,var(--color-surface-2))]">
            <Icon className="size-8 text-[var(--color-pitch)]" />
          </div>
          <div className="space-y-2">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              {game.tagline}
            </p>
            <h1 className="font-display text-4xl leading-[0.92] tracking-tight sm:text-5xl">
              {game.name}
            </h1>
            <p className="max-w-xl font-editorial text-sm italic text-[var(--color-muted-foreground)]">
              {game.description}
            </p>
          </div>
        </div>
      </header>

      <QuienEsQuienClient myIdentityKey={myIdentityKey} myBestScore={myBest} />

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <span className="size-1.5 rounded-full bg-[var(--color-pitch)] mj-led-blink" />
          <h2 className="font-mono text-[0.6rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
            Ranking global · top {rows.length}
          </h2>
          <span className="h-px flex-1 bg-[var(--color-border)]" />
        </div>
        <MinigameScoreTable
          rows={rows}
          highlightIdentityKey={myIdentityKey}
          emptyMessage="Aún no hay puntuaciones. Sé el primero en jugar."
        />
        <p className="text-center font-mono text-[0.55rem] uppercase tracking-[0.24em] text-[var(--color-muted-foreground)]">
          Solo se guarda tu mejor puntuación
        </p>
      </section>
    </div>
  );
}
