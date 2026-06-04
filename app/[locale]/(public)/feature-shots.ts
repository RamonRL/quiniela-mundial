import { type StaticImageData } from "next/image";

// Capturas reales del producto (liga demo "Synaptech World Cup"),
// localizadas por idioma. Static imports → next/image las optimiza y
// genera el placeholder blur. Compartidas por /precios y la sección
// empresas de la home.
import brandingES from "@/marketing/BRANDING/ES.png";
import brandingEN from "@/marketing/BRANDING/EN.png";
import brandingFR from "@/marketing/BRANDING/FR.png";
import brandingPT from "@/marketing/BRANDING/PT.png";
import deptsES from "@/marketing/DEPARTAMENTOS/ES.png";
import deptsEN from "@/marketing/DEPARTAMENTOS/EN.png";
import deptsFR from "@/marketing/DEPARTAMENTOS/FR.png";
import deptsPT from "@/marketing/DEPARTAMENTOS/PT.png";
import bannerES from "@/marketing/BANNER/ES.png";
import bannerEN from "@/marketing/BANNER/EN.png";
import bannerFR from "@/marketing/BANNER/FR.png";
import bannerPT from "@/marketing/BANNER/PT.png";

export type FeatureShotSet = Record<
  "branding" | "depts" | "banner",
  StaticImageData
>;

export const FEATURE_SHOTS: Record<string, FeatureShotSet> = {
  es: { branding: brandingES, depts: deptsES, banner: bannerES },
  en: { branding: brandingEN, depts: deptsEN, banner: bannerEN },
  fr: { branding: brandingFR, depts: deptsFR, banner: bannerFR },
  pt: { branding: brandingPT, depts: deptsPT, banner: bannerPT },
};

export function featureShotsFor(locale: string): FeatureShotSet {
  return FEATURE_SHOTS[locale] ?? FEATURE_SHOTS.es;
}
