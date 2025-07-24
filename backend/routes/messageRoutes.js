const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { 
  verificarToken, 
  verificarMultiplesRoles, 
  verificarPermisosAlmacen 
} = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Middleware que verifica tanto el rol como los permisos específicos de chat
const verificarAccesoChat = [
  verificarMultiplesRoles(1, 3, 4), // Permitir alumnos, almacén y admin
  verificarPermisosAlmacen('chat')   // Verificar permisos específicos para almacén
];

/**
 * ========================
 * RUTAS PRINCIPALES DE CHAT
 * ========================
 */

// Obtener lista de contactos (alumno verá todos almacenistas; almacenista verá solo sus alumnos)
// Versión protegida con verificación de acceso a chat
router.get('/users', verificarAccesoChat, messageController.getContactos);

// Obtener mensajes con un usuario específico
// Versión protegida con verificación de acceso a chat
router.get('/:userId', verificarAccesoChat, messageController.getMessages);

// Enviar mensaje
// Versión protegida con verificación de acceso a chat
router.post('/send', verificarAccesoChat, messageController.sendMessage);

/**
 * ========================
 * RUTAS ADMINISTRATIVAS
 * ========================
 */

// Obtener todos los usuarios de un rol específico
// Solo para usuarios con acceso a chat (para poder ver contactos disponibles)
router.get('/all/:rol', verificarAccesoChat, messageController.getAllByRole);

// Limpiar mensajes antiguos manualmente
// Solo administradores pueden limpiar mensajes
router.delete('/cleanup', verificarMultiplesRoles(4), messageController.cleanupMessages);

/**
 * ========================
 * RUTAS DE FALLBACK/DEBUGGING (OPCIONAL)
 * ========================
 */

// Ruta para verificar el estado de acceso al chat del usuario actual
router.get('/chat/status', (req, res) => {
  const usuario = req.usuario;
  
  let puedeAccederChat = false;
  
  // Lógica de verificación de acceso al chat
  if (usuario.rol_id === 1 || usuario.rol_id === 4) {
    puedeAccederChat = true; // Alumno y admin siempre pueden
  } else if (usuario.rol_id === 3 && usuario.permisos?.acceso_chat) {
    puedeAccederChat = true; // Almacén solo con permisos
  }
  // Docentes (rol_id === 2) no tienen acceso al chat
  
  res.json({
    usuario_id: usuario.id,
    rol: usuario.rol_id,
    acceso_chat: puedeAccederChat,
    permisos: usuario.permisos || null
  });
});

// Ruta para obtener información básica del usuario actual
router.get('/me', (req, res) => {
  const usuario = req.usuario;
  res.json({
    id: usuario.id,
    nombre: usuario.nombre,
    correo: usuario.correo_institucional,
    rol_id: usuario.rol_id,
    permisos: usuario.permisos || null
  });
});

module.exports = router;
