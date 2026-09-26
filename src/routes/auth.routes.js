const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { isGuest, isAuthenticated } = require('../middlewares/auth.middleware');

router.get('/login', isGuest, authController.getLogin);
router.post('/login', isGuest, authController.postLogin);
router.get('/logout', isAuthenticated, authController.logout);

module.exports = router;
