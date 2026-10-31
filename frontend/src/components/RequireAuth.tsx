'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { wasJustLoggedOut } from '@/lib/session';
import type { UserRole } from '@/lib/types';

export function FullScreenLoader({ label = 'Cargando…' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas" role="status" aria-live="polite">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-ruta-500 border-t-transparent" />
        <p className="text-muted">{label}</p>
      </div>
    </div>
  );
}

export default function RequireAuth({
  children,
  roles,
}: {
  children: ReactNode;
  roles?: UserRole[];
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      if (wasJustLoggedOut()) {
        router.replace('/');
        return;
      }
      const next = encodeURIComponent(pathname || '/');
      router.replace(`/login?next=${next}`);
    }
  }, [loading, user, pathname, router]);

  if (loading) return <FullScreenLoader label="Restaurando sesión…" />;
  if (!user) return null;

  if (roles && !roles.includes(user.rol)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
        <div className="card w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-bold">Acceso restringido</h1>
          <p className="mt-2 text-muted">
            Tu cuenta no tiene permisos para esta sección.
          </p>
          <Link href="/dashboard" className="btn-primary mt-6 w-full">
            Volver a mi panel
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
