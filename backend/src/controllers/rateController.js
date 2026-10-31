const { getExchangeRate } = require('../services/exchangeRateService');

exports.current = async (req, res) => {
  try {
    const rate = await getExchangeRate();

    if (!rate) {
      return res.status(503).json({
        error: 'exchange_rate_unavailable',
        message: 'No hay tasa Bs/USD disponible'
      });
    }

    res.json({ rate });
  } catch (error) {
    console.error('Error al obtener tasa:', error);
    res.status(500).json({ error: 'No se pudo obtener la tasa' });
  }
};
