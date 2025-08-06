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

// ✅ URL base correcta para archivos RAW de GitHub
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/Francesito/LabSync/main/frontend/public/';

// Tablas a migrar
const TABLAS_MATERIALES = [
  { tabla: 'MaterialLiquido', campo_nombre: 'nombre', carpeta: 'materialLiquido' },
  { tabla: 'MaterialSolido', campo_nombre: 'nombre', carpeta: 'materialSolido' },
  { tabla: 'MaterialEquipo', campo_nombre: 'nombre', carpeta: 'materialEquipo' },
  { tabla: 'MaterialLaboratorio', campo_nombre: 'nombre', carpeta: 'materialLaboratorio' },
];

// Extensiones de imagen a buscar
const EXTENSIONES_IMAGEN = ['jpg', 'png', 'jpeg', 'webp'];

// Ruta del archivo de progreso
const PROGRESS_FILE = path.join(__dirname, 'migration_progress.json');

// ✅ Función para verificar si una imagen existe en GitHub RAW
async function verificarImagenEnGitHub(nombre, carpeta) {
  for (const ext of EXTENSIONES_IMAGEN) {
    const url = `${GITHUB_BASE_URL}${carpeta}/${nombre}.${ext}`;
    try {
      console.log(`🔍 Verificando: ${nombre}.${ext}`);
      
      const response = await axios.head(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'image/*,*/*',
        },
        validateStatus: (status) => status < 500, // No fallar en 404, solo en errores de servidor
      });
      
      if (response.status === 200) {
        console.log(`✅ Encontrada: ${nombre}.${ext}`);
        return url;
      } else {
        console.log(`⚠️ No encontrada: ${nombre}.${ext} (Status: ${response.status})`);
      }
    } catch (error) {
      if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
        console.log(`⏳ Timeout para ${nombre}.${ext}, reintentando...`);
        // Pausa antes de continuar
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        console.log(`❌ Error verificando ${nombre}.${ext}: ${error.message}`);
      }
    }
  }
  return null;
}

