const jwt = require('jsonwebtoken');
const pool = require('../config/db');

// Middleware para verificar el token JWT
const verificarToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }

    const token = authHeader.substring(7); // Remover 'Bearer '

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Verificar que el usuario aún existe y está activo
    const [userRows] = await pool.query(
      'SELECT * FROM Usuario WHERE id = ? AND activo = TRUE',
      [decoded.id]
    );

    if (userRows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
    }

    const usuario = userRows[0];

    // Si es usuario de almacén, obtener permisos actuales de la base de datos
    if (usuario.rol_id === 3) {
      const [permisosRows] = await pool.query(
        'SELECT acceso_chat, modificar_stock FROM PermisosAlmacen WHERE usuario_id = ?',
        [usuario.id]
      );
      
      if (permisosRows.length > 0) {
        usuario.permisos = {
          acceso_chat: Boolean(permisosRows[0].acceso_chat),
          modificar_stock: Boolean(permisosRows[0].modificar_stock)
        };
      } else {
        usuario.permisos = {
          acceso_chat: false,
          modificar_stock: false
        };
      }
    }

    req.usuario = usuario;
    next();
  } catch (error) {
    console.error('Error en verificarToken:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Middleware para verificar roles específicos
const verificarRol = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol_id)) {
      return res.status(403).json({ error: 'Acceso denegado: rol insuficiente' });
    }

    next();
  };
};

// Middleware para verificar múltiples roles
const verificarMultiplesRoles = (...rolesPermitidos) => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol_id)) {
      return res.status(403).json({ error: 'Acceso denegado: rol insuficiente' });
    }

    next();
  };
};

// Middleware específico para administradores (requerido por adminRoutes.js)
const requireAdmin = (req, res, next) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Verificar que el rol sea administrador (rol_id = 4)
    if (req.usuario.rol_id !== 4) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    next();
  } catch (error) {
    console.error('Error en requireAdmin:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Middleware específico para docentes
const requireDocente = (req, res, next) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (req.usuario.rol_id !== 2) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de docente.' });
    }

    next();
  } catch (error) {
    console.error('Error en requireDocente:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Middleware específico para almacén
const requireAlmacen = (req, res, next) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    if (req.usuario.rol_id !== 3) {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de almacén.' });
    }

    next();
  } catch (error) {
    console.error('Error en requireAlmacen:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Middleware específico para verificar permisos de almacén
const verificarPermisosAlmacen = (tipoPermiso) => {
  return async (req, res, next) => {
    try {
      if (!req.usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      const usuario = req.usuario;

      // Si no es usuario de almacén, permitir acceso (otros roles se manejan en verificarMultiplesRoles)
      if (usuario.rol_id !== 3) {
        return next();
      }

      // Si es usuario de almacén, verificar permisos específicos
      const [permisosRows] = await pool.query(
        'SELECT acceso_chat, modificar_stock FROM PermisosAlmacen WHERE usuario_id = ?',
        [usuario.id]
      );

      if (permisosRows.length === 0) {
        return res.status(403).json({ error: 'Usuario de almacén sin permisos configurados' });
      }

      const permisos = permisosRows[0];

      // Verificar el permiso específico solicitado
      if (tipoPermiso === 'chat' && !permisos.acceso_chat) {
        return res.status(403).json({ error: 'Acceso denegado: sin permisos de chat' });
      }

      if (tipoPermiso === 'stock' && !permisos.modificar_stock) {
        return res.status(403).json({ error: 'Acceso denegado: sin permisos de modificación de stock' });
      }

      // Actualizar los permisos en req.usuario para uso posterior
      req.usuario.permisos = {
        acceso_chat: Boolean(permisos.acceso_chat),
        modificar_stock: Boolean(permisos.modificar_stock)
      };

      next();
    } catch (error) {
      console.error('Error en verificarPermisosAlmacen:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
};

// Middleware combinado para verificar acceso a funciones de stock
const verificarAccesoStock = [
  verificarMultiplesRoles(3, 4), // Solo almacén y administrador
  verificarPermisosAlmacen('stock') // Verificar permisos específicos para almacén
];

// Middleware combinado para verificar acceso al chat
const verificarAccesoChat = [
  verificarMultiplesRoles(1, 3, 4), // Alumno, almacén y administrador
  verificarPermisosAlmacen('chat') // Verificar permisos específicos para almacén
];

// Middleware para verificar si puede hacer solicitudes
const verificarAccesoSolicitudes = (req, res, next) => {
  if (!req.usuario) {
    return res.status(401).json({ error: 'Usuario no autenticado' });
  }

  const usuario = req.usuario;

  // Administradores no pueden hacer solicitudes
  if (usuario.rol_id === 4) {
    return res.status(403).json({ error: 'Los administradores no pueden realizar solicitudes' });
  }

  // Alumnos y docentes siempre pueden hacer solicitudes
  if (usuario.rol_id === 1 || usuario.rol_id === 2) {
    return next();
  }

  // Para usuarios de almacén, solo pueden hacer solicitudes si NO tienen permisos de modificar stock
  if (usuario.rol_id === 3) {
    if (usuario.permisos && usuario.permisos.modificar_stock) {
      return res.status(403).json({ error: 'Los usuarios de almacén con permisos de stock no pueden realizar solicitudes' });
    }
    return next();
  }

  return res.status(403).json({ error: 'Acceso denegado' });
};

// Middleware para verificar permisos de stock (almacén con permisos o admin)
const requireStockPermission = (req, res, next) => {
  try {
    if (!req.usuario) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const { rol_id, permisos } = req.usuario;

    // Administradores siempre tienen acceso
    if (rol_id === 4) {
      return next();
    }

    // Usuarios de almacén con permisos específicos
    if (rol_id === 3 && permisos && permisos.modificar_stock) {
      return next();
    }

    return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos para modificar stock.' });

  } catch (error) {
    console.error('Error en requireStockPermission:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

// Middleware flexible para múltiples roles
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    try {
      if (!req.usuario) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
      }

      if (!allowedRoles.includes(req.usuario.rol_id)) {
        return res.status(403).json({ error: 'Acceso denegado. Rol insuficiente.' });
      }

      next();
    } catch (error) {
      console.error('Error en requireRole:', error);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
};

module.exports = {
  verificarToken,
  verificarRol,
  verificarMultiplesRoles,
  verificarPermisosAlmacen,
  verificarAccesoStock,
  verificarAccesoChat,
  verificarAccesoSolicitudes,
  // Nuevas funciones agregadas para compatibilidad
  requireAdmin,
  requireDocente,
  requireAlmacen,
  requireStockPermission,
  requireRole
};
