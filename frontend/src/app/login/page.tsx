'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import RutaLogo from '@/components/RutaLogo';
import { FullScreenLoader } from '@/components/RequireAuth';
import { roleHome, safeNextPath } from '@/lib/session';

const DEMO_ACCOUNTS = [
  { label: 'Pasajero', email: 'jose@test.com', password: '123456' },
  { label: 'Conductor', email: 'carlos@test.com', password: '123456' },
  { label: 'Admin', email: 'admin@rapidito.com', password: 'admin123' },
];

function LoginForm() {
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');
  const roleParam = searchParams.get('role');
  const isDriverEntry = roleParam === 'DRIVER';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, loading: sessionLoading, login } = useAuth();
  const router = useRouter();

  const registerHref = isDriverEntry ? '/register?role=DRIVER' : '/register?role=PASSENGER';

  useEffect(() => {
    if (!sessionLoading && user) {
      router.replace(safeNextPath(nextParam, roleHome(user.rol)));
    }
  }, [sessionLoading, user, nextParam, router]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      router.replace(safeNextPath(nextParam, roleHome(user.rol)));
    } catch {
      // El contexto muestra el error.
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading || user) {
    return <FullScreenLoader label="Restaurando sesión…" />;
  }

  return (
    <main id="contenido" className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <RutaLogo size={40} />
        </div>

        <div className="card p-6 sm:p-8">
          <span className="brutal-label">Acceso</span>
          <h1 className="mt-3 text-3xl font-black leading-none tracking-tight">
            Iniciar sesión
          </h1>
          <p className="mt-2 text-sm font-medium text-muted">
            {isDriverEntry ? 'Accede a tu cuenta de conductor.' : 'Accede a tu cuenta de RUTA RIDES.'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="field-label">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="input-field"
                placeholder="tu@email.com"
                autoComplete="email"
                inputMode="email"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="input-field"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Iniciando sesión…' : 'Entrar'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            ¿No tienes cuenta?{' '}
            <Link href={registerHref} className="font-semibold text-ruta-600 hover:underline">
              Regístrate
            </Link>
          </p>

          {process.env.NODE_ENV !== 'production' && (
            <div className="mt-6 border-t border-line pt-5">
              <p className="mb-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                Cuentas de demostración
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    key={account.email}
                    type="button"
                    onClick={() => {
                      setEmail(account.email);
                      setPassword(account.password);
                    }}
                    className="border border-line bg-white px-2 py-2 text-xs font-black uppercase tracking-wide transition-colors hover:bg-ruta-500 hover:text-ink"
                  >
                    {account.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-muted">
                Datos de prueba locales. No son usuarios reales.
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-sm">
          <Link href="/" className="text-muted hover:text-ruta-600">
            Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<FullScreenLoader label="Cargando acceso…" />}>
      <LoginForm />
    </Suspense>
  );
}
