const FavoritePlace = require('../models/FavoritePlace');

const LABELS = ['CASA', 'TRABAJO', 'OTRO'];
const MAX_FAVORITES = 20;

const isValidCoordinate = (value, min, max) =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

const sanitizeText = (value, maxLength) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength) return null;
  return trimmed;
};

const validatePayload = (body) => {
  const label = LABELS.includes(body.label) ? body.label : null;
  const nombre = sanitizeText(body.nombre, 120);
  const direccion = sanitizeText(body.direccion, 255);
  const lat = Number(body.lat);
  const lng = Number(body.lng);

  if (!label) return { error: 'La etiqueta debe ser CASA, TRABAJO u OTRO' };
  if (!nombre) return { error: 'El nombre es obligatorio (máximo 120 caracteres)' };
  if (!direccion) return { error: 'La dirección es obligatoria (máximo 255 caracteres)' };
  if (!isValidCoordinate(lat, -90, 90) || !isValidCoordinate(lng, -180, 180)) {
    return { error: 'Coordenadas inválidas' };
  }

  return { value: { label, nombre, direccion, lat, lng } };
};

exports.listFavorites = async (req, res) => {
  try {
    const favorites = await FavoritePlace.findAll({
      where: { userId: req.user.id },
      order: [['label', 'ASC'], ['createdAt', 'ASC']]
    });

    res.json({ favorites });
  } catch (error) {
    console.error('Error al listar favoritos:', error);
    res.status(500).json({ error: 'No se pudieron cargar los favoritos' });
  }
};

exports.createFavorite = async (req, res) => {
  try {
    const parsed = validatePayload(req.body || {});
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const { label, nombre, direccion, lat, lng } = parsed.value;

    const total = await FavoritePlace.count({ where: { userId: req.user.id } });
    if (total >= MAX_FAVORITES) {
      return res.status(400).json({ error: `Máximo ${MAX_FAVORITES} favoritos por usuario` });
    }

    if (label !== 'OTRO') {
      const existing = await FavoritePlace.findOne({
        where: { userId: req.user.id, label }
      });
      if (existing) {
        return res.status(409).json({ error: `Ya tienes un favorito marcado como ${label}` });
      }
    }

    const favorite = await FavoritePlace.create({
      userId: req.user.id,
      label,
      nombre,
      direccion,
      lat,
      lng
    });

    res.status(201).json({ favorite });
  } catch (error) {
    console.error('Error al crear favorito:', error);
    res.status(500).json({ error: 'No se pudo guardar el favorito' });
  }
};

exports.updateFavorite = async (req, res) => {
  try {
    const favorite = await FavoritePlace.findOne({
      where: { id: req.params.favoriteId, userId: req.user.id }
    });

    if (!favorite) {
      return res.status(404).json({ error: 'Favorito no encontrado' });
    }

    const parsed = validatePayload({ ...favorite.toJSON(), ...req.body });
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const { label } = parsed.value;

    if (label !== 'OTRO' && label !== favorite.label) {
      const existing = await FavoritePlace.findOne({
        where: { userId: req.user.id, label }
      });
      if (existing) {
        return res.status(409).json({ error: `Ya tienes un favorito marcado como ${label}` });
      }
    }

    await favorite.update(parsed.value);
    res.json({ favorite });
  } catch (error) {
    console.error('Error al actualizar favorito:', error);
    res.status(500).json({ error: 'No se pudo actualizar el favorito' });
  }
};

exports.deleteFavorite = async (req, res) => {
  try {
    const deleted = await FavoritePlace.destroy({
      where: { id: req.params.favoriteId, userId: req.user.id }
    });

    if (!deleted) {
      return res.status(404).json({ error: 'Favorito no encontrado' });
    }

    res.json({ message: 'Favorito eliminado' });
  } catch (error) {
    console.error('Error al eliminar favorito:', error);
    res.status(500).json({ error: 'No se pudo eliminar el favorito' });
  }
};
