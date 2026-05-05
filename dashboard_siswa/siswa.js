let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = checkSession();
    if (!currentUser || currentUser.role !== 'siswa') {
        window.location.href = '../index.html';
        return;
    }
    
    // Load sidebar
    if (document.getElementById('sidebar-container')) {
        let activePage = 'dashboard';
        if (window.location.pathname.includes('jurnal.html')) activePage = 'jurnal';
        else if (window.location.pathname.includes('tugas.html')) activePage = 'tugas';
        else if (window.location.pathname.includes('absensi.html')) activePage = 'absensi';
        
        loadSidebar('sidebar-container', activePage);
    }
    
    // PENTING: Ambil data profil TERBARU dari database
    await loadUserProfileFromDatabase();
    
    setupEventListeners();
    renderProfile();
    
    if (!currentUser.nama_sekolah || !currentUser.pkl_mulai || !currentUser.pkl_selesai) {
        setTimeout(() => {
            Swal.fire({
                title: 'Lengkapi Profil',
                text: 'Harap lengkapi asal sekolah dan periode PKL Anda terlebih dahulu.',
                icon: 'info',
                confirmButtonText: 'Lengkapi Sekarang'
            }).then((result) => {
                if (result.isConfirmed) openEditProfileModal();
            });
        }, 1000);
    }
    
    await loadInitialData();
});

async function loadUserProfileFromDatabase() {
    try {
        const freshData = await callAPI('getUserProfile', { userId: currentUser.id });
        currentUser = { ...currentUser, ...freshData };
        localStorage.setItem('userSession', JSON.stringify(currentUser));
    } catch (error) {
        console.error('Gagal mengambil profil dari database:', error);
    }
}

function setupEventListeners() {
    const absenBtn = document.getElementById('absenBtn');
    if (absenBtn) {
        absenBtn.addEventListener('click', handleAbsensi);
    }
    
    const jurnalForm = document.getElementById('jurnalForm');
    if (jurnalForm) {
        jurnalForm.addEventListener('submit', handleJurnalSubmit);
    }
    
    const selectStatus = document.getElementById('statusAbsen');
    const buktiContainer = document.getElementById('buktiInputContainer');
    if (selectStatus && buktiContainer) {
        selectStatus.addEventListener('change', () => {
            buktiContainer.style.display = (selectStatus.value === 'hadir') ? 'none' : 'block';
        });
    }
}

function renderProfile() {
    const profileNama = document.getElementById('profileNama');
    const profileSekolah = document.getElementById('profileSekolah');
    const profilePeriode = document.getElementById('profilePeriode');
    
    if (profileNama) profileNama.innerText = currentUser.nama || 'Siswa';
    
    if (profileSekolah) {
        if (currentUser.nama_sekolah) {
            profileSekolah.innerText = currentUser.nama_sekolah;
        } else {
            profileSekolah.innerText = 'Asal Sekolah Belum Diatur';
        }
    }
    
    if (profilePeriode) {
        if (currentUser.pkl_mulai && currentUser.pkl_selesai) {
            profilePeriode.innerText = `${formatDate(currentUser.pkl_mulai)} - ${formatDate(currentUser.pkl_selesai)}`;
        } else {
            profilePeriode.innerText = 'Periode PKL Belum Diatur';
        }
    }
}

