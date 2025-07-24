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
  verificarMultiplesRoles([1, 3, 4]), // Permitir alumnos (1), almacén (3), admin (4)
  verificarPermisosAlmacen('chat')    // Verificar permisos específicos para almacén
];

// Obtener lista de contactos (alumno verá todos almacenistas; almacenista verá solo sus alumnos)
router.get('/users', verificarAccesoChat, messageController.getContactos); // Use getContactos as primary

// Obtener mensajes con un usuario específico
router.get('/:userId', verificarAccesoChat, messageController.obtenerMensajes);
router.get('/:userId', messageController.getMessages); // Duplicate, consolidate if same intent

// Enviar mensaje
router.post('/send', verificarAccesoChat, messageController.enviarMensaje);
router.post('/send', messageController.sendMessage); // Duplicate, consolidate if same intent

// (Opcional) Obtener todos los usuarios de un rol
router.get('/all', verificarAccesoChat, messageController.getAllByRole); // Added protection

// Limpiar mensajes antiguos manualmente
router.delete('/cleanup', verificarAccesoChat, messageController.cleanupMessages); // Added protection

module.exports = router;
