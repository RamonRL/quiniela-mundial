"""Pinta de negro cualquier píxel blanco o casi-blanco preservando el alpha.

Útil para invertir el wordmark cuando queremos una versión "tinta" sobre
fondo claro a partir de la versión blanca recortada (hlogo_alpha2_cropped.png).

Uso:
    python favicon/whitetoblack.py favicon/hlogo_alpha2_cropped.png
    python favicon/whitetoblack.py in.png -o out.png --threshold 220
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image

# Umbral por canal a partir del cual un píxel se considera "blanco o
# cercano". 230 deja respirar bordes con un toque de anti-aliasing
# (mejores resultados que 255 estricto). Si pintamos píxeles que no son
# parte del wordmark, subir a 245+.
DEFAULT_NEAR_WHITE_THRESHOLD: int = 230


def invert_white_to_black(rgba: np.ndarray, threshold: int) -> np.ndarray:
    """Devuelve una copia donde los píxeles casi-blancos pasan a negro.

    Args:
        rgba: Array de forma (H, W, 4) en orden RGBA, uint8.
        threshold: Valor mínimo (0-255) que los tres canales R, G, B deben
            superar simultáneamente para considerar el píxel "casi-blanco".

    Returns:
        Nuevo array RGBA del mismo shape con los píxeles afectados puestos
        a (0, 0, 0) y el canal alpha intacto.
    """
    out = rgba.copy()
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    mask = (r >= threshold) & (g >= threshold) & (b >= threshold)
    out[mask, 0:3] = 0
    return out


def process(input_path: Path, output_path: Path, threshold: int) -> int:
    """Carga la imagen, aplica la inversión, la guarda. Devuelve nº píxeles afectados."""
    img = Image.open(input_path).convert("RGBA")
    rgba = np.array(img)
    out_rgba = invert_white_to_black(rgba, threshold)
    affected = int(
        (
            (rgba[..., 0] >= threshold)
            & (rgba[..., 1] >= threshold)
            & (rgba[..., 2] >= threshold)
        ).sum()
    )
    Image.fromarray(out_rgba).save(output_path)
    return affected


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Pinta de negro los píxeles blancos/cercanos al blanco.",
    )
    parser.add_argument("input", type=Path, help="Imagen PNG de entrada (RGBA).")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Ruta de salida. Por defecto: <input>_black.png junto al input.",
    )
    parser.add_argument(
        "-t",
        "--threshold",
        type=int,
        default=DEFAULT_NEAR_WHITE_THRESHOLD,
        help=f"Umbral 0-255 por canal (default: {DEFAULT_NEAR_WHITE_THRESHOLD}).",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if not 0 <= args.threshold <= 255:
        raise SystemExit(f"--threshold debe estar entre 0 y 255 (es {args.threshold})")
    input_path: Path = args.input
    if not input_path.is_file():
        raise SystemExit(f"No existe el fichero: {input_path}")
    output_path: Path = args.output or input_path.with_name(
        f"{input_path.stem}_black{input_path.suffix}",
    )
    affected = process(input_path, output_path, args.threshold)
    print(f"✔ {affected:,} píxeles convertidos a negro → {output_path}")


if __name__ == "__main__":
    main()
