const prisma = require('../config/db');
const { logActivity } = require('../helpers/logger');

// GET /borrowings - Menampilkan sirkulasi peminjaman alat
async function index(req, res) {
  try {
    const user = req.session.user;
    const { status, search } = req.query;

    const where = {};

    // Peminjam hanya boleh melihat riwayat peminjamannya sendiri
    if (user.role === 'PEMINJAM') {
      where.userId = user.id;
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { tool: { namaAlat: { contains: search } } },
        { user: { nama: { contains: search } } },
        { user: { nisn: { contains: search } } }
      ];
    }

    const borrowings = await prisma.borrowing.findMany({
      where,
      orderBy: { id: 'desc' },
      include: {
        user: true,
        tool: { include: { category: true } },
        toolman: true
      }
    });

    res.render('borrowings/index', {
      title: 'Sirkulasi & Peminjaman Sarpras Lab',
      borrowings,
      selectedStatus: status || 'ALL',
      search: search || '',
      success: req.query.success || null,
      error: req.query.error || null,
      user
    });
  } catch (error) {
    console.error('Error fetching borrowings:', error);
    res.status(500).send('Gagal memuat data sirkulasi peminjaman.');
  }
}

// GET /borrowings/create - Formulir Pengajuan Pinjam Alat (Peminjam & Admin)
async function create(req, res) {
  try {
    const user = req.session.user;
    const preselectedToolId = req.query.toolId ? parseInt(req.query.toolId) : null;

    const [tools, users] = await Promise.all([
      prisma.tool.findMany({
        where: { stok: { gt: 0 } },
        orderBy: { namaAlat: 'asc' },
        include: { category: true }
      }),
      user.role === 'ADMIN'
        ? prisma.user.findMany({ where: { role: 'PEMINJAM' }, orderBy: { nama: 'asc' } })
        : Promise.resolve([])
    ]);

    res.render('borrowings/create', {
      title: 'Formulir Permohonan Pinjam Alat Praktikum',
      tools,
      users,
      preselectedToolId,
      user,
      error: null,
      formData: {}
    });
  } catch (error) {
    console.error('Error loading borrowing create form:', error);
    res.redirect('/borrowings?error=Gagal memuat formulir peminjaman.');
  }
}

// POST /borrowings - Simpan Pengajuan Pinjam (Scenario 3: Siswa mengajukan peminjaman)
async function store(req, res) {
  const user = req.session.user;
  try {
    const { toolId, jumlah, tglKembaliRencana, catatan, targetUserId } = req.body;

    const borrowerId = user.role === 'ADMIN' && targetUserId ? parseInt(targetUserId) : user.id;
    const requestedToolId = parseInt(toolId);
    const requestedQty = parseInt(jumlah) || 1;

    if (!requestedToolId || !tglKembaliRencana || requestedQty < 1) {
      return res.redirect('/borrowings/create?error=Pilihan alat, jumlah unit, dan rencana tanggal kembali wajib diisi.');
    }

    const tool = await prisma.tool.findUnique({
      where: { id: requestedToolId }
    });

    if (!tool) {
      return res.redirect('/borrowings/create?error=Alat yang dipilih tidak ditemukan.');
    }

    if (tool.stok < requestedQty) {
      return res.redirect(`/borrowings/create?error=Stok alat tidak mencukupi! Tersedia saat ini hanya ${tool.stok} unit.`);
    }

    // Buat transaksi peminjaman berstatus PENDING
    const borrowing = await prisma.borrowing.create({
      data: {
        userId: borrowerId,
        toolId: requestedToolId,
        jumlah: requestedQty,
        tglPinjam: new Date(),
        tglKembaliRencana: new Date(tglKembaliRencana),
        status: 'PENDING',
        catatan: catatan ? catatan.trim() : null
      },
      include: {
        user: true,
        tool: true
      }
    });

    // Catat ke ActivityLog
    await logActivity(
      user.id,
      'AJUKAN_PINJAM',
      `${borrowing.user.nama} (${borrowing.user.role}) mengajukan peminjaman alat "${borrowing.tool.namaAlat}" sejumlah ${borrowing.jumlah} unit untuk praktikum lab.`
    );

    res.redirect('/borrowings?success=Permohonan peminjaman berhasil diajukan! Menunggu persetujuan Toolman/Laboran.');
  } catch (error) {
    console.error('Error submitting borrowing request:', error);
    res.redirect('/borrowings/create?error=Terjadi kesalahan saat memproses pengajuan pinjam.');
  }
}

