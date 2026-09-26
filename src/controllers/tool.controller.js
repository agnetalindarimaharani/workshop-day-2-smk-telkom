const prisma = require('../config/db');
const { logActivity } = require('../helpers/logger');

// GET /tools - Lihat Daftar & Ketersediaan Stok Alat (Semua Role)
async function index(req, res) {
  try {
    const { search, categoryId, kondisi } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { namaAlat: { contains: search } },
        { spesifikasi: { contains: search } }
      ];
    }

    if (categoryId && categoryId !== 'ALL') {
      where.categoryId = parseInt(categoryId);
    }

    if (kondisi && kondisi !== 'ALL') {
      where.kondisi = kondisi;
    }

    const [tools, categories] = await Promise.all([
      prisma.tool.findMany({
        where,
        orderBy: { id: 'desc' },
        include: { category: true }
      }),
      prisma.category.findMany({
        orderBy: { namaKategori: 'asc' }
      })
    ]);

    res.render('tools/index', {
      title: 'Inventaris Sarana Alat Praktikum Lab',
      tools,
      categories,
      search: search || '',
      selectedCategory: categoryId || 'ALL',
      selectedKondisi: kondisi || 'ALL',
      success: req.query.success || null,
      error: req.query.error || null,
      user: req.session.user
    });
  } catch (error) {
    console.error('Error fetching tools:', error);
    res.status(500).send('Gagal memuat inventaris alat.');
  }
}

// GET /tools/create - Admin Only
async function create(req, res) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { namaKategori: 'asc' }
    });

    res.render('tools/create', {
      title: 'Tambah Alat Praktikum Baru',
      categories,
      error: null,
      formData: {}
    });
  } catch (error) {
    console.error('Error loading tool create form:', error);
    res.redirect('/tools?error=Gagal memuat formulir.');
  }
}

// POST /tools - Admin Only (Scenario 2: Admin menambah inventaris alat baru)
async function store(req, res) {
  try {
    const { namaAlat, spesifikasi, stok, kondisi, categoryId } = req.body;

    if (!namaAlat || !categoryId || stok === undefined) {
      const categories = await prisma.category.findMany();
      return res.render('tools/create', {
        title: 'Tambah Alat Praktikum Baru',
        categories,
        error: 'Nama alat, kategori, dan stok unit wajib diisi.',
        formData: req.body
      });
    }

    const stockNumber = parseInt(stok) || 0;
    const catId = parseInt(categoryId);

    const newTool = await prisma.tool.create({
      data: {
        namaAlat: namaAlat.trim(),
        spesifikasi: spesifikasi ? spesifikasi.trim() : null,
        stok: stockNumber >= 0 ? stockNumber : 0,
        kondisi: kondisi || 'BAIK',
        categoryId: catId
      },
      include: { category: true }
    });

    await logActivity(
      req.session.user.id,
      'TAMBAH_ALAT',
      `Admin menambahkan alat baru: "${newTool.namaAlat}" kategori ${newTool.category.namaKategori} sejumlah ${newTool.stok} unit (Kondisi: ${newTool.kondisi}).`
    );

    res.redirect('/tools?success=Alat praktikum baru berhasil ditambahkan ke inventaris lab.');
  } catch (error) {
    console.error('Error creating tool:', error);
    const categories = await prisma.category.findMany();
    res.render('tools/create', {
      title: 'Tambah Alat Praktikum Baru',
      categories,
      error: 'Terjadi kesalahan saat menyimpan inventaris alat.',
      formData: req.body
    });
  }
}

// GET /tools/:id/edit - Admin Only
async function edit(req, res) {
  try {
    const toolId = parseInt(req.params.id);
    const [tool, categories] = await Promise.all([
      prisma.tool.findUnique({ where: { id: toolId } }),
      prisma.category.findMany({ orderBy: { namaKategori: 'asc' } })
    ]);

    if (!tool) {
      return res.redirect('/tools?error=Alat praktikum tidak ditemukan.');
    }

    res.render('tools/edit', {
      title: 'Edit Inventaris Alat',
      tool,
      categories,
      error: null
    });
  } catch (error) {
    console.error('Error fetching tool for edit:', error);
    res.redirect('/tools?error=Gagal memuat formulir edit alat.');
  }
}

// POST /tools/:id - Admin Only
async function update(req, res) {
  const toolId = parseInt(req.params.id);
  try {
    const { namaAlat, spesifikasi, stok, kondisi, categoryId } = req.body;

    const existing = await prisma.tool.findUnique({ where: { id: toolId } });
    if (!existing) {
      return res.redirect('/tools?error=Alat praktikum tidak ditemukan.');
    }

    const updated = await prisma.tool.update({
      where: { id: toolId },
      data: {
        namaAlat: namaAlat.trim(),
        spesifikasi: spesifikasi ? spesifikasi.trim() : null,
        stok: parseInt(stok) >= 0 ? parseInt(stok) : 0,
        kondisi: kondisi || 'BAIK',
        categoryId: parseInt(categoryId)
      }
    });

    await logActivity(
      req.session.user.id,
      'UPDATE_ALAT',
      `Admin memperbarui data alat: "${updated.namaAlat}" (Stok: ${updated.stok}, Kondisi: ${updated.kondisi}).`
    );

    res.redirect('/tools?success=Data inventaris alat berhasil diperbarui.');
  } catch (error) {
    console.error('Error updating tool:', error);
    res.redirect(`/tools/${toolId}/edit?error=Gagal memperbarui alat.`);
  }
}

// POST /tools/:id/delete - Admin Only
async function destroy(req, res) {
  const toolId = parseInt(req.params.id);
  try {
    const tool = await prisma.tool.findUnique({ where: { id: toolId } });
    if (!tool) {
      return res.redirect('/tools?error=Alat tidak ditemukan.');
    }

    await prisma.tool.delete({ where: { id: toolId } });

    await logActivity(
      req.session.user.id,
      'HAPUS_ALAT',
      `Admin menghapus inventaris alat: "${tool.namaAlat}".`
    );

    res.redirect('/tools?success=Alat praktikum berhasil dihapus dari inventaris.');
  } catch (error) {
    console.error('Error deleting tool:', error);
    res.redirect('/tools?error=Alat tidak dapat dihapus karena tercatat dalam riwayat peminjaman.');
  }
}

module.exports = {
  index,
  create,
  store,
  edit,
  update,
  destroy
};
