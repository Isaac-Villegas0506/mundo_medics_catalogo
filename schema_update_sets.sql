-- Añadir soporte para "Sets Completos"
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_set BOOLEAN DEFAULT false;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS included_products JSONB DEFAULT '[]'::jsonb;