// ✅ Subir imagen a Cloudinary
async function subirImagenACloudinary(imageUrl, publicId, carpeta) {
  try {
    console.log(`⬆️ Subiendo a Cloudinary: ${publicId}`);
    
    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: `laboratory_materials/${carpeta}`,
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
      transformation: [
        { width: 800, height: 600, crop: 'limit' },
        { quality: 'auto', fetch_format: 'auto' },
      ],
      timeout: 60000,
    });
    
    console.log(`✅ Subida exitosa: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error(`❌ Error al subir ${publicId}:`, error.message);
    return null;
  }
}

// Leer progreso
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

// ✅ Migrar imágenes (versión simplificada)
async function migrarImagenes() {
  let connection;
  let total = 0;
  let subidas = 0;
  let saltados = 0;
  const errores = [];
  const progreso = await leerProgreso();

  try {
    // Validaciones iniciales
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      throw new Error('❌ Faltan credenciales de Cloudinary en las variables de entorno');
    }
    
    if (!process.env.DB_HOST) {
      throw new Error('❌ Faltan credenciales de la base de datos en las variables de entorno');
    }

    console.log('🔌 Conectando a MySQL...');
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos\n');

    for (const { tabla, campo_nombre, carpeta } of TABLAS_MATERIALES) {
      console.log(`\n${'='.repeat(80)}`);
      console.log(`📋 PROCESANDO TABLA: ${tabla}`);
      console.log(`📁 CARPETA: ${carpeta}`);
      console.log(`${'='.repeat(80)}`);
      
      // Obtener registros de la base de datos
      const [materiales] = await connection.execute(
        `SELECT id, ${campo_nombre} as nombre, imagen FROM ${tabla} ORDER BY id`
      );
      
      console.log(`📊 Total de registros en ${tabla}: ${materiales.length}`);

      for (const { id, nombre, imagen } of materiales) {
        total++;
        const clave = `${tabla}_${id}`;
        
        console.log(`\n--- ${total}. Procesando ID: ${id} | Nombre: "${nombre}" ---`);

        // Saltar si ya tiene imagen de Cloudinary
        if (imagen && imagen.includes('cloudinary')) {
          console.log('⏭️ Ya tiene imagen de Cloudinary, saltando...');
          progreso[clave] = { success: true, skipped: true };
          saltados++;
          continue;
        }

        // Saltar si ya se procesó anteriormente
        if (progreso[clave] && progreso[clave].success) {
          console.log('⏭️ Ya procesado anteriormente, saltando...');
          saltados++;
          continue;
        }

        if (!nombre || nombre.trim() === '') {
          console.log('⚠️ Nombre vacío o inválido');
          errores.push(`${clave}: nombre vacío`);
          progreso[clave] = { success: false, error: 'nombre_vacio' };
          continue;
        }

        // ✅ Buscar imagen usando el nombre exacto de la BD
        const urlImagen = await verificarImagenEnGitHub(nombre, carpeta);
        
        if (!urlImagen) {
          console.log(`❌ No se encontró imagen para: ${nombre}`);
          errores.push(`${clave}: imagen no encontrada - ${nombre}`);
          progreso[clave] = { success: false, error: 'no_encontrada', nombre_buscado: nombre };
          continue;
        }

        // Subir a Cloudinary
        const publicId = `${id}_${nombre}`;
        const urlCloudinary = await subirImagenACloudinary(urlImagen, publicId, carpeta);

        if (!urlCloudinary) {
          errores.push(`${clave}: error al subir a Cloudinary`);
          progreso[clave] = { success: false, error: 'error_subida' };
          continue;
        }

        // Actualizar base de datos
        try {
          await connection.execute(
            `UPDATE ${tabla} SET imagen = ? WHERE id = ?`, 
            [urlCloudinary, id]
          );
          
          subidas++;
          progreso[clave] = { 
            success: true, 
            url: urlCloudinary,
            nombre_original: nombre,
            url_github: urlImagen
          };
          
          console.log(`✅ MIGRADO EXITOSAMENTE`);
          console.log(`   GitHub: ${urlImagen}`);
          console.log(`   Cloudinary: ${urlCloudinary}`);
          
          // Pausa para evitar rate limits
          await new Promise(r => setTimeout(r, 500));
          
        } catch (dbError) {
          console.error(`❌ Error actualizando BD:`, dbError.message);
          errores.push(`${clave}: error actualizando BD - ${dbError.message}`);
          progreso[clave] = { success: false, error: 'error_bd' };
        }

        // Guardar progreso cada 5 elementos
        if (total % 5 === 0) {
          await guardarProgreso(progreso);
          console.log(`💾 Progreso guardado...`);
        }
      }

      console.log(`\n✅ TABLA ${tabla} COMPLETADA`);
      console.log(`📊 Procesados de esta tabla: ${materiales.length}`);
    }

  } catch (err) {
    console.error('\n💥 ERROR GENERAL:', err.message);
    errores.push(`Error general: ${err.message}`);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión a BD cerrada');
    }
    
    await guardarProgreso(progreso);

    // Resumen final detallado
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESUMEN FINAL DE MIGRACIÓN');
    console.log('='.repeat(80));
    console.log(`📦 Total de registros procesados: ${total}`);
    console.log(`✅ Imágenes migradas exitosamente: ${subidas}`);
    console.log(`⏭️ Registros saltados (ya procesados): ${saltados}`);
    console.log(`❌ Errores encontrados: ${errores.length}`);
    
    if (subidas > 0) {
      const porcentajeExito = ((subidas / (total - saltados)) * 100).toFixed(1);
      console.log(`📈 Tasa de éxito: ${porcentajeExito}%`);
    }
    
    if (errores.length > 0) {
      console.log('\n🚨 DETALLE DE ERRORES:');
      console.log('-'.repeat(50));
      errores.slice(0, 20).forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
      if (errores.length > 20) {
        console.log(`... y ${errores.length - 20} errores más`);
      }
    }
    
    console.log('\n🎉 PROCESO DE MIGRACIÓN COMPLETADO');
    
    if (subidas > 0) {
      console.log(`\n✨ Se migraron ${subidas} imágenes exitosamente a Cloudinary!`);
      console.log(`🔗 Las imágenes están organizadas en: laboratory_materials/[carpeta]/`);
    }
  }
}

// ✅ Rollback mejorado
async function rollbackMigracion() {
  let connection;

  try {
    console.log('🔄 Iniciando rollback de migración...');
    connection = await mysql.createConnection(dbConfig);

    let totalLimpiados = 0;

    // Limpiar base de datos
    for (const { tabla } of TABLAS_MATERIALES) {
      console.log(`🧹 Limpiando URLs de Cloudinary en tabla: ${tabla}`);
      const [result] = await connection.execute(
        `UPDATE ${tabla} SET imagen = NULL WHERE imagen LIKE '%cloudinary%'`
      );
      totalLimpiados += result.affectedRows;
      console.log(`✅ ${result.affectedRows} registros limpiados en ${tabla}`);
    }

    // Limpiar Cloudinary
    console.log('\n🗑️ Eliminando imágenes de Cloudinary...');
    try {
      const resources = await cloudinary.api.resources({
        resource_type: 'image',
        prefix: 'laboratory_materials',
        max_results: 500,
      });

      console.log(`📊 Encontradas ${resources.resources.length} imágenes en Cloudinary`);

      for (const resource of resources.resources) {
        await cloudinary.uploader.destroy(resource.public_id);
        console.log(`🗑️ Eliminada: ${resource.public_id}`);
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`✅ ${resources.resources.length} imágenes eliminadas de Cloudinary`);
    } catch (cloudError) {
      console.error('⚠️ Error eliminando de Cloudinary:', cloudError.message);
    }

    // Eliminar archivo de progreso
    try {
      await fs.unlink(PROGRESS_FILE);
      console.log('📄 Archivo de progreso eliminado');
    } catch {
      console.log('📄 No se encontró archivo de progreso para eliminar');
    }

    console.log('\n✅ ROLLBACK COMPLETADO EXITOSAMENTE');
    console.log(`📊 Total de registros limpiados en BD: ${totalLimpiados}`);

  } catch (err) {
    console.error('💥 Error durante el rollback:', err.message);
  } finally {
    if (connection) await connection.end();
  }
}

// ✅ Verificar configuración
async function verificarConfiguracion() {
  console.log('🔧 Verificando configuración del sistema...\n');
  
  // Verificar variables de entorno
  const envVars = [
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY', 
    'CLOUDINARY_API_SECRET',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME'
  ];
  
  const missing = envVars.filter(env => !process.env[env]);
  if (missing.length > 0) {
    console.error('❌ Variables de entorno faltantes:', missing.join(', '));
    return false;
  }
  
  console.log('✅ Variables de entorno configuradas correctamente');
  
  // Verificar conexión a Cloudinary
  try {
    await cloudinary.api.ping();
    console.log('✅ Conexión a Cloudinary exitosa');
  } catch (err) {
    console.error('❌ Error conectando a Cloudinary:', err.message);
    return false;
  }
  
  // Verificar conexión a base de datos
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.ping();
    await connection.end();
    console.log('✅ Conexión a base de datos exitosa');
  } catch (err) {
    console.error('❌ Error conectando a BD:', err.message);
    return false;
  }

  // Verificar algunas imágenes de muestra
  console.log('\n🔍 Verificando acceso a imágenes de GitHub...');
  const muestras = [
    { carpeta: 'materialEquipo', nombre: 'agitador_de_propelas' },
    { carpeta: 'materialSolido', nombre: 'acetato_de_amonio' },
    { carpeta: 'materialLiquido', nombre: 'acetona' }
  ];

  for (const { carpeta, nombre } of muestras) {
    const url = await verificarImagenEnGitHub(nombre, carpeta);
    if (url) {
      console.log(`✅ Acceso exitoso: ${carpeta}/${nombre}`);
    } else {
      console.log(`⚠️ No se pudo acceder: ${carpeta}/${nombre}`);
    }
  }
  
  console.log('\n🎉 Verificación de configuración completada');
  return true;
}

// ✅ Comando para listar algunas imágenes disponibles
async function listarImagenesMuestra() {
  console.log('🔍 Verificando disponibilidad de imágenes...\n');
  
  for (const { tabla, campo_nombre, carpeta } of TABLAS_MATERIALES.slice(0, 2)) {
    console.log(`📁 Carpeta: ${carpeta}`);
    
    let connection;
    try {
      connection = await mysql.createConnection(dbConfig);
      const [materiales] = await connection.execute(
        `SELECT id, ${campo_nombre} as nombre FROM ${tabla} ORDER BY id LIMIT 5`
      );
      
      for (const { id, nombre } of materiales) {
        const url = await verificarImagenEnGitHub(nombre, carpeta);
        console.log(`   ${id}. ${nombre}: ${url ? '✅ Encontrada' : '❌ No encontrada'}`);
      }
      
    } catch (err) {
      console.error(`❌ Error consultando ${tabla}:`, err.message);
    } finally {
      if (connection) await connection.end();
    }
    
    console.log('');
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
  case 'verificar':
    verificarConfiguracion();
    break;
  case 'listar':
    listarImagenesMuestra();
    break;
  default:
    console.log('\n📖 USO DEL SCRIPT DE MIGRACIÓN:');
    console.log('='.repeat(60));
    console.log('  node scripts/migrateImagesFromGitHub.js migrar    - Migrar imágenes a Cloudinary');
    console.log('  node scripts/migrateImagesFromGitHub.js rollback  - Deshacer migración completa');
    console.log('  node scripts/migrateImagesFromGitHub.js verificar - Verificar configuración');
    console.log('  node scripts/migrateImagesFromGitHub.js listar    - Listar muestra de imágenes');
    console.log('='.repeat(60));
    console.log('\n💡 Recomendación: Ejecuta primero "verificar" y luego "listar"');
    break;
}
