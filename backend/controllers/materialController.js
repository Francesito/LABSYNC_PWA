/**
 * ==========================================================================================
 * LabSync - Controlador de Materiales
 * ==========================================================================================
 *
 * Soporta:
 * - Subtablas MaterialLiquido, MaterialSolido, MaterialEquipo, MaterialLaboratorio
 * - Solicitudes agrupadas con stock por tipo
 * - Ajuste de inventario robusto con validación
 * - LEFT JOIN dinámico para resolver nombre del material
 *
 * Versión: Extensiva (>400 líneas) para compatibilidad total
 * Autor: ChatGPT Asistente
 * Fecha: 2025
 *
 * ==========================================================================================
 */

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
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [MaterialController] >> ${name}`);
}

/** Detectar tabla y campo de stock según tipo de material */
function detectTableAndField(tipo) {
  switch (tipo) {
    case 'liquido': return { table: 'MaterialLiquido', field: 'cantidad_disponible_ml' };
    case 'solido':  return { table: 'MaterialSolido',  field: 'cantidad_disponible_g'  };
    case 'equipo':  return { table: 'MaterialEquipo', field: 'cantidad_disponible_u' };
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
    COALESCE(ml.nombre, ms.nombre, me.nombre, mlab.nombre) AS nombre_material
  FROM Solicitud s
  JOIN SolicitudItem si ON s.id = si.solicitud_id
  LEFT JOIN MaterialLiquido ml ON si.tipo = 'liquido' AND si.material_id = ml.id
  LEFT JOIN MaterialSolido  ms ON si.tipo = 'solido'  AND si.material_id = ms.id
  LEFT JOIN MaterialEquipo me ON si.tipo = 'equipo'  AND si.material_id = me.id
  LEFT JOIN MaterialLaboratorio mlab ON si.tipo = 'laboratorio' AND si.material_id = mlab.id
  WHERE 1=1
  /*AND_CONDITION*/
`;

/**
 * ========================================
 * RUTAS DE CATALOGO: GET por tipo
 * ========================================
 */

const crearMaterial = async (req, res) => {
  try {
    const { tipo, nombre, cantidad } = req.body;
    const meta = detectTableAndField(tipo);
    if (!meta) return res.status(400).json({ error: 'Tipo de material inválido' });
    const [result] = await pool.query(
      `INSERT INTO ${meta.table} (nombre, ${meta.field}) VALUES (?, ?)`,
      [nombre, cantidad]
    );
    res.status(201).json({ message: 'Material creado', id: result.insertId });
  } catch (error) {
    console.error('[Error] crearMaterial:', error);
    res.status(500).json({ error: 'Error al crear material' });
  }
};

const getReporteUsoPeriodo = async (req, res) => {
  try {
    const { inicio, fin } = req.query; // Espera parámetros de fecha (ejemplo: ?inicio=2025-07-01&fin=2025-07-31)
    if (!inicio || !fin) {
      return res.status(400).json({ error: 'Parámetros "inicio" y "fin" son requeridos' });
    }

    // Ejemplo: Consulta un reporte de uso por período (ajusta según tu esquema)
    const [reporte] = await pool.query(`
      SELECT 
        m.nombre AS material_nombre,
        COUNT(s.id) AS solicitudes,
        SUM(s.cantidad) AS cantidad_total
      FROM Solicitudes s
      JOIN Material m ON s.material_id = m.id
      WHERE s.fecha BETWEEN ? AND ?
      GROUP BY m.nombre
      ORDER BY cantidad_total DESC
    `, [inicio, fin]);
    res.status(200).json({ reporte });
  } catch (error) {
    console.error('[Error] getReporteUsoPeriodo:', error);
    res.status(500).json({ error: 'Error al obtener reporte de uso por período' });
  }
};

const registrarEntradaStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, tipo } = req.body;
    const meta = detectTableAndField(tipo);
    if (!meta) return res.status(400).json({ error: 'Tipo de material inválido' });
    await pool.query(
      `UPDATE ${meta.table} SET ${meta.field} = ${meta.field} + ? WHERE id = ?`,
      [cantidad, id]
    );
    res.status(200).json({ message: 'Entrada de stock registrada' });
  } catch (error) {
    console.error('[Error] registrarEntradaStock:', error);
    res.status(500).json({ error: 'Error al registrar entrada' });
  }
};

const registrarSalidaStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, tipo } = req.body;
    const meta = detectTableAndField(tipo);
    if (!meta) return res.status(400).json({ error: 'Tipo de material inválido' });
    const [stock] = await pool.query(`SELECT ${meta.field} FROM ${meta.table} WHERE id = ?`, [id]);
    if (stock[0][meta.field] < cantidad) return res.status(400).json({ error: 'Stock insuficiente' });
    await pool.query(
      `UPDATE ${meta.table} SET ${meta.field} = ${meta.field} - ? WHERE id = ?`,
      [cantidad, id]
    );
    res.status(200).json({ message: 'Salida de stock registrada' });
  } catch (error) {
    console.error('[Error] registrarSalidaStock:', error);
    res.status(500).json({ error: 'Error al registrar salida' });
  }
};

const getUsuariosConPermisos = async (req, res) => {
  try {
    // Consulta para obtener usuarios con sus permisos (ajusta según tu esquema)
    const [usuarios] = await pool.query(`
      SELECT u.id, u.nombre, u.correo_institucional, u.rol_id, r.nombre AS rol_nombre,
             p.acceso_chat, p.modificar_stock
      FROM Usuario u
      LEFT JOIN PermisosAlmacen p ON u.id = p.usuario_id
      JOIN Rol r ON u.rol_id = r.id
      ORDER BY u.rol_id, u.nombre
    `);
    res.status(200).json({ usuarios });
  } catch (error) {
    console.error('[Error] getUsuariosConPermisos:', error);
    res.status(500).json({ error: 'Error al obtener usuarios con permisos' });
  }
};

const resetearTodoElStock = async (req, res) => {
  try {
    await pool.query('UPDATE MaterialLiquido SET cantidad_disponible_ml = 0');
    await pool.query('UPDATE MaterialSolido SET cantidad_disponible_g = 0');
    await pool.query('UPDATE MaterialEquipo SET cantidad_disponible_u = 0');
    await pool.query('UPDATE MaterialLaboratorio SET cantidad_disponible = 0');
    res.status(200).json({ message: 'Stock reseteado completamente' });
  } catch (error) {
    console.error('[Error] resetearTodoElStock:', error);
    res.status(500).json({ error: 'Error al resetear stock' });
  }
};

const getHistorialMovimientos = async (req, res) => {
  res.status(200).json({ message: 'Historial de movimientos no implementado aún' });
};

