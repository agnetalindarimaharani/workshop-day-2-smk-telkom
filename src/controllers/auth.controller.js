const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const { logActivity } = require('../helpers/logger');

// GET /login
async function getLogin(req, res) {
  const error = req.query.error || null;
  const success = req.query.success || null;
  res.render('auth/login', {
    title: 'Login - Sistem Sarpras Lab RPL & Elektronika',
    error,
    success
  });
}

// POST /login
async function postLogin(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.render('auth/login', {
        title: 'Login - Sistem Sarpras Lab RPL & Elektronika',
        error: 'Username dan password wajib diisi!',
        success: null,
        username
      });
    }

    const user = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() }
    });

    if (!user) {
      return res.render('auth/login', {
        title: 'Login - Sistem Sarpras Lab RPL & Elektronika',
        error: 'Akun dengan username tersebut tidak ditemukan.',
        success: null,
        username
      });
    }

    // Verifikasi password dengan bcrypt
    let isMatch = await bcrypt.compare(password, user.password).catch(() => false);
    // Fallback jika database menggunakan plaintext
    if (!isMatch && user.password === password) {
      isMatch = true;
    }

    if (!isMatch) {
      return res.render('auth/login', {
        title: 'Login - Sistem Sarpras Lab RPL & Elektronika',
        error: 'Password yang Anda masukkan salah.',
        success: null,
        username
      });
    }

    // Simpan data user ke dalam session (tanpa password)
    req.session.user = {
      id: user.id,
      username: user.username,
      nama: user.nama,
      role: user.role,
      nisn: user.nisn,
      telepon: user.telepon
    };

    // Catat log aktivitas login
    await logActivity(user.id, 'LOGIN', `Pengguna ${user.nama} (${user.role}) berhasil masuk ke sistem.`);

    const redirectUrl = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error saat login:', error);
    return res.render('auth/login', {
      title: 'Login - Sistem Sarpras Lab RPL & Elektronika',
      error: 'Terjadi kendala pada server saat proses autentikasi.',
      success: null
    });
  }
}

// GET /logout
async function logout(req, res) {
  if (req.session.user) {
    const user = req.session.user;
    await logActivity(user.id, 'LOGOUT', `Pengguna ${user.nama} (${user.role}) keluar dari sistem.`);
  }

  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
    }
    res.redirect('/login?success=Anda telah berhasil keluar dari sistem sarpras.');
  });
}

module.exports = {
  getLogin,
  postLogin,
  logout
};
