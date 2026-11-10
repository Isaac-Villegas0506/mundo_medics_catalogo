-- Fase 33 — Métricas reales para el panel de administración.
--
-- El dashboard mostraba solo datos derivados de `products`. Para tener
-- "visitas de la web", "productos más vistos" y "actividad reciente" hace falta
-- registrarlos. Se crean dos tablas y una vista de resumen.
--
-- Privacidad: NO se guarda IP, ni user-agent, ni identificadores de usuario. Solo
-- la ruta visitada y la fecha. Se agrega por día con `visit_stats` más abajo.
--
-- Idempotente: se puede ejecutar varias veces sin error.

-- ── 1. Vistas de producto ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.product_views (
  id          bigserial PRIMARY KEY,
  product_id  uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  viewed_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS product_views_product_id_idx
  ON public.product_views (product_id);
CREATE INDEX IF NOT EXISTS product_views_viewed_at_idx
  ON public.product_views (viewed_at DESC);

COMMENT ON TABLE public.product_views IS
  'Una fila por apertura de ficha de producto. Sin datos personales.';

-- ── 2. Visitas de la web ────────────────────────────────────────────────────
-- Se guarda un registro por visita con la ruta, para poder contar totales y
-- hacer un gráfico de los últimos días.
CREATE TABLE IF NOT EXISTS public.page_views (
  id         bigserial PRIMARY KEY,
  path       text NOT NULL DEFAULT '/',
  viewed_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS page_views_viewed_at_idx
  ON public.page_views (viewed_at DESC);

COMMENT ON TABLE public.page_views IS
  'Una fila por visita a una página publica. Solo ruta y fecha, sin datos personales.';

-- ── 3. Actividad del panel ─────────────────────────────────────────────────
-- Cada acción del administrador (crear, editar, borrar, cambiar estado...).
CREATE TABLE IF NOT EXISTS public.admin_activity (
  id          bigserial PRIMARY KEY,
  action      text NOT NULL,             -- 'create' | 'update' | 'delete' | 'status'
  entity      text NOT NULL,             -- 'product' | 'category' | 'settings' | 'featured'
  entity_name text,                      -- nombre legible de lo afectado
  detail      text,                      -- texto corto opcional
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_activity_created_at_idx
  ON public.admin_activity (created_at DESC);

COMMENT ON TABLE public.admin_activity IS
  'Registro de acciones del administrador, para el bloque de actividad reciente.';

-- ── 4. RLS ─────────────────────────────────────────────────────────────────
-- Lectura y escritura solo para administradores autenticados. El registro de
-- visitas lo hace el cliente con la clave anónima a través de una función
-- SECURITY DEFINER más abajo, para no abrir INSERT directo a cualquiera.

ALTER TABLE public.product_views  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.page_views     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura de vistas de producto para autenticados" ON public.product_views;
CREATE POLICY "Lectura de vistas de producto para autenticados"
  ON public.product_views FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura de visitas para autenticados" ON public.page_views;
CREATE POLICY "Lectura de visitas para autenticados"
  ON public.page_views FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Lectura de actividad para autenticados" ON public.admin_activity;
CREATE POLICY "Lectura de actividad para autenticados"
  ON public.admin_activity FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Escritura de actividad para autenticados" ON public.admin_activity;
CREATE POLICY "Escritura de actividad para autenticados"
  ON public.admin_activity FOR INSERT TO authenticated WITH CHECK (true);

-- ── 5. Funciones de registro (SECURITY DEFINER) ────────────────────────────
-- Permiten a un visitante anónimo registrar una visita SIN poder leer ni
-- manipular las tablas. Se limitan en tamaño y se protegen con un chequeo
-- básico para evitar abusos triviales.

CREATE OR REPLACE FUNCTION public.log_page_view(p_path text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se acota la ruta para que nadie llene la tabla con textos gigantes.
  INSERT INTO public.page_views (path)
  VALUES (left(coalesce(p_path, '/'), 200));
END;
$$;

CREATE OR REPLACE FUNCTION public.log_product_view(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sólo se registra si el producto existe (la FK lo exigiría igualmente).
  IF EXISTS (SELECT 1 FROM public.products WHERE id = p_product_id) THEN
    INSERT INTO public.product_views (product_id) VALUES (p_product_id);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.log_page_view(text) FROM public;
REVOKE ALL ON FUNCTION public.log_product_view(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.log_page_view(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_product_view(uuid) TO anon, authenticated;

-- ── 6. Vistas de resumen (facilitan el dashboard) ──────────────────────────
-- Conteo de visitas por día de los últimos 30 días.
CREATE OR REPLACE VIEW public.page_views_daily AS
SELECT
  date_trunc('day', viewed_at)::date AS day,
  count(*)::int AS visits
FROM public.page_views
WHERE viewed_at > now() - interval '30 days'
GROUP BY 1
ORDER BY 1;

-- Productos más vistos (todo el histórico).
CREATE OR REPLACE VIEW public.product_views_ranking AS
SELECT
  p.id,
  p.name,
  p.image_url,
  p.category,
  count(v.id)::int AS views
FROM public.products p
LEFT JOIN public.product_views v ON v.product_id = p.id
GROUP BY p.id, p.name, p.image_url, p.category
ORDER BY views DESC, p.name ASC;

REVOKE ALL ON public.page_views_daily FROM anon;
REVOKE ALL ON public.product_views_ranking FROM anon;
GRANT SELECT ON public.page_views_daily TO authenticated;
GRANT SELECT ON public.product_views_ranking TO authenticated;
