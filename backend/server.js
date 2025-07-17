const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const adeudoRoutes = require('./routes/adeudoRoutes'); 
const authRoutes = require('./routes/authRoutes');
const materialRoutes = require('./routes/materialRoutes');
const messageRoutes = require('./routes/messageRoutes');
const solicitudRoutes = require('./routes/solicitudRoutes');

const pool = require('./config/db');
const { eliminarSolicitudesViejas } = require('./controllers/solicitudController');

const app = express();

// ==================== MIDDLEWARES ====================
app.use(cors());
app.use(express.json());

// ==================== RUTAS DE LA API ====================
app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/solicitudes', solicitudRoutes);
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/adeudos', adeudoRoutes)

// ==================== INICIALIZACIÓN DE ROLES ====================
const initializeRoles = async () => {
  try {
    await pool.query(`
      INSERT IGNORE INTO Rol (id, nombre) VALUES
      (1, 'alumno'),
      (2, 'docente'),
      (3, 'almacen');
    `);
    console.log('✅ Roles inicializados correctamente');
  } catch (error) {
    console.error('❌ Error inicializando roles:', error);
  }
};

// ==================== CRONJOB: LIMPIAR SOLICITUDES VIEJAS ====================
// Se ejecuta cada 24 horas para borrar solicitudes con más de 7 días
const startSolicitudCleanupJob = () => {
  setInterval(async () => {
    console.log('🗑️ Ejecutando limpieza automática de solicitudes viejas...');
    await eliminarSolicitudesViejas();
  }, 24 * 60 * 60 * 1000); // Cada 24 horas
};

// ==================== INICIAR SERVIDOR ====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  initializeRoles();
  startSolicitudCleanupJob();
});
