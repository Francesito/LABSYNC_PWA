//backend/controllers/solicitudController.js
const pool = require('../config/db');

// Crear solicitud sin adeudo

const obtenerMisSolicitudes = async (req, res) => {
  try {
    const { id: usuarioId } = req.usuario;
    
    const [rows] = await pool.query(`
      SELECT 
        s.id AS solicitud_id,
        s.fecha_solicitud,
        s.estado,
        s.motivo,
        s.folio,
        si.id AS item_id,
        si.material_id,
        si.cantidad,
        si.cantidad_devuelta,
        si.tipo,
        CASE 
          WHEN si.tipo = 'liquido' THEN ml.nombre
          WHEN si.tipo = 'solido' THEN ms.nombre
          WHEN si.tipo = 'equipo' THEN me.nombre
        END AS nombre_material
      FROM Solicitud s
      JOIN SolicitudItem si ON s.id = si.solicitud_id
      LEFT JOIN MaterialLiquido ml ON si.material_id = ml.id AND si.tipo = 'liquido'
      LEFT JOIN MaterialSolido ms ON si.material_id = ms.id AND si.tipo = 'solido'
      LEFT JOIN MaterialEquipo me ON si.material_id = me.id AND si.tipo = 'equipo'
      WHERE s.usuario_id = ?
      ORDER BY s.fecha_solicitud DESC
    `, [usuarioId]);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener solicitudes por rango de fechas:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

const obtenerGrupoPorUsuario = async (req, res) => {
  const { id: usuarioId } = req.usuario;

  try {
    const [rows] = await pool.query(`
      SELECT g.nombre
      FROM Grupo g
      JOIN Usuario u ON g.id = u.grupo_id
      WHERE u.id = ?
    `, [usuarioId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Grupo no encontrado para el usuario' });
    }

    res.json({ nombre: rows[0].nombre });
  } catch (error) {
    console.error('Error al obtener el grupo:', error);
    res.status(500).json({ error: 'Error al obtener el grupo' });
  }
};

const cancelarMiSolicitud = async (req, res) => {
  const { id } = req.params;
  const { id: usuarioId } = req.usuario;

  try {
    // Verificar que la solicitud pertenece al usuario y está en estado válido para cancelar
    const [solicitud] = await pool.query(
      'SELECT estado FROM Solicitud WHERE id = ? AND usuario_id = ?',
      [id, usuarioId]
    );

    if (solicitud.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    if (!['pendiente', 'aprobada'].includes(solicitud[0].estado)) {
      return res.status(400).json({ error: 'No se puede cancelar una solicitud en este estado' });
    }

    await pool.query(
      'UPDATE Solicitud SET estado = ? WHERE id = ? AND usuario_id = ?',
      ['cancelado', id, usuarioId]
    );

    res.json({ mensaje: 'Solicitud cancelada correctamente' });
  } catch (error) {
    console.error('Error al cancelar solicitud:', error);
    res.status(500).json({ error: 'Error al cancelar solicitud' });
  }
};

// ========================================
// FUNCIONES PARA DOCENTES
// ========================================

const obtenerTodasSolicitudes = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.id AS solicitud_id,
        s.usuario_id,
        s.nombre_alumno,
        s.profesor,
        s.fecha_solicitud,
        s.estado,
        s.motivo,
        s.folio,
        u.nombre AS nombre_usuario,
        u.correo_institucional,
        g.nombre AS grupo_nombre,
        si.id AS item_id,
        si.material_id,
        si.cantidad,
        si.cantidad_devuelta,
        si.tipo,
        CASE 
          WHEN si.tipo = 'liquido' THEN ml.nombre
          WHEN si.tipo = 'solido' THEN ms.nombre
          WHEN si.tipo = 'equipo' THEN me.nombre
        END AS nombre_material
      FROM Solicitud s
      JOIN Usuario u ON s.usuario_id = u.id
      LEFT JOIN Grupo g ON u.grupo_id = g.id
      JOIN SolicitudItem si ON s.id = si.solicitud_id
      LEFT JOIN MaterialLiquido ml ON si.material_id = ml.id AND si.tipo = 'liquido'
      LEFT JOIN MaterialSolido ms ON si.material_id = ms.id AND si.tipo = 'solido'
      LEFT JOIN MaterialEquipo me ON si.material_id = me.id AND si.tipo = 'equipo'
      ORDER BY s.fecha_solicitud DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener todas las solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

const obtenerSolicitudesPendientesAprobacion = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.id AS solicitud_id,
        s.usuario_id,
        s.nombre_alumno,
        s.profesor,
        s.fecha_solicitud,
        s.motivo,
        s.folio,
        u.nombre AS nombre_usuario,
        u.correo_institucional,
        si.id AS item_id,
        si.material_id,
        si.cantidad,
        si.tipo,
        CASE 
          WHEN si.tipo = 'liquido' THEN ml.nombre
          WHEN si.tipo = 'solido' THEN ms.nombre
          WHEN si.tipo = 'equipo' THEN me.nombre
        END AS nombre_material
      FROM Solicitud s
      JOIN Usuario u ON s.usuario_id = u.id
      JOIN SolicitudItem si ON s.id = si.solicitud_id
      LEFT JOIN MaterialLiquido ml ON si.material_id = ml.id AND si.tipo = 'liquido'
      LEFT JOIN MaterialSolido ms ON si.material_id = ms.id AND si.tipo = 'solido'
      LEFT JOIN MaterialEquipo me ON si.material_id = me.id AND si.tipo = 'equipo'
      WHERE s.estado = 'pendiente'
      ORDER BY s.fecha_solicitud ASC
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener solicitudes pendientes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes pendientes' });
  }
};

// ========================================
// FUNCIONES PARA ALMACENISTAS
// ========================================

const obtenerSolicitudesAprobadasPendientes = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.id AS solicitud_id,
        s.usuario_id,
        s.nombre_alumno,
        s.profesor,
        s.fecha_solicitud,
        s.motivo,
        s.folio,
        u.nombre AS nombre_usuario,
        u.correo_institucional,
        g.nombre AS grupo_nombre,
        si.id AS item_id,
        si.material_id,
        si.cantidad,
        si.tipo,
        CASE 
          WHEN si.tipo = 'liquido' THEN ml.nombre
          WHEN si.tipo = 'solido' THEN ms.nombre
          WHEN si.tipo = 'equipo' THEN me.nombre
        END AS nombre_material,
        CASE 
          WHEN si.tipo = 'liquido' THEN ml.cantidad_disponible_ml
          WHEN si.tipo = 'solido' THEN ms.cantidad_disponible_g
          WHEN si.tipo = 'equipo' THEN me.cantidad_disponible_u
        END AS cantidad_disponible
      FROM Solicitud s
      JOIN Usuario u ON s.usuario_id = u.id
      LEFT JOIN Grupo g ON u.grupo_id = g.id
      JOIN SolicitudItem si ON s.id = si.solicitud_id
      LEFT JOIN MaterialLiquido ml ON si.material_id = ml.id AND si.tipo = 'liquido'
      LEFT JOIN MaterialSolido ms ON si.material_id = ms.id AND si.tipo = 'solido'
      LEFT JOIN MaterialEquipo me ON si.material_id = me.id AND si.tipo = 'equipo'
      WHERE s.estado = 'aprobada'
      ORDER BY s.fecha_solicitud ASC
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener solicitudes aprobadas pendientes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

const obtenerSolicitudes = async (req, res) => {
  try {
    const { id: usuarioId, rol_id } = req.usuario;

    let baseQuery = `
      SELECT 
        s.id AS solicitud_id,
        s.usuario_id,
        s.nombre_alumno,
        s.profesor,
        s.fecha_solicitud,
        s.estado,
        g.nombre AS grupo_nombre,
        si.id AS item_id,
        si.material_id,
        si.cantidad,
        si.tipo,
        CASE 
          WHEN si.tipo = 'liquido' THEN ml.nombre
          WHEN si.tipo = 'solido' THEN ms.nombre
          WHEN si.tipo = 'equipo' THEN me.nombre
        END AS nombre_material
      FROM Solicitud s
      JOIN Usuario u ON s.usuario_id = u.id
      LEFT JOIN Grupo g ON u.grupo_id = g.id
      JOIN SolicitudItem si ON s.id = si.solicitud_id
      LEFT JOIN MaterialLiquido ml ON si.material_id = ml.id AND si.tipo = 'liquido'
      LEFT JOIN MaterialSolido ms ON si.material_id = ms.id AND si.tipo = 'solido'
      LEFT JOIN MaterialEquipo me ON si.material_id = me.id AND si.tipo = 'equipo'
    `;

    let whereClause = '';
    let params = [];

    if (rol_id === 1) {
      // Alumno: solo sus solicitudes
      whereClause = ' WHERE s.usuario_id = ?';
      params.push(usuarioId);
    } else if (rol_id === 3) {
      // Almacenista: solo aprobadas
      whereClause = " WHERE s.estado IN ('aprobada', 'entregado')";
    }
    // Docente: ve TODO (sin WHERE extra)

    const finalQuery = baseQuery + whereClause + ' ORDER BY s.fecha_solicitud DESC';

    console.log('Consulta SQL:', finalQuery, params);

    const [rows] = await pool.query(finalQuery, params);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

const obtenerSolicitudesPendientesDevolucion = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.id AS solicitud_id,
        s.usuario_id,
        s.nombre_alumno,
        s.profesor,
        s.fecha_solicitud,
        s.motivo,
        s.folio,
        u.nombre AS nombre_usuario,
        si.id AS item_id,
        si.material_id,
        si.cantidad,
        si.cantidad_devuelta,
        si.tipo,
        CASE 
          WHEN si.tipo = 'liquido' THEN ml.nombre
          WHEN si.tipo = 'solido' THEN ms.nombre
          WHEN si.tipo = 'equipo' THEN me.nombre
        END AS nombre_material,
        (si.cantidad - si.cantidad_devuelta) AS cantidad_pendiente
      FROM Solicitud s
      JOIN Usuario u ON s.usuario_id = u.id
      JOIN SolicitudItem si ON s.id = si.solicitud_id
      LEFT JOIN MaterialLiquido ml ON si.material_id = ml.id AND si.tipo = 'liquido'
      LEFT JOIN MaterialSolido ms ON si.material_id = ms.id AND si.tipo = 'solido'
      LEFT JOIN MaterialEquipo me ON si.material_id = me.id AND si.tipo = 'equipo'
      WHERE s.estado = 'entregado' AND si.cantidad > si.cantidad_devuelta
      ORDER BY s.fecha_solicitud ASC
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener solicitudes pendientes de devolución:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

const obtenerDetalleSolicitud = async (req, res) => {
  const { id } = req.params;
  
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.id AS solicitud_id,
        s.usuario_id,
        s.nombre_alumno,
        s.profesor,
        s.fecha_solicitud,
        s.estado,
        s.motivo,
        s.folio,
        u.nombre AS nombre_usuario,
        u.correo_institucional,
        si.id AS item_id,
        si.material_id,
        si.cantidad,
        si.cantidad_devuelta,
        si.tipo,
        CASE 
          WHEN si.tipo = 'liquido' THEN ml.nombre
          WHEN si.tipo = 'solido' THEN ms.nombre
          WHEN si.tipo = 'equipo' THEN me.nombre
        END AS nombre_material,
        CASE 
          WHEN si.tipo = 'liquido' THEN ml.cantidad_disponible_ml
          WHEN si.tipo = 'solido' THEN ms.cantidad_disponible_g
          WHEN si.tipo = 'equipo' THEN me.cantidad_disponible_u
        END AS cantidad_disponible
      FROM Solicitud s
      JOIN Usuario u ON s.usuario_id = u.id
      JOIN SolicitudItem si ON s.id = si.solicitud_id
      LEFT JOIN MaterialLiquido ml ON si.material_id = ml.id AND si.tipo = 'liquido'
      LEFT JOIN MaterialSolido ms ON si.material_id = ms.id AND si.tipo = 'solido'
      LEFT JOIN MaterialEquipo me ON si.material_id = me.id AND si.tipo = 'equipo'
      WHERE s.id = ?
    `, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener detalle de solicitud:', error);
    res.status(500).json({ error: 'Error al obtener detalle de solicitud' });
  }
};

const entregarMateriales = async (req, res) => {
  const { id } = req.params;
  const { items_entregados } = req.body; // Array con {item_id, cantidad_entregada}
  const { rol_id, id: usuarioId } = req.usuario;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Verificar que la solicitud existe y está aprobada
    const [solicitud] = await connection.query(
      'SELECT estado FROM Solicitud WHERE id = ?',
      [id]
    );

    if (solicitud.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    if (solicitud[0].estado !== 'aprobada') {
      await connection.rollback();
      return res.status(400).json({ error: 'La solicitud debe estar aprobada para entregar materiales' });
    }

    // Verificar permisos de modificar stock solo para usuarios de almacén
    let tienePermisoStock = rol_id === 4; // Los administradores siempre tienen permiso
    if (rol_id === 3) {
      const [permisos] = await connection.query(
        'SELECT modificar_stock FROM PermisosAlmacen WHERE usuario_id = ?',
        [usuarioId]
      );
      tienePermisoStock = permisos.length > 0 && permisos[0].modificar_stock;
    }

    // Procesar cada item entregado solo si tiene permiso para modificar stock
    if (items_entregados && items_entregados.length > 0) {
      if (!tienePermisoStock) {
        await connection.rollback();
        return res.status(403).json({ error: 'No tienes permisos para modificar el stock.' });
      }

      for (const item of items_entregados) {
        const { item_id, cantidad_entregada } = item;

        // Obtener información del item
        const [itemInfo] = await connection.query(
          'SELECT material_id, tipo, cantidad FROM SolicitudItem WHERE id = ? AND solicitud_id = ?',
          [item_id, id]
        );

        if (itemInfo.length === 0) {
          await connection.rollback();
          return res.status(404).json({ error: `Item ${item_id} no encontrado en la solicitud` });
        }

        const { material_id, tipo, cantidad } = itemInfo[0];

        // Validar que la cantidad entregada no exceda la solicitada
        if (cantidad_entregada > cantidad) {
          await connection.rollback();
          return res.status(400).json({ error: `La cantidad entregada para el item ${item_id} excede la cantidad solicitada` });
        }

        // Verificar stock disponible antes de actualizar
        let stockDisponible;
        if (tipo === 'liquido') {
          const [stock] = await connection.query(
            'SELECT cantidad_disponible_ml FROM MaterialLiquido WHERE id = ?',
            [material_id]
          );
          stockDisponible = stock[0]?.cantidad_disponible_ml || 0;
        } else if (tipo === 'solido') {
          const [stock] = await connection.query(
            'SELECT cantidad_disponible_g FROM MaterialSolido WHERE id = ?',
            [material_id]
          );
          stockDisponible = stock[0]?.cantidad_disponible_g || 0;
        } else if (tipo === 'equipo') {
          const [stock] = await connection.query(
            'SELECT cantidad_disponible_u FROM MaterialEquipo WHERE id = ?',
            [material_id]
          );
          stockDisponible = stock[0]?.cantidad_disponible_u || 0;
        }

        if (stockDisponible < cantidad_entregada) {
          await connection.rollback();
          return res.status(400).json({ error: `Stock insuficiente para el material ${material_id} (${tipo})` });
        }

        // Actualizar stock según el tipo de material
        if (tipo === 'liquido') {
          await connection.query(
            'UPDATE MaterialLiquido SET cantidad_disponible_ml = cantidad_disponible_ml - ? WHERE id = ?',
            [cantidad_entregada, material_id]
          );
        } else if (tipo === 'solido') {
          await connection.query(
            'UPDATE MaterialSolido SET cantidad_disponible_g = cantidad_disponible_g - ? WHERE id = ?',
            [cantidad_entregada, material_id]
          );
        } else if (tipo === 'equipo') {
          await connection.query(
            'UPDATE MaterialEquipo SET cantidad_disponible_u = cantidad_disponible_u - ? WHERE id = ?',
            [cantidad_entregada, material_id]
          );
        }
      }
    }

    // Actualizar estado de la solicitud a entregado (independiente del permiso de stock)
    await connection.query(
      'UPDATE Solicitud SET estado = ? WHERE id = ?',
      ['entregado', id]
    );

    await connection.commit();
    res.json({ mensaje: 'Solicitud marcada como entregada correctamente' });

  } catch (error) {
    await connection.rollback();
    console.error('Error al entregar materiales:', error);
    res.status(500).json({ error: 'Error al entregar materiales' });
  } finally {
    connection.release();
  }
};

const recibirDevolucion = async (req, res) => {
  const { id } = req.params;
  const { items_devueltos } = req.body; // Array con {item_id, cantidad_devuelta}

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Procesar cada item devuelto
    for (const item of items_devueltos) {
      const { item_id, cantidad_devuelta } = item;
      
      // Obtener información del item
      const [itemInfo] = await connection.query(
        'SELECT material_id, tipo, cantidad, cantidad_devuelta FROM SolicitudItem WHERE id = ?',
        [item_id]
      );

      if (itemInfo.length === 0) continue;

      const { material_id, tipo, cantidad, cantidad_devuelta: ya_devuelta } = itemInfo[0];
      const nueva_cantidad_devuelta = ya_devuelta + cantidad_devuelta;

      // Actualizar cantidad devuelta
      await connection.query(
        'UPDATE SolicitudItem SET cantidad_devuelta = ? WHERE id = ?',
        [nueva_cantidad_devuelta, item_id]
      );

      // Actualizar stock según el tipo de material
      if (tipo === 'liquido') {
        await connection.query(
          'UPDATE MaterialLiquido SET cantidad_disponible_ml = cantidad_disponible_ml + ? WHERE id = ?',
          [cantidad_devuelta, material_id]
        );
      } else if (tipo === 'solido') {
        await connection.query(
          'UPDATE MaterialSolido SET cantidad_disponible_g = cantidad_disponible_g + ? WHERE id = ?',
          [cantidad_devuelta, material_id]
        );
      } else if (tipo === 'equipo') {
        await connection.query(
          'UPDATE MaterialEquipo SET cantidad_disponible_u = cantidad_disponible_u + ? WHERE id = ?',
          [cantidad_devuelta, material_id]
        );
      }
    }

    await connection.commit();
    res.json({ mensaje: 'Devolución procesada correctamente' });

  } catch (error) {
    await connection.rollback();
    console.error('Error al procesar devolución:', error);
    res.status(500).json({ error: 'Error al procesar devolución' });
  } finally {
    connection.release();
  }
};

const cancelarSolicitudAlmacen = async (req, res) => {
  const { id } = req.params;
  const { motivo } = req.body;

  try {
    const [solicitud] = await pool.query(
      'SELECT estado FROM Solicitud WHERE id = ?',
      [id]
    );

    if (solicitud.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    if (!['aprobada', 'entregado'].includes(solicitud[0].estado)) {
      return res.status(400).json({ error: 'No se puede cancelar una solicitud en este estado' });
    }

    await pool.query(
      'UPDATE Solicitud SET estado = ?, motivo = CONCAT(COALESCE(motivo, ""), " - CANCELADO POR ALMACÉN: ", ?) WHERE id = ?',
      ['cancelado', motivo || 'Sin motivo especificado', id]
    );

    res.json({ mensaje: 'Solicitud cancelada por almacén' });
  } catch (error) {
    console.error('Error al cancelar solicitud desde almacén:', error);
    res.status(500).json({ error: 'Error al cancelar solicitud' });
  }
};

const ajustarCantidadSolicitud = async (req, res) => {
  const { id } = req.params;
  const { item_id, nueva_cantidad, motivo } = req.body;

  try {
    // Verificar que el item pertenece a la solicitud
    const [item] = await pool.query(
      'SELECT si.* FROM SolicitudItem si WHERE si.id = ? AND si.solicitud_id = ?',
      [item_id, id]
    );

    if (item.length === 0) {
      return res.status(404).json({ error: 'Item no encontrado en la solicitud' });
    }

    await pool.query(
      'UPDATE SolicitudItem SET cantidad = ? WHERE id = ?',
      [nueva_cantidad, item_id]
    );

    res.json({ mensaje: 'Cantidad ajustada correctamente' });
  } catch (error) {
    console.error('Error al ajustar cantidad:', error);
    res.status(500).json({ error: 'Error al ajustar cantidad' });
  }
};

const marcarMaterialDanado = async (req, res) => {
  const { id } = req.params;
  const { item_id, cantidad_danada, descripcion } = req.body;

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Obtener información del item
    const [itemInfo] = await connection.query(
      'SELECT si.*, s.usuario_id FROM SolicitudItem si JOIN Solicitud s ON si.solicitud_id = s.id WHERE si.id = ? AND s.id = ?',
      [item_id, id]
    );

    if (itemInfo.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    const { material_id, tipo, usuario_id } = itemInfo[0];

    // Crear adeudo por material dañado
    await connection.query(
      'INSERT INTO Adeudo (solicitud_id, solicitud_item_id, usuario_id, material_id, tipo, cantidad_pendiente) VALUES (?, ?, ?, ?, ?, ?)',
      [id, item_id, usuario_id, material_id, tipo, cantidad_danada]
    );

    await connection.commit();
    res.json({ mensaje: 'Material marcado como dañado y adeudo creado' });

  } catch (error) {
    await connection.rollback();
    console.error('Error al marcar material como dañado:', error);
    res.status(500).json({ error: 'Error al procesar material dañado' });
  } finally {
    connection.release();
  }
};

const procesarDevolucionParcial = async (req, res) => {
  const { id } = req.params;
  const { item_id, cantidad_devuelta } = req.body;

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Obtener información del item
    const [itemInfo] = await connection.query(
      'SELECT material_id, tipo, cantidad, cantidad_devuelta FROM SolicitudItem WHERE id = ?',
      [item_id]
    );

    if (itemInfo.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Item no encontrado' });
    }

    const { material_id, tipo, cantidad, cantidad_devuelta: ya_devuelta } = itemInfo[0];
    const nueva_cantidad_devuelta = ya_devuelta + cantidad_devuelta;

    if (nueva_cantidad_devuelta > cantidad) {
      await connection.rollback();
      return res.status(400).json({ error: 'No se puede devolver más de lo prestado' });
    }

    // Actualizar cantidad devuelta
    await connection.query(
      'UPDATE SolicitudItem SET cantidad_devuelta = ? WHERE id = ?',
      [nueva_cantidad_devuelta, item_id]
    );

    // Actualizar stock
    if (tipo === 'liquido') {
      await connection.query(
        'UPDATE MaterialLiquido SET cantidad_disponible_ml = cantidad_disponible_ml + ? WHERE id = ?',
        [cantidad_devuelta, material_id]
      );
    } else if (tipo === 'solido') {
      await connection.query(
        'UPDATE MaterialSolido SET cantidad_disponible_g = cantidad_disponible_g + ? WHERE id = ?',
        [cantidad_devuelta, material_id]
      );
    } else if (tipo === 'equipo') {
      await connection.query(
        'UPDATE MaterialEquipo SET cantidad_disponible_u = cantidad_disponible_u + ? WHERE id = ?',
        [cantidad_devuelta, material_id]
      );
    }

    await connection.commit();
    res.json({ mensaje: 'Devolución parcial procesada correctamente' });

  } catch (error) {
    await connection.rollback();
    console.error('Error al procesar devolución parcial:', error);
    res.status(500).json({ error: 'Error al procesar devolución parcial' });
  } finally {
    connection.release();
  }
};

// ========================================
// FUNCIONES GENERALES
// ========================================

const obtenerSolicitudPorId = async (req, res) => {
  const { id } = req.params;
  const { id: usuarioId, rol_id } = req.usuario;

  try {
    let whereClause = 'WHERE s.id = ?';
    let params = [id];

    // Si es alumno, solo puede ver sus propias solicitudes
    if (rol_id === 1) {
      whereClause += ' AND s.usuario_id = ?';
      params.push(usuarioId);
    }

    const [rows] = await pool.query(`
      SELECT 
        s.id AS solicitud_id,
        s.usuario_id,
        s.nombre_alumno,
        s.profesor,
        s.fecha_solicitud,
        s.estado,
        s.motivo,
        s.folio,
        u.nombre AS nombre_usuario,
        u.correo_institucional,
        si.id AS item_id,
        si.material_id,
        si.cantidad,
        si.cantidad_devuelta,
        si.tipo,
        CASE 
          WHEN si.tipo = 'liquido' THEN ml.nombre
          WHEN si.tipo = 'solido' THEN ms.nombre
          WHEN si.tipo = 'equipo' THEN me.nombre
        END AS nombre_material
      FROM Solicitud s
      JOIN Usuario u ON s.usuario_id = u.id
      JOIN SolicitudItem si ON s.id = si.solicitud_id
      LEFT JOIN MaterialLiquido ml ON si.material_id = ml.id AND si.tipo = 'liquido'
      LEFT JOIN MaterialSolido ms ON si.material_id = ms.id AND si.tipo = 'solido'
      LEFT JOIN MaterialEquipo me ON si.material_id = me.id AND si.tipo = 'equipo'
      ${whereClause}
    `, params);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener solicitud por ID:', error);
    res.status(500).json({ error: 'Error al obtener solicitud' });
  }
};

const obtenerHistorialSolicitud = async (req, res) => {
  const { id } = req.params;

  try {
    // Por ahora devolvemos información básica de la solicitud
    // En el futuro se podría implementar una tabla de auditoría
    const [rows] = await pool.query(`
      SELECT 
        s.id,
        s.fecha_solicitud,
        s.estado,
        s.motivo,
        u.nombre AS usuario_nombre,
        'Solicitud creada' AS accion,
        s.fecha_solicitud AS fecha_accion
      FROM Solicitud s
      JOIN Usuario u ON s.usuario_id = u.id
      WHERE s.id = ?
    `, [id]);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

// ========================================
// FUNCIONES ADMINISTRATIVAS
// ========================================

const obtenerEstadisticasCompletas = async (req, res) => {
  try {
    const [estadisticas] = await pool.query(`
      SELECT 
        COUNT(*) as total_solicitudes,
        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'aprobada' THEN 1 ELSE 0 END) as aprobadas,
        SUM(CASE WHEN estado = 'rechazada' THEN 1 ELSE 0 END) as rechazadas,
        SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END) as entregadas,
        SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) as canceladas
      FROM Solicitud
    `);

    const [porMes] = await pool.query(`
      SELECT 
        DATE_FORMAT(fecha_solicitud, '%Y-%m') as mes,
        COUNT(*) as cantidad
      FROM Solicitud
      WHERE fecha_solicitud >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
      GROUP BY DATE_FORMAT(fecha_solicitud, '%Y-%m')
      ORDER BY mes
    `);

    res.json({
      resumen: estadisticas[0],
      por_mes: porMes
    });
  } catch (error) {
    console.error('Error al obtener estadísticas:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

const obtenerReporteEficienciaUsuarios = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        u.id,
        u.nombre,
        u.correo_institucional,
        COUNT(s.id) as total_solicitudes,
        SUM(CASE WHEN s.estado = 'aprobada' THEN 1 ELSE 0 END) as aprobadas,
        SUM(CASE WHEN s.estado = 'rechazada' THEN 1 ELSE 0 END) as rechazadas,
        SUM(CASE WHEN s.estado = 'entregado' THEN 1 ELSE 0 END) as entregadas,
        SUM(CASE WHEN s.estado = 'cancelado' THEN 1 ELSE 0 END) as canceladas,
        ROUND(
          (SUM(CASE WHEN s.estado = 'entregado' THEN 1 ELSE 0 END) / COUNT(s.id)) * 100, 2
        ) as porcentaje_exitosas
      FROM Usuario u
      LEFT JOIN Solicitud s ON u.id = s.usuario_id
      WHERE u.rol_id = 1
      GROUP BY u.id, u.nombre, u.correo_institucional
      HAVING COUNT(s.id) > 0
      ORDER BY porcentaje_exitosas DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener reporte de eficiencia:', error);
    res.status(500).json({ error: 'Error al obtener reporte de eficiencia' });
  }
};

const obtenerReporteMaterialesPopulares = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        si.tipo,
        si.material_id,
        CASE 
          WHEN si.tipo = 'liquido' THEN ml.nombre
          WHEN si.tipo = 'solido' THEN ms.nombre
          WHEN si.tipo = 'equipo' THEN me.nombre
        END AS nombre_material,
        COUNT(*) as veces_solicitado,
        SUM(si.cantidad) as cantidad_total_solicitada
      FROM SolicitudItem si
      JOIN Solicitud s ON si.solicitud_id = s.id
      LEFT JOIN MaterialLiquido ml ON si.material_id = ml.id AND si.tipo = 'liquido'
      LEFT JOIN MaterialSolido ms ON si.material_id = ms.id AND si.tipo = 'solido'
      LEFT JOIN MaterialEquipo me ON si.material_id = me.id AND si.tipo = 'equipo'
      WHERE s.estado IN ('aprobada', 'entregado')
      GROUP BY si.tipo, si.material_id
      ORDER BY veces_solicitado DESC
      LIMIT 20
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener materiales populares:', error);
    res.status(500).json({ error: 'Error al obtener reporte de materiales' });
  }
};

const eliminarSolicitud = async (req, res) => {
  const { id } = req.params;

  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Eliminar items de la solicitud
    await connection.query('DELETE FROM SolicitudItem WHERE solicitud_id = ?', [id]);
    
    // Eliminar adeudos relacionados
    await connection.query('DELETE FROM Adeudo WHERE solicitud_id = ?', [id]);
    
    // Eliminar la solicitud
    await connection.query('DELETE FROM Solicitud WHERE id = ?', [id]);

    await connection.commit();
    res.json({ mensaje: 'Solicitud eliminada correctamente' });

  } catch (error) {
    await connection.rollback();
    console.error('Error al eliminar solicitud:', error);
    res.status(500).json({ error: 'Error al eliminar solicitud' });
  } finally {
    connection.release();
  }
};

const restaurarSolicitud = async (req, res) => {
  const { id } = req.params;

  try {
    // Esta función requeriría una tabla de auditoría o respaldos
    // Por ahora solo cambiamos el estado si existe
    const [result] = await pool.query(
      'UPDATE Solicitud SET estado = ? WHERE id = ?',
      ['pendiente', id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    res.json({ mensaje: 'Solicitud restaurada (estado cambiado a pendiente)' });
  } catch (error) {
    console.error('Error al restaurar solicitud:', error);
    res.status(500).json({ error: 'Error al restaurar solicitud' });
  }
};

const transferirSolicitud = async (req, res) => {
  const { id } = req.params;
  const { nuevo_usuario_id } = req.body;

  try {
    // Verificar que el nuevo usuario existe
    const [usuario] = await pool.query(
      'SELECT id, nombre FROM Usuario WHERE id = ?',
      [nuevo_usuario_id]
    );

    if (usuario.length === 0) {
      return res.status(404).json({ error: 'Usuario destino no encontrado' });
    }

    await pool.query(
      'UPDATE Solicitud SET usuario_id = ?, nombre_alumno = ? WHERE id = ?',
      [nuevo_usuario_id, usuario[0].nombre, id]
    );

    res.json({ mensaje: 'Solicitud transferida correctamente' });
  } catch (error) {
    console.error('Error al transferir solicitud:', error);
    res.status(500).json({ error: 'Error al transferir solicitud' });
  }
};

// ========================================
// FUNCIONES DE MANTENIMIENTO
// ========================================

const limpiarSolicitudesCanceladas = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Eliminar items de solicitudes canceladas más de 30 días atrás
    await connection.query(`
      DELETE si FROM SolicitudItem si
      JOIN Solicitud s ON si.solicitud_id = s.id
      WHERE s.estado = 'cancelado' 
      AND s.fecha_solicitud < DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // Eliminar las solicitudes canceladas
    const [result] = await connection.query(`
      DELETE FROM Solicitud 
      WHERE estado = 'cancelado' 
      AND fecha_solicitud < DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    await connection.commit();
    res.json({ 
      mensaje: 'Limpieza completada', 
      solicitudes_eliminadas: result.affectedRows 
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error en limpieza:', error);
    res.status(500).json({ error: 'Error en limpieza de solicitudes' });
  } finally {
    connection.release();
  }
};

const validarIntegridadSolicitudes = async (req, res) => {
  try {
    // Verificar solicitudes sin items
    const [sinItems] = await pool.query(`
      SELECT s.id, s.folio 
      FROM Solicitud s 
      LEFT JOIN SolicitudItem si ON s.id = si.solicitud_id 
      WHERE si.solicitud_id IS NULL
    `);

    // Verificar items con materiales inexistentes
    const [itemsHuerfanos] = await pool.query(`
      SELECT si.id, si.solicitud_id, si.material_id, si.tipo
      FROM SolicitudItem si
      LEFT JOIN MaterialLiquido ml ON si.material_id = ml.id AND si.tipo = 'liquido'
      LEFT JOIN MaterialSolido ms ON si.material_id = ms.id AND si.tipo = 'solido'
      LEFT JOIN MaterialEquipo me ON si.material_id = me.id AND si.tipo = 'equipo'
      WHERE ml.id IS NULL AND ms.id IS NULL AND me.id IS NULL
    `);

    // Verificar usuarios inexistentes
    const [usuariosHuerfanos] = await pool.query(`
      SELECT s.id, s.usuario_id 
      FROM Solicitud s 
      LEFT JOIN Usuario u ON s.usuario_id = u.id 
      WHERE u.id IS NULL
    `);

    res.json({
      solicitudes_sin_items: sinItems,
      items_huerfanos: itemsHuerfanos,
      usuarios_huerfanos: usuariosHuerfanos,
      integridad_ok: sinItems.length === 0 && itemsHuerfanos.length === 0 && usuariosHuerfanos.length === 0
    });

  } catch (error) {
    console.error('Error al validar integridad:', error);
    res.status(500).json({ error: 'Error al validar integridad' });
  }
};

const repararSolicitudesInconsistentes = async (req, res) => {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();

    // Eliminar solicitudes sin items
    const [solicitudesSinItems] = await connection.query(`
      DELETE s FROM Solicitud s 
      LEFT JOIN SolicitudItem si ON s.id = si.solicitud_id 
      WHERE si.solicitud_id IS NULL
    `);

    // Eliminar items huérfanos
    const [itemsHuerfanos] = await connection.query(`
      DELETE si FROM SolicitudItem si
      LEFT JOIN MaterialLiquido ml ON si.material_id = ml.id AND si.tipo = 'liquido'
      LEFT JOIN MaterialSolido ms ON si.material_id = ms.id AND si.tipo = 'solido'
      LEFT JOIN MaterialEquipo me ON si.material_id = me.id AND si.tipo = 'equipo'
      WHERE ml.id IS NULL AND ms.id IS NULL AND me.id IS NULL
    `);

    await connection.commit();
    res.json({ 
      mensaje: 'Reparación completada',
      solicitudes_eliminadas: solicitudesSinItems.affectedRows,
      items_eliminados: itemsHuerfanos.affectedRows
    });

  } catch (error) {
    await connection.rollback();
    console.error('Error al reparar inconsistencias:', error);
    res.status(500).json({ error: 'Error al reparar inconsistencias' });
  } finally {
    connection.release();
  }
};

// ========================================
// FUNCIONES DE REPORTES POR ROL
// ========================================

const obtenerReportePorAlumno = async (req, res) => {
  const { alumno_id } = req.query;

  try {
    let whereClause = '';
    let params = [];

    if (alumno_id) {
      whereClause = 'WHERE s.usuario_id = ?';
      params = [alumno_id];
    }

    const [rows] = await pool.query(`
      SELECT 
        u.id as usuario_id,
        u.nombre,
        u.correo_institucional,
        COUNT(s.id) as total_solicitudes,
        SUM(CASE WHEN s.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN s.estado = 'aprobada' THEN 1 ELSE 0 END) as aprobadas,
        SUM(CASE WHEN s.estado = 'entregado' THEN 1 ELSE 0 END) as entregadas,
        SUM(CASE WHEN s.estado = 'rechazada' THEN 1 ELSE 0 END) as rechazadas
      FROM Usuario u
      LEFT JOIN Solicitud s ON u.id = s.usuario_id
      ${whereClause}
      GROUP BY u.id, u.nombre, u.correo_institucional
      ORDER BY total_solicitudes DESC
    `, params);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener reporte por alumno:', error);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
};

const obtenerReportePorFecha = async (req, res) => {
  const { fecha_inicio, fecha_fin } = req.query;

  try {
    let whereClause = '';
    let params = [];

    if (fecha_inicio && fecha_fin) {
      whereClause = 'WHERE s.fecha_solicitud BETWEEN ? AND ?';
      params = [fecha_inicio, fecha_fin];
    }

    const [rows] = await pool.query(`
      SELECT 
        DATE(s.fecha_solicitud) as fecha,
        COUNT(*) as total_solicitudes,
        SUM(CASE WHEN s.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN s.estado = 'aprobada' THEN 1 ELSE 0 END) as aprobadas,
        SUM(CASE WHEN s.estado = 'entregado' THEN 1 ELSE 0 END) as entregadas,
        SUM(CASE WHEN s.estado = 'rechazada' THEN 1 ELSE 0 END) as rechazadas
      FROM Solicitud s
      ${whereClause}
      GROUP BY DATE(s.fecha_solicitud)
      ORDER BY fecha DESC
    `, params);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener reporte por fecha:', error);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
};

const obtenerReporteEntregasPendientes = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.id as solicitud_id,
        s.folio,
        s.fecha_solicitud,
        u.nombre as alumno,
        COUNT(si.id) as total_items,
        DATEDIFF(NOW(), s.fecha_solicitud) as dias_pendientes
      FROM Solicitud s
      JOIN Usuario u ON s.usuario_id = u.id
      JOIN SolicitudItem si ON s.id = si.solicitud_id
      WHERE s.estado = 'aprobada'
      GROUP BY s.id, s.folio, s.fecha_solicitud, u.nombre
      ORDER BY dias_pendientes DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener entregas pendientes:', error);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
};

const obtenerReporteDevolucionesPendientes = async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT 
        s.id as solicitud_id,
        s.folio,
        s.fecha_solicitud,
        u.nombre as alumno,
        si.id as item_id,
        CASE 
          WHEN si.tipo = 'liquido' THEN ml.nombre
          WHEN si.tipo = 'solido' THEN ms.nombre
          WHEN si.tipo = 'equipo' THEN me.nombre
        END AS nombre_material,
        si.cantidad,
        si.cantidad_devuelta,
        (si.cantidad - si.cantidad_devuelta) as cantidad_pendiente,
        DATEDIFF(NOW(), s.fecha_solicitud) as dias_prestado
      FROM Solicitud s
      JOIN Usuario u ON s.usuario_id = u.id
      JOIN SolicitudItem si ON s.id = si.solicitud_id
      LEFT JOIN MaterialLiquido ml ON si.material_id = ml.id AND si.tipo = 'liquido'
      LEFT JOIN MaterialSolido ms ON si.material_id = ms.id AND si.tipo = 'solido'
      LEFT JOIN MaterialEquipo me ON si.material_id = me.id AND si.tipo = 'equipo'
      WHERE s.estado = 'entregado' AND si.cantidad > si.cantidad_devuelta
      ORDER BY dias_prestado DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener devoluciones pendientes:', error);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
};

const obtenerReporteEstadoGeneral = async (req, res) => {
  try {
    const [resumen] = await pool.query(`
      SELECT 
        COUNT(*) as total_solicitudes,
        SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
        SUM(CASE WHEN estado = 'aprobada' THEN 1 ELSE 0 END) as aprobadas,
        SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END) as entregadas,
        SUM(CASE WHEN estado = 'rechazada' THEN 1 ELSE 0 END) as rechazadas,
        SUM(CASE WHEN estado = 'cancelado' THEN 1 ELSE 0 END) as canceladas
      FROM Solicitud
    `);

    const [adeudos] = await pool.query(`
      SELECT COUNT(*) as total_adeudos
      FROM Adeudo
    `);

    const [materialesPopulares] = await pool.query(`
      SELECT 
        si.tipo,
        CASE 
          WHEN si.tipo = 'liquido' THEN ml.nombre
          WHEN si.tipo = 'solido' THEN ms.nombre
          WHEN si.tipo = 'equipo' THEN me.nombre
        END AS nombre_material,
        COUNT(*) as veces_solicitado
      FROM SolicitudItem si
      LEFT JOIN MaterialLiquido ml ON si.material_id = ml.id AND si.tipo = 'liquido'
      LEFT JOIN MaterialSolido ms ON si.material_id = ms.id AND si.tipo = 'solido'
      LEFT JOIN MaterialEquipo me ON si.material_id = me.id AND si.tipo = 'equipo'
      GROUP BY si.tipo, si.material_id
      ORDER BY veces_solicitado DESC
      LIMIT 5
    `);

    res.json({
      resumen: resumen[0],
      adeudos: adeudos[0],
      materiales_populares: materialesPopulares
    });

  } catch (error) {
    console.error('Error al obtener estado general:', error);
    res.status(500).json({ error: 'Error al obtener reporte' });
  }
};

// ========================================
// FUNCIONES DE NOTIFICACIONES Y ALERTAS
// ========================================

const obtenerSolicitudesAtencionRequerida = async (req, res) => {
  const { rol_id } = req.usuario;

  try {
    let alertas = [];

    // Alertas para docentes
    if ([2, 4].includes(rol_id)) {
      const [pendientesAprobacion] = await pool.query(`
        SELECT COUNT(*) as cantidad
        FROM Solicitud 
        WHERE estado = 'pendiente' AND fecha_solicitud < DATE_SUB(NOW(), INTERVAL 2 DAY)
      `);
      
      if (pendientesAprobacion[0].cantidad > 0) {
        alertas.push({
          tipo: 'solicitudes_pendientes_viejas',
          mensaje: `${pendientesAprobacion[0].cantidad} solicitudes pendientes por más de 2 días`,
          cantidad: pendientesAprobacion[0].cantidad
        });
      }
    }

    // Alertas para almacenistas
    if ([3, 4].includes(rol_id)) {
      const [devolucionesPendientes] = await pool.query(`
        SELECT COUNT(DISTINCT s.id) as cantidad
        FROM Solicitud s
        JOIN SolicitudItem si ON s.id = si.solicitud_id
        WHERE s.estado = 'entregado' 
        AND si.cantidad > si.cantidad_devuelta
        AND s.fecha_solicitud < DATE_SUB(NOW(), INTERVAL 7 DAY)
      `);

      if (devolucionesPendientes[0].cantidad > 0) {
        alertas.push({
          tipo: 'devoluciones_pendientes_viejas',
          mensaje: `${devolucionesPendientes[0].cantidad} solicitudes con devoluciones pendientes por más de 7 días`,
          cantidad: devolucionesPendientes[0].cantidad
        });
      }
    }

    res.json(alertas);
  } catch (error) {
    console.error('Error al obtener alertas:', error);
    res.status(500).json({ error: 'Error al obtener alertas' });
  }
};

const marcarSolicitudVista = async (req, res) => {
  const { id } = req.params;

  try {
    // Esta función requeriría una tabla adicional para tracking de vistas
    // Por ahora solo retornamos éxito
    res.json({ mensaje: 'Solicitud marcada como vista' });
  } catch (error) {
    console.error('Error al marcar como vista:', error);
    res.status(500).json({ error: 'Error al marcar solicitud' });
  }
};

const obtenerNotificacionesPendientes = async (req, res) => {
  const { id: usuarioId, rol_id } = req.usuario;

  try {
    let notificaciones = [];

    // Notificaciones para alumnos
    if (rol_id === 1) {
      const [misEstados] = await pool.query(`
        SELECT 
          id,
          estado,
          folio,
          fecha_solicitud
        FROM Solicitud 
        WHERE usuario_id = ? AND estado IN ('aprobada', 'rechazada')
        ORDER BY fecha_solicitud DESC
        LIMIT 5
      `, [usuarioId]);

      notificaciones = misEstados.map(sol => ({
        tipo: 'cambio_estado',
        mensaje: `Tu solicitud ${sol.folio} ha sido ${sol.estado}`,
        solicitud_id: sol.id,
        fecha: sol.fecha_solicitud
      }));
    }

    res.json(notificaciones);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
};

// ========================================
// FUNCIONES DE BÚSQUEDA Y FILTROS
// ========================================

const buscarSolicitudes = async (req, res) => {
  const { termino } = req.params;
  const { id: usuarioId, rol_id } = req.usuario;

  try {
    let whereClause = `WHERE (
      s.folio LIKE ? OR 
      s.nombre_alumno LIKE ? OR 
      s.profesor LIKE ? OR 
      s.motivo LIKE ? OR
      u.nombre LIKE ? OR
      u.correo_institucional LIKE ?
    )`;
    
    let params = Array(6).fill(`%${termino}%`);

    // Filtrar por rol
    if (rol_id === 1) {
      whereClause += ' AND s.usuario_id = ?';
      params.push(usuarioId);
    } else if (rol_id === 3) {
      whereClause += " AND s.estado = 'aprobada'";
    }

    const [rows] = await pool.query(`
      SELECT 
        s.id AS solicitud_id,
        s.usuario_id,
        s.nombre_alumno,
        s.profesor,
        s.fecha_solicitud,
        s.estado,
        s.motivo,
        s.folio,
        u.nombre AS nombre_usuario,
        u.correo_institucional
      FROM Solicitud s
      JOIN Usuario u ON s.usuario_id = u.id
      ${whereClause}
      ORDER BY s.fecha_solicitud DESC
      LIMIT 50
    `, params);

    res.json(rows);
  } catch (error) {
    console.error('Error al buscar solicitudes:', error);
    res.status(500).json({ error: 'Error en la búsqueda' });
  }
};

const filtrarSolicitudes = async (req, res) => {
  const { estado, fecha_inicio, fecha_fin, usuario_id, tipo_material } = req.body;
  const { id: usuarioIdToken, rol_id } = req.usuario;

  try {
    let whereConditions = [];
    let params = [];

    // Filtros básicos
    if (estado) {
      whereConditions.push('s.estado = ?');
      params.push(estado);
    }

    if (fecha_inicio && fecha_fin) {
      whereConditions.push('s.fecha_solicitud BETWEEN ? AND ?');
      params.push(fecha_inicio, fecha_fin);
    }

    if (usuario_id && [2, 4].includes(rol_id)) { // Solo docentes y admin pueden filtrar por usuario
      whereConditions.push('s.usuario_id = ?');
      params.push(usuario_id);
    }

    if (tipo_material) {
      whereConditions.push('si.tipo = ?');
      params.push(tipo_material);
    }

    // Restricciones por rol
    if (rol_id === 1) {
      whereConditions.push('s.usuario_id = ?');
      params.push(usuarioIdToken);
    } else if (rol_id === 3) {
      whereConditions.push("s.estado = 'aprobada'");
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const [rows] = await pool.query(`
      SELECT DISTINCT
        s.id AS solicitud_id,
        s.usuario_id,
        s.nombre_alumno,
        s.profesor,
        s.fecha_solicitud,
        s.estado,
        s.motivo,
        s.folio,
        u.nombre AS nombre_usuario,
        u.correo_institucional
      FROM Solicitud s
      JOIN Usuario u ON s.usuario_id = u.id
      LEFT JOIN SolicitudItem si ON s.id = si.solicitud_id
      ${whereClause}
      ORDER BY s.fecha_solicitud DESC
    `, params);

    res.json(rows);
  } catch (error) {
    console.error('Error al filtrar solicitudes:', error);
    res.status(500).json({ error: 'Error al filtrar solicitudes' });
  }
};

const obtenerSolicitudesPorEstado = async (req, res) => {
  const { estado } = req.params;
  const { id: usuarioId, rol_id } = req.usuario;

  try {
    let whereClause = 'WHERE s.estado = ?';
    let params = [estado];

    // Aplicar filtros por rol
    if (rol_id === 1) {
      whereClause += ' AND s.usuario_id = ?';
      params.push(usuarioId);
    } else if (rol_id === 3 && estado !== 'aprobada' && estado !== 'entregado') {
      return res.status(403).json({ error: 'Los almacenistas solo pueden ver solicitudes aprobadas o entregadas' });
    }

    const [rows] = await pool.query(`
      SELECT 
        s.id AS solicitud_id,
        s.usuario_id,
        s.nombre_alumno,
        s.profesor,
        s.fecha_solicitud,
        s.estado,
        s.motivo,
        s.folio,
        u.nombre AS nombre_usuario,
        u.correo_institucional,
        si.id AS item_id,
        si.material_id,
        si.cantidad,
        si.cantidad_devuelta,
        si.tipo,
        CASE 
          WHEN si.tipo = 'liquido' THEN ml.nombre
          WHEN si.tipo = 'solido' THEN ms.nombre
          WHEN si.tipo = 'equipo' THEN me.nombre
        END AS nombre_material
      FROM Solicitud s
      JOIN Usuario u ON s.usuario_id = u.id
      JOIN SolicitudItem si ON s.id = si.solicitud_id
      LEFT JOIN MaterialLiquido ml ON si.material_id = ml.id AND si.tipo = 'liquido'
      LEFT JOIN MaterialSolido ms ON si.material_id = ms.id AND si.tipo = 'solido'
      LEFT JOIN MaterialEquipo me ON si.material_id = me.id AND si.tipo = 'equipo'
      ${whereClause}
      ORDER BY s.fecha_solicitud DESC
    `, params);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener solicitudes por estado:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

const obtenerSolicitudesPorRangoFechas = async (req, res) => {
 const { inicio, fin } = req.params;
 const { id: usuarioId, rol_id } = req.usuario;

 try {
   let whereClause = 'WHERE s.fecha_solicitud BETWEEN ? AND ?';
   let params = [inicio, fin];

   // Aplicar filtros por rol
   if (rol_id === 1) {
     whereClause += ' AND s.usuario_id = ?';
     params.push(usuarioId);
   } else if (rol_id === 3) {
     whereClause += " AND s.estado IN ('aprobada', 'entregado')";
   }

   const [rows] = await pool.query(`
     SELECT 
       s.id AS solicitud_id,
       s.usuario_id,
       s.nombre_alumno,
       s.profesor,
       s.fecha_solicitud,
       s.estado,
       s.motivo,
       s.folio,
       u.nombre AS nombre_usuario,
       u.correo_institucional,
       COUNT(si.id) as total_items
     FROM Solicitud s
     JOIN Usuario u ON s.usuario_id = u.id
     LEFT JOIN SolicitudItem si ON s.id = si.solicitud_id
     ${whereClause}
     GROUP BY s.id, s.usuario_id, s.nombre_alumno, s.profesor, s.fecha_solicitud, s.estado, s.motivo, s.folio, u.nombre, u.correo_institucional
     ORDER BY s.fecha_solicitud DESC
   `, params);

   res.json(rows);
 } catch (error) {
   console.error('Error al obtener solicitudes por rango de fechas:', error);
   res.status(500).json({ error: 'Error al obtener solicitudes' });
 }
};

const crearSolicitud = async (req, res) => {
  const { materiales, motivo, fecha_solicitud, aprobar_automatico } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    const { id: usuario_id, rol_id, nombre } = req.usuario;

    if (![1, 2].includes(rol_id)) {
      return res.status(403).json({ error: 'Solo alumnos o docentes pueden crear solicitudes' });
    }

    if (!Array.isArray(materiales) || materiales.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un material' });
    }

    if (rol_id === 1) {
      const [adeudos] = await pool.query(
        'SELECT * FROM Adeudo WHERE usuario_id = ? AND pagado = FALSE',
        [usuario_id]
      );

      if (adeudos.length > 0) {
        return res.status(400).json({ error: 'Usuario con adeudos pendientes' });
      }
    }

    const estado = (rol_id === 2 || aprobar_automatico) ? 'aprobada' : 'pendiente';

    const [result] = await pool.query(
      `INSERT INTO Solicitud 
       (usuario_id, fecha_solicitud, motivo, estado, nombre_alumno, profesor) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [usuario_id, fecha_solicitud, motivo, estado, nombre, nombre]
    );

    const solicitudId = result.insertId;

    for (const mat of materiales) {
      const { material_id, cantidad, tipo } = mat;
      await pool.query(
        `INSERT INTO SolicitudItem 
         (solicitud_id, material_id, tipo, cantidad)
         VALUES (?, ?, ?, ?)`,
        [solicitudId, material_id, tipo, cantidad]
      );
    }

    res.status(201).json({ mensaje: 'Solicitud creada correctamente', solicitudId });
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    res.status(500).json({ error: 'Error al crear solicitud' });
  }
};

