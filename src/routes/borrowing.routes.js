const express = require('express');
const router = express.Router();
const borrowingController = require('../controllers/borrowing.controller');
const { isAuthenticated, hasRole } = require('../middlewares/auth.middleware');

router.use(isAuthenticated);

// Fitur 5 & 11: Melihat daftar sirkulasi peminjaman
router.get('/', borrowingController.index);

// Fitur 12: Mengajukan peminjaman alat praktikum (Peminjam & Admin)
router.get('/create', hasRole(['PEMINJAM', 'ADMIN']), borrowingController.create);
router.post('/', hasRole(['PEMINJAM', 'ADMIN']), borrowingController.store);

// Fitur 7: Menyetujui (Approval) peminjaman alat praktikum (Toolman & Admin)
router.post('/:id/approve', hasRole(['TOOLMAN', 'ADMIN']), borrowingController.approve);
router.post('/:id/reject', hasRole(['TOOLMAN', 'ADMIN']), borrowingController.reject);

// Fitur 13: Mengembalikan alat ke meja toolman (Peminjam konfirmasi penyerahan fisik)
router.post('/:id/return-request', hasRole('PEMINJAM'), borrowingController.notifyReturn);

// Fitur 8 & 9: Memantau & memproses pengembalian, inspeksi kondisi fisik alat & input denda rusak (Toolman & Admin)
router.get('/:id/return', hasRole(['TOOLMAN', 'ADMIN']), borrowingController.getReturnPage);
router.post('/:id/return', hasRole(['TOOLMAN', 'ADMIN']), borrowingController.processReturn);

// Fitur 5: Hapus data sirkulasi (Hanya Admin)
router.post('/:id/delete', hasRole('ADMIN'), borrowingController.destroy);

module.exports = router;