// POST /borrowings/:id/approve - Menyetujui Peminjaman (Scenario 4: Toolman menyetujui, stok berkurang)
async function approve(req, res) {
  const borrowingId = parseInt(req.params.id);
  const toolman = req.session.user;

  try {
    const borrowing = await prisma.borrowing.findUnique({
      where: { id: borrowingId },
      include: { tool: true, user: true }
    });

    if (!borrowing) {
      return res.redirect('/borrowings?error=Data peminjaman tidak ditemukan.');
    }

    if (borrowing.status !== 'PENDING') {
      return res.redirect(`/borrowings?error=Peminjaman ini sudah berstatus ${borrowing.status} dan tidak dapat disetujui lagi.`);
    }

    if (borrowing.tool.stok < borrowing.jumlah) {
      return res.redirect(`/borrowings?error=Stok alat "${borrowing.tool.namaAlat}" tidak mencukupi (sisa ${borrowing.tool.stok}).`);
    }

    // Transaksi Atomik: Kurangi stok alat dan update status peminjaman jadi APPROVED
    const [updatedBorrowing, updatedTool] = await prisma.$transaction([
      prisma.borrowing.update({
        where: { id: borrowingId },
        data: {
          status: 'APPROVED',
          toolmanId: toolman.id
        },
        include: { user: true, tool: true }
      }),
      prisma.tool.update({
        where: { id: borrowing.toolId },
        data: {
          stok: { decrement: borrowing.jumlah }
        }
      })
    ]);

    // Catat log aktifitas sirkulasi
    await logActivity(
      toolman.id,
      'SETUJUI_PINJAM',
      `Toolman ${toolman.nama} menyetujui peminjaman "${updatedBorrowing.tool.namaAlat}" (${updatedBorrowing.jumlah} unit) untuk peminjam ${updatedBorrowing.user.nama}. Stok alat berkurang menjadi ${updatedTool.stok} unit.`
    );

    res.redirect('/borrowings?success=Peminjaman alat berhasil disetujui! Stok inventaris otomatis berkurang.');
  } catch (error) {
    console.error('Error approving borrowing:', error);
    res.redirect('/borrowings?error=Gagal menyetujui peminjaman.');
  }
}

// POST /borrowings/:id/reject - Menolak Peminjaman (Toolman / Admin)
async function reject(req, res) {
  const borrowingId = parseInt(req.params.id);
  const toolman = req.session.user;
  const { alasanPenolakan } = req.body;

  try {
    const borrowing = await prisma.borrowing.findUnique({
      where: { id: borrowingId },
      include: { tool: true, user: true }
    });

    if (!borrowing) {
      return res.redirect('/borrowings?error=Peminjaman tidak ditemukan.');
    }

    if (borrowing.status !== 'PENDING') {
      return res.redirect('/borrowings?error=Hanya permohonan berstatus PENDING yang dapat ditolak.');
    }

    const note = alasanPenolakan ? ` (Alasan: ${alasanPenolakan})` : '';

    await prisma.borrowing.update({
      where: { id: borrowingId },
      data: {
        status: 'REJECTED',
        toolmanId: toolman.id,
        catatan: borrowing.catatan ? `${borrowing.catatan}${note}` : note
      }
    });

    await logActivity(
      toolman.id,
      'TOLAK_PINJAM',
      `Toolman ${toolman.nama} menolak permohonan pinjam "${borrowing.tool.namaAlat}" dari ${borrowing.user.nama}${note}.`
    );

    res.redirect('/borrowings?success=Permohonan pinjam alat telah ditolak.');
  } catch (error) {
    console.error('Error rejecting borrowing:', error);
    res.redirect('/borrowings?error=Gagal menolak permohonan pinjam.');
  }
}

// POST /borrowings/:id/return-notify - Siswa mengembalikan alat ke meja toolman (Fitur 13)
async function notifyReturn(req, res) {
  const borrowingId = parseInt(req.params.id);
  const user = req.session.user;

  try {
    const borrowing = await prisma.borrowing.findUnique({
      where: { id: borrowingId },
      include: { tool: true, user: true }
    });

    if (!borrowing) {
      return res.redirect('/borrowings?error=Peminjaman tidak ditemukan.');
    }

    if (borrowing.userId !== user.id && user.role === 'PEMINJAM') {
      return res.redirect('/borrowings?error=Anda tidak berhak atas peminjaman ini.');
    }

    if (borrowing.status !== 'APPROVED') {
      return res.redirect('/borrowings?error=Peminjaman tidak dalam status aktif/dipinjam.');
    }

    const updatedNote = (borrowing.catatan ? borrowing.catatan + ' | ' : '') + 'Peminjam telah meletakkan alat di meja Toolman dan meminta inspeksi pengembalian.';

    await prisma.borrowing.update({
      where: { id: borrowingId },
      data: { catatan: updatedNote }
    });

    await logActivity(
      user.id,
      'KEMBALIKAN_ALAT',
      `Peminjam ${borrowing.user.nama} menyerahkan kembali "${borrowing.tool.namaAlat}" ke meja Toolman/Laboran untuk diinspeksi.`
    );

    res.redirect('/borrowings?success=Konfirmasi serah alat ke meja Toolman berhasil dikirim. Menunggu inspeksi fisik oleh Toolman.');
  } catch (error) {
    console.error('Error in notifyReturn:', error);
    res.redirect('/borrowings?error=Gagal melakukan konfirmasi pengembalian.');
  }
}

