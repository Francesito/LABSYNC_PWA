const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const verificarToken = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Acceso no autorizado. Token requerido.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Buscar el usuario en la base de datos para obtener su rol actualizado
    const [usuarios] = await pool.query(
      'SELECT id, rol_id, nombre FROM Usuario WHERE id = ?',
      [decoded.id]
    );

    if (!usuarios.length) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo.' });
    }

    // ✅ Aquí ya tenemos el usuario con su rol real
    req.usuario = usuarios[0];
    next();
  } catch (error) {
    console.error('Error al verificar token:', error);
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

const verificarRol = (rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol_id)) {
      return res.status(403).json({ error: 'Acceso prohibido para tu rol.' });
    }
    next();
  };
};

module.exports = { verificarToken, verificarRol };
