import axios from 'axios';

interface ApiErrorBody {
  error?: string;
  message?: string;
  errors?: Array<{ msg?: string }>;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data;
    if (body?.message) return body.message;
    if (body?.error) return body.error;
    if (body?.errors?.[0]?.msg) return body.errors[0].msg;
    if (error.code === 'ECONNABORTED') return 'La solicitud tardó demasiado. Intenta de nuevo.';
    if (!error.response && error.request) {
      return 'No se pudo conectar con el servidor. Verifica tu conexión.';
    }
  }
  return fallback;
}
