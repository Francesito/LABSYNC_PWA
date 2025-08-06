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
const GITHUB_BASE_URL = 'https://raw.githubusercontent.com/Francesito/LabSync/main/frontend/public/';

// Tablas a migrar
const TABLAS_MATERIALES = [
  { tabla: 'MaterialLiquido', campo_nombre: 'nombre', carpeta: 'materialLiquido' },
  { tabla: 'MaterialSolido', campo_nombre: 'nombre', carpeta: 'materialSolido' },
  { tabla: 'MaterialEquipo', campo_nombre: 'nombre', carpeta: 'materialEquipo' },
  { tabla: 'MaterialLaboratorio', campo_nombre: 'nombre', carpeta: 'materialLaboratorio' },
];

// Ruta del archivo de progreso
const PROGRESS_FILE = path.join(__dirname, 'migration_progress.json');

// ✅ Función mejorada para normalizar nombres (más conservadora)
function normalizarNombre(nombre) {
  return nombre.toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[áàäâ]/g, 'a')
    .replace(/[éèëê]/g, 'e')
    .replace(/[íìïî]/g, 'i')
    .replace(/[óòöô]/g, 'o')
    .replace(/[úùüû]/g, 'u')
    .replace(/[ñ]/g, 'n')
    .replace(/[çç]/g, 'c')
    .replace(/[^a-z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// ✅ Obtener lista de archivos de una carpeta desde GitHub API
async function obtenerArchivosGitHub(carpeta) {
  try {
    const apiUrl = `https://api.github.com/repos/Francesito/LabSync/contents/frontend/public/${carpeta}`;
    console.log(`📂 Obteniendo lista de archivos de: ${carpeta}`);
    
    const response = await axios.get(apiUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (response.status === 200 && Array.isArray(response.data)) {
      const archivos = response.data
        .filter(file => file.type === 'file')
        .map(file => ({
          nombre: file.name,
          nombreSinExt: file.name.replace(/\.(jpg|jpeg|png|webp|gif)$/i, ''),
          url: file.download_url
        }));
      
      console.log(`✅ Encontrados ${archivos.length} archivos en ${carpeta}`);
      return archivos;
    }
  } catch (error) {
    console.error(`❌ Error obteniendo archivos de ${carpeta}:`, error.message);
  }
  return [];
}

// ✅ Buscar imagen por nombre con coincidencia flexible
function buscarImagenPorNombre(nombreBuscado, listaArchivos) {
  const nombreNormalizado = normalizarNombre(nombreBuscado);
  
  // Búsqueda por coincidencia exacta
  let encontrado = listaArchivos.find(archivo => 
    normalizarNombre(archivo.nombreSinExt) === nombreNormalizado
  );
  
  if (encontrado) {
    console.log(`✅ Coincidencia exacta: ${encontrado.nombre}`);
    return encontrado;
  }
  
  // Búsqueda por coincidencia parcial
  encontrado = listaArchivos.find(archivo => 
    normalizarNombre(archivo.nombreSinExt).includes(nombreNormalizado) ||
    nombreNormalizado.includes(normalizarNombre(archivo.nombreSinExt))
  );
  
  if (encontrado) {
    console.log(`⚠️ Coincidencia parcial: ${encontrado.nombre} para "${nombreBuscado}"`);
    return encontrado;
  }
  
  // Búsqueda por palabras clave
  const palabrasClave = nombreNormalizado.split('_').filter(p => p.length > 2);
  if (palabrasClave.length > 0) {
    encontrado = listaArchivos.find(archivo => {
      const nombreArchivo = normalizarNombre(archivo.nombreSinExt);
      return palabrasClave.some(palabra => nombreArchivo.includes(palabra));
    });
    
    if (encontrado) {
      console.log(`🔍 Coincidencia por palabra clave: ${encontrado.nombre} para "${nombreBuscado}"`);
      return encontrado;
    }
  }
  
  return null;
}

// ✅ Subir imagen a Cloudinary (mejorada)
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
      timeout: 60000, // 60 segundos
    });
    
    console.log(`✅ Subida exitosa: ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error(`❌ Error al subir ${publicId}:`, error.message);
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

// ✅ Migrar imágenes (versión mejorada)
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
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📋 Procesando tabla: ${tabla} (carpeta: ${carpeta})`);
      console.log(`${'='.repeat(60)}`);
      
      // Obtener lista de archivos de GitHub
      const archivosGitHub = await obtenerArchivosGitHub(carpeta);
      if (archivosGitHub.length === 0) {
        console.log(`⚠️ No se encontraron archivos en la carpeta ${carpeta}`);
        continue;
      }

      // Obtener registros de la base de datos
      const [materiales] = await connection.execute(
        `SELECT id, ${campo_nombre} as nombre, imagen FROM ${tabla} ORDER BY id`
      );
      
      console.log(`📊 Registros en ${tabla}: ${materiales.length}`);

      for (const { id, nombre, imagen } of materiales) {
        total++;
        const clave = `${tabla}_${id}`;
        
        console.log(`\n--- Procesando ${clave}: "${nombre}" ---`);

        // Saltar si ya tiene imagen de Cloudinary
        if (imagen && imagen.includes('cloudinary')) {
          console.log('⏭️ Ya tiene imagen de Cloudinary');
          progreso[clave] = { success: true, skipped: true };
          saltados++;
          continue;
        }

        // Saltar si ya se procesó anteriormente
        if (progreso[clave] && progreso[clave].success) {
          console.log('⏭️ Ya procesado anteriormente');
          saltados++;
          continue;
        }

        if (!nombre || nombre.trim() === '') {
          console.log('⚠️ Nombre vacío');
          errores.push(`${clave}: nombre vacío`);
          progreso[clave] = { success: false, error: 'nombre_vacio' };
          continue;
        }

        // Buscar imagen correspondiente
        const archivoEncontrado = buscarImagenPorNombre(nombre, archivosGitHub);
        
        if (!archivoEncontrado) {
          console.log(`❌ No se encontró imagen para "${nombre}"`);
          errores.push(`${clave}: imagen no encontrada para "${nombre}"`);
          progreso[clave] = { success: false, error: 'no_encontrada' };
          continue;
        }

        // Subir a Cloudinary
        const publicId = `${id}_${normalizarNombre(nombre)}`;
        const urlCloudinary = await subirImagenACloudinary(
          archivoEncontrado.url, 
          publicId, 
          carpeta
        );

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
            archivo_origen: archivoEncontrado.nombre 
          };
          
          console.log(`✅ Migrado exitosamente`);
          
          // Pausa para evitar rate limits
          await new Promise(r => setTimeout(r, 200));
          
        } catch (dbError) {
          console.error(`❌ Error actualizando BD:`, dbError.message);
          errores.push(`${clave}: error actualizando BD - ${dbError.message}`);
          progreso[clave] = { success: false, error: 'error_bd' };
        }

        // Guardar progreso cada 10 elementos
        if (total % 10 === 0) {
          await guardarProgreso(progreso);
        }
      }

      console.log(`\n✅ Tabla ${tabla} completada`);
    }

  } catch (err) {
    console.error('\n💥 Error general:', err.message);
    errores.push(`Error general: ${err.message}`);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión a BD cerrada');
    }
    
    await guardarProgreso(progreso);

    // Resumen final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESUMEN FINAL');
    console.log('='.repeat(60));
    console.log(`📦 Total procesados: ${total}`);
    console.log(`✅ Migrados a Cloudinary: ${subidas}`);
    console.log(`⏭️ Saltados (ya procesados): ${saltados}`);
    console.log(`❌ Errores: ${errores.length}`);
    
    if (errores.length > 0) {
      console.log('\n🚨 DETALLE DE ERRORES:');
      console.log('-'.repeat(40));
      errores.forEach((error, i) => console.log(`${i + 1}. ${error}`));
    }
    
    console.log('\n🎉 Proceso de migración completado.');
    
    if (subidas > 0) {
      console.log(`\n✨ Se migraron ${subidas} imágenes exitosamente a Cloudinary.`);
    }
  }
}

