const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/register', authController.registrarUsuario);
router.get('/verify/:token', authController.verificarCorreo);
router.post('/login', authController.iniciarSesion);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

module.exports = router;