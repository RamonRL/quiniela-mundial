"use client";

import { useTranslations } from "next-intl";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Controles de paginación para rankings: primera / anterior / siguiente /
 * última + indicador "Página X de Y". Se oculta solo si no hay más de una
 * página, así los rankings pequeños no cambian.
 */
export function TablePagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  const t = useTranslations("ranking");
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-1.5">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(1)}
        aria-label={t("pageFirst")}
      >
        <ChevronsLeft className="size-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label={t("pagePrev")}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-28 px-2 text-center font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[var(--color-muted-foreground)]">
        {t("pageOf", { page, total: totalPages })}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label={t("pageNext")}
      >
        <ChevronRight className="size-4" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(totalPages)}
        aria-label={t("pageLast")}
      >
        <ChevronsRight className="size-4" />
      </Button>
    </div>
  );
}
