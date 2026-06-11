import type { getTranslations } from "next-intl/server";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { initials } from "@/lib/utils";

type Translator = Awaited<ReturnType<typeof getTranslations>>;

/** Una fila ya resuelta de la tabla de predicciones reveladas. */
export type RevealRow = {
  userId: string;
  /** Nombre a mostrar (apodo o local-part del email). */
  display: string;
  avatarUrl: string | null;
  /** Resalta mi propia fila. */
  isMe: boolean;
  homeScore: number | null;
  awayScore: number | null;
  /** En eliminatoria: predijo empate → va a penaltis. */
  willGoToPens: boolean;
  /** El marcador predicho coincide exactamente con el real (verde). */
  exactScore: boolean;
  /** Goleador predicho (modo completo); null si no eligió o no aplica. */
  scorerName: string | null;
  /** Su goleador predicho ha marcado en el partido (punto verde). */
  scorerScored: boolean;
};

/**
 * Tabla "Predicciones de la liga" de la página de partido. Las predicciones de
 * los miembros de la liga se hacen públicas a partir del saque inicial
 * (kickoff). Componente presentacional puro: recibe filas ya resueltas y un
 * translator del namespace `matchDetail` (para que el preview pueda pintar
 * cualquier idioma).
 */
export function MatchPredictionsReveal({
  rows,
  /** Modo de la liga: en `completo` mostramos la columna de goleador. */
  showScorer = true,
  t,
}: {
  rows: RevealRow[];
  showScorer?: boolean;
  t: Translator;
}) {
  const cols = showScorer
    ? "sm:grid-cols-[1fr_110px_1fr]"
    : "sm:grid-cols-[1fr_110px]";
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("predsTitle")}</CardTitle>
        <CardDescription>{t("predsDesc", { count: rows.length })}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            {t("predsEmpty")}
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[var(--color-border)]">
            <div
              className={`hidden items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2 font-mono text-[0.6rem] uppercase tracking-[0.28em] text-[var(--color-muted-foreground)] sm:grid ${cols}`}
            >
              <span>{t("colParticipant")}</span>
              <span className="text-center">{t("colResult")}</span>
              {showScorer ? <span>{t("colScorer")}</span> : null}
            </div>
            <ul>
              {rows.map((c) => (
                <li
                  key={c.userId}
                  className={`flex flex-col gap-1.5 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0 sm:grid sm:items-center sm:gap-2 sm:py-2.5 ${cols} ${
                    c.isMe
                      ? "bg-[color-mix(in_oklch,var(--color-arena)_5%,transparent)]"
                      : ""
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <Avatar className="size-7 border border-[var(--color-border)]">
                      {c.avatarUrl ? <AvatarImage src={c.avatarUrl} alt="" /> : null}
                      <AvatarFallback className="text-[0.6rem]">
                        {initials(c.display)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm font-medium">
                      {c.display}
                      {c.isMe ? (
                        <span className="ml-1.5 font-mono text-[0.55rem] uppercase tracking-[0.3em] text-[var(--color-arena)]">
                          {t("you")}
                        </span>
                      ) : null}
                    </span>
                  </span>
                  <span
                    className={`flex items-baseline gap-2 font-display tabular text-xl sm:justify-center ${
                      c.exactScore ? "text-[var(--color-success)] glow-pitch" : ""
                    }`}
                  >
                    <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] sm:hidden">
                      {t("colResult")}
                    </span>
                    {c.homeScore != null && c.awayScore != null ? (
                      <>
                        {c.homeScore}
                        <span className="mx-1 opacity-60">·</span>
                        {c.awayScore}
                      </>
                    ) : (
                      <span className="text-[var(--color-muted-foreground)]">—</span>
                    )}
                    {c.willGoToPens ? (
                      <span className="font-mono text-[0.55rem] uppercase text-[var(--color-muted-foreground)]">
                        {t("pen")}
                      </span>
                    ) : null}
                  </span>
                  {showScorer ? (
                    <span className="flex items-center gap-2 truncate text-sm">
                      <span className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)] sm:hidden">
                        {t("colScorer")}
                      </span>
                      {c.scorerName ? (
                        <>
                          <span
                            className={`size-1.5 rounded-full ${
                              c.scorerScored
                                ? "bg-[var(--color-success)]"
                                : "bg-[var(--color-muted-foreground)]"
                            }`}
                          />
                          <span className="truncate">{c.scorerName}</span>
                        </>
                      ) : (
                        <span className="text-[var(--color-muted-foreground)]">—</span>
                      )}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
