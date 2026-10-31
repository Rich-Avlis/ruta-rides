const SystemConfig = require('../models/SystemConfig');

const SOURCE_URL =
  process.env.EXCHANGE_RATE_URL || 'https://ve.dolarapi.com/v1/dolares/oficial';
const TIMEOUT_MS = Number(process.env.EXCHANGE_RATE_TIMEOUT_MS || 8000);
const CACHE_TTL_MS = 30 * 60 * 1000;

let cache = { value: null, expiresAt: 0 };

/**
 * Tasa Bs/USD. Prioridad:
 * 1. TASA_CAMBIO_BS configurada manualmente (> 0).
 * 2. Fuente oficial consultada y cacheada 30 min.
 * 3. Último valor cacheado si la fuente falla.
 * Devuelve null si no hay tasa disponible; nunca inventa una.
 */
const getExchangeRate = async () => {
  try {
    const config = await SystemConfig.findOne({ where: { clave: 'TASA_CAMBIO_BS' } });
    const manual = Number(config?.valor);

    if (Number.isFinite(manual) && manual > 0) {
      return { rate: manual, source: 'config', updatedAt: null };
    }
  } catch {
    // Sin configuración: se intenta la fuente oficial.
  }

  if (cache.value && Date.now() < cache.expiresAt) {
    return cache.value;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(SOURCE_URL, {
      signal: controller.signal,
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`exchange_rate_${response.status}`);
    }

    const body = await response.json();
    const rate = Number(body.promedio ?? body.price ?? body.rate);

    if (!Number.isFinite(rate) || rate <= 0) {
      throw new Error('exchange_rate_invalid');
    }

    const value = {
      rate,
      source: 'dolarapi',
      updatedAt: body.fechaActualizacion || new Date().toISOString()
    };

    cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
    return value;
  } catch {
    return cache.value;
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { getExchangeRate };
