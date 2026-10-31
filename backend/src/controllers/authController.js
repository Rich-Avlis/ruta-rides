const jwt = require('jsonwebtoken');
const User = require('../models/User');
const sequelize = require('../config/database');
const PassengerProfile = require('../models/PassengerProfile');
const DriverProfile = require('../models/DriverProfile');
const { sanitizeName } = require('../utils/sanitize');
const { v4: uuidv4 } = require('uuid');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

exports.register = async (req, res) => {
  try {
    const { nombre, apellido, telefono, email, password } = req.body;

    // Sanitizar nombres (sin acentos)
    const nombreLimpio = sanitizeName(nombre);
    const apellidoLimpio = sanitizeName(apellido);

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    const existingPhone = await User.findOne({
      where: { telefono }
    });

    if (existingPhone) {
      return res.status(400).json({ error: 'El número telefónico ya está registrado' });
    }

    // El registro público solo crea pasajeros. El rol nunca se toma del cliente.
    const user = await sequelize.transaction(async (transaction) => {
      const created = await User.create(
        {
          nombre: nombreLimpio,
          apellido: apellidoLimpio,
          telefono,
          email,
          password,
          rol: 'PASSENGER'
        },
        { transaction }
      );

      await PassengerProfile.create(
        {
          userId: created.id,
          telefono: created.telefono,
          codigoReferido: uuidv4().substring(0, 8).toUpperCase()
        },
        { transaction }
      );

      return created;
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user,
      token
    });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

exports.registerDriver = async (req, res) => {
  try {
    const { 
      nombre, apellido, telefono, email, password,
      tipoVehiculo, marcaVehiculo, modeloVehiculo, colorVehiculo, placaVehiculo
    } = req.body;

    // Sanitizar nombres (sin acentos)
    const nombreLimpio = sanitizeName(nombre);
    const apellidoLimpio = sanitizeName(apellido);

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ error: 'El correo electrónico ya está registrado' });
    }

    const existingPhone = await User.findOne({
      where: { telefono }
    });

    if (existingPhone) {
      return res.status(400).json({ error: 'El número telefónico ya está registrado' });
    }

    // Verificar placa del vehículo
    const existingPlate = await DriverProfile.findOne({
      where: { placaVehiculo }
    });

    if (existingPlate) {
      return res.status(400).json({ error: 'La placa del vehículo ya está registrada' });
    }

    // Crear usuario y perfil de conductor en una sola transacción.
    const user = await sequelize.transaction(async (transaction) => {
      const created = await User.create(
        {
          nombre: nombreLimpio,
          apellido: apellidoLimpio,
          telefono,
          email,
          password,
          rol: 'DRIVER'
        },
        { transaction }
      );

      await DriverProfile.create(
        {
          userId: created.id,
          tipoVehiculo,
          marcaVehiculo,
          modeloVehiculo,
          colorVehiculo,
          placaVehiculo
        },
        { transaction }
      );

      return created;
    });

    const token = generateToken(user.id);

    res.status(201).json({
      message: 'Conductor registrado exitosamente',
      user,
      token
    });
  } catch (error) {
    console.error('Error en registro de conductor:', error);
    res.status(500).json({ error: 'Error al registrar conductor' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Correo electrónico y contraseña son requeridos' });
    }

    const user = await User.findOne({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!user.activo) {
      return res.status(401).json({ error: 'Cuenta desactivada' });
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generateToken(user.id);

    res.json({
      message: 'Inicio de sesión exitoso',
      user,
      token
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

exports.getProfile = async (req, res) => {
  try {
    const user = req.user;

    let profile = null;

    if (user.rol === 'PASSENGER') {
      profile = await PassengerProfile.findOne({
        where: { userId: user.id }
      });
    } else if (user.rol === 'DRIVER') {
      profile = await DriverProfile.findOne({
        where: { userId: user.id }
      });
    }

    res.json({
      user,
      profile
    });
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
};

// El perfil solo acepta campos editables por el propio usuario. Rol, estado,
// verificación y contraseña se cambian por flujos administrativos específicos.
const EDITABLE_PROFILE_FIELDS = ['nombre', 'apellido', 'telefono', 'foto'];

exports.updateProfile = async (req, res) => {
  try {
    const user = req.user;
    const updates = {};

    for (const field of EDITABLE_PROFILE_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar' });
    }

    // Sanitizar nombres si se actualizan
    if (updates.nombre) {
      updates.nombre = sanitizeName(updates.nombre);
    }
    if (updates.apellido) {
      updates.apellido = sanitizeName(updates.apellido);
    }

    await user.update(updates);

    res.json({
      message: 'Perfil actualizado exitosamente',
      user
    });
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};