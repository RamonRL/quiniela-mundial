import Image from "next/image";
import { initials } from "@/lib/utils";

type Props = {
  name?: string | null;
  photoUrl?: string | null;
  jerseyNumber?: number | null;
  size?: number;
  className?: string;
};

/**
 * Avatar circular para jugadores: muestra la foto si existe; si no, cae a
 * dorsal (font-display, grande) y, en último recurso, a las iniciales del
 * nombre. Pensado para reutilizarse en cualquier listado de plantilla,
 * goleadores o picks.
 */
export function PlayerAvatar({
  name,
  photoUrl,
  jerseyNumber,
  size = 40,
  className,
}: Props) {
  return (
    <span
      className={`grid shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] ${className ?? ""}`}
      style={{ width: size, height: size }}
    >
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          className="size-full object-cover"
        />
      ) : jerseyNumber != null ? (
        <span
          className="font-display tabular text-[var(--color-foreground)]"
          style={{ fontSize: Math.round(size * 0.42) }}
        >
          {jerseyNumber}
        </span>
      ) : (
        <span
          className="font-mono uppercase tracking-[0.1em] text-[var(--color-muted-foreground)]"
          style={{ fontSize: Math.round(size * 0.32) }}
        >
          {initials(name ?? "—")}
        </span>
      )}
    </span>
  );
}
