# DOKUMENTASI UJI SISTEM (TEST_CASES.md)
## Sistem Peminjaman Sarpras Lab RPL & Elektronika
**Standar Tugas Praktik Uji Kompetensi Keahlian (UKK) / Industri**  
**Role Pengembang:** Senior Fullstack Engineer & Tech Lead  
**Target Pengguna:** Kepala Laboratorium Komputer / Toolman & Laboran / Siswa Peminjam  

---

## 1. Matriks Hak Akses (Role-Based Access Control)

| No | Fitur Sistem | Hak Akses | Status Uji |
|:--:|:---|:---:|:---:|
| 1 | Autentikasi Login & Logout Multi-Role | `ADMIN`, `TOOLMAN`, `PEMINJAM` | ✅ Lulus |
| 2 | CRUD Master Data Pengguna Lab | `ADMIN` | ✅ Lulus |
| 3 | CRUD Inventaris Sarana Alat Praktikum | `ADMIN` | ✅ Lulus |
| 4 | CRUD Kategori Alat (Jaringan, Elektronika, dll) | `ADMIN` | ✅ Lulus |
| 5 | Monitoring & Manajemen Transaksi Sirkulasi | `ADMIN` | ✅ Lulus |
| 6 | Pemantauan Audit Trail Log Aktivitas Lab | `ADMIN` | ✅ Lulus |
| 7 | Persetujuan (Approval) & Penolakan Peminjaman | `TOOLMAN`, `ADMIN` | ✅ Lulus |
| 8 | Monitoring Alat Keluar & Pengembalian | `TOOLMAN`, `ADMIN` | ✅ Lulus |
| 9 | Inspeksi Fisik Alat (Baik/Rusak) & Input Denda | `TOOLMAN`, `ADMIN` | ✅ Lulus |
| 10 | Cetak Rekapitulasi Laporan Resmi (PDF/Print) | `TOOLMAN`, `ADMIN` | ✅ Lulus |
| 11 | Melihat Katalog & Ketersediaan Stok Fisik Alat | `PEMINJAM`, `TOOLMAN`, `ADMIN` | ✅ Lulus |
| 12 | Mengajukan Permohonan Peminjaman Alat | `PEMINJAM`, `ADMIN` | ✅ Lulus |
| 13 | Serahkan Alat ke Meja Toolman (Konfirmasi) | `PEMINJAM` | ✅ Lulus |

---

## 2. Kredensial Akun Pengujian (Demo Accounts)

Aplikasi dilengkapi tombol **Quick Switch Demo Akun** di halaman login (`/login`) untuk memudahkan pengujian:

| Role | Username | Password | Nama Lengkap & Posisi | Akses Utama |
|:---|:---|:---|:---|:---|
| **ADMIN** | `admin` | `password123` | Ahmad Subarjo, S.Kom (Kepala Lab Komputer) | Master Data, User, Kategori, Tools, Log Audit |
| **TOOLMAN** | `toolman` | `password123` | Bagus Prakoso, A.Md (Toolman / Laboran) | Approval Pinjam, Inspeksi Fisik, Denda, Cetak Laporan |
| **PEMINJAM** | `peminjam` | `password123` | Dimas Aditya Pratama (Siswa XII RPL 1) | Katalog Alat, Pengajuan Pinjam, Konfirmasi Meja Toolman |

---

## 3. Laporan 5 Skenario Pengujian Wajib

### Skenario 1: Login User Sesuai Hak Akses (Admin, Toolman, Peminjam Siswa)
* **Tujuan:** Memvalidasi bahwa setiap pengguna dapat login sesuai kredensialnya dan otorisasi sistem (RBAC) membatasi rute dengan respons 403 Forbidden bila tidak memiliki hak akses.
* **Langkah-Langkah:**
  1. Akses halaman `http://localhost:3000/login`.
  2. Klik tombol demo **Admin Lab** (`admin` / `password123`) lalu Submit.
  3. Verifikasi dialihkan ke `/dashboard` dengan dashboard Administrator.
  4. Akses rute `/users` dan `/logs` -> Berhasil dibuka (Status 200).
  5. Logout lalu login sebagai **Toolman** (`toolman` / `password123`).
  6. Verifikasi dialihkan ke dashboard Toolman. Buka `/borrowings` (Status 200).
  7. Akses rute terlarang `/users` -> Sistem menolak dengan tampilan ramah **403 Forbidden**.
  8. Logout lalu login sebagai **Siswa** (`peminjam` / `password123`).
  9. Verifikasi dialihkan ke dashboard Siswa. Buka `/tools` (Status 200).
  10. Akses rute terlarang `/users` -> Sistem menolak dengan respons **403 Forbidden**.
