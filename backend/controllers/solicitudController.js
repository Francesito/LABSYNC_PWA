const pool = require('../config/db');
const crypto = require('crypto');

/** Genera un folio alfanumérico de 4 caracteres */
function generarFolio() {
  return crypto.randomBytes(2).toString('hex').toUpperCase();
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

// Crear solicitud sin adeudo
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

    const folio = generarFolio();
    const estado = (rol_id === 2 || aprobar_automatico) ? 'aprobada' : 'pendiente';
    
    let docente_id = null, profesor = 'Sin asignar';
    
    if (estado === 'aprobada') {
      docente_id = usuario_id; 
      profesor = nombre;
    } else {
      const [docente] = await pool.query('SELECT id, nombre FROM Usuario WHERE rol_id = 2 LIMIT 1');
      docente_id = docente[0]?.id; 
      profesor = docente[0]?.nombre || profesor;
    }

    const [result] = await pool.query(
      `INSERT INTO Solicitud 
       (usuario_id, fecha_solicitud, motivo, estado, nombre_alumno, profesor, docente_id, folio) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [usuario_id, fecha_solicitud, motivo, estado, nombre, profesor, docente_id, folio]
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
        `INSERT INTO SolicitudItem 
         (solicitud_id, material_id, tipo, cantidad)
         VALUES (?, ?, ?, ?)`,
        [solicitudId, material_id, tipo, cantidad]
      );

      // Si es alumno con solicitud pendiente, descontar del stock
      if (rol_id === 1 && estado === 'pendiente') {
        await pool.query(
          `UPDATE ${meta.table} SET ${meta.field} = ${meta.field} - ? WHERE id = ?`,
          [cantidad, material_id]
        );
      }
    }

    res.status(201).json({ mensaje: 'Solicitud creada correctamente', solicitudId, folio });
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    res.status(500).json({ error: 'Error al crear solicitud' });
  }
};

// Crear solicitud con adeudo
const crearSolicitudConAdeudo = async (req, res) => {
  const { usuario_id, material_id, fecha_solicitud, motivo, monto_adeudo, tipo } = req.body;

  if (!usuario_id || !material_id || !fecha_solicitud || !motivo || !monto_adeudo || !tipo) {
    return res.status(400).json({ error: 'Faltan datos para solicitud con adeudo' });
  }

  try {
    // Verificar adeudos pendientes
    const [adeudos] = await pool.query(
      'SELECT COUNT(*) as count FROM Adeudo WHERE usuario_id = ? AND cantidad_pendiente > 0',
      [usuario_id]
    );

    if (adeudos[0].count > 0) {
      return res.status(400).json({ error: 'Usuario con adeudos pendientes' });
    }

    // Verificar stock
    const meta = detectTableAndField(tipo);
    if (!meta) {
      return res.status(400).json({ error: 'Tipo de material inválido' });
    }

    const [stockResult] = await pool.query(
      `SELECT ${meta.field} FROM ${meta.table} WHERE id = ?`,
      [material_id]
    );

    if (!stockResult.length) {
      return res.status(404).json({ error: 'Material no encontrado' });
    }

    if (stockResult[0][meta.field] < 1) {
      return res.status(400).json({ error: 'No hay suficiente stock para el material' });
    }

    // Obtener datos del usuario
    const [user] = await pool.query('SELECT nombre FROM Usuario WHERE id = ?', [usuario_id]);
    if (!user.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const [docente] = await pool.query('SELECT id, nombre FROM Usuario WHERE rol_id = 2 LIMIT 1');
    const docente_id = docente[0]?.id || null;
    const profesor = docente[0]?.nombre || 'Sin asignar';
    const folio = generarFolio();

    // Crear solicitud
    const [result] = await pool.query(
      `INSERT INTO Solicitud 
        (usuario_id, fecha_solicitud, estado, motivo, monto_adeudo, docente_id, nombre_alumno, profesor, folio) 
        VALUES (?, ?, 'pendiente', ?, ?, ?, ?, ?, ?)`,
      [usuario_id, fecha_solicitud, motivo, monto_adeudo, docente_id, user[0].nombre, profesor, folio]
    );

    const solicitudId = result.insertId;

    // Crear item de solicitud
    await pool.query(
      `INSERT INTO SolicitudItem 
       (solicitud_id, material_id, tipo, cantidad)
       VALUES (?, ?, ?, 1)`,
      [solicitudId, material_id, tipo]
    );

    // Descontar stock
    await pool.query(
      `UPDATE ${meta.table} SET ${meta.field} = ${meta.field} - 1 WHERE id = ?`,
      [material_id]
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
    // Verificar que la solicitud existe y obtener sus items para restaurar stock
    const [solicitud] = await pool.query('SELECT estado FROM Solicitud WHERE id = ?', [id]);
    if (!solicitud.length) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }

    // Si la solicitud estaba pendiente, restaurar el stock
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
        s.folio,
        si.id AS item_id,
        si.material_id,
        si.cantidad,
        si.tipo,
        COALESCE(ml.nombre, ms.nombre, me.nombre, mlab.nombre) AS nombre_material
      FROM Solicitud s
      JOIN SolicitudItem si ON s.id = si.solicitud_id
      LEFT JOIN MaterialLiquido ml ON si.tipo = 'liquido' AND si.material_id = ml.id
      LEFT JOIN MaterialSolido  ms ON si.tipo = 'solido'  AND si.material_id = ms.id
      LEFT JOIN MaterialEquipo  me ON si.tipo = 'equipo'  AND si.material_id = me.id
      LEFT JOIN MaterialLaboratorio mlab ON si.tipo = 'laboratorio' AND si.material_id = mlab.id
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
  eliminarSolicitudesViejas
};
