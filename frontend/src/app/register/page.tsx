'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import RutaLogo from '@/components/RutaLogo';
import { FullScreenLoader } from '@/components/RequireAuth';
import { roleHome } from '@/lib/session';
import type { RegisterPayload } from '@/lib/types';

type AccountRole = 'PASSENGER' | 'DRIVER';

interface RegisterFormState extends Omit<RegisterPayload, 'rol'> {
  rol: AccountRole;
  confirmPassword: string;
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const initialRole: AccountRole = searchParams.get('role') === 'DRIVER' ? 'DRIVER' : 'PASSENGER';

  const [formData, setFormData] = useState<RegisterFormState>({
    nombre: '',
    apellido: '',
    telefono: '',
    email: '',
    password: '',
    confirmPassword: '',
    rol: initialRole,
    tipoVehiculo: 'MOTO',
    marcaVehiculo: '',
    modeloVehiculo: '',
    colorVehiculo: '',
    placaVehiculo: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, loading: sessionLoading, register } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!sessionLoading && user) {
      router.replace(roleHome(user.rol));
    }
  }, [sessionLoading, user, router]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const setRole = (rol: AccountRole) => {
    setFormData((current) => ({ ...current, rol }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError(null);

    if (formData.password !== formData.confirmPassword) {
      setFormError('Las contraseñas no coinciden.');
      return;
    }
    if (formData.password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const payload: RegisterPayload = {
        nombre: formData.nombre,
        apellido: formData.apellido,
        telefono: formData.telefono,
        email: formData.email,
        password: formData.password,
        rol: formData.rol,
      };

      if (formData.rol === 'DRIVER') {
        payload.tipoVehiculo = formData.tipoVehiculo;
        payload.marcaVehiculo = formData.marcaVehiculo;
        payload.modeloVehiculo = formData.modeloVehiculo;
        payload.colorVehiculo = formData.colorVehiculo;
        payload.placaVehiculo = formData.placaVehiculo;
      }

      const user = await register(payload);
      router.replace(roleHome(user.rol));
    } catch {
      // El contexto muestra el error del servidor.
    } finally {
      setLoading(false);
    }
  };

  if (sessionLoading || user) {
    return <FullScreenLoader label="Restaurando sesión…" />;
  }

  return (
    <main id="contenido" className="min-h-screen bg-canvas px-4 py-8">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-6 text-center">
          <RutaLogo size={40} />
        </div>

        <div className="card p-6 sm:p-8">
          <span className="brutal-label">Registro</span>
          <h1 className="mt-3 text-3xl font-black leading-none tracking-tight">
            Crear cuenta
          </h1>
          <p className="mt-2 text-sm font-medium text-muted">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="font-black text-ruta-600 underline decoration-2 underline-offset-2">
              Inicia sesión
            </Link>
          </p>

          <div className="mt-6 flex border border-line p-1" role="group" aria-label="Tipo de cuenta">
            <button
              type="button"
              onClick={() => setRole('PASSENGER')}
              aria-pressed={formData.rol === 'PASSENGER'}
              className={`flex-1 px-3 py-2 text-xs font-black uppercase tracking-wide transition-colors ${
                formData.rol === 'PASSENGER'
                  ? 'bg-ruta-500 text-ink'
                  : 'text-muted hover:text-ruta-600'
              }`}
            >
              Pasajero
            </button>
            <button
              type="button"
              onClick={() => setRole('DRIVER')}
              aria-pressed={formData.rol === 'DRIVER'}
              className={`flex-1 px-3 py-2 text-xs font-black uppercase tracking-wide transition-colors ${
                formData.rol === 'DRIVER'
                  ? 'bg-ruta-500 text-ink'
                  : 'text-muted hover:text-ruta-600'
              }`}
            >
              Conductor
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="nombre" className="field-label">
                  Nombre
                </label>
                <input
                  id="nombre"
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Sin acentos"
                  autoComplete="given-name"
                  required
                />
              </div>
              <div>
                <label htmlFor="apellido" className="field-label">
                  Apellido
                </label>
                <input
                  id="apellido"
                  type="text"
                  name="apellido"
                  value={formData.apellido}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Sin acentos"
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="telefono" className="field-label">
                Teléfono
              </label>
              <input
                id="telefono"
                type="tel"
                name="telefono"
                value={formData.telefono}
                onChange={handleChange}
                className="input-field"
                placeholder="+584121234567"
                autoComplete="tel"
                inputMode="tel"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="field-label">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="input-field"
                placeholder="tu@email.com"
                autoComplete="email"
                inputMode="email"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="password" className="field-label">
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Mínimo 6"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="field-label">
                  Confirmar
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Repite"
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </div>
            </div>

            {formData.rol === 'DRIVER' && (
              <div className="space-y-4 border-t border-line pt-4">
                <p className="text-sm font-black uppercase tracking-wide">Vehículo</p>

                <div>
                  <label htmlFor="tipoVehiculo" className="field-label">
                    Tipo
                  </label>
                  <select
                    id="tipoVehiculo"
                    name="tipoVehiculo"
                    value={formData.tipoVehiculo}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="MOTO">Moto</option>
                    <option value="CARRO">Carro</option>
                    <option value="CAMIONETA">Camioneta</option>
                    <option value="VAN">Van</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="marcaVehiculo" className="field-label">
                      Marca
                    </label>
                    <input
                      id="marcaVehiculo"
                      type="text"
                      name="marcaVehiculo"
                      value={formData.marcaVehiculo}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Honda"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="modeloVehiculo" className="field-label">
                      Modelo
                    </label>
                    <input
                      id="modeloVehiculo"
                      type="text"
                      name="modeloVehiculo"
                      value={formData.modeloVehiculo}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="XR 150"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="colorVehiculo" className="field-label">
                      Color
                    </label>
                    <input
                      id="colorVehiculo"
                      type="text"
                      name="colorVehiculo"
                      value={formData.colorVehiculo}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="Negro"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="placaVehiculo" className="field-label">
                      Placa
                    </label>
                    <input
                      id="placaVehiculo"
                      type="text"
                      name="placaVehiculo"
                      value={formData.placaVehiculo}
                      onChange={handleChange}
                      className="input-field uppercase"
                      placeholder="ABC123"
                      required
                    />
                  </div>
                </div>

                <p className="text-xs text-muted">
                  La cuenta de conductor queda pendiente de verificación de documentos antes de
                  recibir viajes.
                </p>
              </div>
            )}

            {formError && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {formError}
              </p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>
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

export default function RegisterPage() {
  return (
    <Suspense fallback={<FullScreenLoader label="Cargando registro…" />}>
      <RegisterForm />
    </Suspense>
  );
}
