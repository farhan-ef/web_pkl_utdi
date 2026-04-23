let currentUser = null;
document.addEventListener('DOMContentLoaded', async () => {
    currentUser = checkSession();
    if (!currentUser || currentUser.role !== 'mentor') {
        window.location.href = '../index.html';
        return;
    }
    loadNavbar('navbar-container', 'Dashboard Mentor');
    
    // Set minimal tanggal deadline adalah hari ini (mencegah human error)
    const deadlineInput = document.getElementById('deadlineTugas');
    if (deadlineInput) {
        deadlineInput.min = new Date().toISOString().split('T')[0];
    }
    
    document.getElementById('tugasForm').addEventListener('submit', handleCreateTugas);
    document.getElementById('selectTugas').addEventListener('change', (e) => {
        if (e.target.value) loadPengumpulan(e.target.value);
    });
    await Promise.all([loadMentorTugas(), loadTugasDropdown(), loadSiswaList()]);
});

async function loadMentorTugas() {
    const container = document.getElementById('mentorTugasList');
    try {
        const data = await getTugas({ mentor_id: currentUser.id });
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-style: italic;">Anda belum membuat tugas.</p>';
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
                        </tr>
                    </thead>
                    <tbody>
                        ${data.map(tugas => {
                            const today = new Date();
                            today.setHours(0,0,0,0);
                            const deadlineDate = tugas.deadline ? new Date(tugas.deadline) : null;
                            if (deadlineDate) deadlineDate.setHours(0,0,0,0);
                            
                            const isExpired = deadlineDate && today > deadlineDate;
                            const statusLabel = isExpired ? 'Non-Aktif' : 'Aktif';
                            const statusClass = isExpired ? 'badge-danger' : 'badge-success';
                            
                            return `
                                <tr>
                                    <td>
                                        <div style="font-weight: 600; color: var(--primary);">${tugas.judul}</div>
                                        <div style="font-size: 0.75rem; color: var(--text-muted);">${tugas.deskripsi.substring(0, 40)}${tugas.deskripsi.length > 40 ? '...' : ''}</div>
                                    </td>
                                    <td style="font-size: 0.85rem; white-space: nowrap;">${formatDate(tugas.deadline) || '-'}</td>
                                    <td style="text-align: center;">
                                        <span class="badge ${statusClass}">${statusLabel}</span>
                                    </td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    } catch (error) {
        container.innerHTML = '<p style="color: red;">Gagal memuat tugas.</p>';
    }
}

async function loadTugasDropdown() {
    const select = document.getElementById('selectTugas');
    try {
        const data = await getTugas({ mentor_id: currentUser.id });
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
        const users = await getUsers();
        const students = users.filter(u => u.role.toLowerCase() === 'siswa');
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
        await createTugas(currentUser.id, judul, deskripsi, deadline, targetSiswa);
        showNotification('Tugas berhasil dibuat!', 'success');
        document.getElementById('tugasForm').reset();
        await Promise.all([loadMentorTugas(), loadTugasDropdown()]);
    } catch (error) {
        showNotification('Gagal membuat tugas: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '➕ Buat Tugas';
    }
}

async function loadPengumpulan(tugasId) {
    const container = document.getElementById('pengumpulanList');
    container.innerHTML = '<p style="text-align: center; color: var(--text-muted); grid-column: 1 / -1;">Memuat data pengumpulan...</p>';
    try {
        const data = await getPengumpulan({ tugas_id: tugasId });
        if (!data || data.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-muted); grid-column: 1 / -1; font-style: italic;">Belum ada siswa yang mengumpulkan.</p>';
            return;
        }
        container.innerHTML = data.map(item => `
            <div class="card" style="padding: 1rem; border: 1px solid #eee;">
                <div style="font-weight: 700; margin-bottom: 5px;"><i class="fas fa-user"></i> ${item.siswa_id}</div>
                <div style="font-size: 0.85rem; margin-bottom: 10px;">
                    <a href="${item.link_drive}" target="_blank" style="color: blue; text-decoration: underline;">Buka Link Tugas 🔗</a>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">
                    Dikumpulkan: ${formatDate(item.tanggal_kumpul)}
                </div>
                <div style="margin-top: 10px;">
                    <span class="badge ${item.status === 'Tepat Waktu' ? 'badge-success' : 'badge-danger'}">
                        ${item.status}
                    </span>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showNotification('Gagal memuat pengumpulan: ' + error.message, 'error');
        container.innerHTML = '<p style="color: red; grid-column: 1 / -1;">Gagal memuat data.</p>';
    }
}
