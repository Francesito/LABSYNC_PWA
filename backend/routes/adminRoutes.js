// routes/adminRoutes.js
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { sendEmail } = require('../utils/email');

const router = express.Router();

// Middleware local para verificar token
const verificarToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const [usuarios] = await pool.query(
      'SELECT id, nombre, correo_institucional, rol_id, activo FROM Usuario WHERE id = ?',
      [decoded.id]
    );

    if (usuarios.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }

    const usuario = usuarios[0];

    if (!usuario.activo) {
      return res.status(401).json({ error: 'Usuario inactivo' });
    }

    req.usuario = usuario;
    next();

  } catch (error) {
    console.error('Error en verificarToken:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Middleware local para verificar rol de administrador
const requireAdmin = (req, res, next) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (req.usuario.rol_id !== 4) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    next();
  } catch (error) {
    console.error('Error en requireAdmin:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Aplicar middlewares
router.use(verificarToken);
router.use(requireAdmin);

// Generar contraseña aleatoria
const generarContrasenaAleatoria = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Crear nuevo usuario
router.post('/crear-usuario', async (req, res) => {
  const { nombre, correo_institucional, rol_id, contrasena } = req.body;

  console.log('Datos recibidos:', { nombre, correo_institucional, rol_id, contrasena });

  // Validaciones
  if (!nombre || !correo_institucional || !rol_id) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  if (!correo_institucional.endsWith('@utsjr.edu.mx')) {
    return res.status(400).json({ error: 'Correo institucional inválido' });
  }

  // Solo permitir roles de docente, almacén y administrador
  if (![2, 3, 4].includes(parseInt(rol_id))) {
    return res.status(400).json({ error: 'Rol no válido' });
  }

  try {
    // Verificar si el usuario ya existe
    const [existingUser] = await pool.query(
      'SELECT * FROM Usuario WHERE correo_institucional = ?', 
      [correo_institucional]
    );
    
    if (existingUser.length > 0) {
      return res.status(400).json({ error: 'El correo ya está registrado' });
    }

    // Generar contraseña si no se proporciona
    const passwordToUse = contrasena || generarContrasenaAleatoria();
    const hash = await bcrypt.hash(passwordToUse, 10);

    console.log('Creando usuario con hash:', hash.substring(0, 20) + '...');

    // Crear usuario activo
    const [result] = await pool.query(
      'INSERT INTO Usuario (nombre, correo_institucional, contrasena, rol_id, activo) VALUES (?, ?, ?, ?, TRUE)',
      [nombre, correo_institucional, hash, parseInt(rol_id)]
    );

    console.log('Usuario creado con ID:', result.insertId);

    // Si es usuario de almacén, crear registro en tabla de permisos
    if (parseInt(rol_id) === 3) {
      try {
        await pool.query(
          'INSERT INTO PermisosAlmacen (usuario_id, acceso_chat, modificar_stock) VALUES (?, FALSE, FALSE)',
          [result.insertId]
        );
        console.log('Permisos de almacén creados');
      } catch (permissionError) {
        console.error('Error al crear permisos de almacén:', permissionError);
        // No fallar la creación del usuario por esto
      }
    }

    // Generar token para reset de contraseña
    const resetToken = jwt.sign(
      { correo_institucional }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    // Actualizar usuario con token de reset
    await pool.query(
      'UPDATE Usuario SET reset_token = ?, reset_token_expires = DATE_ADD(NOW(), INTERVAL 24 HOUR) WHERE id = ?',
      [resetToken, result.insertId]
    );

    // Enviar correo con enlace para establecer contraseña
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://labsync-frontend.onrender.com';
      const emailContent = `
        Hola ${nombre},
        
        Se ha creado una cuenta para ti en el sistema LabSync.
        
        Para establecer tu contraseña, haz clic en el siguiente enlace:
        ${frontendUrl}/reset-password/${resetToken}
        
        Este enlace expirará en 24 horas.
        
        Saludos,
        Equipo LabSync
      `;

      await sendEmail(
        correo_institucional,
        'Cuenta creada - Establece tu contraseña',
        emailContent
      );
      console.log('Correo enviado exitosamente');
    } catch (emailError) {
      console.error('Error al enviar correo:', emailError);
      // No fallar la creación del usuario por error de correo
    }

    res.status(201).json({ 
      mensaje: 'Usuario creado exitosamente. Se ha enviado un enlace para establecer la contraseña.',
      usuario_id: result.insertId
    });

  } catch (error) {
    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor: ' + error.message });
  }
});

// Obtener usuarios de almacén
router.get('/usuarios-almacen', async (req, res) => {
  try {
    const [usuarios] = await pool.query(`
      SELECT 
        u.id,
        u.nombre,
        u.correo_institucional,
        u.activo,
        COALESCE(p.acceso_chat, FALSE) as acceso_chat,
        COALESCE(p.modificar_stock, FALSE) as modificar_stock
      FROM Usuario u
      LEFT JOIN PermisosAlmacen p ON u.id = p.usuario_id
      WHERE u.rol_id = 3
      ORDER BY u.nombre ASC
    `);

    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Actualizar permisos de usuario
router.put('/actualizar-permisos', async (req, res) => {
  const { usuario_id, campo, valor } = req.body;

  if (!usuario_id || !campo || valor === undefined) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  // Validar campos permitidos
  const camposPermitidos = ['acceso_chat', 'modificar_stock'];
  if (!camposPermitidos.includes(campo)) {
    return res.status(400).json({ error: 'Campo no válido' });
  }

  try {
    // Verificar que el usuario existe y es de almacén
    const [usuario] = await pool.query(
      'SELECT * FROM Usuario WHERE id = ? AND rol_id = 3',
      [usuario_id]
    );

    if (usuario.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar si ya existe registro de permisos
    const [permisos] = await pool.query(
      'SELECT * FROM PermisosAlmacen WHERE usuario_id = ?',
      [usuario_id]
    );

    if (permisos.length === 0) {
      // Crear registro de permisos
      await pool.query(
        'INSERT INTO PermisosAlmacen (usuario_id, acceso_chat, modificar_stock) VALUES (?, ?, ?)',
        [usuario_id, campo === 'acceso_chat' ? valor : false, campo === 'modificar_stock' ? valor : false]
      );
    } else {
      // Actualizar permiso existente
      await pool.query(
        `UPDATE PermisosAlmacen SET ${campo} = ? WHERE usuario_id = ?`,
        [valor, usuario_id]
      );
    }

    res.json({ mensaje: 'Permisos actualizados correctamente' });

  } catch (error) {
    console.error('Error al actualizar permisos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Bloquear usuario
router.put('/bloquear-usuario', async (req, res) => {
  const { correo_institucional } = req.body;

  if (!correo_institucional) {
    return res.status(400).json({ error: 'Correo institucional requerido' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE Usuario SET activo = FALSE WHERE correo_institucional = ?',
      [correo_institucional]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ mensaje: 'Usuario bloqueado exitosamente' });

  } catch (error) {
    console.error('Error al bloquear usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Desbloquear usuario
router.put('/desbloquear-usuario', async (req, res) => {
  const { correo_institucional } = req.body;

  if (!correo_institucional) {
    return res.status(400).json({ error: 'Correo institucional requerido' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE Usuario SET activo = TRUE WHERE correo_institucional = ?',
      [correo_institucional]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ mensaje: 'Usuario desbloqueado exitosamente' });

  } catch (error) {
    console.error('Error al desbloquear usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Eliminar usuario
router.delete('/eliminar-usuario', async (req, res) => {
  const { correo_institucional } = req.body;

  if (!correo_institucional) {
    return res.status(400).json({ error: 'Correo institucional requerido' });
  }

  try {
    // Obtener el usuario
    const [usuario] = await pool.query(
      'SELECT id, rol_id FROM Usuario WHERE correo_institucional = ?',
      [correo_institucional]
    );

    if (usuario.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const usuarioId = usuario[0].id;

    // No permitir eliminar administradores (medida de seguridad)
    if (usuario[0].rol_id === 4) {
      return res.status(400).json({ error: 'No se puede eliminar un usuario administrador' });
    }

    // Eliminar permisos de almacén si existen
    await pool.query('DELETE FROM PermisosAlmacen WHERE usuario_id = ?', [usuarioId]);

    // Eliminar usuario
    await pool.query('DELETE FROM Usuario WHERE id = ?', [usuarioId]);

    res.json({ mensaje: 'Usuario eliminado exitosamente' });

  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener todos los usuarios (para estadísticas)
router.get('/usuarios', async (req, res) => {
  try {
    const [usuarios] = await pool.query(`
      SELECT 
        u.id,
        u.nombre,
        u.correo_institucional,
        u.activo,
        r.nombre as rol
      FROM Usuario u
      JOIN Rol r ON u.rol_id = r.id
      ORDER BY u.nombre ASC
    `);

    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Obtener estadísticas de usuarios
router.get('/estadisticas', async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        r.nombre as rol,
        COUNT(u.id) as total,
        SUM(CASE WHEN u.activo = TRUE THEN 1 ELSE 0 END) as activos,
        SUM(CASE WHEN u.activo = FALSE THEN 1 ELSE 0 END) as bloqueados
      FROM Rol r
      LEFT JOIN Usuario u ON r.id = u.rol_id
      GROUP BY r.id, r.nombre
      ORDER BY r.id
    `);

    res.json(stats);
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
