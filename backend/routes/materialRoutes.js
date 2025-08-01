/**
 * ========================================
 * LabSync - Rutas de Material
 *
 * Versión actualizada con control de permisos de stock
 * Incluye rutas separadas por rol
 * y soporte para tipos (liquido, solido, equipo, laboratorio)
 * con soporte de query param en get/:id
 *
 * Autor: Sistema LabSync
 * Fecha: 2025
 * ========================================
 */
const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
console.log('materialController.crearSolicitudes:', materialController.crearSolicitudes);
console.log('materialController.crearSolicitudConAdeudo:', materialController.crearSolicitudConAdeudo);
console.log('materialController.approveSolicitud:', materialController.approveSolicitud);
console.log('materialController.rejectSolicitud:', materialController.rejectSolicitud);
console.log('materialController.deliverSolicitud:', materialController.deliverSolicitud);
console.log('materialController.adjustInventory:', materialController.adjustInventory);
console.log('materialController.cancelSolicitud:', materialController.cancelSolicitud);
console.log('materialController.crearMaterial:', materialController.crearMaterial);
console.log('materialController.registrarEntradaStock:', materialController.registrarEntradaStock);
console.log('materialController.registrarSalidaStock:', materialController.registrarSalidaStock);
console.log('materialController.resetearTodoElStock:', materialController.resetearTodoElStock);
console.log('materialController.getUsuariosConPermisos:', materialController.getUsuariosConPermisos);
console.log('materialController.getEstadisticasCompletas:', materialController.getEstadisticasCompletas);
const { 
  verificarToken, 
  verificarRol, 
  verificarAccesoStock,
  requireAdmin 
} = require('../middleware/authMiddleware');

/**
 * ========================
 * RUTAS PÚBLICAS (SOLO LECTURA)
 * ========================
 */
// Lista todos los materiales (las 4 subtablas unidas) - LECTURA
router.get('/', verificarToken, materialController.getMaterials);

// ✅ NUEVA RUTA: Obtener docentes para selección en solicitudes
router.get('/docentes', verificarToken, materialController.obtenerDocentesParaSolicitud);

// Obtener un material específico por ID y TIPO - LECTURA
// Ejemplo: GET /api/materials/123?tipo=liquido
router.get('/:id', verificarToken, materialController.getMaterialById);


// Rutas específicas para listar por tipo - LECTURA
router.get('/tipo/liquidos', verificarToken, materialController.getLiquidos);
router.get('/tipo/solidos', verificarToken, materialController.getSolidos);
router.get('/tipo/equipos', verificarToken, materialController.getEquipos);
router.get('/tipo/laboratorio', verificarToken, materialController.getLaboratorio);

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
 * RUTAS PARA ALMACENISTAS (ROL 3) - CON CONTROL DE PERMISOS DE STOCK
 * ========================
 */
// Listar solicitudes aprobadas (solo lectura, sin permisos especiales)
router.get(
  '/solicitudes/aprobadas',
  verificarToken,
  verificarRol([3]),
  materialController.getApprovedSolicitudes
);

// ✅ RUTAS QUE REQUIEREN PERMISOS DE STOCK

// Marcar como entregada (requiere permisos de stock)
router.post(
  '/solicitud/:id/entregar',
  verificarToken,
  verificarAccesoStock, // Verificar permisos de stock
  materialController.deliverSolicitud
);

// Cancelar solicitud (almacenista requiere permisos de stock)
router.post(
  '/solicitud/:id/cancelar',
  verificarToken,
  (req, res, next) => {
    if (req.usuario.rol_id === 1) {
      return verificarRol([1])(req, res, next); // Verifica rol de alumno
    }
    if (req.usuario.rol_id === 3) {
      return verificarAccesoStock(req, res, next); // Usa el array completo
    }
    return res.status(403).json({ error: 'No tienes permisos para cancelar solicitudes' });
  },
  materialController.cancelSolicitud
);

// Ajustar inventario (requiere permisos de stock)
router.post(
  '/material/:id/ajustar',
  verificarToken,
  verificarAccesoStock, // Verificar permisos de stock
  materialController.adjustInventory
);

// ✅ NUEVAS RUTAS PARA GESTIÓN DE STOCK

// Crear nuevo material (requiere permisos de stock)
router.post(
  '/crear',
  verificarToken,
  verificarAccesoStock,
  materialController.crearMaterial
);