* **Hasil yang Diharapkan:** Login berhasil untuk seluruh peran dan RBAC memblokir akses rute yang bukan wewenangnya dengan kode 403.
* **Hasil Aktual:** Seluruh pemeriksaan status login dan proteksi middleware RBAC berhasil 100%.
* **Status:** **PASS (LULUS)** ✅

---

### Skenario 2: Admin Menambah Inventaris Alat Baru (Mikrotik Stok 5 Unit)
* **Tujuan:** Memvalidasi bahwa Admin dapat menambahkan sarana alat praktikum baru ke inventaris lab dan tercatat di audit log.
* **Langkah-Langkah:**
  1. Login sebagai Admin (`admin` / `password123`).
  2. Buka menu **Inventaris Alat** (`/tools`) lalu klik **Tambah Alat Baru** (`/tools/create`).
  3. Masukkan data alat:
     * Nama Alat: `Mikrotik RouterBoard RB750Gr3 UKK Testing`
     * Kategori: `Jaringan Komputer`
     * Stok Fisik: `5`
     * Kondisi: `BAIK`
     * Spesifikasi: `5x Gigabit Ethernet, RouterOS L4, Dual Core 880MHz`
  4. Klik **Simpan Alat ke Inventaris**.
  5. Verifikasi di halaman `/tools` bahwa alat muncul dengan badge stok `5 Unit (Tersedia)`.
  6. Buka menu **Audit Log Sistem** (`/logs`) dan periksa entri log `TAMBAH_ALAT`.
* **Hasil yang Diharapkan:** Alat tersimpan di database dengan stok 5 unit, kondisi BAIK, dan rekam jejak tercatat di tabel `ActivityLog`.
* **Hasil Aktual:** Alat berhasil disimpan dan tercatat di database dengan stok 5 serta entri log `TAMBAH_ALAT`.
* **Status:** **PASS (LULUS)** ✅

---

### Skenario 3: Siswa Mengajukan Peminjaman 1 Unit Mikrotik untuk Praktikum Jaringan
* **Tujuan:** Memvalidasi alur pengajuan peminjaman oleh siswa dengan validasi stok inventaris lab.
* **Langkah-Langkah:**
  1. Login sebagai Siswa (`peminjam` / `password123`).
  2. Buka menu **Ajukan Pinjam Alat** (`/borrowings/create`).
  3. Pilih alat: `Mikrotik RouterBoard RB750Gr3 UKK Testing` (Stok: 5).
  4. Masukkan Jumlah: `1` unit.
  5. Tentukan Rencana Tanggal Pengembalian (misal: 2 hari ke depan).
  6. Masukkan Catatan: `Praktikum Jaringan Komputer: Konfigurasi Hotspot & Bandwidth Management di Lab RPL`.
  7. Klik **Kirim Permohonan Peminjaman**.
  8. Verifikasi pada tabel peminjaman bahwa status permohonan adalah **Menunggu Approval (PENDING)**.
* **Hasil yang Diharapkan:** Peminjaman berstatus `PENDING`, unit 1, dan tercatat di log aktifitas dengan aksi `AJUKAN_PINJAM`.
* **Hasil Aktual:** Transaksi terbentuk dengan status `PENDING`, stok alat belum berkurang hingga disetujui toolman, dan aktivitas tercatat.
* **Status:** **PASS (LULUS)** ✅

---

### Skenario 4: Toolman Menyetujui Peminjaman & Stok Alat Berkurang Menjadi 4 Unit
* **Tujuan:** Memvalidasi proses persetujuan oleh Toolman dan pengurangan stok inventaris secara atomik (database transaction).
* **Langkah-Langkah:**
  1. Login sebagai Toolman (`toolman` / `password123`).
  2. Pada dashboard Toolman atau menu **Approval & Sirkulasi** (`/borrowings`), temukan permohonan siswa atas Mikrotik RouterBoard.
  3. Klik tombol hijau **Setujui**.
  4. Konfirmasi persetujuan pada dialog konfirmasi.
  5. Verifikasi status peminjaman berubah menjadi **Sedang Dipinjam (APPROVED)**.
  6. Buka menu **Stok & Kondisi Alat** (`/tools`) dan periksa stok Mikrotik RouterBoard.
  7. Verifikasi stok fisik alat telah berkurang dari 5 menjadi **4 Unit**.
