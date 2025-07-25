const express = require('express');
const router = express.Router();
const solicitudController = require('../controllers/solicitudController');
const { verificarToken, verificarRol } = require('../middleware/authMiddleware');

// Crear solicitud normal (alumnos y docentes)
router.post(
  '/',
  verificarToken,
  verificarRol([1, 2]), // Solo alumnos y docentes
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
  verificarRol([1]), // Solo alumnos
  solicitudController.crearSolicitudConAdeudo
);

// Obtener solicitudes con token (filtradas por rol)
router.get(
  '/',
  verificarToken,
  solicitudController.obtenerSolicitudes
);

// Aprobar solicitud (solo docentes)
router.put(
  '/aprobar/:id', 
  verificarToken, 
  verificarRol([2]), // Solo docentes
  solicitudController.aprobarSolicitud
);

// Rechazar solicitud (solo docentes)
router.put(
  '/rechazar/:id', 
  verificarToken, 
  verificarRol([2]), // Solo docentes
  solicitudController.rechazarSolicitud
);

// Endpoint para limpieza manual de solicitudes viejas (solo administradores)
router.delete(
  '/limpiar-viejas',
  verificarToken,
  verificarRol([2, 3]), // Docentes y almacenistas
  solicitudController.eliminarSolicitudesViejasHandler
);

module.exports = router;
