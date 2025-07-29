//backend/controllers/solicitudController.js
const pool = require('../config/db');

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
  eliminarSolicitudesViejas
};