async function openEditProfileModal() {
    const { value: formValues } = await Swal.fire({
        title: 'Edit Profil Siswa',
        html: `
            <div style="text-align: left;">
                <div class="form-group" style="margin-bottom: 15px;">
                    <label style="font-size: 0.8rem; font-weight: bold; display: block; margin-bottom: 5px;">Nama Sekolah / Instansi</label>
                    <input id="swal-sekolah" class="swal2-input" style="width: 100%; margin: 0;" placeholder="Contoh: SMK Negeri 1 Mars" value="${currentUser.nama_sekolah || ''}">
                </div>
                <div style="display: flex; gap: 15px;">
                    <div class="form-group" style="flex: 1;">
                        <label style="font-size: 0.8rem; font-weight: bold; display: block; margin-bottom: 5px;">Mulai PKL</label>
                        <input id="swal-mulai" class="swal2-input" type="date" style="width: 100%; margin: 0;" value="${currentUser.pkl_mulai || ''}">
                    </div>
                    <div class="form-group" style="flex: 1;">
                        <label style="font-size: 0.8rem; font-weight: bold; display: block; margin-bottom: 5px;">Selesai PKL</label>
                        <input id="swal-selesai" class="swal2-input" type="date" style="width: 100%; margin: 0;" value="${currentUser.pkl_selesai || ''}">
                    </div>
                </div>
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: '💾 Simpan Perubahan',
        cancelButtonText: 'Batal',
        preConfirm: () => {
            const sekolah = document.getElementById('swal-sekolah').value.trim();
            const mulai = document.getElementById('swal-mulai').value;
            const selesai = document.getElementById('swal-selesai').value;

            if (!sekolah || !mulai || !selesai) {
                Swal.showValidationMessage('Semua data wajib diisi!');
                return false;
            }

            return {
                nama_sekolah: sekolah,
                pkl_mulai: mulai,
                pkl_selesai: selesai
            }
        }
    });

    if (formValues) {
        try {
            Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            
            await callAPI('updateProfile', {
                userId: currentUser.id,
                ...formValues
            });

            await loadUserProfileFromDatabase();
            renderProfile();
            Swal.fire('Berhasil', 'Profil berhasil diperbarui!', 'success');
        } catch (error) {
            Swal.fire('Gagal', error.message, 'error');
        }
    }
}

async function loadInitialData() {
    const path = window.location.pathname;
    
    if (path.includes('index.html') || path.endsWith('dashboard_siswa/')) {
        await loadDashboardData();
    } else if (path.includes('jurnal.html')) {
        await loadJurnalHistory();
        await updateTotalJurnal();
    } else if (path.includes('tugas.html')) {
        await loadTugas();
    } else if (path.includes('absensi.html')) {
        await loadAttendanceStatus();
        await loadRiwayatAbsensi();
    }
}

async function loadDashboardData() {
    await Promise.all([
        loadStatusHariIni(),
        loadTotalKehadiran(),
        loadJurnalTerbaru(),
        loadAbsensiMingguIni(),
        loadTotalTugas()
    ]);
}

async function loadStatusHariIni() {
    const statusElement = document.getElementById('statusHariIni');
    if (!statusElement) return;

    try {
        const stats = await getDashboard(currentUser.nama, currentUser.role);
        if (stats && stats.alreadyAbsen) {
            statusElement.innerHTML = 'Sudah Absen';
            statusElement.style.color = 'var(--success)';
        } else {
            statusElement.innerHTML = 'Belum Absen';
            statusElement.style.color = 'var(--warning)';
        }
    } catch (error) {
        console.error('Error loading status:', error);
        statusElement.innerHTML = 'Error';
    }
}

async function loadTotalKehadiran() {
    const element = document.getElementById('totalKehadiran');
    if (!element) return;

    try {
        const stats = await getDashboard(currentUser.nama, currentUser.role);
        element.innerText = stats.totalKehadiran || 0;
    } catch (error) {
        console.error('Error loading kehadiran:', error);
        element.innerText = '0';
    }
}

function truncateText(text, maxLength = 30) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

async function loadJurnalTerbaru() {
    const container = document.getElementById('jurnalTerbaru');
    if (!container) return;

    try {
        const data = await getJurnal(currentUser.id, currentUser.nama);
        if (!data || data.length === 0) {
            container.innerHTML = `
                <p style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
                    <i class="fas fa-book" style="font-size: 3rem; display: block; margin-bottom: 10px; opacity: 0.3;"></i>
                    Belum ada jurnal
                </p>
            `;
            return;
        }

        const latestJournals = data.reverse().slice(0, 5);
        
        container.innerHTML = latestJournals.map(item => `
            <div style="padding: 15px; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--white); margin-bottom: 12px; border-left: 3px solid var(--accent);">
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 5px;">
                    <i class="fas fa-calendar" style="margin-right: 5px;"></i>${formatDate(item.tanggal)}
                </div>
                <div style="font-weight: 600; color: var(--primary); font-size: 0.9rem;">${truncateText(item.kegiatan, 35)}</div>
            </div>
        `).join('');
    } catch (error) {
        container.innerHTML = '<p style="color: var(--error); text-align: center;">Gagal memuat jurnal</p>';
    }
}

async function loadAbsensiMingguIni() {
    const container = document.getElementById('absensiMingguIni');
    if (!container) return;

    try {
        const allAbsensi = await getRiwayatAbsensi(currentUser.id, currentUser.nama);
        
        const today = new Date();
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        const mingguIni = allAbsensi.filter(absen => {
            const absenDate = new Date(absen.tanggal);
            return absenDate >= weekAgo && absenDate <= today;
        });

        if (mingguIni.length === 0) {
            container.innerHTML = `
                <p style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
                    <i class="fas fa-clipboard-list" style="font-size: 3rem; display: block; margin-bottom: 10px; opacity: 0.3;"></i>
                    Belum ada absensi minggu ini
                </p>
            `;
            return;
        }

        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px;">
                ${generateWeekDays(mingguIni)}
            </div>
            <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                    <span style="color: var(--text-muted);">Total minggu ini:</span>
                    <span style="font-weight: 600; color: var(--primary);">${mingguIni.length} hari</span>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading absensi minggu ini:', error);
        container.innerHTML = '<p style="color: var(--error); text-align: center;">Gagal memuat data</p>';
    }
}

function generateWeekDays(absensiList) {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const today = new Date();
    const weekDays = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        weekDays.push(date);
    }
    
    return weekDays.map(date => {
        const dateStr = formatDate(date);
        const absen = absensiList.find(a => a.tanggal === dateStr);
        const dayName = days[date.getDay()];
        const dayNum = date.getDate();
        
        let bgColor = absen ? 'var(--success)' : '#f1f5f9';
        let textColor = absen ? 'white' : 'var(--text-muted)';
        
        return `
            <div style="text-align: center; padding: 10px 5px; border-radius: var(--radius-md); background: ${bgColor}; color: ${textColor};">
                <div style="font-size: 0.7rem; font-weight: 600; margin-bottom: 4px;">${dayName}</div>
                <div style="font-size: 1.1rem; font-weight: 700;">${dayNum}</div>
            </div>
        `;
    }).join('');
}

async function loadTotalTugas() {
    const element = document.getElementById('totalTugas');
    if (!element) return;

    try {
        const tugasList = await getTugas({ siswa_id: currentUser.id, nama_siswa: currentUser.nama });
        const total = tugasList.length;
        const selesai = tugasList.filter(t => t.is_submitted).length;
        element.innerText = `${selesai}/${total}`;
    } catch (error) {
        console.error('Error loading tugas:', error);
        element.innerText = '0/0';
    }
}

async function loadAttendanceStatus() {
    const statusDiv = document.getElementById('absenStatus');
    const formContainer = document.getElementById('absenFormContainer');
    
    if (!statusDiv) return;
    
    try {
        const stats = await getDashboard(currentUser.nama, currentUser.role);
        if (stats && stats.alreadyAbsen) {
            statusDiv.innerHTML = `
                <div class="alert alert-success" style="background: #e3faf3; color: #00b894; padding: 15px; border-radius: 8px; border: 1px solid #00b894;">
                    <i class="fas fa-check-circle"></i> <strong>Pencatatan Berhasil</strong><br>
                    <span class="badge ${stats.status === 'terlambat' ? 'badge-warning' : 'badge-success'}" style="margin: 5px 0; display: inline-block;">
                        Status: ${stats.status ? stats.status.toUpperCase() : 'HADIR'}
                    </span><br>
                    <small>Jarak: ${stats.lastDistance || 0}m | Server: ${stats.serverTime}</small>
                </div>
            `;
            if (formContainer) formContainer.style.display = 'none';
        } else {
            if (formContainer) formContainer.style.display = 'block';
            statusDiv.innerHTML = '';
        }
    } catch (error) {
        console.error('Status Load Error:', error);
    }
}

async function handleAbsensi() {
    const btn = document.getElementById('absenBtn');
    const statusAbsen = document.getElementById('statusAbsen').value;
    const linkBukti = document.getElementById('linkBukti').value.trim();

    if (statusAbsen !== 'hadir' && !linkBukti) {
        Swal.fire('Perhatian', 'Mohon masukkan link bukti (Google Drive).', 'warning');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';

    if (statusAbsen === 'hadir') {
        if (!navigator.geolocation) {
            Swal.fire('Error', 'Browser tidak mendukung GPS.', 'error');
            resetAbsenBtn();
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            await kirimAbsensi(position.coords.latitude, position.coords.longitude, 'hadir', '');
        }, (error) => {
            Swal.fire('GPS Error', 'Gagal mengambil lokasi.', 'error');
            resetAbsenBtn();
        }, { enableHighAccuracy: true });
    } else {
        await kirimAbsensi(0, 0, statusAbsen, linkBukti);
    }
}

async function kirimAbsensi(lat, lng, status, bukti) {
    const btn = document.getElementById('absenBtn');
    const statusDiv = document.getElementById('absenStatus');
    const formContainer = document.getElementById('absenFormContainer');

    try {
        const res = await absen(currentUser.nama, lat, lng, status, bukti);
        Swal.fire('Berhasil!', res.message, 'success');
        
        if (statusDiv) {
            statusDiv.innerHTML = `
                <div class="alert alert-success" style="background: #e3faf3; color: #00b894; padding: 15px; border-radius: 8px; border: 1px solid #00b894;">
                    <i class="fas fa-check-circle"></i> <strong>Pencatatan Berhasil</strong><br>
                    <span>Status: ${status.toUpperCase()}</span>
                </div>
            `;
        }
        
        if (formContainer) formContainer.style.display = 'none';
        
        if (document.getElementById('statusHariIni')) {
            await loadStatusHariIni();
            await loadTotalKehadiran();
        }
    } catch (error) {
        Swal.fire('Gagal', error.message, 'error');
        resetAbsenBtn();
    }
}

function resetAbsenBtn() {
    const btn = document.getElementById('absenBtn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-fingerprint"></i> &nbsp;Konfirmasi Kehadiran';
    }
}

async function showJurnalDetail(jurnal) {
    const { value: formValues } = await Swal.fire({
        title: '<i class="fas fa-book-open" style="margin-right: 8px;"></i>Detail Jurnal',
        html: `
            <div style="text-align: left;">
                <div style="margin-bottom: 15px;">
                    <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 5px;">
                        <i class="fas fa-calendar" style="margin-right: 5px;"></i>Tanggal
                    </label>
                    <div style="font-size: 1rem; color: var(--primary); font-weight: 600;">${formatDate(jurnal.tanggal)}</div>
                </div>
                <div>
                    <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 5px;">
                        <i class="fas fa-list" style="margin-right: 5px;"></i>Kegiatan
                    </label>
                    <div id="detailKegiatan" style="font-size: 0.95rem; color: var(--text-dark); line-height: 1.6; background: #f8fafc; padding: 15px; border-radius: var(--radius-md); border-left: 3px solid var(--accent);">
                        ${jurnal.kegiatan}
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fas fa-edit"></i> Edit',
        cancelButtonText: 'Tutup',
        confirmButtonColor: 'var(--accent)',
        cancelButtonColor: 'var(--text-muted)',
        width: 500,
        preConfirm: () => {
            return 'edit';
        }
    });

    if (formValues === 'edit') {
        await editJurnal(jurnal);
    }
}

