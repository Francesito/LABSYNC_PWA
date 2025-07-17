const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  ssl: {
    rejectUnauthorized: false
  },
  acquireTimeout: 60000,      // 60 segundos para obtener conexión
  timeout: 60000,             // 60 segundos para queries
  reconnect: true,            // Reconectar automáticamente
  connectionLimit: 10,        // Máximo 10 conexiones
  queueLimit: 0,              // Sin límite en la cola
  enableKeepAlive: true,      // Mantener conexiones vivas
  keepAliveInitialDelay: 0
});

// Probar conexión al inicio
pool.getConnection()
  .then(connection => {
    console.log('✅ Conexión a la base de datos exitosa');
    connection.release();
  })
  .catch(error => {
    console.error('❌ Error conectando a la base de datos:', error.message);
  });

module.exports = pool;
