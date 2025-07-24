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

// Obtener lista de contactos (alumno verá todos almacenistas; almacenista verá solo sus alumnos)
router.get('/users', messageController.getContactos);

// Middleware que verifica tanto el rol como los permisos específicos de chat
const verificarAccesoChat = [
  verificarToken, // Included again to ensure it's applied to protected routes
  verificarMultiplesRoles(1, 3, 4), // Permitir alumnos, almacén y admin
  verificarPermisosAlmacen('chat')   // Verificar permisos específicos para almacén
];

// Todas las rutas de mensajes requieren acceso al chat
router.get('/users', verificarAccesoChat, messageController.getContactos); // Protected version
router.get('/:userId', verificarAccesoChat, messageController.obtenerMensajes); // Note: obtenerMensajes is undefined
router.post('/send', verificarAccesoChat, messageController.enviarMensaje);

// Enviar mensaje
router.post('/send', messageController.sendMessage);

// Obtener mensajes con un usuario específico
router.get('/:userId', messageController.getMessages);

// (Opcional) Obtener todos los usuarios de un rol
router.get('/all', messageController.getAllByRole);

// Limpiar mensajes antiguos manualmente
router.delete('/cleanup', messageController.cleanupMessages);

module.exports = router;
