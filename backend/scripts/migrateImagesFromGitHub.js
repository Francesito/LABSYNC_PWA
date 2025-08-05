require('dotenv').config();
const mysql = require('mysql2/promise');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

// Configuración de base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'labsync-labsync.e.aivencloud.com',
  user: process.env.DB_USER || 'your_username',
  password: process.env.DB_PASSWORD || 'your_password',
  database: process.env.DB_NAME || 'defaultdb',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4',
};

// ✅ URL base de GitHub RAW corregida
const GITHUB_BASE_URL = 'https://github.com/Francesito/LabSync/raw/main/frontend/public/';

// Tablas a migrar
const TABLAS_MATERIALES = [
  { tabla: 'MaterialLiquido', campo_nombre: 'nombre', carpeta: 'materialLiquido' },
  { tabla: 'MaterialSolido', campo_nombre: 'nombre', carpeta: 'materialSolido' },
  { tabla: 'MaterialEquipo', campo_nombre: 'nombre', carpeta: 'materialEquipo' },
  { tabla: 'MaterialLaboratorio', campo_nombre: 'nombre', carpeta: 'materialLaboratorio' },
];

// Ruta del archivo de progreso
const PROGRESS_FILE = path.join(__dirname, 'migration_progress.json');

// Función para normalizar nombres
function normalizarNombre(nombre) {
  return nombre.toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9_-]/g, '');
}

// ✅ Verificar si la imagen existe en GitHub (usando GET con headers)
async function verificarImagenEnGitHub(nombreImagen, carpeta) {
  const extensiones = ['jpg', 'png', 'jpeg', 'webp'];
  for (const ext of extensiones) {
    const url = `${GITHUB_BASE_URL}${carpeta}/${nombreImagen}.${ext}`;
    try {
      console.log(`🔗 Intentando: ${url}`);
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': '*/*',
        },
        validateStatus: () => true,
      });
      if (response.status === 200) {
        console.log(`✅ Encontrada: ${url}`);
        return url;
      } else {
        console.log(`⚠️ Status ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Error al acceder: ${error.message}`);
    }
  }
  return null;
}

// Subir imagen a Cloudinary
async function subirImagenACloudinary(imageUrl, publicId) {
  try {
    console.log(`⬆️ Subiendo a Cloudinary: ${publicId}`);
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'laboratory_materials',
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
    });
    return result.secure_url;
  } catch (error) {
    console.error(`❌ Fallo al subir ${publicId}: ${error.message}`);
    return null;
  }
}

// Leer progreso (si existe)
async function leerProgreso() {
  try {
    const data = await fs.readFile(PROGRESS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Guardar progreso
async function guardarProgreso(progreso) {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(progreso, null, 2));
}

// Migrar imágenes
async function migrarImagenes() {
  let connection;
  let total = 0;
  let subidas = 0;
  const errores = [];
  const progreso = {}; // <-- Reseteamos progreso aquí

  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME) throw new Error('Faltan credenciales de Cloudinary');
    if (!process.env.DB_HOST) throw new Error('Faltan credenciales de la base de datos');

    console.log('🔌 Conectando a MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado\n');

    for (const { tabla, campo_nombre, carpeta } of TABLAS_MATERIALES) {
      console.log(`📋 Procesando tabla: ${tabla}`);
      const [materiales] = await connection.execute(`SELECT id, ${campo_nombre} as nombre, imagen FROM ${tabla}`);

      for (const { id, nombre, imagen } of materiales) {
        total++;
        const clave = `${tabla}_${id}`;

        if (!nombre || (imagen && imagen.includes('cloudinary'))) {
          progreso[clave] = { success: true };
          continue;
        }

        const nombreNormalizado = normalizarNombre(nombre);
        const url = await verificarImagenEnGitHub(nombreNormalizado, carpeta);

        if (!url) {
          errores.push(`${clave}: imagen no encontrada`);
          progreso[clave] = { success: false };
          continue;
        }

        const publicId = `${carpeta}_${id}_${nombreNormalizado}`;
        const urlCloudinary = await subirImagenACloudinary(url, publicId);

        if (!urlCloudinary) {
          errores.push(`${clave}: error al subir`);
          progreso[clave] = { success: false };
          continue;
        }

        await connection.execute(`UPDATE ${tabla} SET imagen = ? WHERE id = ?`, [urlCloudinary, id]);
        subidas++;
        progreso[clave] = { success: true, url: urlCloudinary };
        await new Promise(r => setTimeout(r, 100));
      }

      console.log(`✅ Tabla ${tabla} procesada\n`);
    }

  } catch (err) {
    console.error('💥 Error general:', err.message);
    errores.push(`Error general: ${err.message}`);
  } finally {
    if (connection) await connection.end();
    await guardarProgreso(progreso);

    console.log('\n📊 RESUMEN');
    console.log('='.repeat(50));
    console.log(`📦 Total procesados: ${total}`);
    console.log(`✅ Migrados a Cloudinary: ${subidas}`);
    console.log(`❌ Errores: ${errores.length}`);
    if (errores.length) {
      console.log('\n🚨 Detalle de errores:');
      errores.forEach((e, i) => console.log(`${i + 1}. ${e}`));
    }
    console.log('\n🎉 Proceso completado.');
  }
}

// Rollback
async function rollbackMigracion() {
  let connection;

  try {
    console.log('🔄 Rollback en curso...');
    connection = await mysql.createConnection(dbConfig);

    for (const { tabla } of TABLAS_MATERIALES) {
      console.log(`🧹 Limpiando tabla: ${tabla}`);
      await connection.execute(`UPDATE ${tabla} SET imagen = NULL WHERE imagen LIKE '%cloudinary%'`);
    }

    const resources = await cloudinary.api.resources({
      resource_type: 'image',
      prefix: 'laboratory_materials',
      max_results: 500,
    });

    for (const resource of resources.resources) {
      await cloudinary.uploader.destroy(resource.public_id);
      console.log(`🗑️ Borrada: ${resource.public_id}`);
    }

    await fs.unlink(PROGRESS_FILE).catch(() => {});
    console.log('✅ Rollback completado');

  } catch (err) {
    console.error('💥 Error en rollback:', err.message);
  } finally {
    if (connection) await connection.end();
  }
}

// Comando principal
const comando = process.argv[2];

switch (comando) {
  case 'migrar':
    migrarImagenes();
    break;
  case 'rollback':
    rollbackMigracion();
    break;
  default:
    console.log('📖 USO:');
    console.log('  node scripts/migrateImagesFromGitHub.js migrar   - Migrar imágenes');
    console.log('  node scripts/migrateImagesFromGitHub.js rollback - Deshacer migración');
    break;
}
