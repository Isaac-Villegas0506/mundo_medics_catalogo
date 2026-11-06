-- =============================================================================
-- 003_indices_rendimiento.sql
-- Fase 4 (Supabase: consultas, paginación y datos)
--
-- Índices para las consultas frecuentes de la portada:
--   - Filtro por categoría (chips de la portada).
--   - Orden por fecha de creación (listado y paginación).
--
-- Nota: la búsqueda por nombre usa ILIKE '%...%', que un índice btree no
-- acelera; para un catálogo pequeño no se justifica un índice de texto.
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_products_category
  ON public.products (category);

CREATE INDEX IF NOT EXISTS idx_products_created_at
  ON public.products (created_at DESC);
