-- Fase 19: imagen por color de prenda
--
-- Permite que al pulsar un color en el modal del producto la foto cambie a la
-- de ese color. Se guarda como objeto JSON: { "#FFFFFF": "https://.../blanco.webp",
-- "#1a1a1a": "https://.../negro.webp" }.
--
-- Se usa jsonb y no una tabla aparte porque el número de colores por producto es
-- pequeño (2-5) y siempre se lee junto con el producto: evita un JOIN y una
-- consulta extra en el catálogo.
--
-- Idempotente: se puede ejecutar varias veces sin error.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS color_images jsonb DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.products.color_images IS
  'Mapa color (hex) -> URL de imagen. Permite cambiar la foto al elegir color en el modal.';
