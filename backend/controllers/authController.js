const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendEmail } = require('../utils/email');

const registrarUsuario = async (req, res) => {
  const { nombre, correo_institucional, contrasena, rol } = req.body;

  if (!correo_institucional.endsWith('@utsjr.edu.mx')) {
    return res.status(400).json({ error: 'Correo institucional inválido' });
  }

  const rolesMap = {
    alumno: 1,
    docente: 2,
    almacen: 3,
  };

  const rol_id = rolesMap[rol?.toLowerCase()];
  if (!rol_id) {
    return res.status(400).json({ error: 'Rol inválido. Debe ser alumno, docente o almacen.' });
  }

  try {
    const [existingUser] = await pool.query('SELECT * FROM Usuario WHERE correo_institucional = ?', [correo_institucional]);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'Correo ya registrado' });
    }

    const hash = await bcrypt.hash(contrasena, 10);
    const token = jwt.sign({ correo_institucional }, process.env.JWT_SECRET, { expiresIn: '1h' });

    await pool.query(
      'INSERT INTO Usuario (nombre, correo_institucional, contrasena, rol_id, activo) VALUES (?, ?, ?, ?, FALSE)',
      [nombre, correo_institucional, hash, rol_id]
    );

    // ✅ URL del frontend en producción
    const frontendUrl = process.env.FRONTEND_URL || 'https://tu-frontend.onrender.com';
    await sendEmail(
      correo_institucional,
      'Verifica tu cuenta',
      `Haz clic aquí para verificar: ${frontendUrl}/verificar/${token}`
    );

    res.status(201).json({ mensaje: 'Usuario registrado. Verifica tu correo.' });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

const verificarCorreo = async (req, res) => {
  const { token } = req.params;

  try {
    const { correo_institucional } = jwt.verify(token, process.env.JWT_SECRET);
    const [result] = await pool.query('UPDATE Usuario SET activo = TRUE WHERE correo_institucional = ?', [correo_institucional]);
    if (result.affectedRows === 0) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }
    res.json({ mensaje: 'Correo verificado exitosamente' });
  } catch (error) {
    res.status(400).json({ error: 'Token inválido o expirado' });
  }
};

const iniciarSesion = async (req, res) => {
  const { correo_institucional, contrasena } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM Usuario WHERE correo_institucional = ?', [correo_institucional]);
    if (rows.length === 0 || !rows[0].activo) {
      return res.status(400).json({ error: 'Usuario no encontrado o no verificado' });
    }

    const usuario = rows[0];
    const esValido = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!esValido) {
      return res.status(400).json({ error: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nombre: usuario.nombre,
        correo_institucional: usuario.correo_institucional,
        rol_id: usuario.rol_id
      },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
};

const forgotPassword = async (req, res) => {
  const { correo_institucional } = req.body;

  try {
    const [rows] = await pool.query('SELECT * FROM Usuario WHERE correo_institucional = ?', [correo_institucional]);
    if (rows.length === 0) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }

    const token = jwt.sign({ correo_institucional }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // ✅ URL del frontend en producción
    const frontendUrl = process.env.FRONTEND_URL || 'https://tu-frontend.onrender.com';
    await sendEmail(
      correo_institucional,
      'Restablece tu contraseña',
      `Haz clic aquí para restablecer tu contraseña: ${frontendUrl}/reset-password/${token}`
    );

    res.json({ mensaje: 'Enlace de restablecimiento enviado a tu correo.' });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar la solicitud' });
  }
};

const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { contrasena } = req.body;

  if (!contrasena) {
    return res.status(400).json({ error: 'La nueva contraseña es requerida' });
  }

  try {
    const { correo_institucional } = jwt.verify(token, process.env.JWT_SECRET);
    const hash = await bcrypt.hash(contrasena, 10);
    const [result] = await pool.query('UPDATE Usuario SET contrasena = ? WHERE correo_institucional = ?', [hash, correo_institucional]);
    if (result.affectedRows === 0) {
      return res.status(400).json({ error: 'Usuario no encontrado' });
    }
    res.json({ mensaje: 'Contraseña restablecida exitosamente' });
  } catch (error) {
    res.status(400).json({ error: 'Token inválido o expirado' });
  }
};

module.exports = {
  registrarUsuario,
  verificarCorreo,
  iniciarSesion,
  forgotPassword,
  resetPassword
};