// ✅ Rollback mejorado
async function rollbackMigracion() {
  let connection;

  try {
    console.log('🔄 Iniciando rollback...');
    connection = await mysql.createConnection(dbConfig);

    // Limpiar base de datos
    for (const { tabla } of TABLAS_MATERIALES) {
      console.log(`🧹 Limpiando URLs de Cloudinary en tabla: ${tabla}`);
      const [result] = await connection.execute(
        `UPDATE ${tabla} SET imagen = NULL WHERE imagen LIKE '%cloudinary%'`
      );
      console.log(`✅ ${result.affectedRows} registros limpiados`);
    }

    // Limpiar Cloudinary
    console.log('\n🗑️ Eliminando imágenes de Cloudinary...');
    try {
      const resources = await cloudinary.api.resources({
        resource_type: 'image',
        prefix: 'laboratory_materials',
        max_results: 500,
      });

      for (const resource of resources.resources) {
        await cloudinary.uploader.destroy(resource.public_id);
        console.log(`🗑️ Eliminada: ${resource.public_id}`);
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
      console.log('📄 No se encontró archivo de progreso');
    }

    console.log('\n✅ Rollback completado exitosamente');

  } catch (err) {
    console.error('💥 Error durante el rollback:', err.message);
  } finally {
    if (connection) await connection.end();
  }
}

// ✅ Verificar configuración
async function verificarConfiguracion() {
  console.log('🔧 Verificando configuración...\n');
  
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
  
  console.log('✅ Variables de entorno configuradas');
  
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
  
  console.log('\n🎉 Configuración verificada correctamente');
  return true;
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
  default:
    console.log('\n📖 USO DEL SCRIPT:');
    console.log('='.repeat(50));
    console.log('  node scripts/migrateImagesFromGitHub.js migrar    - Migrar imágenes a Cloudinary');
    console.log('  node scripts/migrateImagesFromGitHub.js rollback  - Deshacer migración');
    console.log('  node scripts/migrateImagesFromGitHub.js verificar - Verificar configuración');
    console.log('='.repeat(50));
    break;
}
