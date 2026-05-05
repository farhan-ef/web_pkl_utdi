let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    currentUser = checkSession();
    if (!currentUser || currentUser.role !== 'mentor') {
        window.location.href = '../index.html';
        return;
    }

    // Setup Sidebar
    setupMentorSidebar();
    
    // Set minimal tanggal deadline adalah hari ini
    const deadlineInput = document.getElementById('deadlineTugas');
    if (deadlineInput) {
        deadlineInput.min = new Date().toISOString().split('T')[0];
    }
    
    // Event Listeners
    document.getElementById('tugasForm').addEventListener('submit', handleCreateTugas);
    document.getElementById('selectTugas').addEventListener('change', (e) => {
        if (e.target.value) loadPengumpulan(e.target.value);
    });
    
    // Load Data
    await Promise.all([loadMentorTugas(), loadTugasDropdown(), loadSiswaList()]);
});

// ==================== SIDEBAR MENTOR ====================
function setupMentorSidebar() {
    const container = document.getElementById('sidebar-container');
    const userName = currentUser ? currentUser.nama : 'Mentor';

    container.innerHTML = `
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-user">
                <div class="user-avatar">${userName.charAt(0).toUpperCase()}</div>
                <div class="user-info">
                    <div class="user-name">${userName}</div>
                    <div class="user-role">Mentor PKL</div>
                </div>
            </div>
            <nav class="sidebar-nav">
                <ul class="sidebar-menu">
                    <li class="active">
                        <a href="index.html">
                            <i class="fas fa-home"></i> <span>Dashboard</span>
                        </a>
                    </li>
                </ul>
            </nav>
            <div class="sidebar-footer">
                <button onclick="logout()" class="btn-logout">
                    <i class="fas fa-sign-out-alt"></i> <span>Keluar</span>
                </button>
            </div>
        </aside>
        <div class="sidebar-overlay" onclick="closeSidebar()"></div>
    `;
}

// Mobile Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar && overlay) {
        sidebar.classList.toggle('active');
        overlay.classList.toggle('active');
    }
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    if (sidebar && overlay) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
}

