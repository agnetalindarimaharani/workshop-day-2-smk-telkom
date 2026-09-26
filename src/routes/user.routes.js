const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { isAuthenticated, hasRole } = require('../middlewares/auth.middleware');

// Seluruh rute manajemen pengguna lab dibatasi hanya untuk ADMIN
router.use(isAuthenticated, hasRole('ADMIN'));

router.get('/', userController.index);
router.get('/create', userController.create);
router.post('/', userController.store);
router.get('/:id/edit', userController.edit);
router.post('/:id', userController.update);
router.post('/:id/delete', userController.destroy);

module.exports = router;
