# PKL UTDI - Sistem Manajemen Presensi & Tugas

Sistem manajemen PKL berbasis web yang terintegrasi dengan Google Sheets sebagai database dan Google Apps Script sebagai backend.

## Fitur Utama
- **Multi-Role Authentication**: Mendukung Siswa, Mentor, dan Admin.
- **Geofencing Attendance**: Absensi kehadiran berbasis GPS dengan radius yang dapat diatur (Admin).
- **Status Kehadiran Pintar**: Otomatis mendeteksi "Hadir" atau "Terlambat" berdasarkan jam operasional (06.00 - 08.00).
- **Izin & Sakit**: Fitur pelaporan izin/sakit dengan lampiran bukti link Google Drive (Tanpa cek GPS).
- **Manajemen Tugas**: Mentor dapat memberikan tugas dan siswa dapat mengumpulkan link hasil pekerjaannya.
- **Jurnal Harian**: Siswa dapat mencatat aktivitas harian.

## Kekurangan / Limitasi Sistem (PENTING)

Sebagai aplikasi berbasis Google Apps Script dan Vanilla JavaScript, terdapat beberapa keterbatasan yang perlu diperhatikan:

1. **Keamanan Geofencing (GPS Spoofing)**:
   - Sistem mengandalkan `navigator.geolocation` browser. Siswa yang ahli teknologi dapat memanipulasi koordinat GPS menggunakan browser extension atau Developer Tools (Mock Location).
   
2. **Integritas Link Bukti**:
   - Input Link Bukti untuk Izin/Sakit tidak divalidasi secara otomatis oleh sistem. Siswa bisa saja memasukkan link asal jika admin tidak memeriksanya secara manual di Google Sheets.

3. **Limitasi Google Apps Script (Quotas)**:
   - Terdapat batas eksekusi script (6 menit per request) dan batas jumlah email/request per hari dari Google. Jika pengguna sangat banyak secara bersamaan, kemungkinan akan terjadi *delay* atau *timeout*.
   
4. **Keunikan Identitas (Unique Identifier)**:
   - Saat ini sistem menggunakan **Nama Siswa** sebagai kunci utama di sheet `absensi`. Jika terdapat dua siswa dengan nama yang persis sama, besar kemungkinan akan terjadi bentrok data dalam perhitungan rekapitulasi.

5. **Akses Data Langsung**:
   - Karena database menggunakan Google Sheets, Admin atau siapapun yang punya akses ke file spreadsheet tersebut bisa mengubah data tanpa terekam log perubahannya di aplikasi web.

6. **Efisiensi Data (Scalability)**:
   - Pengambilan data menggunakan `sheet.getDataRange().getValues()` akan semakin lambat seiring bertambahnya ribuan baris data absensi.

## Rekomendasi Pengembangan Mendatang
- Implementasi **Unique ID (UUID)** yang konsisten di semua sheet.
- Penambahan fitur **Upload File Langsung** ke Google Drive (bukan sekadar link).
- Fitur **Rekapitulasi Otomatis** ke dalam format PDF/Excel untuk Admin.
- Penggunaan **Database NoSQL** jika jumlah siswa mencapai ratusan/ribuan.

---
*Farhan f PKL UTDI - 2026*
