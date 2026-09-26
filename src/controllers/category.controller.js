const prisma = require('../config/db');
const { logActivity } = require('../helpers/logger');

// GET /categories
async function index(req, res) {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { namaKategori: 'asc' },
      include: {
        _count: {
          select: { tools: true }
        }
      }
    });

    res.render('categories/index', {
      title: 'Manajemen Kategori Alat Lab',
      categories,
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error listing categories:', error);
    res.status(500).send('Gagal memuat kategori alat.');
  }
}

// POST /categories
async function store(req, res) {
  try {
    const { namaKategori } = req.body;
    if (!namaKategori || !namaKategori.trim()) {
      return res.redirect('/categories?error=Nama kategori tidak boleh kosong.');
    }

    const trimmed = namaKategori.trim();
    const existing = await prisma.category.findUnique({
      where: { namaKategori: trimmed }
    });

    if (existing) {
      return res.redirect('/categories?error=Kategori dengan nama tersebut sudah ada.');
    }

    const newCategory = await prisma.category.create({
      data: { namaKategori: trimmed }
    });

    await logActivity(
      req.session.user.id,
      'TAMBAH_KATEGORI',
      `Admin menambahkan kategori alat baru: "${newCategory.namaKategori}"`
    );

    res.redirect('/categories?success=Kategori alat berhasil ditambahkan.');
  } catch (error) {
    console.error('Error creating category:', error);
    res.redirect('/categories?error=Terjadi kesalahan saat menambahkan kategori.');
  }
}

// POST /categories/:id/edit
async function update(req, res) {
  try {
    const catId = parseInt(req.params.id);
    const { namaKategori } = req.body;

    if (!namaKategori || !namaKategori.trim()) {
      return res.redirect('/categories?error=Nama kategori tidak boleh kosong.');
    }

    const trimmed = namaKategori.trim();
    const updated = await prisma.category.update({
      where: { id: catId },
      data: { namaKategori: trimmed }
    });

    await logActivity(
      req.session.user.id,
      'UPDATE_KATEGORI',
      `Admin memperbarui nama kategori menjadi: "${updated.namaKategori}"`
    );

    res.redirect('/categories?success=Kategori berhasil diperbarui.');
  } catch (error) {
    console.error('Error updating category:', error);
    res.redirect('/categories?error=Gagal memperbarui kategori.');
  }
}

// POST /categories/:id/delete
async function destroy(req, res) {
  try {
    const catId = parseInt(req.params.id);
    const category = await prisma.category.findUnique({
      where: { id: catId },
      include: { _count: { select: { tools: true } } }
    });

    if (!category) {
      return res.redirect('/categories?error=Kategori tidak ditemukan.');
    }

    if (category._count.tools > 0) {
      return res.redirect(`/categories?error=Kategori "${category.namaKategori}" tidak dapat dihapus karena masih menaungi ${category._count.tools} alat praktikum.`);
    }

    await prisma.category.delete({ where: { id: catId } });

    await logActivity(
      req.session.user.id,
      'HAPUS_KATEGORI',
      `Admin menghapus kategori alat: "${category.namaKategori}"`
    );

    res.redirect('/categories?success=Kategori berhasil dihapus.');
  } catch (error) {
    console.error('Error deleting category:', error);
    res.redirect('/categories?error=Gagal menghapus kategori.');
  }
}

module.exports = {
  index,
  store,
  update,
  destroy
};
