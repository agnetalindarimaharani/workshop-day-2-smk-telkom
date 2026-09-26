const prisma = require('../config/db');

/**
 * Catat aktivitas sirkulasi dan perubahan data ke dalam tabel ActivityLog
 * @param {number|null} userId - ID pengguna yang melakukan aksi
 * @param {string} aksi - Jenis aksi (LOGIN, LOGOUT, TAMBAH_ALAT, UPDATE_ALAT, HAPUS_ALAT, AJUKAN_PINJAM, APPROVE_PINJAM, TOLAK_PINJAM, RETURN_ALAT, etc.)
 * @param {string} keterangan - Deskripsi rinci kegiatan
 */
async function logActivity(userId, aksi, keterangan) {
  try {
    await prisma.activityLog.create({
      data: {
        userId: userId || null,
        aksi,
        keterangan
      }
    });
  } catch (err) {
    console.error('⚠️ Gagal mencatat log aktivitas:', err.message);
  }
}

module.exports = {
  logActivity
};