async function editJurnal(jurnal) {
    const { value: formValues } = await Swal.fire({
        title: '<i class="fas fa-edit" style="margin-right: 8px;"></i>Edit Jurnal',
        html: `
            <div style="text-align: left;">
                <div class="form-group">
                    <label style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); display: block; margin-bottom: 5px;">
                        Kegiatan Utama
                    </label>
                    <textarea id="editKegiatan" class="swal2-textarea" rows="5" style="width: 100%; min-height: 150px;">${jurnal.kegiatan}</textarea>
                </div>
            </div>
        `,
        confirmButtonText: '💾 Simpan Perubahan',
        cancelButtonText: 'Batal',
        showCancelButton: true,
        width: 600,
        preConfirm: () => {
            const kegiatan = document.getElementById('editKegiatan').value.trim();
            if (!kegiatan) {
                Swal.showValidationMessage('Kegiatan tidak boleh kosong!');
                return false;
            }
            return { kegiatan };
        }
    });

    if (formValues) {
        try {
            Swal.fire({ title: 'Menyimpan...', didOpen: () => Swal.showLoading(), allowOutsideClick: false });
            
            await callAPI('updateJurnal', {
                jurnalId: jurnal.id,
                kegiatan: formValues.kegiatan
            });
            
            Swal.fire('Berhasil', 'Jurnal berhasil diperbarui!', 'success');
            
            if (document.getElementById('jurnalHistory')) {
                await loadJurnalHistory();
            }
            if (document.getElementById('jurnalTerbaru')) {
                await loadJurnalTerbaru();
            }
            await updateTotalJurnal();
        } catch (error) {
            Swal.fire('Gagal', error.message, 'error');
        }
    }
}

