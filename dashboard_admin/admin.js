// ======================== ADMIN DASHBOARD LOGIC ========================

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Cek Sesi
    currentUser = checkSession();
    if (!currentUser || currentUser.role !== 'admin') {
        window.location.href = '../index.html';
        return;
    }

    // 2. Load Navbar
    loadNavbar('navbar-container', 'Admin Panel');

    // 3. Tab Navigation Logic
    setupTabs();

    // 4. Initial Load (All Data)
    await Promise.all([
        fetchStats(),
        fetchUsers(),
        fetchConfig()
    ]);
});

function setupTabs() {
    const tabs = document.querySelectorAll('.sidebar-menu li');
    tabs.forEach(tab => {
        tab.addEventListener('click', async () => {
            const tabName = tab.getAttribute('data-tab');
            
            // UI Toggle
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`tab-${tabName}`).classList.add('active');

            // Data Load based on tab
            if (tabName === 'summary') await fetchStats();
            if (tabName === 'users') await fetchUsers();
            if (tabName === 'config') await fetchConfig();
        });
    });
}

// --- SUMMARY ---
async function fetchStats() {
    try {
        const data = await getDashboard(currentUser.id, 'admin');
        if (data) {
            document.getElementById('totalUsers').innerText = data.totalUsers || 0;
            document.getElementById('totalSiswa').innerText = data.totalSiswa || 0;
            document.getElementById('totalTugas').innerText = data.totalTugas || 0;
        }
    } catch (error) {
        showNotification('Gagal memuat statistik', 'error');
    }
}

// --- USER MANAGEMENT ---
async function fetchUsers() {
    const tableBody = document.getElementById('userTableBody');
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Memuat data...</td></tr>';
    
    try {
        const users = await getUsers();
        tableBody.innerHTML = '';
        
        users.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.nama}</td>
                <td>${user.email}</td>
                <td><span class="badge ${user.role === 'admin' ? 'badge-danger' : (user.role === 'mentor' ? 'badge-warning' : 'badge-success')}">${user.role}</span></td>
                <td style="font-size: 0.85rem; color: #666;">${user.nama_sekolah || '-'}</td>
                <td>
                    <div class="action-btns">
                        <button class="btn btn-primary btn-sm" onclick="openUserModal(${JSON.stringify(user).replace(/"/g, '&quot;')})">Edit</button>
                        <button class="btn btn-sm" style="background: var(--error); color: white;" onclick="handleDeleteUser(${user.id})">Del</button>
                    </div>
                </td>
            `;
            tableBody.appendChild(tr);
        });
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: red;">Gagal memuat data</td></tr>';
    }
}

async function openUserModal(user = null) {
    const { value: formValues } = await Swal.fire({
        title: user ? 'Edit Pengguna' : 'Tambah Pengguna Baru',
        html:
            `<div class="swal-form">
                <input id="swal-nama" class="swal2-input" placeholder="Nama Lengkap" value="${user ? user.nama : ''}">
                <input id="swal-email" class="swal2-input" placeholder="Email" value="${user ? user.email : ''}">
                <input id="swal-pass" class="swal2-input" type="password" placeholder="Password" value="${user ? user.password : ''}">
                <select id="swal-role" class="swal2-input">
                    <option value="siswa" ${user?.role === 'siswa' ? 'selected' : ''}>Siswa</option>
                    <option value="mentor" ${user?.role === 'mentor' ? 'selected' : ''}>Mentor</option>
                    <option value="admin" ${user?.role === 'admin' ? 'selected' : ''}>Admin</option>
                </select>
            </div>`,
        focusConfirm: false,
        showCancelButton: true,
        preConfirm: () => {
            const role = document.getElementById('swal-role').value;
            return {
                id: user ? user.id : null,
                nama: document.getElementById('swal-nama').value,
                email: document.getElementById('swal-email').value,
                password: document.getElementById('swal-pass').value,
                role: role
            }
        }
    });

    if (formValues) {
        try {
            if (user) {
                await updateUser(formValues);
                showNotification('User diperbarui', 'success');
            } else {
                await addUser(formValues);
                showNotification('User ditambahkan', 'success');
            }
            fetchUsers();
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    }
}

async function handleDeleteUser(id) {
    const result = await Swal.fire({
        title: 'Hapus User?',
        text: "Data yang dihapus tidak bisa dikembalikan!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Ya, Hapus!'
    });

    if (result.isConfirmed) {
        try {
            await deleteUser(id);
            showNotification('User dihapus', 'success');
            fetchUsers();
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    }
}

// --- GPS CONFIG ---
async function fetchConfig() {
    try {
        const config = await getConfig();
        document.getElementById('configLat').value = config.latitude || '';
        document.getElementById('configLng').value = config.longitude || '';
        document.getElementById('configRadius').value = config.radius || '';
    } catch (error) {
        showNotification('Gagal memuat konfigurasi', 'error');
    }
}

document.getElementById('configForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('saveConfigBtn');
    
    const configData = {
        latitude: parseFloat(document.getElementById('configLat').value),
        longitude: parseFloat(document.getElementById('configLng').value),
        radius: parseInt(document.getElementById('configRadius').value)
    };

    btn.disabled = true;
    btn.innerHTML = '⏳ Menyimpan...';

    try {
        await updateConfig(configData);
        Swal.fire('Berhasil', 'Konfigurasi GPS telah diperbarui.', 'success');
    } catch (error) {
        Swal.fire('Gagal', error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '💾 Simpan Pengaturan';
    }
});
