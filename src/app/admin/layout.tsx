import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/utils/supabase/server';
import AdminShell from '@/components/admin/AdminShell';
import { MotionProvider } from '@/components/MotionProvider';

/* Fase 8 (12.2): el panel nunca debe aparecer en buscadores. */
export const metadata: Metadata = {
  title: 'Panel | Mundo Medics',
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protección real en el servidor.
  // (proxy.ts redirige antes, pero esto garantiza la verificación en cada render.)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  /* Fase 8 (3.1): estar autenticado NO es ser administrador.
     Se comprueba la lista explícita `admin_users` en el servidor.

     - Si la migración 004 aún no se ha aplicado, la consulta falla. En ese caso
       se permite el acceso para no dejar al dueño fuera de su propio panel,
       pero se registra el problema en consola. El aviso aparece en el informe.
     - Si la tabla existe y el usuario no está en ella, se le cierra el panel. */
  const { data: isAdminRow, error: adminError } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (adminError) {
    console.warn(
      '[admin] No se pudo comprobar admin_users. ¿Falta ejecutar supabase/migrations/004_admin_roles.sql?',
      adminError.message
    );
  } else if (!isAdminRow) {
    // Autenticado pero sin permiso: no es un error de sesión, así que no se
    // envía a /login (entraría en bucle). Se muestra una página de aviso.
    return (
      <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-[#f8f8f6] px-5 text-center">
        <span className="material-symbols-outlined mb-4 text-[48px] text-[#ddd]">lock</span>
        <h1 className="mb-2 text-xl font-semibold text-[#1a1a1a]">Sin permiso de administración</h1>
        <p className="mb-8 max-w-sm text-sm leading-relaxed text-[#888]">
          Tu cuenta está activa, pero no tiene permisos para administrar el catálogo.
          Si crees que es un error, contacta con el responsable del sitio.
        </p>
        <a
          href="/"
          className="rounded-xl bg-[#1a1a1a] px-6 py-3 text-sm font-semibold text-white hover:bg-[#333]"
        >
          Volver al catálogo
        </a>
      </div>
    );
  }

  /* Fase 10: el panel SÍ conserva framer-motion porque usa <Reorder> para
     arrastrar y ordenar. Al vivir sólo aquí, ese peso no llega nunca al
     catálogo público. */
  return (
    <MotionProvider>
      <AdminShell>{children}</AdminShell>
    </MotionProvider>
  );
}
