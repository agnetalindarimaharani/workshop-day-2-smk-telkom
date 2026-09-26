const express = require('express');
const router = express.Router();
const reportController = require('../controllers/report.controller');
const { isAuthenticated, hasRole } = require('../middlewares/auth.middleware');

// Fitur 10: Mencetak laporan peminjaman alat (Toolman & Admin)
router.use(isAuthenticated, hasRole(['TOOLMAN', 'ADMIN']));

router.get('/', reportController.index);
router.get('/print', reportController.printReport);

module.exports = router;
