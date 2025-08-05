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

// ✅ URL base corregida para GitHub
const GITHUB_BASE_URL = 'https://github.com/Francesito/LabSync/raw/main/frontend/public/';

// Tablas a migrar con sus respectivas carpetas
const TABLAS_MATERIALES = [
  { tabla: 'MaterialLiquido', campo_nombre: 'nombre', carpeta: 'materialLiquido' },
  { tabla: 'MaterialSolido', campo_nombre: 'nombre', carpeta: 'materialSolido' },
  { tabla: 'MaterialEquipo', campo_nombre: 'nombre', carpeta: 'materialEquipo' },
  { tabla: 'MaterialLaboratorio', campo_nombre: 'nombre', carpeta: 'materialLaboratorio' },
];

// Archivo para guardar el progreso
const PROGRESS_FILE = path.join(__dirname, 'migration_progress.json');

// Función para normalizar nombres para URLs
function normalizarNombre(nombre) {
  if (!nombre || typeof nombre !== 'string') return '';
  return nombre
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9_-]/g, '');
}

// ✅ Función para verificar si una imagen existe en GitHub con headers
async function verificarImagenEnGitHub(nombreImagen, carpeta) {
  const extensiones = ['jpg', 'png', 'jpeg', 'webp'];
  for (const ext of extensiones) {
    const url = `${GITHUB_BASE_URL}${carpeta}/${nombreImagen}.${ext}`;
    try {
      console.log(`🔗 Intentando: ${url}`);
      const response = await axios.head(url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Accept': '*/*',
        },
      });
      if (response.status === 200) {
        console.log(`✅ Encontrada: ${url}`);
        return url;
      }
    } catch (error) {
      console.log(`⚠️ Error .${ext}: ${error.message}`);
    }
  }
  console.log(`❌ Imagen no encontrada: ${nombreImagen} en ${carpeta}`);
  return null;
}

// Función para subir imagen a Cloudinary desde URL
async function subirImagenACloudinary(imageUrl, publicId) {
  try {
    console.log(`⬆️ Subiendo: ${publicId}`);
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
    console.log(`✅ Subida: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error(`❌ Error subiendo ${publicId}: ${error.message}`);
    return null;
  }
}

// Función para leer el progreso
async function leerProgreso() {
  try {
    const data = await fs.readFile(PROGRESS_FILE, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

// Función para guardar el progreso
async function guardarProgreso(progreso) {
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(progreso, null, 2));
}

// Función principal de migración
async function migrarImagenes() {
  let connection;
  let totalProcesados = 0;
  let totalMigrados = 0;
  let errores = [];

  try {
    console.log('🚀 Iniciando migración...\n');

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)
      throw new Error('Faltan credenciales de Cloudinary');

    if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME)
      throw new Error('Faltan credenciales de la base de datos');

    console.log('🔌 Conectando a la base de datos...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado\n');

    const progreso = await leerProgreso();

    for (const { tabla, campo_nombre, carpeta } of TABLAS_MATERIALES) {
      if (progreso[tabla]?.completed) {
        console.log(`⏭️ Tabla ${tabla} ya procesada`);
        continue;
      }

      console.log(`📋 Procesando: ${tabla}`);
      const [materiales] = await connection.execute(
        `SELECT id, ${campo_nombre} as nombre, imagen FROM ${tabla}`
      );

      console.log(`📦 ${materiales.length} materiales encontrados`);

      if (materiales.length === 0) {
        console.log(`⚠️ Tabla ${tabla} vacía`);
        errores.push(`Tabla ${tabla}: No hay registros`);
        progreso[tabla] = { completed: true };
        await guardarProgreso(progreso);
        continue;
      }

      for (const material of materiales) {
        const { id, nombre, imagen } = material;
        const progresoKey = `${tabla}_${id}`;

        if (progreso[progresoKey]) {
          console.log(`⏭️ ${nombre} (ID: ${id}) ya procesado`);
          totalProcesados++;
          if (progreso[progresoKey].success) totalMigrados++;
          continue;
        }

        totalProcesados++;
        console.log(`🔎 Procesando: ${nombre} (ID: ${id})`);

        if (!nombre || nombre.trim() === '') {
          console.log(`❌ Nombre inválido (ID: ${id})`);
          errores.push(`${tabla}[${id}] - Nombre inválido`);
          progreso[progresoKey] = { success: false };
          await guardarProgreso(progreso);
          continue;
        }

        if (imagen && imagen.includes('cloudinary')) {
          console.log(`⏭️ ${nombre} ya tiene imagen: ${imagen}`);
          progreso[progresoKey] = { success: true };
          await guardarProgreso(progreso);
          totalMigrados++;
          continue;
        }

        const nombreNormalizado = normalizarNombre(nombre);
        console.log(`🔍 Normalizado: ${nombreNormalizado}`);

        if (!nombreNormalizado) {
          console.log(`❌ Nombre normalizado inválido: ${nombre}`);
          errores.push(`${tabla}[${id}] - ${nombre}: Nombre normalizado inválido`);
          progreso[progresoKey] = { success: false };
          await guardarProgreso(progreso);
          continue;
        }

        const urlGitHub = await verificarImagenEnGitHub(nombreNormalizado, carpeta);
        if (!urlGitHub) {
          console.log(`❌ Imagen no encontrada: ${nombre}`);
          errores.push(`${tabla}[${id}] - ${nombre}: Imagen no encontrada en GitHub`);
          progreso[progresoKey] = { success: false };
          await guardarProgreso(progreso);
          continue;
        }

        const publicId = `${carpeta}_${id}_${nombreNormalizado}`;
        const urlCloudinary = await subirImagenACloudinary(urlGitHub, publicId);
        if (!urlCloudinary) {
          console.log(`❌ Error subiendo: ${nombre}`);
          errores.push(`${tabla}[${id}] - ${nombre}: Error subiendo a Cloudinary`);
          progreso[progresoKey] = { success: false };
          await guardarProgreso(progreso);
          continue;
        }

        console.log(`🔄 Actualizando base de datos: ${nombre}`);
        await connection.execute(`UPDATE ${tabla} SET imagen = ? WHERE id = ?`, [urlCloudinary, id]);

        totalMigrados++;
        console.log(`✅ Migrado: ${nombre} - ${urlCloudinary}`);
        progreso[progresoKey] = { success: true, url: urlCloudinary };
        await guardarProgreso(progreso);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`📋 Tabla ${tabla} completada\n`);
      progreso[tabla] = { completed: true };
      await guardarProgreso(progreso);
    }

  } catch (error) {
    console.error('💥 Error general:', error.message);
    errores.push(`Error general: ${error.message}`);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 RESUMEN');
    console.log('='.repeat(50));
    console.log(`📦 Procesados: ${totalProcesados}`);
    console.log(`✅ Migrados: ${totalMigrados}`);
    console.log(`❌ Errores: ${errores.length}`);

    if (errores.length > 0) {
      console.log('\n🚨 ERRORES:');
      errores.forEach((error, index) => console.log(`${index + 1}. ${error}`));
    }

    console.log('\n🎉 Migración completada!');
  }
}

// Rollback
async function rollbackMigracion() {
  let connection;

  try {
    console.log('🔄 Iniciando rollback...\n');

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET)
      throw new Error('Faltan credenciales de Cloudinary');

    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado\n');

    for (const { tabla } of TABLAS_MATERIALES) {
      console.log(`📋 Limpiando: ${tabla}`);
      const [result] = await connection.execute(
        `UPDATE ${tabla} SET imagen = NULL WHERE imagen LIKE '%cloudinary%'`
      );
      console.log(`✅ ${result.affectedRows} registros limpiados\n`);
    }

    console.log('🗑️ Eliminando imágenes de Cloudinary...');
    const resources = await cloudinary.api.resources({
      resource_type: 'image',
      prefix: 'laboratory_materials',
      max_results: 500,
    });

    if (resources.resources.length === 0) {
      console.log('⚠️ No hay imágenes en laboratory_materials');
    }

    for (const resource of resources.resources) {
      await cloudinary.uploader.destroy(resource.public_id);
      console.log(`✅ Eliminada: ${resource.public_id}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('🎉 Rollback completado!');
    await fs.unlink(PROGRESS_FILE).catch(() => {});

  } catch (error) {
    console.error('💥 Error en rollback:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Comando
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
