/**
 * Middleware untuk memastikan pengguna sudah login
 */
function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    res.locals.user = req.session.user;
    return next();
  }
  
  if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
    return res.status(401).json({ success: false, message: 'Sesi anda telah berakhir. Silakan login kembali.' });
  }

  req.session.returnTo = req.originalUrl;
  return res.redirect('/login?error=Silakan login terlebih dahulu untuk mengakses fitur ini.');
}

/**
 * Middleware Role-Based Access Control (RBAC)
 * @param {Array<string>|string} allowedRoles - Role yang diizinkan (ADMIN, TOOLMAN, PEMINJAM)
 */
function hasRole(allowedRoles) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/login?error=Silakan login terlebih dahulu.');
    }

    const userRole = req.session.user.role;
    if (roles.includes(userRole)) {
      return next();
    }

    // Jika role tidak sesuai, berikan respons 403 Forbidden
    res.status(403);
    if (req.xhr || req.headers.accept?.indexOf('json') > -1) {
      return res.json({ success: false, message: 'Akses ditolak: Anda tidak memiliki wewenang untuk tindakan ini.' });
    }

    return res.render('errors/403', {
      title: '403 Akses Ditolak',
      message: `Role Anda (${userRole}) tidak memiliki izin mengakses halaman ini.`,
      user: req.session.user
    });
  };
}

/**
 * Middleware untuk halaman publik (login), jika sudah login langsung diarahkan ke dashboard
 */
function isGuest(req, res, next) {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  next();
}

module.exports = {
  isAuthenticated,
  hasRole,
  isGuest
};
