import { Gamepad2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/guards";
import { MINIGAMES } from "./_lib/games";
import { MinigameCard } from "./_components/minigame-card";
import { countParticipants, loadMyBestScore } from "./_lib/scores";

export const metadata = {
  title: "Minijuegos",
  description:
    "Mini-juegos del Mundial 2026: pásalo bien y compite por la mejor puntuación global.",
};

export const revalidate = 60;

export default async function MinijuegosHubPage() {
  const me = await getCurrentUser();
  const myIdentityKey = me?.id ?? null;

  const cards = await Promise.all(
    MINIGAMES.map(async (game) => {
      if (game.status === "soon") {
        return { game, myBestScore: null, totalParticipants: 0 };
      }
      const [totalParticipants, myBestScore] = await Promise.all([
        countParticipants(game.gameKey),
        myIdentityKey ? loadMyBestScore(game.gameKey, myIdentityKey) : Promise.resolve(null),
      ]);
      return { game, myBestScore, totalParticipants };
    }),
  );

  return (
    <div className="space-y-8">
      {/* Header arcade — eyebrow LED + título display + tag line corta */}
      <header className="relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 sm:p-8">
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-pitch)] to-transparent"
        />
        <span
          aria-hidden
          className="halftone pointer-events-none absolute inset-0 opacity-[0.05]"
        />
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-pitch)]/40 bg-[color-mix(in_oklch,var(--color-pitch)_8%,transparent)] px-3 py-1">
              <Gamepad2 className="size-3.5 text-[var(--color-pitch)]" />
              <span className="font-mono text-[0.55rem] font-semibold uppercase tracking-[0.32em] text-[var(--color-pitch)]">
                Arcade · Comunidad
              </span>
            </div>
            <h1 className="font-display text-5xl leading-[0.92] tracking-tight sm:text-6xl">
              Minijuegos
            </h1>
            <p className="max-w-xl font-editorial text-base italic text-[var(--color-muted-foreground)]">
              Partidas rápidas para matar tiempo. Ranking global por juego, en
              vivo entre todos los que se atrevan.
            </p>
          </div>
          {/* Marcador decorativo: número de juegos disponibles */}
          <div className="hidden self-end rounded-md border border-[var(--color-pitch)]/40 bg-[color-mix(in_oklch,var(--color-pitch)_5%,transparent)] px-4 py-2 text-right sm:block">
            <p className="font-mono text-[0.55rem] uppercase tracking-[0.32em] text-[var(--color-muted-foreground)]">
              Juegos
            </p>
            <p className="font-display text-3xl tabular text-[var(--color-pitch)] glow-pitch">
              {MINIGAMES.filter((g) => g.status === "live").length
                .toString()
                .padStart(2, "0")}
              <span className="text-[var(--color-muted-foreground)] text-xl">
                /{MINIGAMES.length.toString().padStart(2, "0")}
              </span>
            </p>
          </div>
        </div>
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-px left-0 h-px w-24 bg-[var(--color-pitch)]"
        />
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map(({ game, myBestScore, totalParticipants }) => (
          <MinigameCard
            key={game.slug}
            game={game}
            myBestScore={myBestScore}
            totalParticipants={totalParticipants}
          />
        ))}
      </div>

      {!me ? (
        <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)]/60 px-4 py-3 text-center font-editorial text-sm italic text-[var(--color-muted-foreground)]">
          Sin sesión también puedes jugar — solo te pedimos un apodo para
          aparecer en el ranking.
        </p>
      ) : null}
    </div>
  );
}