// Actualizar material existente (requiere permisos de stock)
router.put(
  '/:id/actualizar',
  verificarToken,
  verificarAccesoStock,
  materialController.actualizarMaterial
);

// Eliminar material (requiere permisos de stock)
router.delete(
  '/:id/eliminar',
  verificarToken,
  verificarAccesoStock,
  materialController.eliminarMaterial
);

// Actualizar stock específico de un material (requiere permisos de stock)
router.patch(
  '/:id/stock',
  verificarToken,
  verificarAccesoStock,
  materialController.actualizarStock
);

// Registrar entrada de stock (requiere permisos de stock)
router.post(
  '/:id/entrada',
  verificarToken,
  verificarAccesoStock,
  materialController.registrarEntradaStock
);

// Registrar salida de stock (requiere permisos de stock)
router.post(
  '/:id/salida',
  verificarToken,
  verificarAccesoStock,
  materialController.registrarSalidaStock
);

/**
 * ========================
 * RUTAS DE CONSULTA PARA ALMACENISTAS (SIN PERMISOS ESPECIALES)
 * ========================
 */
// Listar solicitudes entregadas (solo almacenistas - lectura)
router.get(
  '/solicitudes/entregadas',
  verificarToken,
  verificarRol([3]),
  materialController.getDeliveredSolicitudes
);

// Detalle de una solicitud entregada (almacenista - lectura)
router.get(
  '/solicitudes/:id',
  verificarToken,
  verificarRol([3]),
  materialController.getSolicitudDetalle
);

// Obtener historial de movimientos de stock (almacenista - lectura)
router.get(
  '/historial-movimientos',
  verificarToken,
  verificarRol([3, 4]),
  materialController.getHistorialMovimientos
);

// Obtener materiales con stock bajo (almacenista - lectura)
router.get(
  '/stock-bajo',
  verificarToken,
  verificarRol([3, 4]),
  materialController.getMaterialesStockBajo
);

/**
 * ========================
 * RUTAS SOLO PARA ADMINISTRADORES (ROL 4)
 * ========================
 */
// Crear categorías de materiales (solo admin)
router.post(
  '/categorias',
  verificarToken,
  requireAdmin,
  materialController.crearCategoria
);

// Actualizar categorías (solo admin)
router.put(
  '/categorias/:id',
  verificarToken,
  requireAdmin,
  materialController.actualizarCategoria
);

// Eliminar categorías (solo admin)
router.delete(
  '/categorias/:id',
  verificarToken,
  requireAdmin,
  materialController.eliminarCategoria
);

// Obtener estadísticas completas (solo admin)
router.get(
  '/estadisticas/completas',
  verificarToken,
  requireAdmin,
  materialController.getEstadisticasCompletas
);

// Obtener todos los usuarios con sus permisos (solo admin)
router.get(
  '/usuarios-permisos',
  verificarToken,
  requireAdmin,
  materialController.getUsuariosConPermisos
);

// Resetear stock de todos los materiales (solo admin - emergencia)
router.post(
  '/resetear-stock',
  verificarToken,
  requireAdmin,
  materialController.resetearTodoElStock
);

/**
 * ========================
 * RUTAS DE REPORTES Y ESTADÍSTICAS
 * ========================
 */
// Reporte de uso de materiales por período (docentes y admin)
router.get(
  '/reportes/uso-periodo',
  verificarToken,
  verificarRol([2, 4]),
  materialController.getReporteUsoPeriodo
);

// Reporte de materiales más solicitados (docentes y admin)
router.get(
  '/reportes/mas-solicitados',
  verificarToken,
  verificarRol([2, 4]),
  materialController.getReporteMasSolicitados
);

// Reporte de eficiencia de entrega (almacén y admin)
router.get(
  '/reportes/eficiencia-entrega',
  verificarToken,
  verificarRol([3, 4]),
  materialController.getReporteEficienciaEntrega
);

/**
 * ========================
 * RUTAS DE VALIDACIÓN Y SALUD
 * ========================
 */
// Verificar integridad de datos (admin)
router.get(
  '/validar-integridad',
  verificarToken,
  requireAdmin,
  materialController.validarIntegridadDatos
);

// Obtener estado del sistema de materiales (admin)
router.get(
  '/estado-sistema',
  verificarToken,
  requireAdmin,
  materialController.getEstadoSistema
);

/**
 * ========================================
 * EXPORT
 * ========================================
 */
module.exports = router;
