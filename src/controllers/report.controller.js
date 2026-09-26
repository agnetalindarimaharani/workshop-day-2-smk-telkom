const prisma = require('../config/db');

// GET /reports - Halaman filter & preview laporan sirkulasi
async function index(req, res) {
  try {
    const { startDate, endDate, status, categoryId } = req.query;

    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (categoryId && categoryId !== 'ALL') {
      where.tool = { categoryId: parseInt(categoryId) };
    }

    if (startDate || endDate) {
      where.tglPinjam = {};
      if (startDate) {
        where.tglPinjam.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.tglPinjam.lte = end;
      }
    }

    const [borrowings, categories, dendaAggregate] = await Promise.all([
      prisma.borrowing.findMany({
        where,
        orderBy: { tglPinjam: 'desc' },
        include: {
          user: true,
          tool: { include: { category: true } },
          toolman: true
        }
      }),
      prisma.category.findMany({ orderBy: { namaKategori: 'asc' } }),
      prisma.borrowing.aggregate({
        where,
        _sum: { denda: true, jumlah: true }
      })
    ]);

    res.render('reports/index', {
      title: 'Laporan Sirkulasi Sarana Praktikum Lab',
      borrowings,
      categories,
      totalDenda: dendaAggregate._sum.denda || 0,
      totalUnit: dendaAggregate._sum.jumlah || 0,
      startDate: startDate || '',
      endDate: endDate || '',
      selectedStatus: status || 'ALL',
      selectedCategory: categoryId || 'ALL',
      user: req.session.user
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).send('Gagal memuat laporan sirkulasi.');
  }
}

// GET /reports/print - Halaman Cetak Siap Print (Kop Resmi & Tanda Tangan)
async function printReport(req, res) {
  try {
    const { startDate, endDate, status, categoryId } = req.query;

    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (categoryId && categoryId !== 'ALL') {
      where.tool = { categoryId: parseInt(categoryId) };
    }

    if (startDate || endDate) {
      where.tglPinjam = {};
      if (startDate) {
        where.tglPinjam.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.tglPinjam.lte = end;
      }
    }

    const [borrowings, dendaAggregate, kepalaLab, toolmanUser] = await Promise.all([
      prisma.borrowing.findMany({
        where,
        orderBy: { tglPinjam: 'asc' },
        include: {
          user: true,
          tool: { include: { category: true } },
          toolman: true
        }
      }),
      prisma.borrowing.aggregate({
        where,
        _sum: { denda: true, jumlah: true }
      }),
      prisma.user.findFirst({ where: { role: 'ADMIN' } }),
      prisma.user.findFirst({ where: { role: 'TOOLMAN' } })
    ]);

    res.render('reports/print', {
      title: 'Cetak Laporan Sirkulasi Sarpras Lab',
      borrowings,
      totalDenda: dendaAggregate._sum.denda || 0,
      totalUnit: dendaAggregate._sum.jumlah || 0,
      startDate: startDate || null,
      endDate: endDate || null,
      selectedStatus: status || 'ALL',
      kepalaLab: kepalaLab || { nama: 'Ahmad Subarjo, S.Kom', nisn: 'NIP. 198203152008011005' },
      toolmanUser: toolmanUser || { nama: 'Bagus Prakoso, A.Md', nisn: 'NIP. 199407222020121008' },
      printDate: new Date()
    });
  } catch (error) {
    console.error('Error rendering print report:', error);
    res.status(500).send('Gagal mencetak laporan.');
  }
}

module.exports = {
  index,
  printReport
};
