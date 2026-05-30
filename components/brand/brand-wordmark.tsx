import Image from "next/image";

/**
 * Wordmark "Quiniela Mundial" con variante por tema. Renderiza ambos PNG y
 * deja que CSS decida cuál se ve: el blanco en `.dark` (default), el negro
 * en claro. No hace falta hook de tema en cliente — así evitamos el flash
 * mientras hidrata y funciona igual de bien en SSR/edge.
 *
 * Dimensiones intrínsecas fijas (1919×660, las del PNG); la altura visible
 * se controla con `className` ("h-9 w-auto", "h-12 w-auto", etc.).
 */
export function BrandWordmark({
  priority,
  className,
}: {
  priority?: boolean;
  className?: string;
}) {
  return (
    <>
      {/* Dark theme (default): wordmark blanco */}
      <Image
        src="/hlogo.png"
        alt="Quiniela Mundial"
        width={1919}
        height={660}
        priority={priority}
        className={`hidden dark:block ${className ?? ""}`.trim()}
      />
      {/* Light theme: wordmark negro */}
      <Image
        src="/hlogo-light.png"
        alt="Quiniela Mundial"
        width={1919}
        height={660}
        priority={priority}
        className={`block dark:hidden ${className ?? ""}`.trim()}
      />
    </>
  );
}