// PERBAIKAN LOGIKA UTAMA DI SINI
async function loadJurnalHistory() {
    const container = document.getElementById('jurnalHistory');
    const formContainer = document.getElementById('jurnalForm');
    const statusContainer = document.getElementById('jurnalStatusContainer');

    if (!container) return;
    
    try {
        const data = await getJurnal(currentUser.id, currentUser.nama);
        
        // 1. Dapatkan tanggal HARI INI (Format YYYY-MM-DD)
        const now = new Date();
        const todayStr = now.getFullYear() + '-' + 
                         String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(now.getDate()).padStart(2, '0');
        
        // 2. Cek apakah ada jurnal dengan tanggal HARI INI
        // Karena backend sudah diformat YYYY-MM-DD, perbandingan string langsung aman
        const hasJournalToday = data.some(item => item.tanggal === todayStr);

        // 3. Logika UI
        if (hasJournalToday) {
            // SUDAH ADA JURNAL HARI INI:
            // Sembunyikan form
            if (formContainer) formContainer.style.display = 'none';
            
            // Tampilkan pesan sukses
            if (statusContainer) {
                statusContainer.innerHTML = `
                    <div class="alert alert-success" style="background: #e3faf3; color: #00b894; padding: 15px; border-radius: 8px; border: 1px solid #00b894; display: flex; align-items: center; gap: 12px;">
                        <i class="fas fa-check-circle" style="font-size: 1.5rem;"></i>
                        <div>
                            <strong style="display: block; font-size: 1rem;">Pencatatan Berhasil</strong>
                            <span style="font-size: 0.9rem;">Anda sudah mengisi jurnal untuk hari ini. Silakan edit jika ingin mengubah.</span>
                        </div>
                    </div>
                `;
            }
        } else {
            // BELUM ADA JURNAL HARI INI:
            // Tampilkan form
            if (formContainer) formContainer.style.display = 'block';
            
            // Kosongkan pesan
            if (statusContainer) statusContainer.innerHTML = '';
        }

        // Render Tabel Riwayat
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-style: italic; padding: 20px;">Belum ada jurnal.</p>';
        } else {
            container.innerHTML = `
                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th style="width: 120px;">Tanggal</th>
                                <th>Kegiatan</th>
                                <th style="width: 100px; text-align: center;">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.reverse().map(item => `
                                <tr>
                                    <td style="white-space: nowrap; font-weight: 500;">${formatDate(item.tanggal)}</td>
                                    <td>${truncateText(item.kegiatan, 40)}</td>
                                    <td style="text-align: center;">
                                        <button onclick='showJurnalDetail(${JSON.stringify(item).replace(/'/g, "&#39;")})' 
                                                class="btn btn-secondary" 
                                                style="padding: 6px 12px; font-size: 0.8rem; width: auto; display: inline-flex;">
                                            <i class="fas fa-eye"></i> Detail
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
    } catch (error) {
        console.error(error);
        container.innerHTML = '<p style="color: red;">Gagal memuat jurnal.</p>';
    }
}

