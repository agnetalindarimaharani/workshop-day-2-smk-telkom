const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { isAuthenticated, hasRole } = require('../middlewares/auth.middleware');

// Seluruh rute kategori alat praktikum dibatasi hanya untuk ADMIN
router.use(isAuthenticated, hasRole('ADMIN'));

router.get('/', categoryController.index);
router.post('/', categoryController.store);
router.post('/:id/edit', categoryController.update);
router.post('/:id/delete', categoryController.destroy);

module.exports = router;
