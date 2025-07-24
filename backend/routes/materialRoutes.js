/**
 * ========================================
 * LabSync - Rutas de Material
 *
 * Versión actualizada
 * Incluye rutas separadas por rol
 * y soporte para tipos (liquido, solido, equipo)
 * con soporte de query param en get/:id
 * Con verificación de permisos de almacén
 *
 * Autor: ChatGPT Asistente
 * Fecha: 2025
 * ========================================
 */
const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
const { 
  verificarToken, 
  verificarRol, 
  verificarMultiplesRoles,
  verificarAccesoStock,
  verificarAccesoSolicitudes,
  verificarPermisosAlmacen
} = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

/**
 * ========================
 * RUTAS PÚBLICAS (para usuarios autenticados)
 * ========================
 */
// Lista todos los materiales (las 3 subtablas unidas)
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
// Crear solicitud agrupada (alumno, docente, o almacén sin permisos de stock)
// El body debe incluir tipo en cada objeto de materiales
router.post(
  '/solicitudes',
  verificarAccesoSolicitudes,
  materialController.crearSolicitudes
);

// Crear solicitud con adeudo (solo alumno)
// Body también incluye tipo
router.post(
  '/solicitud-adeudo',
  verificarRol([1]),
  materialController.crearSolicitudConAdeudo
);

// Obtener solicitudes propias (alumno, docente, almacén sin permisos de stock)
router.get(
  '/usuario/solicitudes',
  verificarAccesoSolicitudes,
  materialController.getUserSolicitudes
);

// Cancelar solicitud pendiente (solo alumno)
router.post(
  '/solicitud/:id/cancelar',
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
  verificarRol([2]),
  materialController.getPendingSolicitudes
);

// Obtener TODAS las solicitudes (para docente)
router.get(
  '/solicitudes/todas',
  verificarRol([2]),
  materialController.getAllSolicitudes
);

// Aprobar o rechazar solicitudes por ID
router.post(
  '/solicitud/:id/aprobar',
  verificarRol([2]),
  materialController.approveSolicitud
);

router.post(
  '/solicitud/:id/rechazar',
  verificarRol([2]),
  materialController.rejectSolicitud
);

/**
 * ========================
 * RUTAS PARA ALMACENISTAS (ROL 3) - CON VERIFICACIÓN DE PERMISOS
 * ========================
 */
// Listar solicitudes aprobadas (solo almacenistas)
router.get(
  '/solicitudes/aprobadas',
  verificarRol([3]),
  materialController.getApprovedSolicitudes
);

// Marcar como entregada (solo almacenistas)
router.post(
  '/solicitud/:id/entregar',
  verificarRol([3]),
  materialController.deliverSolicitud
);

// Cancelar solicitud (solo almacenistas)
router.post(
  '/solicitud/:id/cancelar',
  verificarRol([3]),
  materialController.cancelSolicitud
);

// Ajustar inventario (con tipo en body) - SOLO ALMACENISTAS CON PERMISOS DE STOCK
router.post(
  '/material/:id/ajustar',
  verificarRol([3, 4]), // Almacén y Admin
  verificarPermisosAlmacen('stock'), // Verificar permisos específicos para almacén
  materialController.adjustInventory
);

// Listar solicitudes entregadas (solo almacenistas)
router.get(
  '/solicitudes/entregadas',
  verificarRol([3]),
  materialController.getDeliveredSolicitudes
);

// Detalle de una solicitud entregada (almacenista)
router.get(
  '/solicitudes/:id',
  verificarRol([3]),
  materialController.getSolicitudDetalle
);

/**
 * ========================
 * RUTAS ADICIONALES PARA ADMINISTRADORES (ROL 4)
 * ========================
 */
// Ajustar inventario (administradores siempre pueden)
router.post(
  '/material/:id/ajustar-admin',
  verificarRol([4]),
  materialController.adjustInventory
);

// Ver todas las solicitudes (administradores)
router.get(
  '/solicitudes/admin/todas',
  verificarRol([4]),
  materialController.getAllSolicitudes
);

// Estadísticas de materiales (solo admin)
router.get(
  '/estadisticas',
  verificarRol([4]),
  materialController.getEstadisticas || materialController.getMaterials // fallback si no existe
);

// Historial de movimientos (solo admin)
router.get(
  '/historial',
  verificarRol([4]),
  materialController.getHistorialMovimientos || materialController.getMaterials // fallback si no existe
);

/**
 * ========================
 * RUTAS ESPECIALES COMBINADAS
 * ========================
 */
// Ruta que pueden usar tanto almacenistas con permisos como administradores
router.post(
  '/stock/ajuste-masivo',
  verificarAccesoStock,
  materialController.ajusteMasivoStock || materialController.adjustInventory // fallback
);

// Ruta para obtener materiales con stock bajo (almacén con permisos y admin)
router.get(
  '/stock-bajo',
  verificarAccesoStock,
  materialController.getMaterialesStockBajo || materialController.getMaterials // fallback
);

/**
 * ========================================
 * EXPORT
 * ========================================
 */
module.exports = router;
