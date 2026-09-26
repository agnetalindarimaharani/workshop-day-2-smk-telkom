const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const prisma = require('./config/db');
const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const userRoutes = require('./routes/user.routes');
const categoryRoutes = require('./routes/category.routes');
const toolRoutes = require('./routes/tool.routes');
const borrowingRoutes = require('./routes/borrowing.routes');
const reportRoutes = require('./routes/report.routes');
const logRoutes = require('./routes/log.routes');

const app = express();
let currentPort = Number(process.env.PORT) || 3000;

// 1. Konfigurasi View Engine EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// 2. Middlewares Dasar
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// 3. Konfigurasi Session untuk Auth RBAC
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'sarpras-lab-rpl-elektronika-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 jam
      httpOnly: true
    }
  })
);

// 4. Global Template Helpers & Variables
app.use((req, res, next) => {
  res.locals.appName = 'SARPRAS LAB';
  res.locals.systemTitle = 'Sistem Peminjaman Sarpras Lab RPL & Elektronika';
  res.locals.schoolName = 'SMK Telkom';
  res.locals.user = req.session ? req.session.user : null;
  res.locals.currentPath = req.path;

  // Helper Format Rupiah
  res.locals.formatRupiah = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number || 0);
  };

  // Helper Format Tanggal
  res.locals.formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('id-ID', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Helper Format Tanggal & Jam
  res.locals.formatDateTime = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
  };

  next();
});

// 5. Mount Routes
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/users', userRoutes);
app.use('/categories', categoryRoutes);
app.use('/tools', toolRoutes);
app.use('/borrowings', borrowingRoutes);
app.use('/reports', reportRoutes);
app.use('/logs', logRoutes);

// 6. 404 Route Handler
app.use((req, res) => {
  res.status(404).render('errors/404', {
    title: '404 - Halaman Tidak Ditemukan',
    user: req.session ? req.session.user : null
  });
});

// 7. Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(500).render('errors/500', {
    title: '500 - Terjadi Kesalahan Server',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Terjadi kesalahan sistem internal.',
    user: req.session ? req.session.user : null
  });
});

// 8. Graceful Shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  console.log('\n🛑 Server Express & Prisma dimatikan.');
  process.exit(0);
});

// 9. Fungsi Start Server dengan Auto Port Fallback jika Port Sedang Dipakai
function startServer(port) {
  const server = app.listen(port, () => {
    console.log('=======================================================');
    console.log('⚡ SISTEM PEMINJAMAN SARPRAS LAB RPL & ELEKTRONIKA');
    console.log('🏫 SMK Telkom — Sistem Inventaris & Sirkulasi Standar UKK');
    console.log(`🌐 Akses Server: http://localhost:${port}`);
    console.log('=======================================================');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${port} sedang digunakan. Mencoba port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('❌ Server error:', err);
    }
  });
}

startServer(currentPort);
