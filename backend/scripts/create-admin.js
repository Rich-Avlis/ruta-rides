require('dotenv').config();

const sequelize = require('../src/config/database');
const User = require('../src/models/User');

const run = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const phone = process.env.ADMIN_PHONE || '+584000000000';

  if (!email || !password) {
    console.log('ℹ️  ADMIN_EMAIL/ADMIN_PASSWORD no configurados. Se omite creación de admin.');
    await sequelize.close();
    return;
  }

  await sequelize.sync({ force: false });

  const existing = await User.findOne({ where: { email } });

  if (existing) {
    console.log(`ℹ️  Admin ya existe: ${email}`);
    await sequelize.close();
    return;
  }

  await User.create({
    nombre: 'ADMIN',
    apellido: 'RUTA RIDES',
    telefono: phone,
    email,
    password,
    rol: 'ADMIN',
    activo: true,
    verificado: true
  });

  console.log(`✅ Admin creado: ${email}`);
  await sequelize.close();
};

run().catch(async (error) => {
  console.error('Error creando admin:', error.message);
  await sequelize.close();
  process.exit(1);
});
