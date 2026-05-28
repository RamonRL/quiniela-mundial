# Recuperación ante desastres · Quiniela Mundial

Este documento es el "sitio al que volver" si algo se rompe. Hay **dos capas de
copia independientes**, pensadas para no perder jamás los datos de los usuarios
(predicciones, puntos, perfiles).

## Capas de copia

| Capa | Qué cubre | Frecuencia | Dónde | Retención |
|------|-----------|------------|-------|-----------|
| **Supabase Pro (gestionada)** | BD completa | Diaria (automática) | Cuenta Supabase | Según plan |
| **Dump lógico → R2** | BD completa (`pg_dump -Fc`) | Cada 6 h | Cloudflare R2 `db/` | 7 días 6-horarios + 30 diarios + 12 semanales |
| **Storage → R2** | Buckets `avatars`, `news`, `leagues` | Diaria | Cloudflare R2 `storage/` | 30 días |

> **PITR (restauración al segundo): deferido.** Cuando el beneficio lo
> justifique, activar el add-on PITR en Supabase reduciría la peor ventana de
> pérdida de ~6 h (cadencia del dump a R2) a segundos. Mientras tanto, la
> combinación snapshot diario de Supabase + dump 6-horario a R2 es la red.

Los workflows viven en `.github/workflows/backup-db.yml` (cada 6 h) y
`.github/workflows/backup-storage.yml` (diario). Ambos admiten disparo manual
desde la pestaña **Actions → Run workflow**.

## Secrets necesarios (GitHub → Settings → Secrets → Actions)

- `DATABASE_DIRECT_URL` — pooler de sesión (puerto 5432). **No** el transaction pooler.
- `R2_ENDPOINT` — `https://<accountid>.r2.cloudflarestorage.com`.
- `R2_BUCKET` — nombre del bucket de R2.
- `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` — token de API de R2 con permiso de escritura.
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — para el backup de Storage.

## Escenario A — borrado/corrupción de datos, mismo proyecto

Lo más rápido es el snapshot gestionado de Supabase:

1. Supabase Dashboard → Database → **Backups**.
2. Elegir el snapshot diario anterior al incidente y **Restore**.
3. Verificar conteos clave (ver "Verificación post-restore").

Si el incidente es posterior al último snapshot diario y necesitas algo más
reciente, usa el dump 6-horario de R2 (Escenario B sobre el mismo proyecto, o
restaurar tablas concretas con `pg_restore -t`).

## Escenario B — fallo total de la cuenta Supabase (restaurar desde R2)

1. Crear un proyecto Supabase nuevo. Anotar su `DATABASE_DIRECT_URL`.
2. Descargar el dump más reciente de R2:
   ```bash
   aws s3 ls s3://$R2_BUCKET/db/ --endpoint-url $R2_ENDPOINT | tail
   aws s3 cp s3://$R2_BUCKET/db/quiniela-<STAMP>.dump ./restore.dump --endpoint-url $R2_ENDPOINT
   ```
3. Restaurar el esquema + datos:
   ```bash
   pg_restore --no-owner --no-privileges --clean --if-exists \
     -d "$NUEVO_DATABASE_DIRECT_URL" ./restore.dump
   ```
4. Restaurar los objetos de Storage:
   ```bash
   aws s3 cp s3://$R2_BUCKET/storage/storage-<STAMP>.tar.gz ./storage.tar.gz --endpoint-url $R2_ENDPOINT
   tar -xzf storage.tar.gz -C ./storage-restore
   # Crear los buckets públicos avatars/news/leagues en el proyecto nuevo y
   # re-subir su contenido (Supabase CLI o un script de upload por bucket).
   ```
5. Actualizar en Vercel las env vars del proyecto nuevo (`DATABASE_URL`,
   `DATABASE_DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`) y re-desplegar.
6. Re-ejecutar `pnpm db:setup-rls` para reaplicar RLS/realtime.

## Verificación post-restore

```sql
select count(*) from profiles;
select count(*) from pred_match_result;
select count(*) from points_ledger;
select max(submitted_at) from pred_match_result;
```

Compara con los valores esperados y, si el torneo está en marcha, ejecuta el
auditor de puntos para confirmar que el scoring es coherente:

```bash
pnpm db:audit-points
```

## Ritual trimestral

Hacer un **restore de prueba** del último dump de R2 a un proyecto Supabase
scratch y verificar los conteos. Un backup no probado no es un backup.
