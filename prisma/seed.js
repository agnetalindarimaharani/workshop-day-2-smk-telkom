const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai seeding database Sarpras Lab RPL & Elektronika...');

  // 1. Bersihkan data lama jika ada
  await prisma.activityLog.deleteMany({});
  await prisma.borrowing.deleteMany({});
  await prisma.tool.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 2. Buat Akun Pengguna (Admin, Toolman, Peminjam)
  const adminUser = await prisma.user.create({
    data: {
      username: 'admin',
      password: defaultPassword,
      nama: 'Ahmad Subarjo, S.Kom',
      role: 'ADMIN',
      nisn: 'NIP. 198203152008011005',
      telepon: '081234567890'
    }
  });

  const toolmanUser = await prisma.user.create({
    data: {
      username: 'toolman',
      password: defaultPassword,
      nama: 'Bagus Prakoso, A.Md',
      role: 'TOOLMAN',
      nisn: 'NIP. 199407222020121008',
      telepon: '081398765432'
    }
  });

  const peminjamUser = await prisma.user.create({
    data: {
      username: 'peminjam',
      password: defaultPassword,
      nama: 'Dimas Aditya Pratama',
      role: 'PEMINJAM',
      nisn: '0068491823',
      telepon: '085711223344'
    }
  });

  const peminjam2 = await prisma.user.create({
    data: {
      username: 'siti',
      password: defaultPassword,
      nama: 'Siti Nurhaliza',
      role: 'PEMINJAM',
      nisn: '0071239841',
      telepon: '085899887766'
    }
  });

  const guruUser = await prisma.user.create({
    data: {
      username: 'budi_guru',
      password: defaultPassword,
      nama: 'Budi Santoso, S.Pd',
      role: 'PEMINJAM',
      nisn: 'NIP. 198811122015031002',
      telepon: '081299881122'
    }
  });

  console.log('✅ Pengguna demo berhasil dibuat (admin, toolman, peminjam)!');

  // 3. Buat Kategori Alat Praktikum
  const catJaringan = await prisma.category.create({
    data: { namaKategori: 'Jaringan Komputer' }
  });

  const catElektronika = await prisma.category.create({
    data: { namaKategori: 'Elektronika & IoT' }
  });

  const catMultimedia = await prisma.category.create({
    data: { namaKategori: 'Multimedia & Proyektor' }
  });

  const catToolset = await prisma.category.create({
    data: { namaKategori: 'Perkakas & Toolset' }
  });

  console.log('✅ Kategori alat praktikum berhasil dibuat!');

  // 4. Buat Inventaris Alat Praktikum
  const toolMikrotik = await prisma.tool.create({
    data: {
      namaAlat: 'Router Mikrotik RB750Gr3 hEX',
      spesifikasi: '5x Gigabit LAN, Dual Core 880MHz, RouterOS v7 L4, Rak Lab A1',
      stok: 7, // Stok tersedia saat ini (1 sedang dipinjam oleh Dimas)
      kondisi: 'BAIK',
      categoryId: catJaringan.id
    }
  });

  const toolMikrotikWifi = await prisma.tool.create({
    data: {
      namaAlat: 'Mikrotik Wireless Router RB951Ui-2HnD',
      spesifikasi: '5x Fast Ethernet, USB 2.0, AP 2.4GHz High Power, Rak Lab A2',
      stok: 5,
      kondisi: 'BAIK',
      categoryId: catJaringan.id
    }
  });

  const toolCrimping = await prisma.tool.create({
    data: {
      namaAlat: 'Crimping Tool RJ45 Cat5/Cat6 Proskit',
      spesifikasi: 'Heavy duty ratchet frame, built-in wire cutter & stripper',
      stok: 8,
      kondisi: 'BAIK',
      categoryId: catJaringan.id
    }
  });

  const toolLanTester = await prisma.tool.create({
    data: {
      namaAlat: 'Kabel LAN Tester Digital RJ45 RJ11',
      spesifikasi: 'Auto scan 1-8 LED tester, baterai kotak 9V, leather case',
      stok: 6,
      kondisi: 'BAIK',
      categoryId: catJaringan.id
    }
  });

  const toolSolder = await prisma.tool.create({
    data: {
      namaAlat: 'Solder Station Digital Atten 60W',
      spesifikasi: 'Temp control 200-480°C, antistatis ESD safe, metal stand + brass sponge',
      stok: 5,
      kondisi: 'BAIK',
      categoryId: catElektronika.id
    }
  });

  const toolMultimeter = await prisma.tool.create({
    data: {
      namaAlat: 'Digital Multimeter Sanwa CD800a',
      spesifikasi: '4000 counts, auto power-off, kontinuitas buzzer, safety cover',
      stok: 4,
      kondisi: 'BAIK',
      categoryId: catElektronika.id
    }
  });

  const toolArduino = await prisma.tool.create({
    data: {
      namaAlat: 'Arduino Uno R3 Starter Kit',
      spesifikasi: 'Board DIP ATmega328P, breadboard 830, sensor box, kabel jumper',
      stok: 10,
      kondisi: 'BAIK',
      categoryId: catElektronika.id
    }
  });

  const toolProyektor = await prisma.tool.create({
    data: {
      namaAlat: 'Proyektor Epson EB-X500 XGA',
      spesifikasi: '3600 Lumens 3LCD, input HDMI/VGA/USB, kabel power + remote',
      stok: 2,
      kondisi: 'BAIK',
      categoryId: catMultimedia.id
    }
  });

  const toolObeng = await prisma.tool.create({
    data: {
      namaAlat: 'Obeng Set Presisi 32-in-1 Jakemy',
      spesifikasi: 'Magnetic bits CR-V, pinset antistatis, handle ergonomis',
      stok: 8,
      kondisi: 'BAIK',
      categoryId: catToolset.id
    }
  });

  console.log('✅ Inventaris sarpras lab praktikum berhasil dibuat!');

  // 5. Buat Data Peminjaman Awal (Sirkulasi Realistis)
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
  const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
  const tomorrow = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
  const twoDaysLater = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

  // Transaksi 1: Sudah Kembali, Kondisi BAIK, Denda 0
  const borrow1 = await prisma.borrowing.create({
    data: {
      userId: peminjamUser.id,
      toolId: toolCrimping.id,
      jumlah: 1,
      tglPinjam: threeDaysAgo,
      tglKembaliRencana: twoDaysAgo,
      tglKembaliReal: twoDaysAgo,
      status: 'RETURNED',
      kondisiKembali: 'BAIK',
      denda: 0,
      toolmanId: toolmanUser.id,
      catatan: 'Praktikum crimping kabel LAN straight & cross di Lab 1. Alat kembali lengkap dan bersih.'
    }
  });

  // Transaksi 2: Sudah Kembali, Kondisi RUSAK, Ada Denda
  const borrow2 = await prisma.borrowing.create({
    data: {
      userId: peminjam2.id,
      toolId: toolLanTester.id,
      jumlah: 1,
      tglPinjam: threeDaysAgo,
      tglKembaliRencana: yesterday,
      tglKembaliReal: yesterday,
      status: 'RETURNED',
      kondisiKembali: 'RUSAK',
      denda: 50000,
      toolmanId: toolmanUser.id,
      catatan: 'Layar LCD tester retak dan soket RJ45 longgar saat dikembalikan. Denda penggantian sparepart.'
    }
  });

  // Transaksi 3: Sedang Dipinjam (APPROVED)
  const borrow3 = await prisma.borrowing.create({
    data: {
      userId: peminjamUser.id,
      toolId: toolMikrotik.id,
      jumlah: 1,
      tglPinjam: yesterday,
      tglKembaliRencana: tomorrow,
      status: 'APPROVED',
      toolmanId: toolmanUser.id,
      catatan: 'Tugas praktik konfigurasi OSPF multi-area & bandwidth management.'
    }
  });

  // Transaksi 4: Menunggu Persetujuan (PENDING)
  const borrow4 = await prisma.borrowing.create({
    data: {
      userId: peminjamUser.id,
      toolId: toolMultimeter.id,
      jumlah: 1,
      tglPinjam: now,
      tglKembaliRencana: twoDaysLater,
      status: 'PENDING',
      catatan: 'Pengukuran tegangan output regulator Arduino & sensor DHT22.'
    }
  });

  // Transaksi 5: Guru Meminjam Proyektor (APPROVED)
  const borrow5 = await prisma.borrowing.create({
    data: {
      userId: guruUser.id,
      toolId: toolProyektor.id,
      jumlah: 1,
      tglPinjam: now,
      tglKembaliRencana: tomorrow,
      status: 'APPROVED',
      toolmanId: toolmanUser.id,
      catatan: 'Presentasi materi pembelajaran Cloud Computing kelas XII RPL 2.'
    }
  });

  console.log('✅ Riwayat dan transaksi peminjaman awal berhasil dibuat!');

  // 6. Buat Audit Log Aktifitas Lab
  await prisma.activityLog.createMany({
    data: [
      {
        userId: adminUser.id,
        aksi: 'INISIALISASI_SISTEM',
        keterangan: 'Admin menginisialisasi sistem sarpras dan data master kategori alat.',
        createdAt: threeDaysAgo
      },
      {
        userId: peminjamUser.id,
        aksi: 'AJUKAN_PINJAM',
        keterangan: 'Siswa Dimas Aditya mengajukan peminjaman Crimping Tool Proskit (1 unit).',
        createdAt: threeDaysAgo
      },
      {
        userId: toolmanUser.id,
        aksi: 'SETUJUI_PINJAM',
        keterangan: 'Toolman Bagus menyetujui peminjaman Crimping Tool Proskit untuk Dimas Aditya.',
        createdAt: threeDaysAgo
      },
      {
        userId: toolmanUser.id,
        aksi: 'INSPEKSI_PENGEMBALIAN',
        keterangan: 'Toolman Bagus memproses pengembalian Crimping Tool: Fisik BAIK, Denda Rp 0.',
        createdAt: twoDaysAgo
      },
      {
        userId: toolmanUser.id,
        aksi: 'INSPEKSI_PENGEMBALIAN',
        keterangan: 'Toolman Bagus memeriksa pengembalian LAN Tester dari Siti Nurhaliza: Kondisi RUSAK, Denda Rp 50.000.',
        createdAt: yesterday
      },
      {
        userId: peminjamUser.id,
        aksi: 'AJUKAN_PINJAM',
        keterangan: 'Siswa Dimas Aditya mengajukan pinjam Router Mikrotik RB750Gr3 (1 unit).',
        createdAt: yesterday
      },
      {
        userId: toolmanUser.id,
        aksi: 'SETUJUI_PINJAM',
        keterangan: 'Toolman Bagus menyetujui peminjaman Router Mikrotik RB750Gr3 untuk Dimas Aditya. Stok berkurang menjadi 7.',
        createdAt: yesterday
      },
      {
        userId: peminjamUser.id,
        aksi: 'AJUKAN_PINJAM',
        keterangan: 'Siswa Dimas Aditya mengajukan peminjaman Digital Multimeter Sanwa (1 unit).',
        createdAt: now
      }
    ]
  });

  console.log('✅ Activity log awal berhasil dibuat!');
  console.log('🎉 Seeding database selesai dengan sukses!');
}

main()
  .catch((e) => {
    console.error('❌ Terjadi kesalahan saat seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