* **Hasil yang Diharapkan:** Status peminjaman berubah menjadi `APPROVED`, stok fisik alat berkurang secara otomatis menjadi 4 unit, dan aksi `SETUJUI_PINJAM` tercatat di log.
* **Hasil Aktual:** Status peminjaman terupdate menjadi `APPROVED`, stok alat berkurang dari 5 menjadi 4 unit secara akurat, dan aksi tercatat di log.
* **Status:** **PASS (LULUS)** ✅

---

### Skenario 5: Pengembalian Alat Kondisi Rusak, Hitung Denda, & Verifikasi Log
* **Tujuan:** Memvalidasi proses pengembalian alat praktikum, inspeksi fisik oleh Toolman, penetapan denda ganti rugi, pengembalian stok, dan rekam jejak audit log.
* **Langkah-Langkah:**
  1. Login sebagai Toolman (`toolman` / `password123`).
  2. Temukan transaksi peminjaman aktif Mikrotik milik siswa Dimas Aditya.
  3. Klik tombol **Inspeksi & Terima Pengembalian** (`/borrowings/:id/return`).
  4. Pilih hasil pemeriksaan fisik: **Kondisi RUSAK**.
  5. Masukkan nominal denda ganti rugi: **Rp 50.000**.
  6. Masukkan Catatan Hasil Inspeksi: `Pemeriksaan fisik menemukan port 1 LAN retak dan adaptor kabel longgar. Denda sparepart Rp 50.000.`
  7. Centang opsi *Tandai alat di master inventaris lab sebagai RUSAK*.
  8. Klik **Konfirmasi Pengembalian & Catat Log**.
  9. Verifikasi status peminjaman berubah menjadi **Sudah Kembali (RETURNED)** dengan badge kondisi `RUSAK` dan denda `Rp 50.000`.
  10. Buka menu **Stok & Kondisi Alat** (`/tools`), verifikasi stok fisik bertambah kembali menjadi **5 Unit** dan status kondisi alat tertera `RUSAK`.
  11. Login sebagai Admin (`admin` / `password123`) lalu buka **Audit Log Sistem** (`/logs`).
  12. Verifikasi terdapat entri log baru dengan aksi `INSPEKSI_PENGEMBALIAN` yang mendokumentasikan kondisi fisik rusak dan denda Rp 50.000.
* **Hasil yang Diharapkan:** Transaksi berstatus `RETURNED`, denda tersimpan Rp 50.000, stok fisik kembali seimbang (5 unit), dan audit log mencatat seluruh rincian inspeksi.
* **Hasil Aktual:** Seluruh data inspeksi tersimpan dengan tepat, denda Rp 50.000 tercatat, stok seimbang kembali, dan log audit terverifikasi.
* **Status:** **PASS (LULUS)** ✅

---

## 4. Cara Menjalankan Uji Otomatis (Automated Testing)

Aplikasi menyediakan script pengujian otomatis mandiri `test_system.js`:

```bash
# Jalankan verifikasi otomatis 5 skenario
node test_system.js
```

**Ringkasan Eksekusi Pengujian:**
* Total Uji Asersi: **26 Asersi**
* Asersi Lulus: **26 Lulus (100%)**
* Asersi Gagal: **0 Gagal (0%)**
* Tingkat Kesiapan Sistem: **Siap Digunakan (Production Ready)**

---

## 5. Ringkasan Fitur Unggulan Sistem

1. **Dashboard Khusus Tiap Role:**
   - **Admin:** Metrik aset, sirkulasi global, dan monitoring audit log real-time.
   - **Toolman:** Widget antrean persetujuan, daftar pinjam aktif, dan penerimaan denda.
   - **Peminjam:** Profil siswa/NISN, status pinjaman aktif, tombol serah meja toolman, dan katalog alat.
2. **Kop Surat & Cetak Laporan Resmi:**
   - Halaman `/reports/print` siap cetak (A4 landscape) lengkap dengan Kop Surat SMK Telkom, nomor filter tanggal, tabel sirkulasi, dan blok tanda tangan Kepala Lab & Toolman.
3. **Database Transaksional Atomik:**
   - Perubahan stok dan status peminjaman dijamin konsisten menggunakan Prisma Transaction (`prisma.$transaction`).
