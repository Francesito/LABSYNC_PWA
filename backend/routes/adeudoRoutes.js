// backend/routes/adeudoRoutes.js
const express = require('express');
const router  = express.Router();
const { getUsuarioAdeudos, ajustarAdeudo } = require('../controllers/adeudoController');
const { verificarToken } = require('../middleware/authMiddleware');

// Obtiene adeudos del usuario
router.get('/usuario', verificarToken, getUsuarioAdeudos);

// Ajusta adeudo tras devolución parcial
router.post('/ajustar/:solicitudId', verificarToken, ajustarAdeudo);

module.exports = router;