// Crear solicitud con adeudo
const crearSolicitudConAdeudo = async (req, res) => {
  const { usuario_id, material_id, fecha_solicitud, motivo, monto_adeudo } = req.body;

  if (!usuario_id || !material_id || !fecha_solicitud || !motivo || !monto_adeudo) {
    return res.status(400).json({ error: 'Faltan datos para solicitud con adeudo' });
  }

  try {
    const [adeudos] = await pool.query(
      'SELECT * FROM Adeudo WHERE usuario_id = ? AND pagado = FALSE',
      [usuario_id]
    );

    if (adeudos.length > 0) {
      return res.status(400).json({ error: 'Usuario con adeudos pendientes' });
    }

    await pool.query(
      `INSERT INTO Solicitud 
        (usuario_id, material_id, fecha_solicitud, estado, motivo) 
        VALUES (?, ?, ?, ?, ?)`,
      [usuario_id, material_id, fecha_solicitud, 'pendiente', motivo]
    );

    await pool.query(
      `INSERT INTO Adeudo 
        (usuario_id, tipo, monto, fecha, pagado) 
        VALUES (?, ?, ?, NOW(), FALSE)`,
      [usuario_id, 'Préstamo de material', monto_adeudo]
    );

    res.status(201).json({ mensaje: 'Solicitud y adeudo creados correctamente' });
  } catch (error) {
    console.error('Error al crear solicitud con adeudo:', error);
    res.status(500).json({ error: 'Error al crear solicitud y adeudo' });
  }
};