// GET /borrowings/:id/return - Halaman Pemeriksaan Fisik & Input Denda (Toolman & Admin)
async function getReturnPage(req, res) {
  const borrowingId = parseInt(req.params.id);
  try {
    const borrowing = await prisma.borrowing.findUnique({
      where: { id: borrowingId },
      include: {
        user: true,
        tool: { include: { category: true } }
      }
    });

    if (!borrowing) {
      return res.redirect('/borrowings?error=Data peminjaman tidak ditemukan.');
    }

    if (borrowing.status !== 'APPROVED') {
      return res.redirect('/borrowings?error=Alat ini tidak sedang dalam status dipinjam.');
    }

    res.render('borrowings/return', {
      title: 'Inspeksi Pengembalian & Perhitungan Denda',
      borrowing,
      user: req.session.user,
      error: null
    });
  } catch (error) {
    console.error('Error loading return page:', error);
    res.redirect('/borrowings?error=Gagal memuat formulir pengembalian.');
  }
}

// POST /borrowings/:id/return - Proses Pengembalian, Inspeksi Fisik, & Input Denda (Scenario 5)
async function processReturn(req, res) {
  const borrowingId = parseInt(req.params.id);
  const toolman = req.session.user;

  try {
    const { kondisiKembali, denda, catatanInspeksi, updateToolCondition } = req.body;

    const borrowing = await prisma.borrowing.findUnique({
      where: { id: borrowingId },
      include: { tool: true, user: true }
    });

    if (!borrowing) {
      return res.redirect('/borrowings?error=Peminjaman tidak ditemukan.');
    }

    if (borrowing.status !== 'APPROVED') {
      return res.redirect('/borrowings?error=Peminjaman tidak sedang berstatus aktif (APPROVED).');
    }

    const fineAmount = parseInt(denda) || 0;
    const finalKondisi = kondisiKembali || 'BAIK';
    const returnDate = new Date();

    const fullCatatan = [
      borrowing.catatan,
      catatanInspeksi ? `[Hasil Inspeksi Toolman: ${catatanInspeksi.trim()}]` : null
    ].filter(Boolean).join(' | ');

    // Menyesuaikan stok inventaris & kondisi alat jika diupdate
    const toolUpdateData = {
      stok: { increment: borrowing.jumlah }
    };

    if (finalKondisi === 'RUSAK' && updateToolCondition === 'yes') {
      toolUpdateData.kondisi = 'RUSAK';
    }

    // Transaksi Atomik Pengembalian
    const [updatedBorrowing, updatedTool] = await prisma.$transaction([
      prisma.borrowing.update({
        where: { id: borrowingId },
        data: {
          status: 'RETURNED',
          tglKembaliReal: returnDate,
          kondisiKembali: finalKondisi,
          denda: fineAmount >= 0 ? fineAmount : 0,
          toolmanId: toolman.id,
          catatan: fullCatatan
        },
        include: { user: true, tool: true }
      }),
      prisma.tool.update({
        where: { id: borrowing.toolId },
        data: toolUpdateData
      })
    ]);

    // Catat Log Aktifitas Laboratorium (Scenario 5 Verification)
    const logDesc = `Toolman ${toolman.nama} memproses pengembalian "${updatedBorrowing.tool.namaAlat}" dari siswa/peminjam ${updatedBorrowing.user.nama}. Hasil Inspeksi Fisik: [${finalKondisi}], Denda: Rp ${fineAmount.toLocaleString('id-ID')}. Stok alat kembali menjadi ${updatedTool.stok} unit. ${catatanInspeksi ? 'Keterangan: ' + catatanInspeksi : ''}`;

    await logActivity(
      toolman.id,
      'INSPEKSI_PENGEMBALIAN',
      logDesc
    );

    res.redirect('/borrowings?success=Pengembalian alat berhasil diproses dan inspeksi fisik telah dicatat ke audit log.');
  } catch (error) {
    console.error('Error processing return:', error);
    res.redirect(`/borrowings/${borrowingId}/return?error=Gagal memproses pengembalian alat.`);
  }
}

// POST /borrowings/:id/delete - Admin Only
async function destroy(req, res) {
  const borrowingId = parseInt(req.params.id);
  try {
    const borrowing = await prisma.borrowing.findUnique({
      where: { id: borrowingId },
      include: { tool: true, user: true }
    });

    if (!borrowing) {
      return res.redirect('/borrowings?error=Data sirkulasi tidak ditemukan.');
    }

    // Jika status masih APPROVED, kembalikan stok sebelum dihapus
    if (borrowing.status === 'APPROVED') {
      await prisma.tool.update({
        where: { id: borrowing.toolId },
        data: { stok: { increment: borrowing.jumlah } }
      });
    }

    await prisma.borrowing.delete({ where: { id: borrowingId } });

    await logActivity(
      req.session.user.id,
      'HAPUS_SIRKULASI',
      `Admin menghapus riwayat sirkulasi #${borrowing.id} (${borrowing.tool.namaAlat} oleh ${borrowing.user.nama}).`
    );

    res.redirect('/borrowings?success=Data sirkulasi peminjaman berhasil dihapus.');
  } catch (error) {
    console.error('Error deleting borrowing:', error);
    res.redirect('/borrowings?error=Gagal menghapus data sirkulasi.');
  }
}

module.exports = {
  index,
  create,
  store,
  approve,
  reject,
  notifyReturn,
  getReturnPage,
  processReturn,
  destroy
};