// ==================== FITUR MENTOR ====================
async function loadMentorTugas() {
    const container = document.getElementById('mentorTugasList');
    try {
        const response = await callAPI('getTugas', { mentor_id: currentUser.id });
        const data = response.data;
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <p style="text-align: center; color: var(--text-muted); padding: 40px 20px;">
                    <i class="fas fa-clipboard-list" style="font-size: 3rem; display: block; margin-bottom: 10px; opacity: 0.3;"></i>
                    Anda belum membuat tugas.
                </p>
            `;
            return;
        }
        
        container.innerHTML = `
            <div style="overflow-x: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>Tugas</th>
                            <th>Deadline</th>
                            <th style="text-align: center;">Status</th>
                            <th style="text-align: center;">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(tugas => {
                            // Gunakan is_active dari data, fallback ke true
                            const isActive = tugas.is_active !== undefined ? tugas.is_active : true;
                            const statusLabel = isActive ? 'Aktif' : 'Non-Aktif';
                            const statusClass = isActive ? 'badge-success' : 'badge-danger';
                            const toggleLabel = isActive ? 'Non-Aktifkan' : 'Aktifkan';
                            const toggleClass = isActive ? 'badge-warning' : 'badge-success';
                            
                            return `
                                <tr>
                                    <td>
                                        <div style="font-weight: 600; color: var(--primary);">${tugas.judul}</div>
                                        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
                                            ${tugas.deskripsi.substring(0, 60)}${tugas.deskripsi.length > 60 ? '...' : ''}
                                        </div>
                                    </td>
                                    <td style="white-space: nowrap; font-size: 0.85rem;">
                                        ${tugas.deadline ? formatDate(tugas.deadline) : '-'}
                                    </td>
                                    <td style="text-align: center;">
                                        <span class="badge ${statusClass}">${statusLabel}</span>
                                    </td>
                                    <td style="text-align: center;">
                                        <button onclick="toggleTugasStatus(${tugas.id}, ${!isActive})" 
                                                class="badge ${toggleClass}" 
                                                style="cursor: pointer; border: none; padding: 6px 12px; font-size: 0.85rem;">
                                            <i class="fas ${isActive ? 'fa-pause' : 'fa-play'}"></i> ${toggleLabel}
                                        </button>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        console.error('Error loading mentor tugas:', error);
        container.innerHTML = '<p style="color: red; text-align: center; padding: 20px;">Gagal memuat tugas.</p>';
    }
}

// Fungsi untuk toggle status tugas
async function toggleTugasStatus(tugasId, isActive) {
    const action = isActive ? 'mengaktifkan' : 'menonaktifkan';
    
    try {
        await callAPI('updateTugasStatus', {
            tugas_id: tugasId,
            is_active: isActive
        });
        
        showNotification(`Tugas berhasil ${action}!`, 'success');
        await loadMentorTugas();
        await loadTugasDropdown();
    } catch (error) {
        showNotification('Gagal mengubah status: ' + error.message, 'error');
    }
}

async function loadTugasDropdown() {
    const select = document.getElementById('selectTugas');
    try {
        const response = await callAPI('getTugas', { mentor_id: currentUser.id });
        const data = response.data;
        
        if (data) {
            select.innerHTML = '<option value="">-- Pilih Tugas untuk Melihat Pengumpulan --</option>';
            data.forEach(tugas => {
                const opt = document.createElement('option');
                opt.value = tugas.id;
                opt.textContent = tugas.judul;
                select.appendChild(opt);
            });
        }
    } catch (error) {
        console.error('Dropdown Error:', error);
    }
}

async function loadSiswaList() {
    const select = document.getElementById('targetSiswa');
    if (!select) return;
    try {
        const response = await callAPI('getUsers');
        const users = response.data;
        const students = users.filter(u => u.role && u.role.toLowerCase() === 'siswa');
        students.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.nama;
            select.appendChild(opt);
        });
    } catch (error) {
        console.error('Gagal memuat daftar siswa:', error);
    }
}

async function handleCreateTugas(e) {
    e.preventDefault();
    const btn = document.getElementById('createTugasBtn');
    const judul = document.getElementById('judulTugas').value.trim();
    const deskripsi = document.getElementById('deskripsiTugas').value.trim();
    const targetSiswa = document.getElementById('targetSiswa').value;
    const deadline = document.getElementById('deadlineTugas').value;
    
    btn.disabled = true;
    btn.innerHTML = '⏳ Memproses...';
    
    try {
        await callAPI('createTugas', {
            mentor_id: currentUser.id,
            judul: judul,
            deskripsi: deskripsi,
            deadline: deadline,
            target_siswa: targetSiswa
        });
        
        showNotification('Tugas berhasil dibuat!', 'success');
        document.getElementById('tugasForm').reset();
        await Promise.all([loadMentorTugas(), loadTugasDropdown()]);
    } catch (error) {
        showNotification('Gagal membuat tugas: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> &nbsp;Publikasikan Tugas';
    }
}

async function loadPengumpulan(tugasId) {
    const container = document.getElementById('pengumpulanList');
    container.innerHTML = `
        <p style="text-align: center; color: var(--text-muted); grid-column: 1 / -1; padding: 40px 20px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; display: block; margin-bottom: 10px;"></i>
            Memuat data pengumpulan...
        </p>
    `;
    
    try {
        const response = await callAPI('getPengumpulan', { tugas_id: tugasId });
        const data = response.data;
        
        if (!data || data.length === 0) {
            container.innerHTML = `
                <p style="text-align: center; color: var(--text-muted); grid-column: 1 / -1; padding: 40px 20px;">
                    <i class="fas fa-inbox" style="font-size: 3rem; display: block; margin-bottom: 10px; opacity: 0.3;"></i>
                    Belum ada siswa yang mengumpulkan.
                </p>
            `;
            return;
        }
        
        container.innerHTML = data.map(item => `
            <div class="card" style="padding: 1.25rem; border: 1px solid var(--border-color); border-radius: var(--radius-md);">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <div style="font-weight: 700; color: var(--primary);">
                        <i class="fas fa-user" style="margin-right: 8px;"></i>${item.siswa_id || item.nama_siswa}
                    </div>
                    <span class="badge ${item.status === 'Tepat Waktu' || item.status === 'tepat waktu' ? 'badge-success' : 'badge-danger'}">
                        ${item.status || 'Terlambat'}
                    </span>
                </div>
                <div style="margin-bottom: 10px;">
                    <a href="${item.link_drive}" target="_blank" style="color: var(--accent); text-decoration: none; font-size: 0.9rem; display: inline-flex; align-items: center; gap: 5px;">
                        <i class="fas fa-external-link-alt"></i> Buka Link Tugas
                    </a>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 10px;">
                    <i class="fas fa-clock" style="margin-right: 5px;"></i>
                    Dikumpulkan: ${formatDate(item.tanggal_kumpul)}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading pengumpulan:', error);
        showNotification('Gagal memuat pengumpulan: ' + error.message, 'error');
        container.innerHTML = '<p style="color: red; text-align: center; grid-column: 1 / -1; padding: 20px;">Gagal memuat data.</p>';
    }
}