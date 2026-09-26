const express = require('express');
const router = express.Router();
const logController = require('../controllers/log.controller');
const { isAuthenticated, hasRole } = require('../middlewares/auth.middleware');

// Fitur 6: Log Aktifitas Sistem Laboratorium (Admin Only)
router.use(isAuthenticated, hasRole('ADMIN'));

router.get('/', logController.index);

module.exports = router;