const getEstadisticasCompletas = async (req, res) => {
  try {
    // Ejemplo: Consulta estadísticas agregadas (ajusta según tu esquema)
    const [stats] = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM Usuario WHERE rol_id = 1) AS alumnos,
        (SELECT COUNT(*) FROM Usuario WHERE rol_id = 2) AS docentes,
        (SELECT COUNT(*) FROM Usuario WHERE rol_id = 3) AS almacenes,
        (SELECT COUNT(*) FROM Usuario WHERE rol_id = 4) AS administradores,
        (SELECT COUNT(*) FROM Solicitudes WHERE estado = 'pendiente') AS solicitudes_pendientes,
        (SELECT COUNT(*) FROM Solicitudes WHERE estado = 'aprobada') AS solicitudes_aprobadas,
        (SELECT COUNT(*) FROM Solicitudes WHERE estado = 'entregada') AS solicitudes_entregadas
    `);
    res.status(200).json({ estadisticas: stats[0] });
  } catch (error) {
    console.error('[Error] getEstadisticasCompletas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas completas' });
  }
};

const actualizarMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, cantidad, tipo } = req.body;
    const meta = detectTableAndField(tipo);
    if (!meta) return res.status(400).json({ error: 'Tipo de material inválido' });
    await pool.query(
      `UPDATE ${meta.table} SET nombre = ?, ${meta.field} = ? WHERE id = ?`,
      [nombre, cantidad, id]
    );
    res.status(200).json({ message: 'Material actualizado' });
  } catch (error) {
    console.error('[Error] actualizarMaterial:', error);
    res.status(500).json({ error: 'Error al actualizar material' });
  }
};

const eliminarMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const { tipo } = req.query;
    const meta = detectTableAndField(tipo);
    if (!meta) return res.status(400).json({ error: 'Tipo de material inválido' });
    await pool.query(`DELETE FROM ${meta.table} WHERE id = ?`, [id]);
    res.status(200).json({ message: 'Material eliminado' });
  } catch (error) {
    console.error('[Error] eliminarMaterial:', error);
    res.status(500).json({ error: 'Error al eliminar material' });
  }
};

const actualizarStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, tipo } = req.body;
    const meta = detectTableAndField(tipo);
    if (!meta) return res.status(400).json({ error: 'Tipo de material inválido' });
    await pool.query(
      `UPDATE ${meta.table} SET ${meta.field} = ? WHERE id = ?`,
      [cantidad, id]
    );
    res.status(200).json({ message: 'Stock actualizado' });
  } catch (error) {
    console.error('[Error] actualizarStock:', error);
    res.status(500).json({ error: 'Error al actualizar stock' });
  }
};

/** Obtener líquidos */
const getLiquidos = async (req, res) => {
  logRequest('getLiquidos');
  try {
    const [rows] = await pool.query('SELECT * FROM MaterialLiquido');
    res.json(rows);
  } catch (error) {
    console.error('[Error] getLiquidos:', error);
    res.status(500).json({ error: 'Error al obtener materiales líquidos' });
  }
};

/** Obtener sólidos */
const getSolidos = async (req, res) => {
  logRequest('getSolidos');
  try {
    const [rows] = await pool.query('SELECT * FROM MaterialSolido');
    res.json(rows);
  } catch (error) {
    console.error('[Error] getSolidos:', error);
    res.status(500).json({ error: 'Error al obtener materiales sólidos' });
  }
};

/** Obtener equipos */
const getEquipos = async (req, res) => {
  logRequest('getEquipos');
  try {
    const [rows] = await pool.query('SELECT * FROM MaterialEquipo');
    res.json(rows);
  } catch (error) {
    console.error('[Error] getEquipos:', error);
    res.status(500).json({ error: 'Error al obtener equipos' });
  }
};

/** Obtener materiales de laboratorio */
const getLaboratorio = async (req, res) => {
  logRequest('getLaboratorio');
  try {
    const [rows] = await pool.query('SELECT * FROM MaterialLaboratorio');
    res.json(rows);
  } catch (error) {
    console.error('[Error] getLaboratorio:', error);
    res.status(500).json({ error: 'Error al obtener materiales de laboratorio' });
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

/**
 * Obtener TODAS las solicitudes (para DOCENTE)
 */
const getAllSolicitudes = async (req, res) => {
  logRequest('getAllSolicitudes');
  try {
    const query = SELECT_SOLICITUDES_CON_NOMBRE.replace('/*AND_CONDITION*/', '') + ' ORDER BY s.fecha_solicitud DESC';
    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('[Error] getAllSolicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

/** Crear solicitud (alumno/docente) con folio */
const crearSolicitudes = async (req, res) => {
  logRequest('crearSolicitudes');
  const token = req.headers.authorization?.split(' ')[1];
  const { materiales, motivo, fecha_solicitud, aprobar_automatico } = req.body;

  if (!token) return res.status(401).json({ error: 'Token requerido' });
  if (!Array.isArray(materiales) || materiales.length === 0) {
    return res.status(400).json({ error: 'Se requiere al menos un material' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const usuario_id = decoded.id;
    const rol_id = decoded.rol_id;

    console.log('[DEBUG] Usuario decodificado:', { usuario_id, rol_id });

    if (![1, 2].includes(rol_id)) {
      return res.status(403).json({ error: 'Solo alumnos o docentes pueden crear solicitudes' });
    }

    // Verificar si el alumno tiene adeudos pendientes
    if (rol_id === 1) {
      const [adeudos] = await pool.query(
        'SELECT COUNT(*) as count FROM Adeudo WHERE usuario_id = ? AND cantidad_pendiente > 0',
        [usuario_id]
      );
      
      if (adeudos[0].count > 0) {
        return res.status(400).json({ error: 'No puedes crear solicitudes mientras tengas adeudos pendientes' });
      }
    }

    const [user] = await pool.query('SELECT nombre FROM Usuario WHERE id = ?', [usuario_id]);
    if (!user.length) return res.status(404).json({ error: 'Usuario no encontrado' });

    const folio = generarFolio();
    const estadoInicial = (rol_id === 2 || aprobar_automatico) ? 'aprobada' : 'pendiente';
    let docente_id = null, profesor = 'Sin asignar';
    
    if (estadoInicial === 'aprobada') {
      docente_id = usuario_id; 
      profesor = user[0].nombre;
    } else {
      const [docente] = await pool.query('SELECT id, nombre FROM Usuario WHERE rol_id = 2 LIMIT 1');
      docente_id = docente[0]?.id; 
      profesor = docente[0]?.nombre || profesor;
    }

    console.log('[DEBUG] Creando solicitud con estado:', estadoInicial);

    const [result] = await pool.query(
      `INSERT INTO Solicitud
         (usuario_id, fecha_solicitud, motivo, estado, docente_id, nombre_alumno, profesor, folio)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuario_id, fecha_solicitud, motivo, estadoInicial, docente_id, user[0].nombre, profesor, folio]
    );
    const solicitudId = result.insertId;

    // Verificar stock y crear items
    for (const mat of materiales) {
      const { material_id, cantidad, tipo } = mat;
      
      // Verificar stock disponible
      const meta = detectTableAndField(tipo);
      if (!meta) {
        return res.status(400).json({ error: `Tipo de material inválido: ${tipo}` });
      }

      const [stockResult] = await pool.query(
        `SELECT ${meta.field} FROM ${meta.table} WHERE id = ?`,
        [material_id]
      );

      if (!stockResult.length) {
        return res.status(404).json({ error: `Material no encontrado: ${material_id}` });
      }

      const stockDisponible = stockResult[0][meta.field];
      if (stockDisponible < cantidad) {
        return res.status(400).json({ 
          error: `Stock insuficiente para el material ${material_id}. Disponible: ${stockDisponible}, Solicitado: ${cantidad}` 
        });
      }

      // Crear item de solicitud
      await pool.query(
        `INSERT INTO SolicitudItem (solicitud_id, material_id, tipo, cantidad) VALUES (?,?,?,?)`,
        [solicitudId, material_id, tipo, cantidad]
      );

      // Si es alumno con solicitud pendiente, descontar del stock
      if (rol_id === 1 && estadoInicial === 'pendiente') {
        await pool.query(
          `UPDATE ${meta.table} SET ${meta.field} = ${meta.field} - ? WHERE id = ?`,
          [cantidad, material_id]
        );
        console.log(`[DEBUG] Stock descontado para material ${material_id}: ${cantidad}`);
      }
    }

    console.log('[DEBUG] Solicitud creada exitosamente:', { solicitudId, folio });
    res.status(201).json({ message: 'Solicitud creada', solicitudId, folio });
  } catch(err) {
    console.error('[Error] crearSolicitudes:', err);
    res.status(500).json({ error: 'Error al registrar solicitud' });
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
  const { usuario_id, material_id, tipo, fecha_solicitud, motivo, monto_adeudo } = req.body;

  if (!usuario_id || !material_id || !tipo || !fecha_solicitud || !motivo || !monto_adeudo) {
    return res.status(400).json({ error: 'Faltan datos obligatorios para la solicitud con adeudo' });
  }

  try {
    const [user] = await pool.query('SELECT nombre, rol_id FROM Usuario WHERE id = ?', [usuario_id]);
    if (!user.length) return res.status(404).json({ error: 'Usuario no encontrado' });
    if (user[0].rol_id !== 1) return res.status(403).json({ error: 'Solo alumnos pueden crear solicitudes con adeudo' });

    const meta = detectTableAndField(tipo);
    if (!meta) return res.status(400).json({ error: 'Tipo de material inválido' });

    const [material] = await pool.query(`SELECT ${meta.field} FROM ${meta.table} WHERE id = ?`, [material_id]);
    if (!material.length) return res.status(404).json({ error: 'Material no encontrado' });
    if (material[0][meta.field] < 1) {
      return res.status(400).json({ error: 'No hay suficiente stock para el material' });
    }

    const [docente] = await pool.query('SELECT id, nombre FROM Usuario WHERE rol_id = 2 LIMIT 1');
    const docente_id = docente[0]?.id || null;
    const profesor = docente[0]?.nombre || 'Sin asignar';

    const folio = generarFolio();

    const [result] = await pool.query(
      `INSERT INTO Solicitud 
        (usuario_id, fecha_solicitud, motivo, monto_adeudo, estado, docente_id, nombre_alumno, profesor, folio)
       VALUES (?, ?, ?, ?, 'pendiente', ?, ?, ?, ?)`,
      [usuario_id, fecha_solicitud, motivo, monto_adeudo, docente_id, user[0].nombre, profesor, folio]
    );

    const solicitudId = result.insertId;

    await pool.query(
      `INSERT INTO SolicitudItem (solicitud_id, material_id, tipo, cantidad) VALUES (?,?,?,?)`,
      [solicitudId, material_id, tipo, 1]
    );

    res.status(201).json({ message: 'Solicitud con adeudo registrada correctamente' });
  } catch (error) {
    console.error('[Error] crearSolicitudConAdeudo:', error);
    res.status(500).json({ error: 'Error al crear solicitud con adeudo' });
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
 * Obtener solicitudes del usuario
 */
const getUserSolicitudes = async (req, res) => {
  logRequest('getUserSolicitudes');
  const token = req.headers.authorization?.split(' ')[1];

  try {
    const { id: usuario_id } = jwt.verify(token, process.env.JWT_SECRET);

    // Reemplaza el marcador del WHERE
    const query = SELECT_SOLICITUDES_CON_NOMBRE.replace(
      '/*AND_CONDITION*/',
      `AND s.usuario_id = ?`
    ) + ' ORDER BY s.fecha_solicitud DESC';

    const [rows] = await pool.query(query, [usuario_id]);
    res.json(rows);
  } catch (error) {
    console.error('[Error] getUserSolicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

/**
 * Obtener solicitudes aprobadas
 */
const getApprovedSolicitudes = async (req, res) => {
  logRequest('getApprovedSolicitudes');

  try {
    // Inserta la condición AND para el estado aprobado
    const query = SELECT_SOLICITUDES_CON_NOMBRE.replace(
      '/*AND_CONDITION*/',
      "AND s.estado = 'aprobada'"
    ) + ' ORDER BY s.fecha_solicitud DESC';

    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('[Error] getApprovedSolicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes aprobadas' });
  }
};

/**
 * Obtener solicitudes pendientes
 */
const getPendingSolicitudes = async (req, res) => {
  logRequest('getPendingSolicitudes');

  try {
    const query = SELECT_SOLICITUDES_CON_NOMBRE.replace(
      '/*AND_CONDITION*/',
      "AND s.estado = 'pendiente'"
    ) + ' ORDER BY s.fecha_solicitud DESC';

    const [rows] = await pool.query(query);
    res.json(rows);
  } catch (error) {
    console.error('[Error] getPendingSolicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes pendientes' });
  }
};

/**
 * ========================================
 * ACCIONES SOBRE SOLICITUDES
 * ========================================
 */

/**
 * Aprobar solicitud
 */
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
    res.status(500).json({ error: 'Error al aprobar solicitud' });
  }
};

/**
 * Rechazar solicitud
 */
const rejectSolicitud = async (req, res) => {
  const { id } = req.params;
  logRequest(`rejectSolicitud - ID=${id}`);
  
  try {
    // Verificar que la solicitud existe y obtener sus items para restaurar stock
    const [solicitud] = await pool.query('SELECT estado, usuario_id FROM Solicitud WHERE id = ?', [id]);
    if (!solicitud.length) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    // Si la solicitud estaba pendiente, restaurar el stock (porque se había descontado al crearla)
    if (solicitud[0].estado === 'pendiente') {
      const [items] = await pool.query(
        'SELECT material_id, tipo, cantidad FROM SolicitudItem WHERE solicitud_id = ?',
        [id]
      );

      for (const item of items) {
        const meta = detectTableAndField(item.tipo);
        if (meta) {
          await pool.query(
            `UPDATE ${meta.table} SET ${meta.field} = ${meta.field} + ? WHERE id = ?`,
            [item.cantidad, item.material_id]
          );
        }
      }
    }

    await pool.query('UPDATE Solicitud SET estado = ? WHERE id = ?', ['rechazada', id]);
    res.status(200).json({ message: 'Solicitud rechazada' });
  } catch (error) {
    console.error('[Error] rejectSolicitud:', error);
    res.status(500).json({ error: 'Error al rechazar solicitud' });
  }
};

/**
 * Marcar como entregada
 */
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
         VALUES (?,         ?,                  ?,          ?,           ?,        ?,                 NOW())`,
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
      .json({ error: 'Error al entregar solicitud' });
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
    res.status(500).json({ error: 'Error al cancelar solicitud' });
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

  try {
    const { rol_id } = jwt.verify(token, process.env.JWT_SECRET);
    if (rol_id !== 3) return res.status(403).json({ error: 'Solo almacenistas pueden ajustar inventario' });

    if (isNaN(cantidad)) return res.status(400).json({ error: 'Cantidad debe ser un número válido' });

    let meta = detectTableAndField(tipo);
    if (!meta) return res.status(400).json({ error: 'Tipo de material inválido' });

    const [material] = await pool.query(`SELECT ${meta.field} FROM ${meta.table} WHERE id = ?`, [id]);
    if (!material.length) return res.status(404).json({ error: 'Material no encontrado' });

    if (cantidad < 0) return res.status(400).json({ error: 'La cantidad no puede ser negativa' });

    await pool.query(`UPDATE ${meta.table} SET ${meta.field} = ? WHERE id = ?`, [cantidad, id]);
    res.status(200).json({ message: 'Inventario actualizado correctamente', nuevoStock: cantidad });
  } catch (error) {
    console.error('[Error] adjustInventory:', error);
    res.status(500).json({ error: 'Error al ajustar inventario' });
  }
};

const getMaterials = async (req, res) => {
  logRequest('getMaterials');
  try {
    const [liquidos] = await pool.query('SELECT id, nombre, "liquido" AS tipo FROM MaterialLiquido');
    const [solidos] = await pool.query('SELECT id, nombre, "solido" AS tipo FROM MaterialSolido');
    const [laboratorio] = await pool.query('SELECT id, nombre, "laboratorio" AS tipo FROM MaterialLaboratorio');
    const [equipos] = await pool.query('SELECT id, nombre, "equipo" AS tipo FROM MaterialEquipo');

    const materials = [...liquidos, ...solidos, ...laboratorio, ...equipos];
    res.json(materials);
  } catch (error) {
    console.error('[Error] getMaterials:', error);
    res.status(500).json({ error: 'Error al obtener materiales' });
  }
};

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
    res.status(500).json({ error: 'Error al obtener material' });
  }
};

/**
 * Listar solicitudes entregadas **con** adeudos pendientes (solo almacenistas)
 */
const getDeliveredSolicitudes = async (req, res) => {
  logRequest('getDeliveredSolicitudes');
  try {
    const [rows] = await pool.query(`
      SELECT
        s.id AS solicitud_id,
        s.folio,
        s.nombre_alumno,
        s.profesor,
        -- Tomamos la fecha de entrega del primer adeudo (insertada en deliverSolicitud)
        MIN(a.fecha_entrega) AS fecha_entrega 
      FROM Solicitud s
      JOIN Adeudo a
        ON a.solicitud_id = s.id
      GROUP BY
        s.id,
        s.folio,
        s.nombre_alumno,
        s.profesor
      ORDER BY fecha_entrega DESC
    `);
    res.json(rows);
  } catch (error) {
    console.error('[Error] getDeliveredSolicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes entregadas' });
  }
};

/**
 * ========================================
 * Obtener detalle de una solicitud entregada
 * ========================================
 */
const getSolicitudDetalle = async (req, res) => {
  logRequest(`getSolicitudDetalle - ID=${req.params.id}`);
  try {
    const { id } = req.params;

    // 1) Cabecera: folio, alumno, profesor y fecha_entrega (tomada del primer adeudo)
    const [solRows] = await pool.query(
      `SELECT 
         s.id AS solicitud_id,
         s.folio,
         s.nombre_alumno,
         s.profesor,
         /* Fecha de entrega = máxima fecha_entrega en los adeudos */
         (SELECT MAX(a.fecha_entrega) 
            FROM Solicitud s
      WHERE s.id = ?`,
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
    res.status(500).json({ error: 'Error al obtener detalle de solicitud' });
  }
};

/**
 * ========================================
 * EXPORTS
 * ========================================
 */
module.exports = {
  getMaterials,
  getDeliveredSolicitudes,
  getAllSolicitudes,
  getMaterialById,
  getLiquidos,
  getSolidos,
  getLaboratorio,
  getEquipos,
  crearSolicitudes,
  crearSolicitudConAdeudo,
  getUserSolicitudes,
  getApprovedSolicitudes,
  getPendingSolicitudes,
  approveSolicitud,
  rejectSolicitud,
  deliverSolicitud,
  getSolicitudDetalle,
  cancelSolicitud,
  adjustInventory,
  crearMaterial,
  registrarEntradaStock,
  getEstadisticasCompletas,
  registrarSalidaStock,
  resetearTodoElStock,
  actualizarMaterial,
  getUsuariosConPermisos,
  getReporteUsoPeriodo,
  eliminarMaterial,
  actualizarStock,
  getHistorialMovimientos
}; 
