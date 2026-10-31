'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import api, { AUTH_UNAUTHORIZED_EVENT } from '@/lib/api';
import { getApiErrorMessage } from '@/lib/errors';
import { clearStoredSession, persistSession, readStoredToken } from '@/lib/session';
import { closeSocket } from '@/lib/socket';
import type {
  LoginResponse,
  Profile,
  ProfileResponse,
  RegisterPayload,
  User,
} from '@/lib/types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: RegisterPayload) => Promise<User>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((nextToken: string, nextUser: User, nextProfile: Profile | null) => {
    persistSession(nextToken, nextUser);
    setToken(nextToken);
    setUser(nextUser);
    setProfile(nextProfile);
  }, []);

  const dropSession = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setUser(null);
    setProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data } = await api.get<ProfileResponse>('/api/auth/profile');
    const storedToken = readStoredToken();
    if (!storedToken) return;
    applySession(storedToken, data.user, data.profile ?? null);
  }, [applySession]);

  // Restaura la sesión contra el backend: el token guardado no se considera
  // válido hasta que /api/auth/profile responde.
  useEffect(() => {
    let active = true;

    const restore = async () => {
      const storedToken = readStoredToken();

      if (!storedToken) {
        if (active) setLoading(false);
        return;
      }

      try {
        const { data } = await api.get<ProfileResponse>('/api/auth/profile');
        if (!active) return;
        applySession(storedToken, data.user, data.profile ?? null);
      } catch {
        if (!active) return;
        clearStoredSession();
        setToken(null);
        setUser(null);
        setProfile(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    void restore();

    return () => {
      active = false;
    };
  }, [applySession]);

  // Otra pestaña o una respuesta 401 invalidan la sesión en memoria.
  useEffect(() => {
    const handleUnauthorized = () => {
      setToken(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const { data } = await api.post<LoginResponse>('/api/auth/login', { email, password });
        applySession(data.token, data.user, null);

        // El perfil (vehículo, calificación, referido) llega en otra consulta.
        try {
          const { data: profileData } = await api.get<ProfileResponse>('/api/auth/profile');
          applySession(data.token, profileData.user, profileData.profile ?? null);
        } catch {
          // La sesión sigue válida aunque el perfil no cargue en este momento.
        }

        toast.success(`Bienvenido, ${data.user.nombre}`);
        return data.user;
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'No se pudo iniciar sesión'));
        throw error;
      }
    },
    [applySession]
  );

  const register = useCallback(
    async (data: RegisterPayload) => {
      const isDriver = data.rol === 'DRIVER';
      const endpoint = isDriver ? '/api/auth/register-driver' : '/api/auth/register';
      const body: Record<string, string> = {
        nombre: data.nombre,
        apellido: data.apellido,
        telefono: data.telefono,
        email: data.email,
        password: data.password,
        rol: data.rol,
      };

      if (isDriver) {
        body.tipoVehiculo = data.tipoVehiculo ?? 'MOTO';
        body.marcaVehiculo = data.marcaVehiculo ?? '';
        body.modeloVehiculo = data.modeloVehiculo ?? '';
        body.colorVehiculo = data.colorVehiculo ?? '';
        body.placaVehiculo = data.placaVehiculo ?? '';
      }

      try {
        const response = await api.post<LoginResponse>(endpoint, body);
        applySession(response.data.token, response.data.user, null);

        try {
          const { data: profileData } = await api.get<ProfileResponse>('/api/auth/profile');
          applySession(response.data.token, profileData.user, profileData.profile ?? null);
        } catch {
          // La cuenta ya está creada; el perfil se reintenta al recargar.
        }

        toast.success('Registro exitoso');
        return response.data.user;
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'No se pudo completar el registro'));
        throw error;
      }
    },
    [applySession]
  );

  const logout = useCallback(() => {
    closeSocket();
    dropSession();
    toast.success('Sesión cerrada');
  }, [dropSession]);

  const updateUser = useCallback((data: Partial<User>) => {
    setUser((current) => {
      if (!current) return current;
      const updated = { ...current, ...data };
      try {
        window.localStorage.setItem('user', JSON.stringify(updated));
      } catch {
        // Sin almacenamiento: la sesión sigue en memoria.
      }
      return updated;
    });
  }, []);

  const value = useMemo(
    () => ({ user, profile, token, loading, login, register, logout, updateUser, refreshProfile }),
    [user, profile, token, loading, login, register, logout, updateUser, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
