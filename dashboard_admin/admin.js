let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cek Session
    currentUser = checkSession();
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = '../index.html';
        return;
    }

    // 2. Setup Sidebar Khusus Admin
    setupAdminSidebar();

    // 3. Load Data Awal
    document.getElementById('adminName').innerText = currentUser.nama || 'Admin';
    await loadDashboardStats();
    
    // Load GPS Data initially
    loadGPSData();
});

// ==================== SIDEBAR ADMIN ====================
function setupAdminSidebar() {
    const container = document.getElementById('sidebar-container');
    const userName = currentUser ? currentUser.nama : 'Admin';

    container.innerHTML = `
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-user">
                <div class="user-avatar">${userName.charAt(0).toUpperCase()}</div>
                <div class="user-info">
                    <div class="user-name">${userName}</div>
                    <div class="user-role">Administrator</div>
                </div>
            </div>
            <nav class="sidebar-nav">
                <ul class="sidebar-menu">
                    <li class="active" onclick="switchSection('ringkasan', this)">
                        <a href="#"><i class="fas fa-chart-line"></i> <span>Ringkasan</span></a>
                    </li>
                    <li onclick="switchSection('user', this)">
                        <a href="#"><i class="fas fa-users"></i> <span>Kelola User</span></a>
                    </li>
                    <li onclick="switchSection('gps', this)">
                        <a href="#"><i class="fas fa-map-marker-alt"></i> <span>Setting GPS</span></a>
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

// Fungsi Navigasi Tab
function switchSection(sectionId, element) {
    // Hide all sections
    document.getElementById('section-ringkasan').style.display = 'none';
    document.getElementById('section-user').style.display = 'none';
    document.getElementById('section-gps').style.display = 'none';

    // Show selected
    document.getElementById('section-' + sectionId).style.display = 'block';

    // Update Sidebar Active State
    const menuItems = document.querySelectorAll('.sidebar-menu li');
    menuItems.forEach(item => item.classList.remove('active'));
    element.classList.add('active');

    // Load data based on section
    if (sectionId === 'user') {
        loadUserManagement();
    } else if (sectionId === 'gps') {
        loadGPSData();
    }

    // Close sidebar on mobile after click
    if (window.innerWidth <= 768) {
        closeSidebar();
    }
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

// ==================== FITUR RINGKASAN ====================
async function loadDashboardStats() {
    try {
        const stats = await getDashboard(currentUser.nama, 'admin');
        
        document.getElementById('statUsers').innerText = stats.totalUsers || 0;
        document.getElementById('statSiswa').innerText = stats.totalSiswa || 0;
        
        const users = await getUsers();
        const mentorCount = users.filter(u => String(u.role).toLowerCase() === 'mentor').length;
        document.getElementById('statMentor').innerText = mentorCount;

    } catch (error) {
        console.error("Gagal load stats:", error);
    }
}

// ==================== FITUR KELOLA USER ====================
async function loadUserManagement() {
    const container = document.getElementById('userTableContainer');
    container.innerHTML = '<p style="text-align:center;">Memuat data...</p>';

    try {
        const users = await getUsers();
        
        if (!users || users.length === 0) {
            container.innerHTML = '<p style="text-align:center;">Tidak ada data user.</p>';
            return;
        }

        let html = `
            <div style="overflow-x: auto;">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Nama</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        users.forEach(u => {
            html += `
                <tr>
                    <td>${u.id}</td>
                    <td>${u.nama}</td>
                    <td>${u.email}</td>
                    <td><span class="badge badge-success">${u.role}</span></td>
                    <td>
                        <button onclick="deleteUserConfirm(${u.id}, '${u.nama}')" class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem;">
                            <i class="fas fa-trash" style="color: var(--error);"></i>
                        </button>
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table></div>';
        container.innerHTML = html;

    } catch (error) {
        container.innerHTML = '<p style="color: red; text-align: center;">Gagal memuat user.</p>';
    }
}

function showAddUserModal() {
    Swal.fire({
        title: 'Tambah User Baru',
        html: `
            <div style="text-align: left;">
                <div class="form-group"><label>Nama</label><input id="swal-nama" class="swal2-input"></div>
                <div class="form-group"><label>Email</label><input id="swal-email" class="swal2-input"></div>
                <div class="form-group"><label>Password</label><input id="swal-pass" class="swal2-input" type="password"></div>
                <div class="form-group">
                    <label>Role</label>
                    <select id="swal-role" class="swal2-input">
                        <option value="siswa">Siswa</option>
                        <option value="mentor">Mentor/Guru</option>
                        <option value="admin">Admin</option>
                        <option value="dudi">DUDI</option>
                    </select>
                </div>
                <div id="siswa-fields" style="display:none;">
                     <div class="form-group"><label>Nama Sekolah</label><input id="swal-sekolah" class="swal2-input"></div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Simpan',
        preConfirm: () => {
            return {
                nama: document.getElementById('swal-nama').value,
                email: document.getElementById('swal-email').value,
                password: document.getElementById('swal-pass').value,
                role: document.getElementById('swal-role').value,
                nama_sekolah: document.getElementById('swal-sekolah').value
            }
        }
    }).then(async (result) => {
        if (result.isConfirmed) {
            const data = result.value;
            if(!data.nama || !data.email || !data.password) {
                Swal.fire('Error', 'Data tidak lengkap', 'error');
                return;
            }
            try {
                Swal.showLoading();
                await addUser(data);
                Swal.fire('Berhasil', 'User ditambahkan', 'success');
                loadUserManagement();
                loadDashboardStats();
            } catch(e) {
                Swal.fire('Gagal', e.message, 'error');
            }
        }
    });

    document.getElementById('swal-role').addEventListener('change', (e) => {
        document.getElementById('siswa-fields').style.display = e.target.value === 'siswa' ? 'block' : 'none';
    });
}