// Aprobar solicitud
const aprobarSolicitud = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE Solicitud SET estado = ? WHERE id = ?', ['aprobada', id]);
    res.json({ mensaje: 'Solicitud aprobada' });
  } catch (error) {
    console.error('Error al aprobar solicitud:', error);
    res.status(500).json({ error: 'Error al aprobar solicitud' });
  }
};

// Rechazar solicitud
const rechazarSolicitud = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('UPDATE Solicitud SET estado = ? WHERE id = ?', ['rechazada', id]);
    res.json({ mensaje: 'Solicitud rechazada' });
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    res.status(500).json({ error: 'Error al rechazar solicitud' });
  }
};

// Obtener todas las solicitudes
const obtenerSolicitudes = async (req, res) => {
  try {
    const { id: usuarioId, rol_id } = req.usuario;

    let baseQuery = `
      SELECT 
        s.id AS solicitud_id,
        s.usuario_id,
        s.nombre_alumno,
        s.profesor,
        s.fecha_solicitud,
        s.estado,
        si.id AS item_id,
        si.material_id,
        si.cantidad,
        si.tipo,
        m.nombre AS nombre_material
      FROM Solicitud s
      JOIN SolicitudItem si ON s.id = si.solicitud_id
      JOIN Material m ON si.material_id = m.id
    `;

    let whereClause = '';
    let params = [];

    if (rol_id === 1) {
      // Alumno: solo sus solicitudes
      whereClause = ' WHERE s.usuario_id = ?';
      params.push(usuarioId);
    } else if (rol_id === 3) {
      // Almacenista: solo aprobadas
      whereClause = " WHERE s.estado = 'aprobada'";
    }
    // Docente: ve TODO (sin WHERE extra)

    const finalQuery = baseQuery + whereClause + ' ORDER BY s.fecha_solicitud DESC';

    console.log('Consulta SQL:', finalQuery, params);

    const [rows] = await pool.query(finalQuery, params);

    res.json(rows);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};






// ELIMINAR SOLICITUDES VIEJAS
const eliminarSolicitudesViejas = async () => {
  try {
    const [result] = await pool.query(`
      DELETE FROM Solicitud 
      WHERE fecha_solicitud < DATE_SUB(CURDATE(), INTERVAL 7 DAY)
    `);
    console.log(`🗑️ Limpieza automática: ${result.affectedRows} solicitudes eliminadas`);
  } catch (error) {
    console.error('Error al eliminar solicitudes viejas:', error);
  }
};

// Endpoint opcional para disparar limpieza manual
const eliminarSolicitudesViejasHandler = async (req, res) => {
  try {
    await eliminarSolicitudesViejas();
    res.json({ mensaje: 'Solicitudes antiguas eliminadas' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar solicitudes viejas' });
  }
};

module.exports = {
crearSolicitud,
  crearSolicitudConAdeudo,
  aprobarSolicitud,
  rechazarSolicitud,
  obtenerSolicitudes,
  eliminarSolicitudesViejasHandler,
  eliminarSolicitudesViejas,

  // Funciones para alumnos
  obtenerMisSolicitudes,
  cancelarMiSolicitud,

  // Funciones para docentes
  obtenerTodasSolicitudes,
  obtenerSolicitudesPendientesAprobacion,

  // Funciones para almacenistas
  obtenerSolicitudesAprobadasPendientes,
  obtenerSolicitudesEntregadas,
  obtenerSolicitudesPendientesDevolucion,
  obtenerDetalleSolicitud,
  entregarMateriales,
  recibirDevolucion,
  cancelarSolicitudAlmacen,
  ajustarCantidadSolicitud,
  marcarMaterialDanado,
  procesarDevolucionParcial,

  // Funciones generales
  obtenerSolicitudPorId,
  obtenerHistorialSolicitud,
  obtenerGrupoPorUsuario,

  // Funciones administrativas
  obtenerEstadisticasCompletas,
  obtenerReporteEficienciaUsuarios,
  obtenerReporteMaterialesPopulares,
  eliminarSolicitud,
  restaurarSolicitud,
  transferirSolicitud,

  // Funciones de mantenimiento
  limpiarSolicitudesCanceladas,
  validarIntegridadSolicitudes,
  repararSolicitudesInconsistentes,

  // Funciones de reportes por rol
  obtenerReportePorAlumno,
  obtenerReportePorFecha,
  obtenerReporteEntregasPendientes,
  obtenerReporteDevolucionesPendientes,
  obtenerReporteEstadoGeneral,

  // Funciones de notificaciones y alertas
  obtenerSolicitudesAtencionRequerida,
  marcarSolicitudVista,
  obtenerNotificacionesPendientes,

  // Funciones de búsqueda y filtros
  buscarSolicitudes,
  filtrarSolicitudes,
  obtenerSolicitudesPorEstado,
  obtenerSolicitudesPorRangoFechas
};
