from PIL import Image
import numpy as np

img = Image.open("/home/ramon.romero/Pictures/unnax.png").convert("RGBA")
data = np.array(img)

# Separar canales
r, g, b, a = data.T

# Detectar blanco (puedes ajustar tolerancia)
white = (r < 30) & (g < 30) & (b < 30)

# Hacer transparente
data[..., :-1][white.T] = (255, 255, 255)
data[..., -1][white.T] = 0

Image.fromarray(data).save("/home/ramon.romero/Pictures/unnax_alpha.png")
