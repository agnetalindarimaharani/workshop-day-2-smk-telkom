const prisma = require('../config/db');

async function getDashboard(req, res) {
  try {
    const user = req.session.user;

    // 1. Data untuk ADMIN
    if (user.role === 'ADMIN') {
      const [
        totalTools,
        toolsAggregate,
        totalBorrowings,
        totalUsers,
        pendingCount,
        recentActivities,
        recentBorrowings
      ] = await Promise.all([
        prisma.tool.count(),
        prisma.tool.aggregate({ _sum: { stok: true } }),
        prisma.borrowing.count(),
        prisma.user.count(),
        prisma.borrowing.count({ where: { status: 'PENDING' } }),
        prisma.activityLog.findMany({
          take: 8,
          orderBy: { createdAt: 'desc' },
          include: { user: true }
        }),
        prisma.borrowing.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { user: true, tool: true, toolman: true }
        })
      ]);

      return res.render('dashboard/admin', {
        title: 'Dashboard Administrator Lab',
        user,
        stats: {
          totalTools,
          totalStock: toolsAggregate._sum.stok || 0,
          totalBorrowings,
          totalUsers,
          pendingCount
        },
        recentActivities,
        recentBorrowings
      });
    }

    // 2. Data untuk TOOLMAN
    if (user.role === 'TOOLMAN') {
      const [
        pendingCount,
        activeCount,
        returnedCount,
        dendaAggregate,
        pendingBorrowings,
        activeBorrowings
      ] = await Promise.all([
        prisma.borrowing.count({ where: { status: 'PENDING' } }),
        prisma.borrowing.count({ where: { status: 'APPROVED' } }),
        prisma.borrowing.count({ where: { status: 'RETURNED' } }),
        prisma.borrowing.aggregate({ _sum: { denda: true } }),
        prisma.borrowing.findMany({
          where: { status: 'PENDING' },
          orderBy: { tglPinjam: 'desc' },
          include: { user: true, tool: true }
        }),
        prisma.borrowing.findMany({
          where: { status: 'APPROVED' },
          orderBy: { tglPinjam: 'desc' },
          include: { user: true, tool: true }
        })
      ]);

      return res.render('dashboard/toolman', {
        title: 'Dashboard Toolman & Laboran',
        user,
        stats: {
          pendingCount,
          activeCount,
          returnedCount,
          totalDenda: dendaAggregate._sum.denda || 0
        },
        pendingBorrowings,
        activeBorrowings
      });
    }

    // 3. Data untuk PEMINJAM (Siswa / Guru)
    const [
      myPendingCount,
      myActiveCount,
      myReturnedCount,
      myBorrowings,
      availableTools
    ] = await Promise.all([
      prisma.borrowing.count({ where: { userId: user.id, status: 'PENDING' } }),
      prisma.borrowing.count({ where: { userId: user.id, status: 'APPROVED' } }),
      prisma.borrowing.count({ where: { userId: user.id, status: 'RETURNED' } }),
      prisma.borrowing.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        include: { tool: true, toolman: true }
      }),
      prisma.tool.findMany({
        where: { stok: { gt: 0 } },
        take: 6,
        orderBy: { stok: 'desc' },
        include: { category: true }
      })
    ]);

    return res.render('dashboard/peminjam', {
      title: 'Portal Peminjaman Lab RPL & Elektronika',
      user,
      stats: {
        myPendingCount,
        myActiveCount,
        myReturnedCount,
        total: myPendingCount + myActiveCount + myReturnedCount
      },
      myBorrowings,
      availableTools
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).send('Terjadi kesalahan saat memuat dashboard.');
  }
}

module.exports = {
  getDashboard
};
