let currentUser = null;
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = checkSession();
    if (!currentUser || currentUser.role !== 'siswa') {
        window.location.href = '../index.html';
        return;
    }
    loadNavbar('navbar-container', 'Dashboard Siswa');
    setupEventListeners();
    renderProfile();
    await loadInitialData();
});

function setupEventListeners() {
    document.getElementById('absenBtn').addEventListener('click', handleAbsensi);
    document.getElementById('jurnalForm').addEventListener('submit', handleJurnalSubmit);
    
    // Toggle input bukti drive
    const selectStatus = document.getElementById('statusAbsen');
    const buktiContainer = document.getElementById('buktiInputContainer');
    if (selectStatus && buktiContainer) {
        selectStatus.addEventListener('change', () => {
            buktiContainer.style.display = (selectStatus.value === 'hadir') ? 'none' : 'block';
        });
    }
}

function renderProfile() {
    document.getElementById('profileNama').innerText = currentUser.nama || 'Siswa';
    document.getElementById('profileSekolah').innerText = currentUser.nama_sekolah || 'Asal Sekolah Belum Diatur';
    
    if (currentUser.pkl_mulai && currentUser.pkl_selesai) {
        document.getElementById('profilePeriode').innerText = `${formatDate(currentUser.pkl_mulai)} - ${formatDate(currentUser.pkl_selesai)}`;
    } else {
        document.getElementById('profilePeriode').innerText = 'Periode PKL Belum Diatur';
    }
}

async function loadInitialData() {
    await Promise.all([loadAttendanceStatus(), loadJurnalHistory(), loadTugas()]);
}

async function loadAttendanceStatus() {
    const statusDiv = document.getElementById('absenStatus');
    const formContainer = document.getElementById('absenFormContainer');
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
        
        statusDiv.innerHTML = `
            <div class="alert alert-success" style="background: #e3faf3; color: #00b894; padding: 15px; border-radius: 8px; border: 1px solid #00b894;">
                <i class="fas fa-check-circle"></i> <strong>Pencatatan Berhasil</strong><br>
                <span>Status: ${status.toUpperCase()}</span>
            </div>
        `;
        if (formContainer) formContainer.style.display = 'none';
    } catch (error) {
        Swal.fire('Gagal', error.message, 'error');
        resetAbsenBtn();
    }
}

function resetAbsenBtn() {
    const btn = document.getElementById('absenBtn');
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-fingerprint"></i> &nbsp;Konfirmasi Kehadiran';
}

// ... Sisanya tetap sama (handleJurnal, handleTugas, dll) ...
async function loadJurnalHistory() {
    const container = document.getElementById('jurnalHistory');
    try {
        const data = await getJurnal(currentUser.id, currentUser.nama);
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-style: italic;">Belum ada jurnal.</p>';
            return;
        }
        container.innerHTML = `
            <div style="overflow-x: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Tanggal</th>
                            <th>Kegiatan</th>
                            <th>Catatan</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.reverse().slice(0, 10).map(item => `
                            <tr>
                                <td style="white-space: nowrap; font-weight: 500;">${formatDate(item.tanggal)}</td>
                                <td>${item.kegiatan}</td>
                                <td style="color: var(--text-muted); font-size: 0.85rem;">${item.catatan || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<p style="color: red;">Gagal memuat jurnal.</p>';
    }
}

async function handleJurnalSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('saveJurnalBtn');
    const kegiatan = document.getElementById('kegiatan').value.trim();
    const catatan = document.getElementById('catatan').value.trim();
    btn.disabled = true;
    btn.innerHTML = '⏳ Menyimpan...';
    try {
        await addJurnal(currentUser.id, currentUser.nama, kegiatan, catatan);
        showNotification('Jurnal berhasil disimpan!', 'success');
        document.getElementById('jurnalForm').reset();
        await loadJurnalHistory();
    } catch (error) {
        showNotification('Gagal simpan jurnal: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-save"></i> &nbsp;Simpan Jurnal';
    }
}

async function loadTugas() {
    const container = document.getElementById('tugasList');
    try {
        const data = await getTugas({ siswa_id: currentUser.id, nama_siswa: currentUser.nama });
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-style: italic;">Tidak ada tugas.</p>';
            return;
        }
        
        container.innerHTML = data.map(tugas => `
            <div class="card" style="padding: 1rem; margin-bottom: 1rem; border: 1px solid #eee; background: #fff; box-shadow: none;">
                <h4 style="margin-bottom: 5px;">${tugas.judul}</h4>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">${tugas.deskripsi}</p>
                
                ${tugas.is_submitted ? `
                    <div style="background: #e3faf3; color: #00b894; padding: 15px; border-radius: 8px; font-size: 0.85rem; text-align: center; font-weight: 600; line-height: 1.4;">
                        ✅ Tugas sudah dikumpulkan.<br>
                        <span style="font-weight: normal; font-size: 0.75rem;">Terimakasih sudah mengumpulkan tugas.</span>
                    </div>
                ` : `
                    <div class="form-group" style="margin-bottom: 10px;">
                        <label style="font-size: 0.75rem; color: #666;">Link Drive Pekerjaan:</label>
                        <input type="text" id="link_tugas_${tugas.id}" class="form-control" placeholder="Tempel link Google Drive di sini..." style="font-size: 0.8rem; padding: 8px;">
                    </div>
                    <button onclick="handleTugasSubmit(${tugas.id})" id="btn_tugas_${tugas.id}" class="btn btn-primary btn-block" style="padding: 8px; font-size: 0.85rem; font-weight: 600;">
                        Kumpulkan
                    </button>
                `}
            </div>
        `).join('');
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
        await loadTugas(); // Refresh list tugas
    } catch (error) {
        Swal.fire('Gagal', error.message, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Kumpulkan';
    }
}
