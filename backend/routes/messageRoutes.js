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

// Obtener lista de contactos (alumno verá todos almacenistas; almacenista verá solo sus alumnos)
// Unprotected version (fallback or public preview)
router.get('/users', messageController.getContactos);

// Protected version with chat access
router.get('/users', verificarAccesoChat, messageController.getContactos); // Using getContactos instead of obtenerUsuarios

// Obtener mensajes con un usuario específico
// Protected version
router.get('/:userId', verificarAccesoChat, messageController.getMessages); // Using getMessages instead of obtenerMensajes
// Unprotected version (fallback)
router.get('/:userId', messageController.getMessages);

// Enviar mensaje
// Protected version
router.post('/send', verificarAccesoChat, messageController.sendMessage); // Using sendMessage instead of enviarMensaje
// Unprotected version (fallback)
router.post('/send', messageController.sendMessage);

// (Opcional) Obtener todos los usuarios de un rol
router.get('/all', messageController.getAllByRole);

// Limpiar mensajes antiguos manualmente
router.delete('/cleanup', messageController.cleanupMessages);

module.exports = router;