async function handleJurnalSubmit(e) {
    e.preventDefault();
    
    const btn = document.getElementById('saveJurnalBtn');
    const kegiatan = document.getElementById('kegiatan').value.trim();
    
    if (!kegiatan) {
        Swal.fire('Peringatan', 'Kegiatan tidak boleh kosong!', 'warning');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '⏳ Menyimpan...';
    
    try {
        await addJurnal(currentUser.id, currentUser.nama, kegiatan, '');
        showNotification('Jurnal berhasil disimpan!', 'success');
        document.getElementById('jurnalForm').reset();
        
        // PENTING: Reload history untuk trigger logika sembunyikan form
        await loadJurnalHistory();
        await updateTotalJurnal();
    } catch (error) {
        showNotification('Gagal simpan jurnal: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> &nbsp;Simpan Jurnal';
    }
}

async function updateTotalJurnal() {
    const element = document.getElementById('totalJurnal');
    if (!element) return;

    try {
        const data = await getJurnal(currentUser.id, currentUser.nama);
        element.innerText = data.length || 0;
    } catch (error) {
        element.innerText = '0';
    }
}

async function loadTugas() {
    const container = document.getElementById('tugasList');
    if (!container) return;
    
    try {
        const data = await getTugas({ siswa_id: currentUser.id, nama_siswa: currentUser.nama });
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-style: italic;">Tidak ada tugas.</p>';
            return;
        }
        
        container.innerHTML = data.map(tugas => {
            // Prioritas: Jika sudah mengumpulkan, tampilkan sebagai sudah dikumpulkan
            if (tugas.is_submitted) {
                return `
                    <div class="card" style="padding: 1rem; margin-bottom: 1rem; border: 1px solid #eee; background: #fff; box-shadow: none;">
                        <h4 style="margin-bottom: 5px;">${tugas.judul}</h4>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">${tugas.deskripsi}</p>
                        
                        <div style="background: #e3faf3; color: #00b894; padding: 15px; border-radius: 8px; font-size: 0.85rem; text-align: center; font-weight: 600; line-height: 1.4;">
                            ✅ Tugas sudah dikumpulkan.<br>
                            <span style="font-weight: normal; font-size: 0.75rem;">Terimakasih sudah mengumpulkan tugas.</span>
                        </div>
                    </div>
                `;
            }
            
            // Jika belum mengumpulkan, cek status aktif/non-aktif
            const isNonActive = !tugas.is_active;
            
            if (isNonActive) {
                // Tampilan untuk tugas non-aktif (belum dikumpulkan)
                return `
                    <div class="card" style="padding: 1rem; margin-bottom: 1rem; border: 1px solid #eee; background: #f8f9fa; opacity: 0.7;">
                        <h4 style="margin-bottom: 5px; color: var(--text-muted);">${tugas.judul}</h4>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">${tugas.deskripsi}</p>
                        
                        <div style="background: #fff3cd; color: #856404; padding: 12px; border-radius: 8px; font-size: 0.85rem; text-align: center; border-left: 4px solid #ffc107;">
                            <i class="fas fa-lock" style="margin-right: 8px;"></i>
                            <strong>Tugas Non-Aktif</strong><br>
                            <span style="font-size: 0.75rem;">Tugas ini sudah tidak dapat dikumpulkan</span>
                        </div>
                    </div>
                `;
            } else {
                // Tampilan untuk tugas aktif yang belum dikumpulkan
                return `
                    <div class="card" style="padding: 1rem; margin-bottom: 1rem; border: 1px solid #eee; background: #fff; box-shadow: none;">
                        <h4 style="margin-bottom: 5px;">${tugas.judul}</h4>
                        <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">${tugas.deskripsi}</p>
                        
                        <div class="form-group" style="margin-bottom: 10px;">
                            <label style="font-size: 0.75rem; color: #666;">Link Drive Pekerjaan:</label>
                            <input type="text" id="link_tugas_${tugas.id}" class="form-control" placeholder="Tempel link Google Drive di sini..." style="font-size: 0.8rem; padding: 8px;">
                        </div>
                        <button onclick="handleTugasSubmit(${tugas.id})" id="btn_tugas_${tugas.id}" class="btn btn-primary btn-block" style="padding: 8px; font-size: 0.85rem; font-weight: 600;">
                            Kumpulkan
                        </button>
                    </div>
                `;
            }
        }).join('');
    } catch (error) {
        container.innerHTML = '<p style="color: red;">Gagal memuat tugas.</p>';
    }
}

async function handleTugasSubmit(tugasId) {
    const input = document.getElementById(`link_tugas_${tugasId}`);
    const btn = document.getElementById(`btn_tugas_${tugasId}`);
    const linkDrive = input.value.trim();

    if (!linkDrive) {
        Swal.fire('Peringatan', 'Harap masukkan link Google Drive pekerjaan Anda.', 'warning');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '⏳ Mengirim...';

    try {
        await submitTugas(tugasId, currentUser.nama, linkDrive);
        Swal.fire('Berhasil!', 'Tugas Anda telah dikumpulkan.', 'success');
        await loadTugas();
        if (document.getElementById('totalTugas')) {
            await loadTotalTugas();
        }
    } catch (error) {
        Swal.fire('Gagal', error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Kumpulkan';
    }
}

async function loadRiwayatAbsensi() {
    const container = document.getElementById('riwayatAbsensi');
    if (!container) return;

    container.innerHTML = `
        <p style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
            Memuat riwayat...
        </p>
    `;

    try {
        const response = await callAPI('getRiwayatAbsensi', { 
            nama_siswa: currentUser.nama
        });
        
        const data = response.data;
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <p style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
                    <i class="fas fa-inbox" style="font-size: 3rem; display: block; margin-bottom: 10px; opacity: 0.3;"></i>
                    Belum ada riwayat absensi
                </p>
            `;
            return;
        }

        // Fungsi untuk format waktu WIB
        function formatWaktuWIB(waktuStr) {
            if (!waktuStr) return '-';
            
            // Jika format ISO (1899-12-29T17:33:01.000Z)
            if (waktuStr.includes('T')) {
                const date = new Date(waktuStr);
                // Tambah 7 jam untuk WIB (GMT+7)
                const wibTime = new Date(date.getTime() + (7 * 60 * 60 * 1000));
                return wibTime.toLocaleTimeString('id-ID', { 
                    hour: '2-digit', 
                    minute: '2-digit', 
                    second: '2-digit',
                    hour12: false 
                });
            }
            
            // Jika sudah format jam biasa (HH:MM:SS)
            return waktuStr;
        }

        container.innerHTML = `
            <div style="overflow-x: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Tanggal</th>
                            <th>Jam</th>
                            <th>Status</th>
                            <th>Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.reverse().slice(0, 50).map(item => `
                            <tr>
                                <td style="white-space: nowrap; font-weight: 500;">${formatDate(item.tanggal)}</td>
                                <td style="white-space: nowrap; font-weight: 500;">${formatWaktuWIB(item.waktu)}</td>
                                <td>
                                    <span class="badge ${getBadgeClass(item.status)}">
                                        ${item.status ? item.status.toUpperCase() : 'HADIR'}
                                    </span>
                                </td>
                                <td style="color: var(--text-muted); font-size: 0.85rem;">
                                    ${item.jarak ? item.jarak + 'm' : '-'}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading riwayat absensi:', error);
        container.innerHTML = '<p style="color: var(--error); text-align: center;">Gagal memuat riwayat</p>';
    }
}

function getBadgeClass(status) {
    if (!status || status === 'hadir') return 'badge-success';
    if (status === 'terlambat') return 'badge-warning';
    if (status === 'izin' || status === 'sakit') return 'badge-danger';
    return 'badge-success';
}