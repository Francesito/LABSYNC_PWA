// backend/routes/messageRoutes.js

const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { verificarToken } = require('../middleware/authMiddleware');

// Todas las rutas requieren autenticación
router.use(verificarToken);

// Obtener lista de contactos (alumno verá todos almacenistas; almacenista verá solo sus alumnos)
router.get('/users', messageController.getContactos);

// Enviar mensaje
router.post('/send', messageController.sendMessage);

// Obtener mensajes con un usuario específico
router.get('/:userId', messageController.getMessages);

// (Opcional) Obtener todos los usuarios de un rol
router.get('/all', messageController.getAllByRole);

// Limpiar mensajes antiguos manualmente
router.delete('/cleanup', messageController.cleanupMessages);

module.exports = router;