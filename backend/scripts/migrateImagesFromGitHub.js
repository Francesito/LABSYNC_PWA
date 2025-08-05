require('dotenv').config();
const mysql = require('mysql2/promise');
const cloudinary = require('../config/cloudinary');
const axios = require('axios');

// Configuración de base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'labsync-labsync.e.aivencloud.com',
  user: process.env.DB_USER || 'your_username',
  password: process.env.DB_PASSWORD || 'your_password',
  database: process.env.DB_NAME || 'defaultdb',
  port: process.env.DB_PORT || 3306,
  charset: 'utf8mb4',
};

// URL base de GitHub para las imágenes
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/Francesito/LabSync/main/frontend/public/';

// Tablas a migrar con sus respectivas carpetas
const TABLAS_MATERIALES = [
  { tabla: 'MaterialLiquido', campo_nombre: 'nombre', carpeta: 'materialLiquido' },
  { tabla: 'MaterialSolido', campo_nombre: 'nombre', carpeta: 'materialSolido' },
  { tabla: 'MaterialEquipo', campo_nombre: 'nombre', carpeta: 'materialEquipo' },
  { tabla: 'MaterialLaboratorio', campo_nombre: 'nombre', carpeta: 'materialLaboratorio' },
];

// Función para normalizar nombres para URLs
function normalizarNombre(nombre) {
  return nombre
    .toLowerCase()
    .replace(/\s+/g, '_')           // Espacios a guiones bajos
    .replace(/[áàäâ]/g, 'a')        // Acentos
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9_-]/g, '');   // Solo letras, números, guiones y guiones bajos
}

// Función para verificar si una imagen existe en GitHub
async function verificarImagenEnGitHub(nombreImagen, carpeta) {
  try {
    const url = `${GITHUB_BASE_URL}${carpeta}/${nombreImagen}.jpg`;
    const response = await axios.head(url, { timeout: 5000 });
    return response.status === 200 ? url : null;
  } catch (error) {
    // Intentar con .png si .jpg no existe
    try {
      const url = `${GITHUB_BASE_URL}${carpeta}/${nombreImagen}.png`;
      const response = await axios.head(url, { timeout: 5000 });
      return response.status === 200 ? url : null;
    } catch (error2) {
      return null;
    }
  }
}

// Función para subir imagen a Cloudinary desde URL
async function subirImagenACloudinary(imageUrl, publicId) {
  try {
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: 'laboratory_materials',
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto' },
      ],
    });
    return result.secure_url;
  } catch (error) {
    console.error(`Error subiendo imagen ${publicId}:`, error.message);
    return null;
  }
}

// Función principal de migración
async function migrarImagenes() {
  let connection;
  let totalProcesados = 0;
  let totalMigrados = 0;
  let errores = [];

  try {
    console.log('🚀 Iniciando migración de imágenes de GitHub a Cloudinary...\n');
    
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos\n');

    // Procesar cada tabla
    for (const { tabla, campo_nombre, carpeta } of TABLAS_MATERIALES) {
      console.log(`📋 Procesando tabla: ${tabla}`);
      
      // Obtener todos los materiales de la tabla
      const [materiales] = await connection.execute(
        `SELECT id, ${campo_nombre} as nombre, imagen FROM ${tabla}`
      );

      console.log(`   - Encontrados ${materiales.length} materiales`);

      for (const material of materiales) {
        totalProcesados++;
        const { id, nombre, imagen } = material;

        // Si ya tiene imagen de Cloudinary, saltar
        if (imagen && imagen.includes('cloudinary')) {
          console.log(`   ⏭️  ${nombre} ya tiene imagen de Cloudinary`);
          continue;
        }

        // Normalizar nombre para buscar imagen
        const nombreNormalizado = normalizarNombre(nombre);
        
        // Verificar si existe imagen en GitHub
        console.log(`   🔍 Buscando imagen para: ${nombre} (${nombreNormalizado})`);
        const urlGitHub = await verificarImagenEnGitHub(nombreNormalizado, carpeta);
        
        if (!urlGitHub) {
          console.log(`   ❌ No se encontró imagen en GitHub para: ${nombre}`);
          errores.push(`${tabla}[${id}] - ${nombre}: Imagen no encontrada en GitHub`);
          continue;
        }

        // Subir a Cloudinary
        console.log(`   ⬆️  Subiendo a Cloudinary: ${nombre}`);
        const publicId = `${carpeta}_${id}_${nombreNormalizado}`;
        const urlCloudinary = await subirImagenACloudinary(urlGitHub, publicId);

        if (!urlCloudinary) {
          console.log(`   ❌ Error subiendo a Cloudinary: ${nombre}`);
          errores.push(`${tabla}[${id}] - ${nombre}: Error subiendo a Cloudinary`);
          continue;
        }

        // Actualizar base de datos
        await connection.execute(
          `UPDATE ${tabla} SET imagen = ? WHERE id = ?`,
          [urlCloudinary, id]
        );

        totalMigrados++;
        console.log(`   ✅ Migrado exitosamente: ${nombre}`);
        console.log(`      📎 URL: ${urlCloudinary}\n`);

        // Pausa pequeña para no saturar las APIs
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log(`📋 Tabla ${tabla} completada\n`);
    }

  } catch (error) {
    console.error('💥 Error durante la migración:', error);
  } finally {
    if (connection) {
      await connection.end();
    }

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN DE MIGRACIÓN');
    console.log('='.repeat(60));
    console.log(`📦 Total materiales procesados: ${totalProcesados}`);
    console.log(`✅ Total imágenes migradas: ${totalMigrados}`);
    console.log(`❌ Total errores: ${errores.length}`);
    
    if (errores.length > 0) {
      console.log('\n🚨 ERRORES ENCONTRADOS:');
      errores.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    console.log('\n🎉 Migración completada!');
  }
}

// Función para rollback (restaurar estado anterior)
async function rollbackMigracion() {
  let connection;
  
  try {
    console.log('🔄 Iniciando rollback de migración...\n');
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos\n');

    for (const { tabla } of TABLAS_MATERIALES) {
      console.log(`📋 Limpiando tabla: ${tabla}`);
      
      const [result] = await connection.execute(
        `UPDATE ${tabla} SET imagen = NULL WHERE imagen LIKE '%cloudinary%'`
      );
      
      console.log(`   ✅ ${result.affectedRows} registros limpiados\n`);
    }

    // Eliminar imágenes de Cloudinary
    const resources = await cloudinary.api.resources({
      resource_type: 'image',
      prefix: 'laboratory_materials',
      max_results: 500,
    });

    for (const resource of resources.resources) {
      await cloudinary.uploader.destroy(resource.public_id);
      console.log(`   ✅ Imagen eliminada de Cloudinary: ${resource.public_id}`);
    }

    console.log('🎉 Rollback completado!');
    
  } catch (error) {
    console.error('💥 Error durante rollback:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ejecutar script según argumentos de línea de comandos
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
    console.log('  node scripts/migrateImagesFromGitHub.js migrar   - Migrar imágenes a Cloudinary');
    console.log('  node scripts/migrateImagesFromGitHub.js rollback - Deshacer migración');
    break;
}
