# Flujo para subir una convocatoria nueva

Cinco pasos por selección, en orden. `<CODE>` = código FIFA (NOR, GER, BRA…).

## 1. Comprobar si hay convocatoria publicada

Buscar en prensa o redes oficiales si esa federación ya ha anunciado su lista
de 26 (o pre-lista de 30). Si todavía no hay nada, esperar.

## 2. Descargar las fotos de los jugadores

Carpeta: `plantillas/<CODE>/`. Archivos `<apellido>.png` (lowercase, sin
acentos). Para apellidos comunes usar `<nombre apellido>.png` (e.g.
`marcus pedersen.png`).

Si no hay fotos disponibles aún, saltar este paso — el comando del paso 3
hará skip silencioso de la carga.

## 3. Inyectar jugadores + dorsales + fotos

```
/convocatoria-qm <CODE>
```

Busca la convocatoria oficial, asigna dorsales reales cruzando varias fuentes,
hace UPSERT en `players` y sube las fotos de la carpeta.

## 4. Generar la portada con ChatGPT

Prompt base (ajustar `<País>` y `<jugadores>`):

> Crea una imagen en 16:9 que sirva de cartel de la convocatoria de **<País>**
> para el Mundial 2026. Quiero que esté protagonizada por los jugadores más
> importantes convocados por **<País>** (**<Jugador 1 (celebración)>**,
> **<Jugador 2>**, **<Jugador 3>**), y que no contenga texto.

Guardar el resultado en `noticias/convocatorias/<CODE>.png`.

## 5. Redactar y publicar la noticia

```
/noticia-convocatoria-qm <CODE>
```

Busca info, redacta siguiendo el patrón del resto de convocatorias, sube la
portada desde `noticias/convocatorias/<CODE>.png` y publica en
`/noticias/convocatoria-<pais>-mundial-2026-...`.

---

**Atajos útiles**

- Ver dorsales antes de aplicar: cada comando soporta `--dry-run` por debajo
  (el slash command lo pasa solo).
- Repetir el comando del paso 3 o 5 dos veces no duplica nada (UPSERT por
  `(teamId, name)` y por `slug` respectivamente).
- Si quieres regenerar el cover de una noticia ya publicada:
  `pnpm db:upsert-news /tmp/news-<CODE>.json --force-cover`.
