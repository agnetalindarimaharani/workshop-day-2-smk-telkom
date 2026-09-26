const http = require('http');
const querystring = require('querystring');
const prisma = require('./src/config/db');

const PORT = 3000;

function request(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: PORT,
        ...options
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body
          });
        });
      }
    );

    req.on('error', reject);

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

function extractCookie(headers) {
  const setCookie = headers['set-cookie'];
  if (!setCookie) return null;
  return setCookie[0].split(';')[0];
}

async function login(username, password) {
  const postData = querystring.stringify({ username, password });
  const res = await request(
    {
      path: '/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    },
    postData
  );

  return {
    statusCode: res.statusCode,
    cookie: extractCookie(res.headers)
  };
}

async function runTests() {
  console.log('=================================================================');
  console.log('🚀 MEMULAI VERIFIKASI 5 SKENARIO PENGUJIAN SISTEM SARPRAS LAB');
  console.log('=================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // SKENARIO 1: Login user sesuai dengan hak akses (Admin, Toolman, Peminjam Siswa)
    // -------------------------------------------------------------
    console.log('📌 SKENARIO 1: Verifikasi Login Multi-Role & RBAC Access Control');

    // 1.1 Login Admin
    const adminLogin = await login('admin', 'password123');
    assert(adminLogin.statusCode === 302 && adminLogin.cookie, 'Admin berhasil login (Status 302 Redirect)');

    // Admin akses rute sensitif /users
    const adminUsersRes = await request({
      path: '/users',
      method: 'GET',
      headers: { Cookie: adminLogin.cookie }
    });
    assert(adminUsersRes.statusCode === 200, 'Admin berwenang membuka CRUD Data Pengguna (/users: 200 OK)');

    // 1.2 Login Toolman
    const toolmanLogin = await login('toolman', 'password123');
    assert(toolmanLogin.statusCode === 302 && toolmanLogin.cookie, 'Toolman berhasil login (Status 302 Redirect)');

    // Toolman akses rute /borrowings
    const toolmanBorrowingsRes = await request({
      path: '/borrowings',
      method: 'GET',
      headers: { Cookie: toolmanLogin.cookie }
    });
    assert(toolmanBorrowingsRes.statusCode === 200, 'Toolman berwenang membuka Sirkulasi & Approval (/borrowings: 200 OK)');

    // Toolman coba akses /users (Harus 403 Forbidden)
    const toolmanForbiddenRes = await request({
      path: '/users',
      method: 'GET',
      headers: { Cookie: toolmanLogin.cookie }
    });
    assert(toolmanForbiddenRes.statusCode === 403, 'Akses Toolman ke /users ditolak dengan aman (403 Forbidden)');

    // 1.3 Login Peminjam (Siswa)
    const siswaLogin = await login('peminjam', 'password123');
    assert(siswaLogin.statusCode === 302 && siswaLogin.cookie, 'Siswa (Peminjam) berhasil login (Status 302 Redirect)');

    // Siswa akses /tools
    const siswaToolsRes = await request({
      path: '/tools',
      method: 'GET',
      headers: { Cookie: siswaLogin.cookie }
    });
    assert(siswaToolsRes.statusCode === 200, 'Siswa dapat melihat daftar & ketersediaan stok alat (/tools: 200 OK)');

    // Siswa coba akses /users (Harus 403 Forbidden)
    const siswaForbiddenRes = await request({
      path: '/users',
      method: 'GET',
      headers: { Cookie: siswaLogin.cookie }
    });
    assert(siswaForbiddenRes.statusCode === 403, 'Akses Siswa ke /users ditolak dengan aman (403 Forbidden)');

    console.log('');

    // -------------------------------------------------------------
    // SKENARIO 2: Admin menambah inventaris alat baru (Contoh: Mikrotik RouterBoard stok 5 unit)
    // -------------------------------------------------------------
    console.log('📌 SKENARIO 2: Admin Menambah Inventaris Alat Baru (Mikrotik Stok 5 Unit)');

    const categoryJaringan = await prisma.category.findFirst({
      where: { namaKategori: { contains: 'Jaringan' } }
    });

    const newToolData = querystring.stringify({
      namaAlat: 'Mikrotik RouterBoard RB750Gr3 UKK Testing',
      spesifikasi: '5x Gigabit Ethernet, RouterOS L4, dual core 880MHz, Rak Lab A4',
      stok: '5',
      kondisi: 'BAIK',
      categoryId: categoryJaringan.id.toString()
    });

    const addToolRes = await request(
      {
        path: '/tools',
        method: 'POST',
        headers: {
          Cookie: adminLogin.cookie,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(newToolData)
        }
      },
      newToolData
    );

    assert(addToolRes.statusCode === 302, 'Admin berhasil menambahkan alat baru (Status 302 Redirect)');

    const createdTool = await prisma.tool.findFirst({
      where: { namaAlat: 'Mikrotik RouterBoard RB750Gr3 UKK Testing' }
    });
    assert(createdTool && createdTool.stok === 5, 'Inventaris Mikrotik tersimpan di database dengan stok 5 unit');

    const addToolLog = await prisma.activityLog.findFirst({
      where: { aksi: 'TAMBAH_ALAT', keterangan: { contains: 'Mikrotik RouterBoard RB750Gr3 UKK Testing' } }
    });
    assert(addToolLog !== null, 'Tercatat di ActivityLog: Aksi TAMBAH_ALAT oleh Admin');

    console.log('');

    // -------------------------------------------------------------
    // SKENARIO 3: Siswa mengajukan peminjaman 1 unit Mikrotik untuk praktikum jaringan
    // -------------------------------------------------------------
    console.log('📌 SKENARIO 3: Siswa Mengajukan Peminjaman 1 Unit Mikrotik untuk Praktikum Jaringan');

    const borrowRequestData = querystring.stringify({
      toolId: createdTool.id.toString(),
      jumlah: '1',
      tglKembaliRencana: '2026-10-05',
      catatan: 'Praktikum Jaringan Komputer: Konfigurasi Hotspot & Bandwidth Management di Lab RPL'
    });

    const borrowRes = await request(
      {
        path: '/borrowings',
        method: 'POST',
        headers: {
          Cookie: siswaLogin.cookie,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(borrowRequestData)
        }
      },
      borrowRequestData
    );

    assert(borrowRes.statusCode === 302, 'Siswa berhasil mengirim formulir pengajuan peminjaman (Status 302 Redirect)');

    const pendingBorrowing = await prisma.borrowing.findFirst({
      where: { toolId: createdTool.id, status: 'PENDING' },
      include: { tool: true, user: true }
    });
    assert(pendingBorrowing && pendingBorrowing.status === 'PENDING', 'Transaksi peminjaman terbentuk dengan status PENDING');
    assert(pendingBorrowing.jumlah === 1, 'Jumlah unit yang diajukan tepat 1 unit');

    const borrowLog = await prisma.activityLog.findFirst({
      where: { aksi: 'AJUKAN_PINJAM', keterangan: { contains: 'Mikrotik RouterBoard RB750Gr3 UKK Testing' } }
    });
    assert(borrowLog !== null, 'Tercatat di ActivityLog: Aksi AJUKAN_PINJAM oleh Siswa');

    console.log('');

    // -------------------------------------------------------------
    // SKENARIO 4: Toolman menyetujui peminjaman dan stok alat berkurang menjadi 4 unit
    // -------------------------------------------------------------
    console.log('📌 SKENARIO 4: Toolman Menyetujui Peminjaman & Stok Alat Berkurang Menjadi 4 Unit');

    const approveRes = await request({
      path: `/borrowings/${pendingBorrowing.id}/approve`,
      method: 'POST',
      headers: { Cookie: toolmanLogin.cookie }
    });

    assert(approveRes.statusCode === 302, 'Toolman berhasil memproses approval peminjaman (Status 302 Redirect)');

    const approvedBorrowing = await prisma.borrowing.findUnique({
      where: { id: pendingBorrowing.id }
    });
    assert(approvedBorrowing.status === 'APPROVED', 'Status peminjaman berubah menjadi APPROVED');

    const toolAfterApprove = await prisma.tool.findUnique({
      where: { id: createdTool.id }
    });
    assert(toolAfterApprove.stok === 4, `Stok Mikrotik otomatis berkurang dari 5 menjadi ${toolAfterApprove.stok} unit`);

    const approveLog = await prisma.activityLog.findFirst({
      where: { aksi: 'SETUJUI_PINJAM', keterangan: { contains: 'Mikrotik RouterBoard RB750Gr3 UKK Testing' } }
    });
    assert(approveLog !== null, 'Tercatat di ActivityLog: Aksi SETUJUI_PINJAM oleh Toolman');

    console.log('');

    // -------------------------------------------------------------
    // SKENARIO 5: Pengembalian alat dengan simulasi kondisi rusak, hitung denda, dan verifikasi pencatatan di log aktifitas
    // -------------------------------------------------------------
    console.log('📌 SKENARIO 5: Pengembalian Alat Kondisi Rusak, Hitung Denda, & Verifikasi Log');

    const returnData = querystring.stringify({
      kondisiKembali: 'RUSAK',
      denda: '50000',
      catatanInspeksi: 'Pemeriksaan fisik menemukan port 1 LAN retak dan adaptor kabel longgar. Denda sparepart Rp 50.000.',
      updateToolCondition: 'yes'
    });

    const returnRes = await request(
      {
        path: `/borrowings/${pendingBorrowing.id}/return`,
        method: 'POST',
        headers: {
          Cookie: toolmanLogin.cookie,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(returnData)
        }
      },
      returnData
    );

    assert(returnRes.statusCode === 302, 'Toolman berhasil memproses inspeksi pengembalian (Status 302 Redirect)');

    const returnedBorrowing = await prisma.borrowing.findUnique({
      where: { id: pendingBorrowing.id }
    });
    assert(returnedBorrowing.status === 'RETURNED', 'Status peminjaman berubah menjadi RETURNED');
    assert(returnedBorrowing.kondisiKembali === 'RUSAK', 'Hasil inspeksi fisik tercatat: RUSAK');
    assert(returnedBorrowing.denda === 50000, 'Nominal denda kerusakan tercatat: Rp 50.000');

    const toolAfterReturn = await prisma.tool.findUnique({
      where: { id: createdTool.id }
    });
    assert(toolAfterReturn.stok === 5, `Stok alat fisik kembali menjadi ${toolAfterReturn.stok} unit`);
    assert(toolAfterReturn.kondisi === 'RUSAK', 'Kondisi inventaris alat diperbarui menjadi RUSAK');

    const returnLog = await prisma.activityLog.findFirst({
      where: { aksi: 'INSPEKSI_PENGEMBALIAN', keterangan: { contains: 'Mikrotik RouterBoard RB750Gr3 UKK Testing' } }
    });
    assert(returnLog !== null, 'Tercatat di ActivityLog: Aksi INSPEKSI_PENGEMBALIAN dengan catatan RUSAK dan denda');

    console.log('\n=================================================================');
    console.log(`📊 HASIL VERIFIKASI: ${passed} LULUS, ${failed} GAGAL`);
    console.log('=================================================================');

    if (failed === 0) {
      console.log('🎉 SELURUH 5 SKENARIO SISTEM WAJIB LULUS 100% SESUAI SPESIFIKASI!');
    }
  } catch (err) {
    console.error('❌ Terjadi kesalahan pengujian:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
