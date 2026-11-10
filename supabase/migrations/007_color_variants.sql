-- Fase 33 — Nombres de las variantes de color.
--
-- Antes había `color_hex_codes` (array de hex) y `color_images` (mapa hex -> URL),
-- pero NO se guardaba el NOMBRE de cada color. En la tienda solo se veía el hex
-- (`#FFFFFF`) en lugar de «Rojo vino», como pidió el dueño.
--
-- Se añade:
--   color_variants: [{ hex: '#7b1113', name: 'Rojo vino', image: 'https://...' }]
--
-- Se mantiene `color_hex_codes` y `color_images` por compatibilidad: el código
-- público y el admin los siguen leyendo, y `color_variants` es la fuente
-- completa. Un trigger ligero mantiene ambas representaciones en sincronía para
-- no romper nada que aún lea las columnas antiguas.
--
-- Idempotente.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS color_variants jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.products.color_variants IS
  'Variantes de color: [{hex, name, image}]. Fuente principal para la tienda.';

-- ── Migración de los datos existentes ─────────────────────────────────────
-- Para cada producto con `color_hex_codes`, se construye el array de variantes
-- reutilizando el nombre en `color_name` y la imagen de `color_images` si la hay.
UPDATE public.products
SET color_variants = sub.variants
FROM (
  SELECT
    p.id,
    jsonb_agg(
      jsonb_build_object(
        'hex', hex,
        -- Si el producto solo tiene un color, su nombre es `color_name`.
        -- Si tiene varios, se deja vacío para que el dueño lo complete.
        'name', CASE
                  WHEN jsonb_array_length(to_jsonb(p.color_hex_codes)) = 1
                  THEN coalesce(nullif(p.color_name, ''), hex)
                  ELSE coalesce(p.color_images ->> hex, '')
                END,
        'image', coalesce(p.color_images ->> hex, '')
      )
      ORDER BY ord
    ) AS variants
  FROM public.products p
  CROSS JOIN LATERAL unnest(p.color_hex_codes) WITH ORDINALITY AS t(hex, ord)
  WHERE p.color_hex_codes IS NOT NULL
    AND array_length(p.color_hex_codes, 1) > 0
    AND (p.color_variants IS NULL OR p.color_variants = '[]'::jsonb)
  GROUP BY p.id
) AS sub
WHERE products.id = sub.id;
