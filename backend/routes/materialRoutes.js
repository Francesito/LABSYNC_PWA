/**
 * ========================================
 * LabSync - Rutas de Material
 *
 * Versión actualizada
 * Incluye rutas separadas por rol
 * y soporte para tipos (liquido, solido, equipo, laboratorio)
 * con soporte de query param en get/:id
 *
 * Autor: ChatGPT Asistente
 * Fecha: 2025
 * ========================================
 */
const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
const { verificarToken, verificarRol } = require('../middleware/authMiddleware');

/**
 * ========================
 * RUTAS PÚBLICAS
 * ========================
 */
// Lista todos los materiales (las 4 subtablas unidas)
router.get('/', materialController.getMaterials);

// Obtener un material específico por ID y TIPO
// Ejemplo: GET /api/materials/123?tipo=liquido
router.get('/:id', materialController.getMaterialById);

// Rutas específicas para listar por tipo
router.get('/tipo/liquidos', materialController.getLiquidos);
router.get('/tipo/solidos', materialController.getSolidos);
router.get('/tipo/equipos', materialController.getEquipos);
router.get('/tipo/laboratorio', materialController.getLaboratorio);

/**
 * ========================
 * RUTAS PARA ALUMNOS (ROL 1) Y DOCENTES (ROL 2)
 * ========================
 */
// Crear solicitud agrupada (alumno o docente)
// El body debe incluir tipo en cada objeto de materiales
router.post(
  '/solicitudes',
  verificarToken,
  verificarRol([1, 2]),
  materialController.crearSolicitudes
);

// Crear solicitud con adeudo (solo alumno)
// Body también incluye tipo
router.post(
  '/solicitud-adeudo',
  verificarToken,
  verificarRol([1]),
  materialController.crearSolicitudConAdeudo
);

// Obtener solicitudes propias (alumno)
router.get(
  '/usuario/solicitudes',
  verificarToken,
  verificarRol([1]),
  materialController.getUserSolicitudes
);

// Cancelar solicitud pendiente (solo alumno)
router.post(
  '/solicitud/:id/cancelar',
  verificarToken,
  verificarRol([1]),
  materialController.cancelSolicitud
);

/**
 * ========================
 * RUTAS PARA DOCENTES (ROL 2)
 * ========================
 */
// Listar solicitudes pendientes
router.get(
  '/solicitudes/pendientes',
  verificarToken,
  verificarRol([2]),
  materialController.getPendingSolicitudes
);

// Obtener TODAS las solicitudes (para docente)
router.get(
  '/solicitudes/todas',
  verificarToken,
  verificarRol([2]),
  materialController.getAllSolicitudes
);

// Aprobar o rechazar solicitudes por ID
router.post(
  '/solicitud/:id/aprobar',
  verificarToken,
  verificarRol([2]),
  materialController.approveSolicitud
);

router.post(
  '/solicitud/:id/rechazar',
  verificarToken,
  verificarRol([2]),
  materialController.rejectSolicitud
);

/**
 * ========================
 * RUTAS PARA ALMACENISTAS (ROL 3)
 * ========================
 */
// Listar solicitudes aprobadas
router.get(
  '/solicitudes/aprobadas',
  verificarToken,
  verificarRol([3]),
  materialController.getApprovedSolicitudes
);

// Marcar como entregada o cancelar (almacenista puede cancelar también)
router.post(
  '/solicitud/:id/entregar',
  verificarToken,
  verificarRol([3]),
  materialController.deliverSolicitud
);

router.post(
  '/solicitud/:id/cancelar',
  verificarToken,
  verificarRol([1, 3]), // Tanto alumnos como almacenistas pueden cancelar
  materialController.cancelSolicitud
);

// Ajustar inventario (con tipo en body)
router.post(
  '/material/:id/ajustar',
  verificarToken,
  verificarRol([3]),
  materialController.adjustInventory
);

// Listar solicitudes entregadas (solo almacenistas)
router.get(
  '/solicitudes/entregadas',
  verificarToken,
  verificarRol([3]),
  materialController.getDeliveredSolicitudes
);

// Detalle de una solicitud entregada (almacenista)
router.get(
  '/solicitudes/:id',
  verificarToken,
  verificarRol([3]),
  materialController.getSolicitudDetalle
);

/**
 * ========================================
 * EXPORT
 * ========================================
 */
module.exports = router;
