const express = require('express');
const router = express.Router();
const toolController = require('../controllers/tool.controller');
const { isAuthenticated, hasRole } = require('../middlewares/auth.middleware');

router.use(isAuthenticated);

// Fitur 11 & 3: Melihat daftar alat (Bisa diakses oleh semua role yang login)
router.get('/', toolController.index);

// Fitur 3: CRUD Inventaris Alat Praktikum (Hanya ADMIN)
router.get('/create', hasRole('ADMIN'), toolController.create);
router.post('/', hasRole('ADMIN'), toolController.store);
router.get('/:id/edit', hasRole('ADMIN'), toolController.edit);
router.post('/:id', hasRole('ADMIN'), toolController.update);
router.post('/:id/delete', hasRole('ADMIN'), toolController.destroy);

module.exports = router;
