const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const { logActivity } = require('../helpers/logger');

// GET /users
async function index(req, res) {
  try {
    const { search, role } = req.query;
    const where = {};

    if (search) {
      where.OR = [
        { nama: { contains: search } },
        { username: { contains: search } },
        { nisn: { contains: search } }
      ];
    }

    if (role && role !== 'ALL') {
      where.role = role;
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { id: 'asc' },
      include: {
        _count: {
          select: { borrowings: true }
        }
      }
    });

    res.render('users/index', {
      title: 'Manajemen Data Pengguna Lab',
      users,
      search: search || '',
      currentRole: role || 'ALL',
      success: req.query.success || null,
      error: req.query.error || null
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).send('Gagal memuat data pengguna.');
  }
}

// GET /users/create
async function create(req, res) {
  res.render('users/create', {
    title: 'Tambah Pengguna Baru',
    error: null,
    formData: {}
  });
}

// POST /users
async function store(req, res) {
  try {
    const { username, password, nama, role, nisn, telepon } = req.body;

    if (!username || !password || !nama || !role) {
      return res.render('users/create', {
        title: 'Tambah Pengguna Baru',
        error: 'Username, password, nama lengkap, dan role wajib diisi.',
        formData: req.body
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { username: username.trim().toLowerCase() }
    });

    if (existingUser) {
      return res.render('users/create', {
        title: 'Tambah Pengguna Baru',
        error: 'Username sudah digunakan oleh akun lain. Silakan pilih username lain.',
        formData: req.body
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username: username.trim().toLowerCase(),
        password: hashedPassword,
        nama: nama.trim(),
        role,
        nisn: nisn ? nisn.trim() : null,
        telepon: telepon ? telepon.trim() : null
      }
    });

    await logActivity(
      req.session.user.id,
      'TAMBAH_USER',
      `Admin menambahkan pengguna baru: ${newUser.nama} (${newUser.role}, @${newUser.username})`
    );

    res.redirect('/users?success=Pengguna baru berhasil ditambahkan.');
  } catch (error) {
    console.error('Error creating user:', error);
    res.render('users/create', {
      title: 'Tambah Pengguna Baru',
      error: 'Terjadi kesalahan sistem saat menyimpan data pengguna.',
      formData: req.body
    });
  }
}

// GET /users/:id/edit
async function edit(req, res) {
  try {
    const userToEdit = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!userToEdit) {
      return res.redirect('/users?error=Pengguna tidak ditemukan.');
    }

    res.render('users/edit', {
      title: 'Edit Data Pengguna',
      userToEdit,
      error: null
    });
  } catch (error) {
    console.error('Error fetching user for edit:', error);
    res.redirect('/users?error=Terjadi kesalahan saat memuat data.');
  }
}

// POST /users/:id
async function update(req, res) {
  const userId = parseInt(req.params.id);
  try {
    const { username, password, nama, role, nisn, telepon } = req.body;

    const userToEdit = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToEdit) {
      return res.redirect('/users?error=Pengguna tidak ditemukan.');
    }

    // Cek username bentrok
    if (username.trim().toLowerCase() !== userToEdit.username) {
      const exists = await prisma.user.findUnique({
        where: { username: username.trim().toLowerCase() }
      });
      if (exists) {
        return res.render('users/edit', {
          title: 'Edit Data Pengguna',
          userToEdit: { ...userToEdit, ...req.body },
          error: 'Username sudah dipakai oleh pengguna lain.'
        });
      }
    }

    const updateData = {
      username: username.trim().toLowerCase(),
      nama: nama.trim(),
      role,
      nisn: nisn ? nisn.trim() : null,
      telepon: telepon ? telepon.trim() : null
    };

    if (password && password.trim() !== '') {
      updateData.password = await bcrypt.hash(password.trim(), 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData
    });

    await logActivity(
      req.session.user.id,
      'UPDATE_USER',
      `Admin memperbarui profil pengguna: ${updatedUser.nama} (@${updatedUser.username})`
    );

    res.redirect('/users?success=Data pengguna berhasil diperbarui.');
  } catch (error) {
    console.error('Error updating user:', error);
    res.redirect(`/users/${userId}/edit?error=Gagal memperbarui data pengguna.`);
  }
}

// POST /users/:id/delete
async function destroy(req, res) {
  const userId = parseInt(req.params.id);
  try {
    if (req.session.user.id === userId) {
      return res.redirect('/users?error=Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif.');
    }

    const userToDelete = await prisma.user.findUnique({ where: { id: userId } });
    if (!userToDelete) {
      return res.redirect('/users?error=Pengguna tidak ditemukan.');
    }

    await prisma.user.delete({ where: { id: userId } });

    await logActivity(
      req.session.user.id,
      'HAPUS_USER',
      `Admin menghapus akun pengguna: ${userToDelete.nama} (@${userToDelete.username})`
    );

    res.redirect('/users?success=Pengguna berhasil dihapus dari sistem.');
  } catch (error) {
    console.error('Error deleting user:', error);
    res.redirect('/users?error=Gagal menghapus pengguna karena memiliki riwayat sirkulasi transaksi.');
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