async function deleteUserConfirm(id, nama) {
    const result = await Swal.fire({
        title: 'Hapus User?',
        text: `Yakin ingin menghapus user ${nama}?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus'
    });

    if (result.isConfirmed) {
        try {
            await deleteUser(id);
            Swal.fire('Terhapus!', 'User telah dihapus.', 'success');
            loadUserManagement();
            loadDashboardStats();
        } catch(e) {
            Swal.fire('Gagal', e.message, 'error');
        }
    }
}

// ==================== FITUR SETTING GPS ====================
async function loadGPSData() {
    try {
        const config = await getConfig();
        if(config) {
            document.getElementById('gpsLat').value = config.latitude || '';
            document.getElementById('gpsLng').value = config.longitude || '';
            document.getElementById('gpsRadius').value = config.radius || '';
        }
    } catch (error) {
        console.error("Gagal load GPS config", error);
    }
}

// FIX: Handle form submit dengan benar
document.addEventListener('DOMContentLoaded', () => {
    const gpsForm = document.getElementById('gpsForm');
    if (gpsForm) {
        gpsForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const lat = document.getElementById('gpsLat').value;
            const lng = document.getElementById('gpsLng').value;
            const radius = document.getElementById('gpsRadius').value;

            if (!lat || !lng || !radius) {
                Swal.fire('Error', 'Semua field wajib diisi', 'error');
                return;
            }

            try {
                Swal.fire({
                    title: 'Menyimpan...',
                    didOpen: () => Swal.showLoading(),
                    allowOutsideClick: false
                });
                
                await updateConfig({ 
                    latitude: parseFloat(lat), 
                    longitude: parseFloat(lng), 
                    radius: parseInt(radius) 
                });
                
                Swal.fire('Berhasil', 'Lokasi berhasil diupdate', 'success');
            } catch (error) {
                Swal.fire('Gagal', error.message, 'error');
            }
        });
    }
});