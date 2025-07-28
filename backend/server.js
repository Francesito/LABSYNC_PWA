const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Importar rutas existentes
const adeudoRoutes = require('./routes/adeudoRoutes'); 
const authRoutes = require('./routes/authRoutes');
const materialRoutes = require('./routes/materialRoutes');
const messageRoutes = require('./routes/messageRoutes');
const solicitudRoutes = require('./routes/solicitudRoutes');

// Importar nueva ruta de administrador
const adminRoutes = require('./routes/adminRoutes');

const pool = require('./config/db');
const { eliminarSolicitudesViejas } = require('./controllers/solicitudController');

const app = express();

// ==================== MIDDLEWARES ====================
// CORS configurado para permitir el frontend
app.use(cors({
  origin: [
    'https://labsync-frontend.onrender.com', // Tu frontend en Render
    'http://localhost:3000',                 // Para desarrollo local
    'https://localhost:3000'                 // Para desarrollo local con HTTPS
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// ==================== RUTA DE PRUEBA ====================
// Ruta para verificar que el backend funciona
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 LabSync Backend funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '2.0.0 - Con control de permisos de stock'
  });
});

// Ruta de salud para verificar la conexión a la BD
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    
    // ✅ NUEVO: Verificar también la tabla de permisos
    const [permisosCount] = await pool.query('SELECT COUNT(*) as total FROM PermisosAlmacen');
    
    res.json({ 
      status: 'OK', 
      database: 'Connected',
      permisos_configurados: permisosCount[0].total,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      database: 'Disconnected',
      error: error.message 
    });
  }
});

// ==================== RUTAS DE LA API ====================
// Rutas existentes (con mejoras de permisos)
app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/solicitudes', solicitudRoutes);
app.use('/api/adeudos', adeudoRoutes);

// Nueva ruta de administrador (con gestión de permisos completa)
app.use('/api/admin', adminRoutes);

// ==================== INICIALIZACIÓN DE ROLES ====================
const initializeRoles = async () => {
  try {
    // Actualizado para incluir el rol de administrador
    await pool.query(`
      INSERT IGNORE INTO Rol (id, nombre) VALUES
      (1, 'alumno'),
      (2, 'docente'),
      (3, 'almacen'),
      (4, 'administrador');
    `);
    console.log('✅ Roles inicializados correctamente');
  } catch (error) {
    console.error('❌ Error inicializando roles:', error);
  }
};

// ==================== INICIALIZACIÓN DE TABLA PERMISOS ====================
const initializePermisosTable = async () => {
  try {
    // Crear tabla PermisosAlmacen si no existe
    await pool.query(`
      CREATE TABLE IF NOT EXISTS PermisosAlmacen (
        id INT AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT NOT NULL,
        acceso_chat BOOLEAN DEFAULT FALSE,
        modificar_stock BOOLEAN DEFAULT FALSE,
        fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES Usuario(id) ON DELETE CASCADE,
        UNIQUE KEY unique_usuario (usuario_id)
      );
    `);

    // Insertar permisos por defecto para usuarios de almacén existentes
    await pool.query(`
      INSERT IGNORE INTO PermisosAlmacen (usuario_id, acceso_chat, modificar_stock)
      SELECT id, FALSE, FALSE 
      FROM Usuario 
      WHERE rol_id = 3;
    `);

    // ✅ NUEVO: Verificar que los administradores no tengan registros en PermisosAlmacen
    await pool.query(`
      DELETE FROM PermisosAlmacen 
      WHERE usuario_id IN (SELECT id FROM Usuario WHERE rol_id = 4);
    `);

    // Crear índices para mejorar rendimiento
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_permisos_usuario ON PermisosAlmacen(usuario_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_usuario_rol ON Usuario(rol_id);
    `);
    
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_usuario_activo ON Usuario(activo);
    `);

    // ✅ NUEVO: Mostrar estadísticas de permisos inicializados
    const [stats] = await pool.query(`
      SELECT 
        COUNT(*) as total_permisos,
        SUM(acceso_chat) as con_chat,
        SUM(modificar_stock) as con_stock
      FROM PermisosAlmacen
    `);

    console.log('✅ Tabla PermisosAlmacen inicializada correctamente');
    console.log(`📊 Permisos configurados: ${stats[0].total_permisos} usuarios de almacén`);
    console.log(`💬 Con acceso a chat: ${stats[0].con_chat}`);
    console.log(`📦 Con acceso a stock: ${stats[0].con_stock}`);
  } catch (error) {
    console.error('❌ Error inicializando tabla PermisosAlmacen:', error);
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

// ✅ NUEVO: CRONJOB para limpiar mensajes antiguos
const { cleanupOldMessages } = require('./controllers/messageController');

const startMessageCleanupJob = () => {
  setInterval(async () => {
    console.log('🗑️ Ejecutando limpieza automática de mensajes antiguos...');
    try {
      const deletedCount = await cleanupOldMessages();
      console.log(`✅ Eliminados ${deletedCount} mensajes antiguos`);
    } catch (error) {
      console.error('❌ Error en limpieza de mensajes:', error);
    }
  }, 12 * 60 * 60 * 1000); // Cada 12 horas
};

// ==================== MANEJO DE ERRORES 404 ====================
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    path: req.originalUrl,
    method: req.method,
    disponibles: [
      '/api/auth/*',
      '/api/materials/*',
      '/api/messages/*', 
      '/api/solicitudes/*',
      '/api/adeudos/*',
      '/api/admin/*'
    ]
  });
});

// ==================== MANEJO DE ERRORES GLOBALES ====================
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal'
  });
});

// ==================== INICIAR SERVIDOR ====================
const PORT = process.env.PORT || 5000;

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Servidor LabSync corriendo en puerto ${PORT}`);
  console.log(`🌐 URL: https://labsync-1090.onrender.com`);
  console.log(`📅 Fecha de inicio: ${new Date().toISOString()}`);
  
  // Inicializar base de datos
  console.log('🔧 Inicializando sistema...');
  await initializeRoles();
  await initializePermisosTable();
  
  // Iniciar trabajos programados
  console.log('⏰ Iniciando trabajos programados...');
  startSolicitudCleanupJob();
  startMessageCleanupJob();
  
  console.log('✅ Sistema LabSync inicializado completamente');
  console.log('🔐 Funcionalidades de permisos:');
  console.log('   - Control de acceso a chat por usuario');
  console.log('   - Control de acceso a modificación de stock');
  console.log('   - Gestión completa de permisos desde panel admin');
});
