    /**
    * PKL UTDI - BACKEND (Google Apps Script)
    * Versi Final: Perbaikan Radius & Pencatatan Nama
    */

    const SPREADSHEET_ID = '1X9QCaxRu3dDmfV54bW0Rsabyqdlir3z6-kowvkyhi5g';

    function doPost(e) {
      var output = ContentService.createTextOutput().setMimeType(ContentService.MimeType.JSON);
      try {
        var data = JSON.parse(e.postData.contents);
        var action = data.action;
        var result;
        
        if (action === 'login') result = handleLogin(data);
        else if (action === 'getDashboard') result = handleGetDashboard(data);
        else if (action === 'absen') result = handleAbsen(data);
        else if (action === 'getJurnal') result = handleGetJurnal(data);
        else if (action === 'addJurnal') result = handleAddJurnal(data);
        else if (action === 'getTugas') result = handleGetTugas(data);
        else if (action === 'submitTugas') result = handleSubmitTugas(data);
        else if (action === 'createTugas') result = handleCreateTugas(data);
        else if (action === 'getPengumpulan') result = handleGetPengumpulan(data);
        else if (action === 'getUsers') result = handleGetUsers();
        else if (action === 'addUser') result = handleAddUser(data);
        else if (action === 'updateUser') result = handleUpdateUser(data);
        else if (action === 'deleteUser') result = handleDeleteUser(data);
        else if (action === 'getConfig') result = handleGetConfig();
        else if (action === 'updateConfig') result = handleUpdateConfig(data);
        else throw new Error('Action tidak dikenal: ' + action);
        
        output.setContent(JSON.stringify({ status: 'success', data: result }));
        return output;
      } catch(error) {
        output.setContent(JSON.stringify({ status: 'error', message: error.message }));
        return output;
      }
    }

    function handleGetDashboard(data) {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var role = (data.role || '').toLowerCase();
      var tz = "GMT+7";
      var today = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");

      if (role === 'siswa') {
        var sheet = ss.getSheetByName('absensi');
        var rows = sheet.getDataRange().getValues();
        if (rows.length < 1) return { totalKehadiran: 0, alreadyAbsen: false };
        
        var headers = rows.shift().map(function(h) { return String(h).toLowerCase().trim().replace(/ /g, '_'); });
        var idxSiswaId = headers.indexOf('siswa_id');
        if (idxSiswaId === -1) idxSiswaId = headers.indexOf('nama_siswa');
        if (idxSiswaId === -1) idxSiswaId = headers.indexOf('nama');
        
        var idxTanggal = headers.indexOf('tanggal');
        var idxJarak = headers.indexOf('jarak') === -1 ? headers.indexOf('radius') : headers.indexOf('jarak');
        
        var inputId = String(data.userId).trim();
        var count = 0, alreadyAbsen = false, lastDistance = 0, currentStatus = "";

        for (var i = 0; i < rows.length; i++) {
            if (String(rows[i][idxSiswaId]).trim() === inputId) {
                count++;
                var d = rows[i][idxTanggal];
                var dStr = (d instanceof Date) ? Utilities.formatDate(d, tz, "yyyy-MM-dd") : String(d).trim().split('T')[0];
                if (dStr === today) { 
                  alreadyAbsen = true; 
                  lastDistance = (idxJarak !== -1) ? rows[i][idxJarak] : 0; 
                  currentStatus = rows[i][headers.indexOf('status')] || "hadir";
                }
            }
        }
        return { totalKehadiran: count, alreadyAbsen: alreadyAbsen, lastDistance: lastDistance, status: currentStatus, serverTime: today };
      }
      
      if (role === 'admin') {
        return { totalUsers: ss.getSheetByName('users').getLastRow() - 1, totalSiswa: ss.getSheetByName('siswa').getLastRow() - 1, totalTugas: ss.getSheetByName('tugas').getLastRow() - 1 };
      }
      return {};
    }

    function handleAbsen(data) {
      var config = handleGetConfig();
      var distance = (config.latitude && config.longitude) ? calculateDistance(data.latitude, data.longitude, config.latitude, config.longitude) : 0;
      
      // Bypass GPS check for Izin/Sakit
      var isHadir = (data.status === 'hadir' || !data.status);
      if (isHadir && config.radius && distance > config.radius) {
        throw new Error('❌ Luar Jangkauan (' + Math.round(distance) + 'm)');
      }

      var sheet = getSheet('absensi');
      var rows = sheet.getDataRange().getValues();
      var headers = rows.shift().map(function(h) { return String(h).toLowerCase().trim().replace(/ /g, '_'); });
      
      var tz = "GMT+7", today = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
      var idxSiswaId = headers.indexOf('siswa_id');
      if (idxSiswaId === -1) idxSiswaId = headers.indexOf('nama_siswa');
      if (idxSiswaId === -1) idxSiswaId = headers.indexOf('nama');
      
      var idxTanggal = headers.indexOf('tanggal');
      var inputId = String(data.siswa_id).trim();

      for (var i = 1; i < (rows.length + 1); i++) {
          var d = rows[i-1][idxTanggal];
          var dStr = (d instanceof Date) ? Utilities.formatDate(d, tz, "yyyy-MM-dd") : String(d).trim().split('T')[0];
          if (String(rows[i-1][idxSiswaId]).trim() === inputId && dStr === today) throw new Error('❌ Anda sudah absen hari ini!');
      }

      var idxColJarak = headers.indexOf('jarak') === -1 ? headers.indexOf('radius') : headers.indexOf('jarak');
      if (idxColJarak === -1) idxColJarak = 7; // Default H

      var idxColBukti = headers.indexOf('bukti');
      if (idxColBukti === -1) {
        idxColBukti = 8; // Column I
        sheet.getRange(1, 9).setValue('bukti');
      }

      var id = getNextId(sheet), waktu = Utilities.formatDate(new Date(), tz, "HH:mm:ss");
      
      // Logika Jam Absen & Status
      var jam = parseInt(waktu.split(":")[0]);
      var menit = parseInt(waktu.split(":")[1]);
      var statusFix = data.status || "hadir"; // Ambil status dari tombol yang dipilih
      
      // Hanya hitung terlambat jika statusnya 'hadir'
      if (statusFix === 'hadir') {
        if (jam > 8 || (jam === 8 && menit > 0)) {
          statusFix = "terlambat";
        } else if (jam < 6) {
          statusFix = "terlalu awal";
        }
      }

      var newRow = [id, data.siswa_id, today, waktu, data.latitude, data.longitude, statusFix];
      newRow[idxColJarak] = Math.round(distance);
      newRow[idxColBukti] = data.bukti || "";
      
      sheet.appendRow(newRow);
      return { message: '✅ Absensi berhasil! Status: ' + statusFix, distance: Math.round(distance), status: statusFix };
    }

    function handleLogin(data) {
      var rows = getSheet('users').getDataRange().getValues();
      var headers = rows.shift().map(function(h) { return String(h).toLowerCase().trim(); });
      for (var i = 0; i < rows.length; i++) {
        if (String(rows[i][headers.indexOf('email')]).trim() === String(data.email).trim() && 
            String(rows[i][headers.indexOf('password')]).trim() === String(data.password).trim()) {
          var userObj = {};
          for (var j = 0; j < headers.length; j++) {
            userObj[headers[j]] = rows[i][j];
          }
          return userObj;
        }
      }
      throw new Error('Email atau password salah');
    }

    function handleGetConfig() {
      var rows = getSheet('config').getDataRange().getValues();
      return (rows.length < 2) ? { latitude: 0, longitude: 0, radius: 500 } : { latitude: rows[1][0], longitude: rows[1][1], radius: rows[1][2] };
    }

    function handleUpdateConfig(data) {
      var sheet = getSheet('config');
      if (sheet.getLastRow() < 2) sheet.appendRow(["latitude","longitude","radius"]);
      sheet.getRange(2, 1, 1, 3).setValues([[data.latitude, data.longitude, data.radius]]);
      return { message: '✅ Konfigurasi diupdate!' };
    }

    function handleGetUsers() {
      var rows = getSheet('users').getDataRange().getValues();
      var headers = rows.shift();
      return rows.map(function(r) {
        var obj = {};
        for (var i = 0; i < headers.length; i++) { obj[headers[i]] = r[i]; }
        return obj;
      });
    }

    function handleAddUser(data) {
      var sheet = getSheet('users');
      var id = getNextId(sheet);
      
      // Pastikan header lengkap
      var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      if (headers.indexOf('nama_sekolah') === -1) {
        sheet.getRange(1, 6, 1, 3).setValues([['nama_sekolah', 'pkl_mulai', 'pkl_selesai']]);
      }
      
      // id, nama, email, password, role, nama_sekolah, pkl_mulai, pkl_selesai
      sheet.appendRow([
        id, 
        data.nama, 
        data.email, 
        data.password, 
        data.role, 
        data.nama_sekolah || '', 
        data.pkl_mulai || '', 
        data.pkl_selesai || ''
      ]);
      
      if (data.role === 'siswa') {
        var sSheet = getSheet('siswa');
        var sHeaders = sSheet.getRange(1, 1, 1, sSheet.getLastColumn()).getValues()[0];
        if (sHeaders.indexOf('nama_sekolah') === -1) {
          sSheet.getRange(1, 5, 1, 3).setValues([['nama_sekolah', 'pkl_mulai', 'pkl_selesai']]);
        }
        // id, nama, email, id_mentor, nama_sekolah, pkl_mulai, pkl_selesai
        getSheet('siswa').appendRow([
          id, 
          data.nama, 
          data.email, 
          data.id_mentor || '', 
          data.nama_sekolah || '', 
          data.pkl_mulai || '', 
          data.pkl_selesai || ''
        ]);
      }
      return { message: '✅ Berhasil tambah user!' };
    }

    function handleUpdateUser(data) {
      var sheet = getSheet('users');
      var rows = sheet.getDataRange().getValues();
      var headers = rows[0].map(function(h) { return String(h).toLowerCase().trim(); });
      
      // Pastikan header lengkap
      if (headers.indexOf('nama_sekolah') === -1) {
        sheet.getRange(1, 6, 1, 3).setValues([['nama_sekolah', 'pkl_mulai', 'pkl_selesai']]);
        rows = sheet.getDataRange().getValues(); // Refresh rows
        headers = rows[0].map(function(h) { return String(h).toLowerCase().trim(); });
      }
      
      for (var i = 1; i < rows.length; i++) {
        if (rows[i][0] == data.id) {
          // Siapkan data array berdasarkan jumlah headers
          var newRow = rows[i];
          newRow[headers.indexOf('id')] = data.id;
          newRow[headers.indexOf('nama')] = data.nama;
          newRow[headers.indexOf('email')] = data.email;
          newRow[headers.indexOf('password')] = data.password;
          newRow[headers.indexOf('role')] = data.role;
          
          if (headers.indexOf('nama_sekolah') !== -1) newRow[headers.indexOf('nama_sekolah')] = data.nama_sekolah || '';
          if (headers.indexOf('pkl_mulai') !== -1) newRow[headers.indexOf('pkl_mulai')] = data.pkl_mulai || '';
          if (headers.indexOf('pkl_selesai') !== -1) newRow[headers.indexOf('pkl_selesai')] = data.pkl_selesai || '';
          
          sheet.getRange(i + 1, 1, 1, newRow.length).setValues([newRow]);
          
          // Update di sheet siswa juga jika rolnya siswa
          if (data.role === 'siswa') {
            var sSheet = getSheet('siswa');
            var sRows = sSheet.getDataRange().getValues();
            var sHeaders = sRows[0].map(function(h) { return String(h).toLowerCase().trim(); });
            
            if (sHeaders.indexOf('nama_sekolah') === -1) {
                sSheet.getRange(1, 5, 1, 3).setValues([['nama_sekolah', 'pkl_mulai', 'pkl_selesai']]);
                sRows = sSheet.getDataRange().getValues();
                sHeaders = sRows[0].map(function(h) { return String(h).toLowerCase().trim(); });
            }

            for (var j = 1; j < sRows.length; j++) {
              if (sRows[j][0] == data.id) {
                var sHeaders = sRows[0].map(function(h) { return String(h).toLowerCase().trim(); });
                var sRow = sRows[j];
                sRow[0] = data.id;
                sRow[1] = data.nama;
                sRow[2] = data.email;
                if (sHeaders.indexOf('nama_sekolah') !== -1) sRow[sHeaders.indexOf('nama_sekolah')] = data.nama_sekolah || '';
                if (sHeaders.indexOf('pkl_mulai') !== -1) sRow[sHeaders.indexOf('pkl_mulai')] = data.pkl_mulai || '';
                if (sHeaders.indexOf('pkl_selesai') !== -1) sRow[sHeaders.indexOf('pkl_selesai')] = data.pkl_selesai || '';
                sSheet.getRange(j + 1, 1, 1, sRow.length).setValues([sRow]);
                break;
              }
            }
          }
          
          return { message: '✅ User diperbarui!' };
        }
      }
    }

    function handleDeleteUser(data) {
      var sheet = getSheet('users');
      var rows = sheet.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
          if (rows[i][0] == data.id) { sheet.deleteRow(i + 1); return { message: '✅ User dihapus!' }; }
      }
    }

    function handleGetJurnal(data) {
      var rows = getSheet('jurnal').getDataRange().getValues();
      var headers = rows.shift();
      return rows.filter(function(r) { return r[1] == data.siswa_id || r[1] == data.nama_siswa; })
                .map(function(r) { return { id: r[0], tanggal: r[2], kegiatan: r[3], catatan: r[4] }; });
    }

    function handleAddJurnal(data) {
      var id = getNextId(getSheet('jurnal'));
      getSheet('jurnal').appendRow([id, data.nama_siswa, Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd"), data.kegiatan, data.catatan]);
      return { message: '✅ Jurnal disimpan!' };
    }

    function handleGetTugas(data) {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var tugasRows = ss.getSheetByName('tugas').getDataRange().getValues();
      var qRows = ss.getSheetByName('pengumpulan').getDataRange().getValues();
      
      var tugasHeaders = tugasRows.shift();
      var qHeaders = qRows.shift();
      
      // Ambil daftar tugas yang sudah dikumpulkan oleh siswa ini
      var submittedIds = qRows.filter(function(r) { 
        return String(r[2]).trim() === String(data.nama_siswa).trim(); // Cocokkan Nama Siswa
      }).map(function(r) { return r[1]; }); // Ambil ID Tugas nya

      return tugasRows.map(function(r) { 
        return { 
          id: r[0], 
          judul: r[1], 
          deskripsi: r[2], 
          deadline: r[5],
          is_submitted: submittedIds.indexOf(r[0]) !== -1 // Cek apakah ID tugas ini ada di daftar yang sudah kumpul
        }; 
      });
    }

    function handleSubmitTugas(data) {
      var id = getNextId(getSheet('pengumpulan'));
      getSheet('pengumpulan').appendRow([id, data.tugas_id, data.nama_siswa, data.link_drive, new Date(), "tepat waktu"]);
      return { message: '✅ Tugas dikumpulkan!' };
    }

    function handleCreateTugas(data) {
      var sheet = getSheet('tugas');
      var id = getNextId(sheet);
      var tgl = Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
      sheet.appendRow([id, data.judul, data.deskripsi, data.mentor_id, tgl, data.deadline, data.target_siswa || 'all']);
      return { message: '✅ Tugas berhasil dibuat!' };
    }

    function handleGetPengumpulan(data) {
      var rows = getSheet('pengumpulan').getDataRange().getValues();
      var headers = rows.shift();
      return rows.map(function(r) {
          return { id: r[0], tugas_id: r[1], siswa_id: r[2], link_drive: r[3], tanggal_kumpul: r[4], status: r[5] };
      });
    }

    function getSheet(name) {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var s = ss.getSheetByName(name);
      if (!s) throw new Error('Sheet ' + name + ' tidak ada!');
      return s;
    }

    function getNextId(sheet) {
      var lr = sheet.getLastRow();
      if (lr < 2) return 1;
      var ids = sheet.getRange(2, 1, lr - 1, 1).getValues();
      var max = 0;
      for (var i = 0; i < ids.length; i++) { if (Number(ids[i][0]) > max) max = Number(ids[i][0]); }
      return max + 1;
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
      var R = 6371000;
      var dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
      var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
      return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }