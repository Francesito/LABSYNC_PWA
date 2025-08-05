//frontend/controllers/materialController.js

const pool = require('../config/db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * ========================================
 * UTILS
 * ========================================
 */

/** Log helper con timestamp */
function logRequest(name) {
  const timestamp = new Date().toISOString(); // Ejemplo: 2025-07-24T20:20:00.000Z
  console.log(`[${timestamp}] [MaterialController] >> ${name}`);
}

/** Detectar tabla y campo de stock según tipo de material */
function detectTableAndField(tipo) {
  switch (tipo) {
    case 'liquido': return { table: 'MaterialLiquido', field: 'cantidad_disponible_ml' };
    case 'solido': return { table: 'MaterialSolido', field: 'cantidad_disponible_g' };
    case 'equipo': return { table: 'MaterialEquipo', field: 'cantidad_disponible_u' };
    case 'laboratorio': return { table: 'MaterialLaboratorio', field: 'cantidad_disponible' };
    default: return null;
  }
}

/** Genera un folio alfanumérico de 4 caracteres */
function generarFolio() {
  return crypto.randomBytes(2).toString('hex').toUpperCase();
}

/**
 * ========================================
 * CONSULTA TEMPLATE JOIN para nombre_material
 * ========================================
 * 
 * Usado en getUserSolicitudes, getApprovedSolicitudes, getPendingSolicitudes
 * 
 * Explicación:
 * - Usa LEFT JOIN con COALESCE para resolver nombre del material de subtablas.
 * - Filtra dinámicamente por condición reemplazada en runtime.
 * 
 */

const SELECT_SOLICITUDES_CON_NOMBRE = `
  SELECT 
    s.id            AS solicitud_id,
    s.usuario_id,
    s.fecha_solicitud,
    s.estado,
    s.nombre_alumno,
    s.profesor,
    s.folio,
    si.id           AS item_id,
    si.material_id,
    si.tipo,
    si.cantidad,
    COALESCE(ml.nombre, ms.nombre, me.nombre, mlab.nombre) AS nombre_material,
    g.nombre        AS grupo_nombre
  FROM Solicitud s
  JOIN SolicitudItem si ON s.id = si.solicitud_id
  LEFT JOIN MaterialLiquido ml ON si.tipo = 'liquido' AND si.material_id = ml.id
  LEFT JOIN MaterialSolido  ms ON si.tipo = 'solido'  AND si.material_id = ms.id
  LEFT JOIN MaterialEquipo me ON si.tipo = 'equipo'  AND si.material_id = me.id
  LEFT JOIN MaterialLaboratorio mlab ON si.tipo = 'laboratorio' AND si.material_id = mlab.id
  LEFT JOIN Grupo g ON s.grupo_id = g.id
  WHERE 1=1
  /*AND_CONDITION*/
`;

/**
 * ========================================
 * RUTAS DE CATALOGO: GET por tipo
 * ========================================
 */

/** Obtener líquidos */
const getLiquidos = async (req, res) => {
  logRequest('getLiquidos');
  try {
    const [rows] = await pool.query('SELECT id, nombre, cantidad_disponible_ml, riesgos_fisicos, riesgos_salud, riesgos_ambientales FROM MaterialLiquido');
    res.json(rows);
  } catch (error) {
    console.error('[Error] getLiquidos:', error);
    res.status(500).json({ error: 'Error al obtener materiales líquidos: ' + error.message });
  }
};

/** Obtener sólidos */
const getSolidos = async (req, res) => {
  logRequest('getSolidos');
  try {
    const [rows] = await pool.query('SELECT id, nombre, cantidad_disponible_g, riesgos_fisicos, riesgos_salud, riesgos_ambientales FROM MaterialSolido');
    res.json(rows);
  } catch (error) {
    console.error('[Error] getSolidos:', error);
    res.status(500).json({ error: 'Error al obtener materiales sólidos: ' + error.message });
  }
};

/** Obtener equipos */
const getEquipos = async (req, res) => {
  logRequest('getEquipos');
  try {
    const [rows] = await pool.query('SELECT id, nombre, cantidad_disponible_u FROM MaterialEquipo');
    res.json(rows);
  } catch (error) {
    console.error('[Error] getEquipos:', error);
    res.status(500).json({ error: 'Error al obtener equipos: ' + error.message });
  }
};

// ✅ NUEVA FUNCIÓN: Obtener docentes disponibles para solicitudes
const obtenerDocentesParaSolicitud = async (req, res) => {
  logRequest('obtenerDocentesParaSolicitud');
  try {
    const [rows] = await pool.query(`
      SELECT id, nombre, correo_institucional 
      FROM Usuario 
      WHERE rol_id = 2 AND activo = TRUE 
      ORDER BY nombre
    `);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener docentes:', error);
    res.status(500).json({ error: 'Error al obtener docentes' });
  }
};

/** Obtener materiales de laboratorio */
const getLaboratorio = async (req, res) => {
  logRequest('getLaboratorio');
  try {
    const [rows] = await pool.query('SELECT id, nombre, cantidad_disponible FROM MaterialLaboratorio');
    res.json(rows);
  } catch (error) {
    console.error('[Error] getLaboratorio:', error);
    res.status(500).json({ error: 'Error al obtener materiales de laboratorio: ' + error.message });
  }
};

/**
 * ========================================
 * CREAR SOLICITUDES (AGRUPADAS)
 * ========================================
 * 
 * Permite que alumnos y docentes creen solicitudes
 * - Docentes pueden aprobar automáticamente
 * - Alumnos deben esperar aprobación
 * 
 * Guarda en tabla Solicitud con:
 * - usuario_id, material_id, tipo
 * - cantidad, motivo, estado
 * - folio_vale único para agrupar
 * 
 */

/** Obtener TODAS las solicitudes (para DOCENTE) */
const getAllSolicitudes = async (req, res) => {
  logRequest('getAllSolicitudes');
  try {
    const query = SELECT_SOLICITUDES_CON_NOMBRE.replace('/*AND_CONDITION*/', '') + ' ORDER BY s.fecha_solicitud DESC';
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('[Error] getAllSolicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes: ' + error.message });
  }
};

/** Crear solicitud (alumno/docente) con folio */
/** Crear solicitud (alumno/docente) con folio y selección de docente */
/** Crear solicitud (alumno/docente) con folio, grupo y selección de docente */
const crearSolicitudes = async (req, res) => {
  logRequest('crearSolicitudes');
  const token = req.headers.authorization?.split(' ')[1];
  const { materiales, motivo, fecha_solicitud, aprobar_automatico, docente_id } = req.body;

  if (!token) return res.status(401).json({ error: 'Token requerido' });
  if (!Array.isArray(materiales) || materiales.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un material' });
  }

  try {
    const { id: usuario_id, rol_id } = jwt.verify(token, process.env.JWT_SECRET);
    if (![1, 2].includes(rol_id)) {
      return res.status(403).json({ error: 'Solo alumnos o docentes pueden crear solicitudes' });
    }

    const [user] = await pool.query('SELECT nombre, grupo_id FROM Usuario WHERE id = ?', [usuario_id]);
    if (!user.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    let grupo_nombre = null;
    let grupo_id = null;
    if (rol_id === 1 && user[0].grupo_id) {
      const [grupo] = await pool.query('SELECT nombre FROM Grupo WHERE id = ?', [user[0].grupo_id]);
      grupo_nombre = grupo[0]?.nombre || 'No especificado';
      grupo_id = user[0].grupo_id;
    }

    const folio = generarFolio();
    const estadoInicial = (rol_id === 2 || aprobar_automatico) ? 'aprobada' : 'pendiente';
    
    let docente_seleccionado_id = null;
    let profesor = 'Sin asignar';

    if (estadoInicial === 'aprobada') {
      // Si es docente o aprobación automática, el docente es el mismo usuario
      docente_seleccionado_id = usuario_id;
      profesor = user[0].nombre;
    } else if (docente_id) {
      // Si es alumno y seleccionó un docente específico
      const [docente] = await pool.query('SELECT id, nombre FROM Usuario WHERE id = ? AND rol_id = 2 AND activo = TRUE', [docente_id]);
      if (docente.length > 0) {
        docente_seleccionado_id = docente[0].id;
        profesor = docente[0].nombre;
      } else {
        return res.status(400).json({ error: 'Docente seleccionado no válido' });
      }
    } else {
      // Si no se seleccionó docente, asignar el primero disponible
      const [docente] = await pool.query('SELECT id, nombre FROM Usuario WHERE rol_id = 2 AND activo = TRUE LIMIT 1');
      docente_seleccionado_id = docente[0]?.id;
      profesor = docente[0]?.nombre || profesor;
    }

    const [result] = await pool.query(
      `INSERT INTO Solicitud
         (usuario_id, fecha_solicitud, motivo, estado, docente_id, nombre_alumno, profesor, folio, grupo_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuario_id, fecha_solicitud, motivo, estadoInicial, docente_seleccionado_id, user[0].nombre, profesor, folio, grupo_id]
    );
    const solicitudId = result.insertId;

    for (const mat of materiales) {
      const { material_id, cantidad, tipo } = mat;
      await pool.query(
        `INSERT INTO SolicitudItem (solicitud_id, material_id, tipo, cantidad) VALUES (?,?,?,?)`,
        [solicitudId, material_id, tipo, cantidad]
      );
      if (rol_id === 1) {
        const meta = detectTableAndField(tipo);
        if (meta) {
          await pool.query(
            `UPDATE ${meta.table} SET ${meta.field} = ${meta.field} - ? WHERE id = ?`,
            [cantidad, material_id]
          );
        }
      }
    }

    res.status(201).json({ 
      message: 'Solicitud creada', 
      solicitudId, 
      folio,
      docente_asignado: profesor,
      grupo: grupo_nombre
    });
  } catch (err) {
    console.error('[Error] crearSolicitudes:', err);
    res.status(500).json({ error: 'Error al registrar solicitud: ' + err.message });
  }
};

/**
 * ========================================
 * CREAR SOLICITUD CON ADEUDO
 * Solo ALUMNO
 * ========================================
 */

const crearSolicitudConAdeudo = async (req, res) => {
  logRequest('crearSolicitudConAdeudo');
  const { usuario_id, material_id, tipo, fecha_solicitud, motivo, monto_adeudo, docente_id } = req.body;

  if (!usuario_id || !material_id || !tipo || !fecha_solicitud || !motivo || !monto_adeudo) {
    return res.status(400).json({ error: 'Faltan datos obligatorios para la solicitud con adeudo' });
  }

  try {
    const [user] = await pool.query('SELECT nombre, rol_id, grupo_id FROM Usuario WHERE id = ?', [usuario_id]);
    if (!user.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user[0].rol_id !== 1) return res.status(403).json({ error: 'Solo alumnos pueden crear solicitudes con adeudo' });

    let grupo_nombre = 'No especificado';
    let grupo_id = null;
    if (user[0].grupo_id) {
      const [grupo] = await pool.query('SELECT nombre FROM Grupo WHERE id = ?', [user[0].grupo_id]);
      grupo_nombre = grupo[0]?.nombre || 'No especificado';
      grupo_id = user[0].grupo_id;
    }

    const meta = detectTableAndField(tipo);
    if (!meta) return res.status(400).json({ error: 'Tipo de material inválido' });

    const [material] = await pool.query(`SELECT ${meta.field} FROM ${meta.table} WHERE id = ?`, [material_id]);
    if (!material.length) return res.status(404).json({ error: 'Material no encontrado' });
    if (material[0][meta.field] < 1) {
      return res.status(400).json({ error: 'No hay suficiente stock para el material' });
    }

    let docente_seleccionado_id = null;
    let profesor = 'Sin asignar';

    if (docente_id) {
      // Verificar que el docente seleccionado sea válido
      const [docente] = await pool.query('SELECT id, nombre FROM Usuario WHERE id = ? AND rol_id = 2 AND activo = TRUE', [docente_id]);
      if (docente.length > 0) {
        docente_seleccionado_id = docente[0].id;
        profesor = docente[0].nombre;
      } else {
        return res.status(400).json({ error: 'Docente seleccionado no válido' });
      }
    } else {
      // Si no se seleccionó docente, asignar el primero disponible
      const [docente] = await pool.query('SELECT id, nombre FROM Usuario WHERE rol_id = 2 AND activo = TRUE LIMIT 1');
      docente_seleccionado_id = docente[0]?.id || null;
      profesor = docente[0]?.nombre || 'Sin asignar';
    }

    const [result] = await pool.query(
      `INSERT INTO Solicitud 
        (usuario_id, material_id, tipo, cantidad, fecha_solicitud, motivo, monto_adeudo, estado, docente_id, nombre_alumno, profesor, grupo_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?, ?, ?)`,
      [usuario_id, material_id, tipo, 1, fecha_solicitud, motivo, monto_adeudo, docente_seleccionado_id, user[0].nombre, profesor, grupo_id]
    );

    res.status(201).json({ 
      message: 'Solicitud con adeudo registrada correctamente',
      solicitudId: result.insertId,
      docente_asignado: profesor,
      grupo: grupo_nombre
    });
  } catch (error) {
    console.error('[Error] crearSolicitudConAdeudo:', error);
    res.status(500).json({ error: 'Error al crear solicitud con adeudo: ' + error.message });
  }
};

/**
 * ========================================
 * CONSULTAS DE SOLICITUDES CON JOIN POR TIPO
 * ========================================
 * 
 * LEFT JOIN dinámico con COALESCE para resolver nombre_material
 * 
 * ========================================
 */

/**
 * Obtener solicitudes del usuario */
const getUserSolicitudes = async (req, res) => {
  logRequest('getUserSolicitudes');
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const { id: usuario_id } = jwt.verify(token, process.env.JWT_SECRET);

    // Reemplaza el marcador del WHERE
    const query = SELECT_SOLICITUDES_CON_NOMBRE.replace(
      '/*AND_CONDITION*/',
      `AND s.usuario_id = ?`
    );

    const [rows] = await pool.query(query, [usuario_id]);
    res.json(rows);
  } catch (error) {
    console.error('[Error] getUserSolicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes: ' + error.message });
  }
};

/**
 * Obtener solicitudes aprobadas */
const getApprovedSolicitudes = async (req, res) => {
  logRequest('getApprovedSolicitudes');

  try {
    // Inserta la condición AND para el estado aprobado
    const query = SELECT_SOLICITUDES_CON_NOMBRE.replace(
      '/*AND_CONDITION*/',
      "AND s.estado = 'aprobada'"
    );

    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('[Error] getApprovedSolicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes aprobadas: ' + error.message });
  }
};

/**
 * Obtener solicitudes pendientes */
const getPendingSolicitudes = async (req, res) => {
  logRequest('getPendingSolicitudes');

  try {
    const query = SELECT_SOLICITUDES_CON_NOMBRE.replace(
      '/*AND_CONDITION*/',
      "AND s.estado = 'pendiente'"
    );

    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('[Error] getPendingSolicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes pendientes: ' + error.message });
  }
};

/**
 * ========================================
 * ACCIONES SOBRE SOLICITUDES
 * ========================================
 */

/**
 * Aprobar solicitud */
const approveSolicitud = async (req, res) => {
  logRequest(`approveSolicitud`);

  const { id } = req.params;
  if (!id || isNaN(parseInt(id))) {
    console.warn('[Warn] ID de solicitud inválido o no proporcionado');
    return res.status(400).json({ error: 'ID de solicitud inválido' });
  }

  try {
    const [result] = await pool.query(
      "UPDATE Solicitud SET estado = 'aprobada' WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.status(200).json({ message: 'Solicitud aprobada' });
  } catch (error) {
    console.error('[Error] approveSolicitud:', error);
    res.status(500).json({ error: 'Error al aprobar solicitud: ' + error.message });
  }
};

/**
 * Rechazar solicitud */
const rejectSolicitud = async (req, res) => {
  const { id } = req.params;
  logRequest(`rejectSolicitud - ID=${id}`);
  try {
    await pool.query('UPDATE Solicitud SET estado = ? WHERE id = ?', ['rechazada', id]);
    res.status(200).json({ message: 'Solicitud rechazada' });
  } catch (error) {
    console.error('[Error] rejectSolicitud:', error);
    res.status(500).json({ error: 'Error al rechazar solicitud: ' + error.message });
  }
};

/**
 * Marcar solicitud como entregada + generar adeudos con fecha_entrega */
const deliverSolicitud = async (req, res) => {
  logRequest('deliverSolicitud');
  const { id } = req.params;
  try {
    // 1) Verificar existencia y estado
    const [[sol]] = await pool.query(
      'SELECT usuario_id, estado FROM Solicitud WHERE id = ?',
      [id]
    );
    if (!sol) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    if (sol.estado !== 'aprobada') {
      return res
        .status(400)
        .json({ error: 'Solo solicitudes aprobadas pueden entregarse' });
    }

    // 2) Marcar la solicitud como entregada
    await pool.query(
      'UPDATE Solicitud SET estado = ? WHERE id = ?',
      ['entregado', id]
    );

    // 3) Leer los ítems asociados
    const [items] = await pool.query(
      'SELECT id AS solicitud_item_id, material_id, tipo, cantidad FROM SolicitudItem WHERE solicitud_id = ?',
      [id]
    );

    // 4) Insertar un registro de adeudo por cada ítem, con fecha_entrega = NOW()
    for (const it of items) {
      await pool.query(
        `INSERT INTO Adeudo
           (solicitud_id,
            solicitud_item_id,
            usuario_id,
            material_id,
            tipo,
            cantidad_pendiente,
            fecha_entrega)
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          id,
          it.solicitud_item_id,
          sol.usuario_id,
          it.material_id,
          it.tipo,
          it.cantidad
        ]
      );
    }

    return res.json({ message: 'Entregado y adeudos generados' });
  } catch (err) {
    console.error('[Error] deliverSolicitud:', err);
    return res
      .status(500)
      .json({ error: 'Error al entregar solicitud: ' + err.message });
  }
};

/**
 * Cancelar solicitud
 * - Si lo hace un alumno (rol 1): valida que sea suya, esté pendiente,
 *   restaura stock y luego marca como cancelado.
 * - Para almacenistas (rol 3) sigue marcando como cancelado sin tocar stock.
 */
const cancelSolicitud = async (req, res) => {
  const { id } = req.params;
  logRequest(`cancelSolicitud - ID=${id}`);
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const { id: usuario_id, rol_id } = jwt.verify(token, process.env.JWT_SECRET);

    if (rol_id === 1) {
      // 1) Verificar que la solicitud exista, sea del alumno y esté pendiente
      const [[sol]] = await pool.query(
        'SELECT estado, usuario_id FROM Solicitud WHERE id = ?',
        [id]
      );
      if (!sol) {
        return res.status(404).json({ error: 'Solicitud no encontrada' });
      }
      if (sol.usuario_id !== usuario_id) {
        return res.status(403).json({ error: 'No puede cancelar esta solicitud' });
      }
      if (sol.estado !== 'pendiente') {
        return res.status(400).json({ error: 'Solo solicitudes pendientes pueden cancelarse' });
      }

      // 2) Restaurar stock de cada ítem
      const [items] = await pool.query(
        'SELECT material_id, tipo, cantidad FROM SolicitudItem WHERE solicitud_id = ?',
        [id]
      );
      for (const it of items) {
        const meta = detectTableAndField(it.tipo);
        if (meta) {
          await pool.query(
            `UPDATE ${meta.table} 
               SET ${meta.field} = ${meta.field} + ? 
             WHERE id = ?`,
            [it.cantidad, it.material_id]
          );
        }
      }
    }
    // 3) Eliminar o marcar según rol
    if (rol_id === 1) {
      // Si es alumno, borramos ítems y solicitud para que desaparezca del listado
      await pool.query('DELETE FROM SolicitudItem WHERE solicitud_id = ?', [id]);
      await pool.query('DELETE FROM Solicitud WHERE id = ?', [id]);
      return res.status(200).json({ message: 'Solicitud eliminada permanentemente' });
    } else {
      // Almacenistas siguen marcando como cancelado
      await pool.query('UPDATE Solicitud SET estado = ? WHERE id = ?', ['cancelado', id]);
      return res.status(200).json({ message: 'Solicitud cancelada' });
    }

  } catch (error) {
    console.error('[Error] cancelSolicitud:', error);
    res.status(500).json({ error: 'Error al cancelar solicitud: ' + error.message });
  }
};

/**
 * ========================================
 * AJUSTE DE INVENTARIO (SOLO ALMACENISTA)
 * ========================================
 */

const adjustInventory = async (req, res) => {
  logRequest('adjustInventory');
  const { id } = req.params;
  const { cantidad, tipo } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const { rol_id } = jwt.verify(token, process.env.JWT_SECRET);
    if (rol_id !== 3 && !req.user?.permisos?.modificar_stock) {
      return res.status(403).json({ error: 'Solo almacenistas con permisos de stock pueden ajustar inventario' });
    }

    if (isNaN(cantidad)) return res.status(400).json({ error: 'Cantidad debe ser un número válido' });

    let meta = detectTableAndField(tipo);
    if (!meta) return res.status(400).json({ error: 'Tipo de material inválido' });

    const [material] = await pool.query(`SELECT ${meta.field} FROM ${meta.table} WHERE id = ?`, [id]);
    if (!material.length) return res.status(404).json({ error: 'Material no encontrado' });

    const nuevaCantidad = material[0][meta.field] + parseInt(cantidad);
    if (nuevaCantidad < 0) return res.status(400).json({ error: 'La cantidad no puede ser negativa' });

    await pool.query(`UPDATE ${meta.table} SET ${meta.field} = ? WHERE id = ?`, [nuevaCantidad, id]);
    res.status(200).json({ message: 'Inventario actualizado correctamente', nuevoStock: nuevaCantidad });
  } catch (error) {
    console.error('[Error] adjustInventory:', error);
    res.status(500).json({ error: 'Error al ajustar inventario: ' + error.message });
  }
};

/**
 * ========================================
 * RUTAS ADICIONALES PARA ADMINISTRADORES
 * ========================================
 */

/** Obtener estadísticas de materiales (solo admin) */
const getEstadisticas = async (req, res) => {
  logRequest('getEstadisticas');
  try {
    const { rol_id } = req.usuario;
    if (rol_id !== 4) return res.status(403).json({ error: 'Solo administradores pueden ver estadísticas' });

    const [liquidos] = await pool.query('SELECT COUNT(*) as total, SUM(cantidad_disponible_ml) as stock FROM MaterialLiquido');
    const [solidos] = await pool.query('SELECT COUNT(*) as total, SUM(cantidad_disponible_g) as stock FROM MaterialSolido');
    const [equipos] = await pool.query('SELECT COUNT(*) as total, SUM(cantidad_disponible_u) as stock FROM MaterialEquipo');
    const [laboratorio] = await pool.query('SELECT COUNT(*) as total, SUM(cantidad_disponible) as stock FROM MaterialLaboratorio');

    const stats = {
      liquidos: { total: liquidos[0].total, stock: liquidos[0].stock || 0 },
      solidos: { total: solidos[0].total, stock: solidos[0].stock || 0 },
      equipos: { total: equipos[0].total, stock: equipos[0].stock || 0 },
      laboratorio: { total: laboratorio[0].total, stock: laboratorio[0].stock || 0 },
      total_items: liquidos[0].total + solidos[0].total + equipos[0].total + laboratorio[0].total,
      total_stock: (liquidos[0].stock || 0) + (solidos[0].stock || 0) + (equipos[0].stock || 0) + (laboratorio[0].stock || 0)
    };

    res.json(stats);
  } catch (error) {
    console.error('[Error] getEstadisticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas: ' + error.message });
  }
};

/** Obtener historial de movimientos (solo admin) */
const getHistorialMovimientos = async (req, res) => {
  logRequest('getHistorialMovimientos');
  try {
    const { rol_id } = req.usuario;
    if (rol_id !== 4) return res.status(403).json({ error: 'Solo administradores pueden ver el historial' });

    const [rows] = await pool.query(`
      SELECT m.*, u.nombre AS usuario
      FROM MovimientosInventario m
      JOIN Usuario u ON m.usuario_id = u.id
      ORDER BY m.fecha_movimiento DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error('[Error] getHistorialMovimientos:', error);
    res.status(500).json({ error: 'Error al obtener historial de movimientos: ' + error.message });
  }
};

/**
 * ========================================
 * RUTAS ESPECIALES COMBINADAS
 * ========================================
 */

/** Ajuste masivo de stock (almacenistas con permisos y admins) */
const ajusteMasivoStock = async (req, res) => {
  logRequest('ajusteMasivoStock');
  const { ajustes } = req.body; // Array de { id, tipo, cantidad }
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Token requerido' });

  try {
    const { rol_id, permisos } = jwt.verify(token, process.env.JWT_SECRET);
    if (rol_id !== 3 && rol_id !== 4 && !permisos?.modificar_stock) {
      return res.status(403).json({ error: 'Acceso denegado. Requiere permisos de stock' });
    }

    if (!Array.isArray(ajustes) || ajustes.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un ajuste' });
    }

    for (const ajuste of ajustes) {
      const { id, tipo, cantidad } = ajuste;
      if (!id || !tipo || isNaN(cantidad)) {
        return res.status(400).json({ error: 'Datos de ajuste inválidos' });
      }

      const meta = detectTableAndField(tipo);
      if (!meta) return res.status(400).json({ error: 'Tipo de material inválido' });

      const [material] = await pool.query(`SELECT ${meta.field} FROM ${meta.table} WHERE id = ?`, [id]);
      if (!material.length) return res.status(404).json({ error: `Material ${id} no encontrado` });

      const nuevaCantidad = material[0][meta.field] + parseInt(cantidad);
      if (nuevaCantidad < 0) return res.status(400).json({ error: 'La cantidad no puede ser negativa' });

      await pool.query(`UPDATE ${meta.table} SET ${meta.field} = ? WHERE id = ?`, [nuevaCantidad, id]);
      await pool.query(
        `INSERT INTO MovimientosInventario (usuario_id, material_id, tipo, cantidad, fecha_movimiento)
         VALUES (?, ?, ?, ?, NOW())`,
        [req.usuario.id, id, tipo, cantidad]
      );
    }

    res.status(200).json({ message: 'Ajuste masivo de stock completado' });
  } catch (error) {
    console.error('[Error] ajusteMasivoStock:', error);
    res.status(500).json({ error: 'Error al ajustar stock masivo: ' + error.message });
  }
};

/** Obtener materiales con stock bajo (almacenistas con permisos y admins) */
const getMaterialesStockBajo = async (req, res) => {
  logRequest('getMaterialesStockBajo');
  try {
    const { rol_id, permisos } = req.usuario;
    if (rol_id !== 3 && rol_id !== 4 && !permisos?.modificar_stock) {
      return res.status(403).json({ error: 'Acceso denegado. Requiere permisos de stock' });
    }

    const threshold = 10; // Umbral de stock bajo (ajustable)
    const [liquidos] = await pool.query(
      'SELECT id, nombre, cantidad_disponible_ml AS stock, riesgos_fisicos, riesgos_salud, riesgos_ambientales FROM MaterialLiquido WHERE cantidad_disponible_ml < ?',
      [threshold]
    );
    const [solidos] = await pool.query(
      'SELECT id, nombre, cantidad_disponible_g AS stock, riesgos_fisicos, riesgos_salud, riesgos_ambientales FROM MaterialSolido WHERE cantidad_disponible_g < ?',
      [threshold]
    );
    const [equipos] = await pool.query(
      'SELECT id, nombre, cantidad_disponible_u AS stock FROM MaterialEquipo WHERE cantidad_disponible_u < ?',
      [threshold]
    );
    const [laboratorio] = await pool.query(
      'SELECT id, nombre, cantidad_disponible AS stock FROM MaterialLaboratorio WHERE cantidad_disponible < ?',
      [threshold]
    );

    // Agregar tipo a cada material
    const liquidosConTipo = liquidos.map(item => ({ ...item, tipo: 'liquido' }));
    const solidosConTipo = solidos.map(item => ({ ...item, tipo: 'solido' }));
    const equiposConTipo = equipos.map(item => ({ ...item, tipo: 'equipo' }));
    const laboratorioConTipo = laboratorio.map(item => ({ ...item, tipo: 'laboratorio' }));

    const lowStock = [...liquidosConTipo, ...solidosConTipo, ...equiposConTipo, ...laboratorioConTipo];

    res.json(lowStock);
  } catch (error) {
    console.error('[Error] getMaterialesStockBajo:', error);
    res.status(500).json({ error: 'Error al obtener materiales con stock bajo: ' + error.message });
  }
};

/**
 * ========================================
 * RUTAS GENERALES
 * ========================================
 */

const getMaterials = async (req, res) => {
  logRequest('getMaterials');
  try {
    const [liquidos] = await pool.query('SELECT id, nombre, "liquido" AS tipo, cantidad_disponible_ml, riesgos_fisicos, riesgos_salud, riesgos_ambientales FROM MaterialLiquido');
    const [solidos] = await pool.query('SELECT id, nombre, "solido" AS tipo, cantidad_disponible_g, riesgos_fisicos, riesgos_salud, riesgos_ambientales FROM MaterialSolido');
    const [laboratorio] = await pool.query('SELECT id, nombre, "laboratorio" AS tipo, cantidad_disponible FROM MaterialLaboratorio');
    const [equipos] = await pool.query('SELECT id, nombre, "equipo" AS tipo, cantidad_disponible_u FROM MaterialEquipo');

    const materials = [...liquidos, ...solidos, ...laboratorio, ...equipos];
    res.json(materials);
  } catch (error) {
    console.error('[Error] getMaterials:', error);
    res.status(500).json({ error: 'Error al obtener materiales: ' + error.message });
  }
};

/** Obtener un material específico por ID y TIPO */
const getMaterialById = async (req, res) => {
  const { id } = req.params;
  const { tipo } = req.query;  // IMPORTANTE: ahora recibe el tipo

  logRequest(`getMaterialById - ID=${id}, tipo=${tipo}`);

  try {
    let meta = detectTableAndField(tipo);
    if (!meta) {
      return res.status(400).json({ error: 'Tipo de material inválido' });
    }

    const [result] = await pool.query(`SELECT * FROM ${meta.table} WHERE id = ?`, [id]);
    if (!result.length) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }

    res.json({ ...result[0], tipo });
  } catch (error) {
    console.error('[Error] getMaterialById:', error);
    res.status(500).json({ error: 'Error al obtener material: ' + error.message });
  }
};

/** Listar solicitudes entregadas CON adeudos pendientes */
const getDeliveredSolicitudes = async (req, res) => {
  logRequest('getDeliveredSolicitudes');
  try {
    const [rows] = await pool.query(`
      SELECT
        s.id AS solicitud_id,
        s.folio,
        s.nombre_alumno,
        s.profesor,
        MIN(a.fecha_entrega) AS fecha_entrega,
        g.nombre AS grupo_nombre
      FROM Solicitud s
      JOIN Adeudo a ON a.solicitud_id = s.id
      LEFT JOIN Grupo g ON s.grupo_id = g.id
      WHERE s.estado = 'entregado'
      GROUP BY s.id, s.folio, s.nombre_alumno, s.profesor, g.nombre
      ORDER BY fecha_entrega DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('[Error] getDeliveredSolicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes entregadas: ' + error.message });
  }
};

/** Obtener detalle de una solicitud entregada */
const getSolicitudDetalle = async (req, res) => {
  logRequest(`getSolicitudDetalle - ID=${req.params.id}`);
  try {
    const { id } = req.params;

    // 1) Cabecera: folio, alumno, profesor, grupo y fecha_entrega (tomada del primer adeudo)
    const [solRows] = await pool.query(
      `SELECT 
         s.id AS solicitud_id,
         s.folio,
         s.nombre_alumno,
         s.profesor,
         MIN(a.fecha_entrega) AS fecha_entrega,
         g.nombre AS grupo_nombre
       FROM Solicitud s
       LEFT JOIN Adeudo a ON a.solicitud_id = s.id
       LEFT JOIN Grupo g ON s.grupo_id = g.id
       WHERE s.id = ?
       GROUP BY s.id, s.folio, s.nombre_alumno, s.profesor, g.nombre`,
      [id]
    );
    if (!solRows.length) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    const sol = solRows[0];

    // 2) Ítems: solo los que aún tienen adeudo (cantidad_pendiente > 0)
    const [items] = await pool.query(
      `SELECT
         a.solicitud_item_id AS item_id,
         a.tipo,
         a.cantidad_pendiente AS cantidad,
         COALESCE(ml.nombre, ms.nombre, me.nombre, mlab.nombre) AS nombre_material
       FROM Adeudo a
       LEFT JOIN MaterialLiquido ml ON a.tipo = 'liquido' AND a.material_id = ml.id
       LEFT JOIN MaterialSolido  ms ON a.tipo = 'solido'  AND a.material_id = ms.id
       LEFT JOIN MaterialEquipo  me ON a.tipo = 'equipo'  AND a.material_id = me.id
       LEFT JOIN MaterialLaboratorio mlab ON a.tipo = 'laboratorio' AND a.material_id = mlab.id
      WHERE a.solicitud_id = ? AND a.cantidad_pendiente > 0`,
      [id]
    );

    // 3) Respuesta unificada
    res.json({
      solicitud_id: sol.solicitud_id,
      folio: sol.folio,
      nombre_alumno: sol.nombre_alumno,
      profesor: sol.profesor,
      fecha_entrega: sol.fecha_entrega,
      grupo: sol.grupo_nombre || 'No especificado',
      items: items.map(i => ({
        item_id: i.item_id,
        nombre_material: i.nombre_material,
        cantidad: i.cantidad,
        tipo: i.tipo,
        entregado: false
      }))
    });
  } catch (err) {
    console.error('[Error] getSolicitudDetalle:', err);
    res.status(500).json({ error: 'Error al obtener detalle de solicitud: ' + err.message });
  }
};

// ========================================
// FUNCIONES FALTANTES PARA materialController.js
// ========================================

// CREAR NUEVO MATERIAL
// REEMPLAZAR la función crearMaterial existente en materialController.js

const crearMaterial = async (req, res) => {
  logRequest('crearMaterial');
  
  const { 
    nombre, 
    descripcion, 
    tipo, 
    cantidad_inicial, 
    categoria_id, 
    riesgos_fisicos, 
    riesgos_salud, 
    riesgos_ambientales,
    estado = 'disponible'
  } = req.body;

  // Validaciones básicas
  if (!nombre || !tipo || cantidad_inicial === undefined) {
    return res.status(400).json({ 
      error: 'Faltan datos obligatorios: nombre, tipo, cantidad_inicial' 
    });
  }

  if (cantidad_inicial < 0) {
    return res.status(400).json({ 
      error: 'La cantidad inicial no puede ser negativa' 
    });
  }

  try {
    const meta = detectTableAndField(tipo);
    if (!meta) {
      return res.status(400).json({ error: 'Tipo de material inválido' });
    }

    // Procesar imagen subida (si existe)
    let imagenUrl = null;
    if (req.file) {
      imagenUrl = req.file.path; // Cloudinary devuelve la URL en req.file.path
      console.log(`[INFO] Imagen subida a Cloudinary: ${imagenUrl}`);
    }

    let query, params;
    
    // Construir query según el tipo de material
    switch (tipo) {
      case 'liquido':
        query = `
          INSERT INTO ${meta.table} 
          (nombre, descripcion, ${meta.field}, categoria_id, riesgos_fisicos, riesgos_salud, riesgos_ambientales, estado, imagen) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        params = [
          nombre, 
          descripcion, 
          cantidad_inicial, 
          categoria_id, 
          riesgos_fisicos, 
          riesgos_salud, 
          riesgos_ambientales, 
          estado, 
          imagenUrl
        ];
        break;

      case 'solido':
        query = `
          INSERT INTO ${meta.table} 
          (nombre, descripcion, ${meta.field}, categoria_id, riesgos_fisicos, riesgos_salud, riesgos_ambientales, estado, imagen) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        params = [
          nombre, 
          descripcion, 
          cantidad_inicial, 
          categoria_id, 
          riesgos_fisicos, 
          riesgos_salud, 
          riesgos_ambientales, 
          estado, 
          imagenUrl
        ];
        break;

      case 'equipo':
        query = `
          INSERT INTO ${meta.table} 
          (nombre, descripcion, ${meta.field}, categoria_id, estado, imagen) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        params = [
          nombre, 
          descripcion, 
          cantidad_inicial, 
          categoria_id, 
          estado, 
          imagenUrl
        ];
        break;

      case 'laboratorio':
        query = `
          INSERT INTO ${meta.table} 
          (nombre, descripcion, ${meta.field}, categoria_id, estado, imagen) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        params = [
          nombre, 
          descripcion, 
          cantidad_inicial, 
          categoria_id, 
          estado, 
          imagenUrl
        ];
        break;

      default:
        return res.status(400).json({ error: 'Tipo de material no soportado' });
    }

    // Ejecutar inserción
    const [result] = await pool.query(query, params);

    // Registrar movimiento de inventario (entrada inicial)
    try {
      await pool.query(
        `INSERT INTO MovimientosInventario 
         (usuario_id, material_id, tipo, cantidad, tipo_movimiento, motivo, fecha_movimiento) 
         VALUES (?, ?, ?, ?, ?, ?, NOW())`,
        [
          req.usuario?.id || 1, 
          result.insertId, 
          tipo, 
          cantidad_inicial, 
          'entrada', 
          'Material creado - Stock inicial'
        ]
      );
    } catch (movError) {
      console.warn('[Warn] No se pudo registrar movimiento de inventario:', movError.message);
    }

    // Respuesta exitosa
    res.status(201).json({ 
      message: 'Material creado exitosamente',
      material: {
        id: result.insertId,
        nombre,
        tipo,
        cantidad_inicial,
        imagen_url: imagenUrl,
        estado
      }
    });

  } catch (error) {
    console.error('[Error] crearMaterial:', error);
    
    // Si hubo error y se subió imagen, intentar eliminarla de Cloudinary
    if (req.file && req.file.public_id) {
      try {
        const cloudinary = require('../config/cloudinary');
        await cloudinary.uploader.destroy(req.file.public_id);
        console.log(`[INFO] Imagen eliminada de Cloudinary: ${req.file.public_id}`);
      } catch (deleteError) {
        console.error('[Error] No se pudo eliminar imagen de Cloudinary:', deleteError);
      }
    }

    res.status(500).json({ 
      error: 'Error al crear material: ' + error.message 
    });
  }
};

// ACTUALIZAR MATERIAL EXISTENTE

const actualizarMaterial = async (req, res) => {
  logRequest('actualizarMaterial');
  const { id } = req.params;
  const { 
    nombre, 
    descripcion, 
    categoria_id, 
    riesgos_fisicos, 
    riesgos_salud, 
    riesgos_ambientales,
    estado,
    mantener_imagen = true // Flag para mantener imagen existente
  } = req.body;
  const { tipo } = req.query;

  if (!tipo) {
    return res.status(400).json({ error: 'Parámetro tipo requerido' });
  }

  try {
    const meta = detectTableAndField(tipo);
    if (!meta) {
      return res.status(400).json({ error: 'Tipo de material inválido' });
    }

    // Obtener imagen actual si existe
    let imagenActual = null;
    if (req.file || mantener_imagen === 'false') {
      const [materialActual] = await pool.query(
        `SELECT imagen FROM ${meta.table} WHERE id = ?`, 
        [id]
      );
      if (materialActual.length > 0) {
        imagenActual = materialActual[0].imagen;
      }
    }

    // Procesar nueva imagen si se subió
    let nuevaImagenUrl = imagenActual; // Por defecto mantener la actual
    
    if (req.file) {
      nuevaImagenUrl = req.file.path; // Nueva imagen desde Cloudinary
      
      // Eliminar imagen anterior de Cloudinary si existía
      if (imagenActual && imagenActual.includes('cloudinary')) {
        try {
          const cloudinary = require('../config/cloudinary');
          // Extraer public_id de la URL de Cloudinary
          const publicId = imagenActual.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`materiales-laboratorio/${publicId}`);
          console.log(`[INFO] Imagen anterior eliminada: ${publicId}`);
        } catch (deleteError) {
          console.warn('[Warn] No se pudo eliminar imagen anterior:', deleteError.message);
        }
      }
    } else if (mantener_imagen === 'false') {
      // Usuario quiere eliminar la imagen
      if (imagenActual && imagenActual.includes('cloudinary')) {
        try {
          const cloudinary = require('../config/cloudinary');
          const publicId = imagenActual.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`materiales-laboratorio/${publicId}`);
          console.log(`[INFO] Imagen eliminada por solicitud del usuario: ${publicId}`);
        } catch (deleteError) {
          console.warn('[Warn] No se pudo eliminar imagen:', deleteError.message);
        }
      }
      nuevaImagenUrl = null;
    }

    // Construir query de actualización
    let query, params;
    
    if (tipo === 'liquido' || tipo === 'solido') {
      query = `
        UPDATE ${meta.table} 
        SET nombre = ?, descripcion = ?, categoria_id = ?, 
            riesgos_fisicos = ?, riesgos_salud = ?, riesgos_ambientales = ?, 
            estado = ?, imagen = ?
        WHERE id = ?
      `;
      params = [
        nombre, 
        descripcion, 
        categoria_id, 
        riesgos_fisicos, 
        riesgos_salud, 
        riesgos_ambientales, 
        estado || 'disponible',
        nuevaImagenUrl,
        id
      ];
    } else if (tipo === 'equipo' || tipo === 'laboratorio') {
      query = `
        UPDATE ${meta.table} 
        SET nombre = ?, descripcion = ?, categoria_id = ?, estado = ?, imagen = ?
        WHERE id = ?
      `;
      params = [
        nombre, 
        descripcion, 
        categoria_id, 
        estado || 'disponible',
        nuevaImagenUrl,
        id
      ];
    }

    const [result] = await pool.query(query, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }

    res.json({ 
      message: 'Material actualizado exitosamente',
      imagen_actualizada: req.file ? true : false,
      nueva_imagen_url: nuevaImagenUrl
    });

  } catch (error) {
    console.error('[Error] actualizarMaterial:', error);
    
    // Si hubo error y se subió nueva imagen, eliminarla
    if (req.file && req.file.public_id) {
      try {
        const cloudinary = require('../config/cloudinary');
        await cloudinary.uploader.destroy(req.file.public_id);
        console.log(`[INFO] Nueva imagen eliminada por error: ${req.file.public_id}`);
      } catch (deleteError) {
        console.error('[Error] No se pudo eliminar nueva imagen:', deleteError);
      }
    }

    res.status(500).json({ 
      error: 'Error al actualizar material: ' + error.message 
    });
  }
};

/** Obtener todas las categorías disponibles */
const getCategorias = async (req, res) => {
  logRequest('getCategorias');
  try {
    const [rows] = await pool.query('SELECT id, nombre FROM Categoria ORDER BY nombre');
    res.json(rows);
  } catch (error) {
    console.error('[Error] getCategorias:', error);
    res.status(500).json({ error: 'Error al obtener categorías: ' + error.message });
  }
};

// ELIMINAR MATERIAL
const eliminarMaterial = async (req, res) => {
  logRequest('eliminarMaterial');
  const { id } = req.params;
  const { tipo } = req.query;

  if (!tipo) return res.status(400).json({ error: 'Parámetro tipo requerido' });

  try {
    const meta = detectTableAndField(tipo);
    if (!meta) return res.status(400).json({ error: 'Tipo de material inválido' });

    // Verificar si el material tiene solicitudes pendientes
    const [solicitudesPendientes] = await pool.query(
      'SELECT COUNT(*) as count FROM SolicitudItem si JOIN Solicitud s ON si.solicitud_id = s.id WHERE si.material_id = ? AND si.tipo = ? AND s.estado IN ("pendiente", "aprobada")',
      [id, tipo]
    );

    if (solicitudesPendientes[0].count > 0) {
      return res.status(400).json({ error: 'No se puede eliminar material con solicitudes pendientes' });
    }

    const [result] = await pool.query(`DELETE FROM ${meta.table} WHERE id = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }

    res.json({ message: 'Material eliminado exitosamente' });
  } catch (error) {
    console.error('[Error] eliminarMaterial:', error);
    res.status(500).json({ error: 'Error al eliminar material: ' + error.message });
  }
};

// ACTUALIZAR STOCK ESPECÍFICO
const actualizarStock = async (req, res) => {
  logRequest('actualizarStock');
  const { id } = req.params;
  const { cantidad, tipo } = req.body;

  if (!tipo || cantidad === undefined) {
    return res.status(400).json({ error: 'Tipo y cantidad son requeridos' });
  }

  try {
    const meta = detectTableAndField(tipo);
    if (!meta) return res.status(400).json({ error: 'Tipo de material inválido' });

    if (cantidad < 0) return res.status(400).json({ error: 'La cantidad no puede ser negativa' });

    const [result] = await pool.query(
      `UPDATE ${meta.table} SET ${meta.field} = ? WHERE id = ?`,
      [cantidad, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }

    // Registrar movimiento
    await pool.query(
      'INSERT INTO MovimientosInventario (usuario_id, material_id, tipo, cantidad, tipo_movimiento, motivo) VALUES (?, ?, ?, ?, ?, ?)',
      [req.usuario.id, id, tipo, cantidad, 'ajuste', 'Actualización directa de stock']
    );

    res.json({ message: 'Stock actualizado exitosamente', nuevoStock: cantidad });
  } catch (error) {
    console.error('[Error] actualizarStock:', error);
    res.status(500).json({ error: 'Error al actualizar stock: ' + error.message });
  }
};

// REGISTRAR ENTRADA DE STOCK
const registrarEntradaStock = async (req, res) => {
  logRequest('registrarEntradaStock');
  const { id } = req.params;
  const { cantidad, tipo, motivo } = req.body;

  if (!tipo || !cantidad || cantidad <= 0) {
    return res.status(400).json({ error: 'Tipo y cantidad válida son requeridos' });
  }

  try {
    const meta = detectTableAndField(tipo);
    if (!meta) return res.status(400).json({ error: 'Tipo de material inválido' });

    // Obtener stock actual
    const [material] = await pool.query(`SELECT ${meta.field} FROM ${meta.table} WHERE id = ?`, [id]);
    if (!material.length) return res.status(404).json({ error: 'Material no encontrado' });

    const nuevoStock = material[0][meta.field] + parseInt(cantidad);

    // Actualizar stock
    await pool.query(`UPDATE ${meta.table} SET ${meta.field} = ? WHERE id = ?`, [nuevoStock, id]);

    // Registrar movimiento solo si la tabla existe
    try {
      await pool.query(
        'INSERT INTO MovimientosInventario (usuario_id, material_id, tipo, cantidad, tipo_movimiento, motivo) VALUES (?, ?, ?, ?, ?, ?)',
        [req.usuario?.id || 1, id, tipo, cantidad, 'entrada', motivo || 'Entrada de stock']
      );
    } catch (movError) {
      console.warn('[Warn] No se pudo registrar movimiento:', movError.message);
    }

    res.json({ 
      message: 'Entrada de stock registrada exitosamente',
      stockAnterior: material[0][meta.field],
      cantidadAgregada: cantidad,
      nuevoStock: nuevoStock
    });
  } catch (error) {
    console.error('[Error] registrarEntradaStock:', error);
    res.status(500).json({ error: 'Error al registrar entrada: ' + error.message });
  }
};

// REGISTRAR SALIDA DE STOCK
const registrarSalidaStock = async (req, res) => {
  logRequest('registrarSalidaStock');
  const { id } = req.params;
  const { cantidad, tipo, motivo } = req.body;

  if (!tipo || !cantidad || cantidad <= 0) {
    return res.status(400).json({ error: 'Tipo y cantidad válida son requeridos' });
  }

  try {
    const meta = detectTableAndField(tipo);
    if (!meta) return res.status(400).json({ error: 'Tipo de material inválido' });

    // Obtener stock actual
    const [material] = await pool.query(`SELECT ${meta.field} FROM ${meta.table} WHERE id = ?`, [id]);
    if (!material.length) return res.status(404).json({ error: 'Material no encontrado' });

    const stockActual = material[0][meta.field];
    if (stockActual < cantidad) {
      return res.status(400).json({ error: 'Stock insuficiente para la salida solicitada' });
    }

    const nuevoStock = stockActual - parseInt(cantidad);

    // Actualizar stock
    await pool.query(`UPDATE ${meta.table} SET ${meta.field} = ? WHERE id = ?`, [nuevoStock, id]);

    // Registrar movimiento
    await pool.query(
      'INSERT INTO MovimientosInventario (usuario_id, material_id, tipo, cantidad, tipo_movimiento, motivo) VALUES (?, ?, ?, ?, ?, ?)',
      [req.usuario.id, id, tipo, -cantidad, 'salida', motivo || 'Salida de stock']
    );

    res.json({ 
      message: 'Salida de stock registrada exitosamente',
      stockAnterior: stockActual,
      cantidadRetirada: cantidad,
      nuevoStock: nuevoStock
    });
  } catch (error) {
    console.error('[Error] registrarSalidaStock:', error);
    res.status(500).json({ error: 'Error al registrar salida: ' + error.message });
  }
};

// CREAR CATEGORÍA
const crearCategoria = async (req, res) => {
  logRequest('crearCategoria');
  const { nombre } = req.body;

  if (!nombre) return res.status(400).json({ error: 'Nombre de categoría requerido' });

  try {
    const [result] = await pool.query('INSERT INTO Categoria (nombre) VALUES (?)', [nombre]);
    res.status(201).json({ 
      message: 'Categoría creada exitosamente', 
      categoriaId: result.insertId 
    });
  } catch (error) {
    console.error('[Error] crearCategoria:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'La categoría ya existe' });
    }
    res.status(500).json({ error: 'Error al crear categoría: ' + error.message });
  }
};

// ACTUALIZAR CATEGORÍA
const actualizarCategoria = async (req, res) => {
  logRequest('actualizarCategoria');
  const { id } = req.params;
  const { nombre } = req.body;

  if (!nombre) return res.status(400).json({ error: 'Nombre de categoría requerido' });

  try {
    const [result] = await pool.query('UPDATE Categoria SET nombre = ? WHERE id = ?', [nombre, id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ message: 'Categoría actualizada exitosamente' });
  } catch (error) {
    console.error('[Error] actualizarCategoria:', error);
    res.status(500).json({ error: 'Error al actualizar categoría: ' + error.message });
  }
};

// ELIMINAR CATEGORÍA
const eliminarCategoria = async (req, res) => {
  logRequest('eliminarCategoria');
  const { id } = req.params;

  try {
    // Verificar si hay materiales usando esta categoría
    const [materialesUsandoCategoria] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM MaterialLiquido WHERE categoria_id = ?) +
        (SELECT COUNT(*) FROM MaterialSolido WHERE categoria_id = ?) +
        (SELECT COUNT(*) FROM MaterialEquipo WHERE categoria_id = ?) +
        (SELECT COUNT(*) FROM MaterialLaboratorio WHERE categoria_id = ?) as total
    `, [id, id, id, id]);

    if (materialesUsandoCategoria[0].total > 0) {
      return res.status(400).json({ error: 'No se puede eliminar categoría con materiales asociados' });
    }

    const [result] = await pool.query('DELETE FROM Categoria WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    res.json({ message: 'Categoría eliminada exitosamente' });
  } catch (error) {
    console.error('[Error] eliminarCategoria:', error);
    res.status(500).json({ error: 'Error al eliminar categoría: ' + error.message });
  }
};

// ESTADÍSTICAS COMPLETAS
const getEstadisticasCompletas = async (req, res) => {
  logRequest('getEstadisticasCompletas');
  try {
    // Estadísticas de materiales por tipo
    const [liquidos] = await pool.query('SELECT COUNT(*) as total, SUM(cantidad_disponible_ml) as stock FROM MaterialLiquido');
    const [solidos] = await pool.query('SELECT COUNT(*) as total, SUM(cantidad_disponible_g) as stock FROM MaterialSolido');
    const [equipos] = await pool.query('SELECT COUNT(*) as total, SUM(cantidad_disponible_u) as stock FROM MaterialEquipo');
    const [laboratorio] = await pool.query('SELECT COUNT(*) as total, SUM(cantidad_disponible) as stock FROM MaterialLaboratorio');

    // Estadísticas de solicitudes
    const [solicitudes] = await pool.query(`
      SELECT 
        estado,
        COUNT(*) as cantidad
      FROM Solicitud 
      WHERE fecha_solicitud >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY estado
    `);

    // Usuarios por rol
    const [usuarios] = await pool.query(`
      SELECT 
        r.nombre as rol,
        COUNT(*) as cantidad
      FROM Usuario u
      JOIN Rol r ON u.rol_id = r.id
      WHERE u.activo = 1
      GROUP BY r.id, r.nombre
    `);

    // Materiales con stock bajo
    const [stockBajo] = await pool.query(`
      SELECT 
        'liquido' as tipo, COUNT(*) as cantidad FROM MaterialLiquido WHERE cantidad_disponible_ml < 10
      UNION ALL
      SELECT 
        'solido' as tipo, COUNT(*) as cantidad FROM MaterialSolido WHERE cantidad_disponible_g < 10
      UNION ALL
      SELECT 
        'equipo' as tipo, COUNT(*) as cantidad FROM MaterialEquipo WHERE cantidad_disponible_u < 10
      UNION ALL
      SELECT 
        'laboratorio' as tipo, COUNT(*) as cantidad FROM MaterialLaboratorio WHERE cantidad_disponible < 10
    `);

    // Movimientos recientes
    const [movimientos] = await pool.query(`
      SELECT 
        tipo_movimiento,
        COUNT(*) as cantidad,
        SUM(ABS(cantidad)) as total_cantidad
      FROM MovimientosInventario 
      WHERE fecha_movimiento >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY tipo_movimiento
    `);

    const estadisticas = {
      materiales: {
        liquidos: { total: liquidos[0].total, stock: liquidos[0].stock || 0 },
        solidos: { total: solidos[0].total, stock: solidos[0].stock || 0 },
        equipos: { total: equipos[0].total, stock: equipos[0].stock || 0 },
        laboratorio: { total: laboratorio[0].total, stock: laboratorio[0].stock || 0 }
      },
      solicitudes: solicitudes.reduce((acc, sol) => {
        acc[sol.estado] = sol.cantidad;
        return acc;
      }, {}),
      usuarios: usuarios.reduce((acc, user) => {
        acc[user.rol] = user.cantidad;
        return acc;
      }, {}),
      alertas: {
        stockBajo: stockBajo.reduce((acc, item) => {
          acc[item.tipo] = item.cantidad;
          return acc;
        }, {})
      },
      movimientos: movimientos.reduce((acc, mov) => {
        acc[mov.tipo_movimiento] = {
          cantidad: mov.cantidad,
          total_cantidad: mov.total_cantidad
        };
        return acc;
      }, {}),
      resumen: {
        total_materiales: liquidos[0].total + solidos[0].total + equipos[0].total + laboratorio[0].total,
        total_usuarios: usuarios.reduce((sum, user) => sum + user.cantidad, 0),
        total_solicitudes_mes: solicitudes.reduce((sum, sol) => sum + sol.cantidad, 0)
      }
    };

    res.json(estadisticas);
  } catch (error) {
    console.error('[Error] getEstadisticasCompletas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas: ' + error.message });
  }
};

// OBTENER USUARIOS CON PERMISOS
const getUsuariosConPermisos = async (req, res) => {
  logRequest('getUsuariosConPermisos');
  try {
    const [usuarios] = await pool.query(`
      SELECT 
        u.id,
        u.nombre,
        u.correo_institucional,
        r.nombre as rol,
        u.activo,
        COALESCE(p.acceso_chat, FALSE) as acceso_chat,
        COALESCE(p.modificar_stock, FALSE) as modificar_stock,
        p.fecha_actualizacion
      FROM Usuario u
      JOIN Rol r ON u.rol_id = r.id
      LEFT JOIN PermisosAlmacen p ON u.id = p.usuario_id
      ORDER BY r.id, u.nombre
    `);

    res.json(usuarios);
  } catch (error) {
    console.error('[Error] getUsuariosConPermisos:', error);
    res.status(500).json({ error: 'Error al obtener usuarios: ' + error.message });
  }
};

// RESETEAR TODO EL STOCK (EMERGENCIA)
const resetearTodoElStock = async (req, res) => {
  logRequest('resetearTodoElStock');
  const { confirmacion } = req.body;

  if (confirmacion !== 'RESETEAR_STOCK_COMPLETO') {
    return res.status(400).json({ error: 'Confirmación requerida para esta operación crítica' });
  }

  try {
    // Resetear todos los stocks a 0
    await pool.query('UPDATE MaterialLiquido SET cantidad_disponible_ml = 0');
    await pool.query('UPDATE MaterialSolido SET cantidad_disponible_g = 0');
    await pool.query('UPDATE MaterialEquipo SET cantidad_disponible_u = 0');
    await pool.query('UPDATE MaterialLaboratorio SET cantidad_disponible = 0');

    // Registrar la acción crítica
    await pool.query(
      'INSERT INTO MovimientosInventario (usuario_id, material_id, tipo, cantidad, tipo_movimiento, motivo) VALUES (?, ?, ?, ?, ?, ?)',
      [req.usuario.id, 0, 'sistema', 0, 'ajuste', 'RESET COMPLETO DE STOCK - OPERACIÓN DE EMERGENCIA']
    );

    res.json({ 
      message: 'Stock completo reseteado a 0',
      usuario: req.usuario.nombre,
      fecha: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Error] resetearTodoElStock:', error);
    res.status(500).json({ error: 'Error al resetear stock: ' + error.message });
  }
};

// VALIDAR INTEGRIDAD DE DATOS
const validarIntegridadDatos = async (req, res) => {
  logRequest('validarIntegridadDatos');
  try {
    const problemas = [];

    // Verificar stocks negativos
    const [stocksNegativos] = await pool.query(`
      SELECT 'liquido' as tipo, id, nombre, cantidad_disponible_ml as stock 
      FROM MaterialLiquido WHERE cantidad_disponible_ml < 0
      UNION ALL
      SELECT 'solido' as tipo, id, nombre, cantidad_disponible_g as stock 
      FROM MaterialSolido WHERE cantidad_disponible_g < 0
      UNION ALL
      SELECT 'equipo' as tipo, id, nombre, cantidad_disponible_u as stock 
      FROM MaterialEquipo WHERE cantidad_disponible_u < 0
      UNION ALL
      SELECT 'laboratorio' as tipo, id, nombre, cantidad_disponible as stock 
      FROM MaterialLaboratorio WHERE cantidad_disponible < 0
    `);

    if (stocksNegativos.length > 0) {
      problemas.push({
        tipo: 'stocks_negativos',
        cantidad: stocksNegativos.length,
        detalles: stocksNegativos
      });
    }

    // Verificar solicitudes huérfanas
    const [solicitudesHuerfanas] = await pool.query(`
      SELECT s.id, s.folio, s.estado
      FROM Solicitud s
      LEFT JOIN Usuario u ON s.usuario_id = u.id
      WHERE u.id IS NULL
    `);

    if (solicitudesHuerfanas.length > 0) {
      problemas.push({
        tipo: 'solicitudes_huerfanas',
        cantidad: solicitudesHuerfanas.length,
        detalles: solicitudesHuerfanas
      });
    }

    // Verificar adeudos sin solicitud
    const [adeudosHuerfanos] = await pool.query(`
      SELECT a.id, a.usuario_id, a.cantidad_pendiente
      FROM Adeudo a
      LEFT JOIN Solicitud s ON a.solicitud_id = s.id
      WHERE s.id IS NULL
    `);

    if (adeudosHuerfanos.length > 0) {
      problemas.push({
        tipo: 'adeudos_huerfanos',
        cantidad: adeudosHuerfanos.length,
        detalles: adeudosHuerfanos
      });
    }

    // Verificar usuarios sin permisos de almacén
    const [usuariosSinPermisos] = await pool.query(`
      SELECT u.id, u.nombre
      FROM Usuario u
      LEFT JOIN PermisosAlmacen p ON u.id = p.usuario_id
      WHERE u.rol_id = 3 AND p.id IS NULL
    `);

    if (usuariosSinPermisos.length > 0) {
      problemas.push({
        tipo: 'usuarios_sin_permisos',
        cantidad: usuariosSinPermisos.length,
        detalles: usuariosSinPermisos
      });
    }

    res.json({
      estado: problemas.length === 0 ? 'CORRECTO' : 'PROBLEMAS_ENCONTRADOS',
      total_problemas: problemas.length,
      problemas: problemas,
      fecha_verificacion: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Error] validarIntegridadDatos:', error);
    res.status(500).json({ error: 'Error al validar integridad: ' + error.message });
  }
};

// ESTADO DEL SISTEMA
// ESTADO DEL SISTEMA (sin estado de permisos)
const getEstadoSistema = async (req, res) => {
  logRequest('getEstadoSistema');
  try {
    // Información de la base de datos
    const [dbInfo] = await pool.query('SELECT VERSION() as version, NOW() as servidor_tiempo');
    
    // Contadores generales
    const [contadores] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM Usuario WHERE activo = 1) as usuarios_activos,
        (SELECT COUNT(*) FROM Solicitud WHERE fecha_solicitud = CURDATE()) as solicitudes_hoy,
        (SELECT COUNT(*) FROM Mensaje WHERE DATE(fecha_envio) = CURDATE()) as mensajes_hoy,
        (SELECT COUNT(*) FROM MovimientosInventario WHERE DATE(fecha_movimiento) = CURDATE()) as movimientos_hoy
    `);

    // Últimas actividades
    const [ultimasActividades] = await pool.query(`
      SELECT 'solicitud' as tipo, fecha_solicitud as fecha, nombre_alumno as detalle
      FROM Solicitud 
      ORDER BY fecha_solicitud DESC 
      LIMIT 5
    `);

    res.json({
      sistema: {
        version_bd: dbInfo[0].version,
        servidor_tiempo: dbInfo[0].servidor_tiempo,
        uptime: process.uptime(),
        memoria_uso: process.memoryUsage()
      },
      actividad_hoy: {
        usuarios_activos: contadores[0].usuarios_activos,
        solicitudes: contadores[0].solicitudes_hoy,
        mensajes: contadores[0].mensajes_hoy,
        movimientos: contadores[0].movimientos_hoy
      },
      ultimas_actividades: ultimasActividades,
      estado: 'OPERATIVO'
    });

  } catch (error) {
    console.error('[Error] getEstadoSistema:', error);
    res.status(500).json({ error: 'Error al obtener estado del sistema: ' + error.message });
  }
};

// REPORTES ADICIONALES
const getReporteUsoPeriodo = async (req, res) => {
  logRequest('getReporteUsoPeriodo');
  const { fecha_inicio, fecha_fin } = req.query;

  try {
    const [reporte] = await pool.query(`
      SELECT 
        si.tipo,
        COALESCE(ml.nombre, ms.nombre, me.nombre, mlab.nombre) as nombre_material,
        COUNT(*) as veces_solicitado,
        SUM(si.cantidad) as cantidad_total,
        AVG(si.cantidad) as cantidad_promedio
      FROM SolicitudItem si
      JOIN Solicitud s ON si.solicitud_id = s.id
      LEFT JOIN MaterialLiquido ml ON si.tipo = 'liquido' AND si.material_id = ml.id
      LEFT JOIN MaterialSolido ms ON si.tipo = 'solido' AND si.material_id = ms.id
      LEFT JOIN MaterialEquipo me ON si.tipo = 'equipo' AND si.material_id = me.id
      LEFT JOIN MaterialLaboratorio mlab ON si.tipo = 'laboratorio' AND si.material_id = mlab.id
      WHERE s.fecha_solicitud BETWEEN ? AND ?
      GROUP BY si.tipo, si.material_id
      ORDER BY veces_solicitado DESC
    `, [fecha_inicio || '2024-01-01', fecha_fin || new Date().toISOString().split('T')[0]]);

    res.json(reporte);
  } catch (error) {
    console.error('[Error] getReporteUsoPeriodo:', error);
    res.status(500).json({ error: 'Error al generar reporte: ' + error.message });
  }
};

const getReporteMasSolicitados = async (req, res) => {
  logRequest('getReporteMasSolicitados');
  try {
    const [reporte] = await pool.query(`
      SELECT 
        si.tipo,
        COALESCE(ml.nombre, ms.nombre, me.nombre, mlab.nombre) as nombre_material,
        COUNT(*) as total_solicitudes,
        SUM(si.cantidad) as cantidad_total
      FROM SolicitudItem si
      JOIN Solicitud s ON si.solicitud_id = s.id
      LEFT JOIN MaterialLiquido ml ON si.tipo = 'liquido' AND si.material_id = ml.id
      LEFT JOIN MaterialSolido ms ON si.tipo = 'solido' AND si.material_id = ms.id
      LEFT JOIN MaterialEquipo me ON si.tipo = 'equipo' AND si.material_id = me.id
      LEFT JOIN MaterialLaboratorio mlab ON si.tipo = 'laboratorio' AND si.material_id = mlab.id
      WHERE s.fecha_solicitud >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
      GROUP BY si.tipo, si.material_id
      ORDER BY total_solicitudes DESC
      LIMIT 20
    `);

    res.json(reporte);
  } catch (error) {
    console.error('[Error] getReporteMasSolicitados:', error);
    res.status(500).json({ error: 'Error al generar reporte: ' + error.message });
  }
};

const getReporteEficienciaEntrega = async (req, res) => {
  logRequest('getReporteEficienciaEntrega');
  try {
    const [reporte] = await pool.query(`
      SELECT 
        DATE(s.fecha_solicitud) as fecha,
        COUNT(*) as total_solicitudes,
        SUM(CASE WHEN s.estado = 'entregado' THEN 1 ELSE 0 END) as entregadas,
        SUM(CASE WHEN s.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        ROUND((SUM(CASE WHEN s.estado = 'entregado' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 2) as porcentaje_eficiencia
      FROM Solicitud s
      WHERE s.fecha_solicitud >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(s.fecha_solicitud)
      ORDER BY fecha DESC
    `);

    res.json(reporte);
  } catch (error) {
    console.error('[Error] getReporteEficienciaEntrega:', error);
    res.status(500).json({ error: 'Error al generar reporte: ' + error.message });
  }
};

/**
 * ========================================
 * EXPORTS
 * ========================================
 */
module.exports = {
  // Catálogo de materiales por tipo
  getLiquidos,
  getSolidos,
  getEquipos,
  getLaboratorio,
  
  // Materiales generales
  getMaterials,
  getMaterialById,
  
  // CRUD de materiales
  crearMaterial,
  actualizarMaterial,
  eliminarMaterial,
  
  // Gestión de stock
  actualizarStock,
  registrarEntradaStock,
  registrarSalidaStock,
  adjustInventory,
  ajusteMasivoStock,
  getMaterialesStockBajo,
  
  // Solicitudes - CRUD
  crearSolicitudes,
  crearSolicitudConAdeudo,
  getAllSolicitudes,
  getUserSolicitudes,
  getApprovedSolicitudes,
  getPendingSolicitudes,
  getDeliveredSolicitudes,
  getSolicitudDetalle,
  
  // Acciones sobre solicitudes
  approveSolicitud,
  rejectSolicitud,
  deliverSolicitud,
  cancelSolicitud,
  
  // Categorías
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  getCategorias,
  
  // Estadísticas y reportes
  getEstadisticas,
  getEstadisticasCompletas,
  getHistorialMovimientos,
  getReporteUsoPeriodo,
  getReporteMasSolicitados,
  obtenerDocentesParaSolicitud,
  getReporteEficienciaEntrega,
  
  // Usuarios y permisos
  getUsuariosConPermisos,
  
  // Sistema y administración
  getEstadoSistema,
  validarIntegridadDatos,
  resetearTodoElStock
};
