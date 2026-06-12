-- supabase_schema_v3.sql
-- Ejecuta este script en Supabase para solucionar el error de permisos (RLS) al guardar, editar o eliminar.

-- Habilitar permisos totales para PRODUCTOS
CREATE POLICY "Permitir insertar productos" ON public.products FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizar productos" ON public.products FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminar productos" ON public.products FOR DELETE USING (true);

-- Habilitar permisos totales para CATEGORÍAS
CREATE POLICY "Permitir insertar categorias" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir actualizar categorias" ON public.categories FOR UPDATE USING (true);
CREATE POLICY "Permitir eliminar categorias" ON public.categories FOR DELETE USING (true);
