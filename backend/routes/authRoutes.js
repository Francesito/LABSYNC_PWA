// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verificarToken } = require('../middleware/authMiddleware');

// Rutas públicas (sin cambios)
router.post('/register', authController.registrarUsuario);
router.get('/verify/:token', authController.verificarCorreo);
router.post('/login', authController.iniciarSesion);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Nueva ruta protegida para verificar permisos de chat
router.get('/permisos-chat', verificarToken, authController.verificarPermisosChat);
router.get('/permisos-stock', verificarToken, authController.verificarPermisosStock);


module.exports = router;
