const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

const getAllowedOrigins = () => {
  return (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

/**
 * Sin CORS_ORIGINS el backend refleja el origen de la petición. En producción
 * hay que declarar la lista exacta (por ejemplo, el dominio de Vercel).
 */
const corsOptions = () => {
  const origins = getAllowedOrigins();

  return {
    origin: origins.length > 0 ? origins : true,
    methods: DEFAULT_METHODS,
    credentials: true
  };
};

module.exports = { getAllowedOrigins, corsOptions };
