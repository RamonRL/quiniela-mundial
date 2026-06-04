// Declaraciones de módulos para imports estáticos de imágenes
// (import shot from "@/marketing/.../ES.png").
//
// Viven aquí y NO en next-env.d.ts porque next-env.d.ts está gitignored
// (lo regenera Next en cada dev/build): en CI no existe y `tsc --noEmit`
// fallaba con TS2307 en cada import de PNG. Este archivo SÍ se versiona.
/// <reference types="next/image-types/global" />
