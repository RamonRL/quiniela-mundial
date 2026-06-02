import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-sm space-y-4 text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
          Error de acceso
        </p>
        <h1 className="font-display text-4xl">No hemos podido validarte</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {params.reason ?? "El enlace caducó o ya se usó. Pide uno nuevo."}
        </p>
        <Button asChild>
          <Link href="/login">Volver a empezar</Link>
        </Button>
      </div>
    </div>
  );
}
