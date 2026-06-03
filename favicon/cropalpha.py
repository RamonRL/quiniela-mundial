from PIL import Image
import numpy as np

# --- Ruta de la imagen ---
img_path = "/home/ramon.romero/workspace/personal/quiniela-mundial/favicon/output.png"

img = Image.open(img_path).convert("RGBA")
data = np.array(img)

# --- Canal alpha ---
alpha = data[:, :, 3]

# --- Máscara: todo lo no transparente ---
mask = alpha > 0

# --- Evitar imagen vacía ---
coords = np.column_stack(np.where(mask))

if coords.size == 0:
    raise ValueError("Imagen completamente transparente")

# --- Bounding box ---
y_min, x_min = coords.min(axis=0)
y_max, x_max = coords.max(axis=0)

# --- Crop ---
cropped = img.crop((x_min, y_min, x_max + 1, y_max + 1))

# --- Guardar ---
out_path = "/home/ramon.romero/workspace/personal/quiniela-mundial/favicon/output_black.png"
cropped.save(out_path)

print(f"✔ Imagen recortada guardada en: {out_path}")
