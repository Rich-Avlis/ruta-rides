/**
 * Elimina acentos, ñ y caracteres especiales de nombres y apellidos
 * @param {string} name - Nombre a limpiar
 * @returns {string} - Nombre sin acentos ni caracteres especiales
 */
function sanitizeName(name) {
  if (!name) return '';
  
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Eliminar acentos
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N")
    .replace(/[^a-zA-Z\s]/g, "") // Solo letras y espacios
    .trim()
    .toUpperCase();
}

/**
 * Valida que un nombre solo contenga letras y espacios
 * @param {string} name - Nombre a validar
 * @returns {boolean} - true si es válido
 */
function isValidName(name) {
  const regex = /^[a-zA-Z\s]+$/;
  return regex.test(name);
}

module.exports = { sanitizeName, isValidName };