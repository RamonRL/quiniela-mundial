import { requireAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/shell/page-header";
import { KnockoutBanner } from "@/components/dashboard/knockout-banner";
import { KoDrawPreview } from "@/components/predictions/ko-draw-preview";

export const metadata = { title: "Preview · Admin" };
export const dynamic = "force-dynamic";

export default async function PreviewPage() {
  await requireAdmin();
  // Cuenta atrás de muestra (~5 h) para previsualizar el banner de bracket.
  const previewClosesAt = new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Preview · Componentes"
        description="Previsualización de componentes del dashboard y de las predicciones. No guarda nada."
      />

      <section className="space-y-6">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
            Banner fase eliminatoria · al cerrar los grupos
          </p>
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            Sustituye al banner de redes cuando se abren los dieciseisavos.
            Arriba, el de las ligas en modo <strong>Completo</strong> (urgencia
            del bracket + cuenta atrás al primer R32, y menciona resultados y
            goleadores). Abajo, el del <strong>resto de modos</strong> (solo el
            aviso de dieciseisavos). La cuenta atrás es de muestra (~5 h).
          </p>
        </div>
        <KnockoutBanner variant="completo" closesAtISO={previewClosesAt} bracketDone={false} />
        <KnockoutBanner variant="basic" />
      </section>

      <section className="space-y-4">
        <div>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-[var(--color-arena)]">
            Paso a paso · eliminatoria con empate
          </p>
          <p className="font-editorial text-sm italic text-[var(--color-muted-foreground)]">
            Cómo se ve un partido de <strong>dieciseisavos</strong> con un{" "}
            <strong>empate</strong> predicho en los 3 modos, para revisar la
            selección del ganador a penaltis. La nota recuerda que el marcador es
            a 120′ (fin de la prórroga). Es interactivo y no guarda nada.
          </p>
        </div>
        <KoDrawPreview />
      </section>
    </div>
  );
}
