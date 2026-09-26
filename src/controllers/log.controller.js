const prisma = require('../config/db');

// GET /logs - Admin Only
async function index(req, res) {
  try {
    const { search, aksi } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { keterangan: { contains: search } },
        { user: { nama: { contains: search } } },
        { user: { username: { contains: search } } }
      ];
    }

    if (aksi && aksi !== 'ALL') {
      where.aksi = aksi;
    }

    const [logs, actionTypes] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { user: true }
      }),
      prisma.activityLog.findMany({
        distinct: ['aksi'],
        select: { aksi: true }
      })
    ]);

    res.render('logs/index', {
      title: 'Audit Log Aktifitas Sistem Sarpras',
      logs,
      actionTypes: actionTypes.map((a) => a.aksi),
      search: search || '',
      selectedAksi: aksi || 'ALL',
      user: req.session.user
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).send('Gagal memuat log aktivitas sistem.');
  }
}

module.exports = {
  index
};
