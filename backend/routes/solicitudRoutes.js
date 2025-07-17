const express = require('express');
const router = express.Router();
const solicitudController = require('../controllers/solicitudController');
const { verificarToken } = require('../middleware/authMiddleware');

// Crear solicitud normal
router.post(
  '/',
  verificarToken,
  (req, res, next) => {
    if (req.usuario && req.usuario.rol_id) {
      req.body.rol_id = req.usuario.rol_id;
    }
    next();
  },
  solicitudController.crearSolicitud
);

// Crear solicitud con adeudo (solo alumnos)
router.post(
  '/con-adeudo',
  verificarToken,
  (req, res, next) => {
    if (req.usuario && req.usuario.rol_id !== 1) {
      return res.status(403).json({ error: 'Solo alumnos pueden crear solicitudes con adeudo' });
    }
    next();
  },
  solicitudController.crearSolicitudConAdeudo
);

// Obtener todas las solicitudes con token
router.get(
  '/',
  verificarToken,
  solicitudController.obtenerSolicitudes
);

// Aprobar solicitud
router.put('/aprobar/:id', verificarToken, solicitudController.aprobarSolicitud);

// Rechazar solicitud
router.put('/rechazar/:id', verificarToken, solicitudController.rechazarSolicitud);

module.exports = router;
