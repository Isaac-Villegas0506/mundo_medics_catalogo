-- supabase_schema_v4.sql
-- Ejecuta este script en Supabase para añadir la opción de personalización (bordado personalizado, etc.)

-- Añadir columna de opciones de personalización a productos
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS customization_options text[] DEFAULT '{}'::text[];

-- Comentario de la columna para documentación
COMMENT ON COLUMN public.products.customization_options IS 'Opciones de personalización disponibles (ej. Bordado personalizado)';
