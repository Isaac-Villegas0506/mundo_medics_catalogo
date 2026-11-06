-- =============================================================================
-- 004_admin_roles.sql
-- Fase 8 (3.1) — Autorización administrativa real.
--
-- PROBLEMA: hasta ahora "estar autenticado" equivalía a "ser administrador".
-- Si el registro público de Supabase Auth está activo (o se reactiva por
-- error), cualquiera podía crear una cuenta y administrar el catálogo.
--
-- SOLUCIÓN: lista explícita de administradores.
--   - Tabla `admin_users` con el id (y correo) de quienes pueden administrar.
--   - Función `is_admin()` que consulta esa lista.
--   - Las políticas de escritura pasan de `authenticated` a `is_admin()`.
--
-- ⚠️  EJECUTAR DESPUÉS de 002_rls_seguridad.sql y con respaldo previo.
-- ⚠️  Sustituye el correo de ejemplo por el del dueño ANTES de ejecutar.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Tabla de administradores
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.admin_users IS
  'Personas con permiso para administrar el catálogo. Sin fila aquí, un usuario autenticado NO puede escribir.';

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Nadie puede leer la lista desde el navegador (ni siquiera un admin):
-- se consulta sólo desde el servidor con la función is_admin().
DROP POLICY IF EXISTS "Sin acceso publico a admin_users" ON public.admin_users;
CREATE POLICY "Sin acceso publico a admin_users"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Función is_admin()
--    SECURITY DEFINER para poder leer admin_users desde las políticas sin
--    depender de los permisos del usuario que hace la consulta.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Alta del administrador
--    ⚠️ CAMBIA EL CORREO por el del dueño antes de ejecutar.
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO public.admin_users (user_id, email)
SELECT id, email FROM auth.users WHERE email = 'admin@mundomedics.com'
ON CONFLICT (user_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Reemplazar las políticas de escritura: de `authenticated` a `is_admin()`
-- ─────────────────────────────────────────────────────────────────────────────
-- PRODUCTS
DROP POLICY IF EXISTS "Escritura de productos solo autenticados" ON public.products;
DROP POLICY IF EXISTS "Actualizacion de productos solo autenticados" ON public.products;
DROP POLICY IF EXISTS "Eliminacion de productos solo autenticados" ON public.products;

CREATE POLICY "Escritura de productos solo administradores"
  ON public.products FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Actualizacion de productos solo administradores"
  ON public.products FOR UPDATE TO authenticated USING (public.is_admin());

CREATE POLICY "Eliminacion de productos solo administradores"
  ON public.products FOR DELETE TO authenticated USING (public.is_admin());

-- CATEGORIES
DROP POLICY IF EXISTS "Escritura de categorias solo autenticados" ON public.categories;
DROP POLICY IF EXISTS "Actualizacion de categorias solo autenticados" ON public.categories;
DROP POLICY IF EXISTS "Eliminacion de categorias solo autenticados" ON public.categories;

CREATE POLICY "Escritura de categorias solo administradores"
  ON public.categories FOR INSERT TO authenticated WITH CHECK (public.is_admin());

CREATE POLICY "Actualizacion de categorias solo administradores"
  ON public.categories FOR UPDATE TO authenticated USING (public.is_admin());

CREATE POLICY "Eliminacion de categorias solo administradores"
  ON public.categories FOR DELETE TO authenticated USING (public.is_admin());

-- SETTINGS
DROP POLICY IF EXISTS "Escritura de settings solo autenticados" ON public.settings;

CREATE POLICY "Escritura de settings solo administradores"
  ON public.settings FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- STORAGE
DROP POLICY IF EXISTS "Subida de imagenes solo autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Actualizacion de imagenes solo autenticados" ON storage.objects;
DROP POLICY IF EXISTS "Eliminacion de imagenes solo autenticados" ON storage.objects;

CREATE POLICY "Subida de imagenes solo administradores"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'products' AND public.is_admin());

CREATE POLICY "Actualizacion de imagenes solo administradores"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'products' AND public.is_admin());

CREATE POLICY "Eliminacion de imagenes solo administradores"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'products' AND public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Verificación
-- ─────────────────────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd, roles::text AS roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('products', 'categories', 'settings')
ORDER BY tablename, cmd, policyname;

SELECT user_id, email, created_at FROM public.admin_users;

-- ═══════════════════════════════════════════════════════════════════════════════
-- ROLLBACK (volver al esquema anterior, escritura para cualquier autenticado)
-- ═══════════════════════════════════════════════════════════════════════════════
-- DROP POLICY IF EXISTS "Escritura de productos solo administradores" ON public.products;
-- CREATE POLICY "Escritura de productos solo autenticados"
--   ON public.products FOR INSERT TO authenticated WITH CHECK (true);
-- (repetir el patrón para el resto de políticas)
