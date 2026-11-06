import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import AdminShell from '@/components/admin/AdminShell';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Protección real en el servidor: sin sesión válida no se renderiza el panel.
  // (proxy.ts redirige antes, pero esto garantiza la verificación en cada render.)
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <AdminShell>{children}</AdminShell>;
}
