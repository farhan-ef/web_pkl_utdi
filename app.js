// ==================== API CALL FUNCTION ====================
async function callAPI(action, params = {}) {
    try {
        const requestBody = { action, ...params };
        
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: { 
                'Content-Type': 'text/plain;charset=utf-8' 
            },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        
        if (result.status === 'success') {
            return result;
        } else {
            throw new Error(result.message || 'Terjadi kesalahan');
        }
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ==================== LOGIN FUNCTION ====================
async function login(email, password) {
    if (!email || !password) {
        throw new Error('Email dan password wajib diisi');
    }
    
    const response = await callAPI('login', { email, password });
    const user = response.data;
    
    if (user) {
        localStorage.setItem('userSession', JSON.stringify(user));
    }
    
    return user;
}

// ==================== CHECK SESSION ====================
function isLoggedIn() {
    try {
        const session = localStorage.getItem('userSession');
        if (!session) return null;
        
        const user = JSON.parse(session);
        
        const validRoles = ['siswa', 'admin', 'dudi', 'mentor'];
        if (!user.role || !validRoles.includes(String(user.role).toLowerCase().trim())) {
            return null;
        }
        
        return user;
    } catch (e) {
        localStorage.removeItem('userSession');
        return null;
    }
}

// ==================== REDIRECT BY ROLE ====================
function redirectByRole(user) {
    if (!user || !user.role) {
        window.location.replace('index.html');
        return;
    }
    
    const role = String(user.role).toLowerCase().trim();
    
    const rolePaths = {
        'siswa': 'dashboard_siswa/index.html',
        'admin': 'dashboard_admin/index.html',
        'dudi': 'dashboard_dudi/index.html',
        'mentor': 'dashboard_mentor/index.html'
    };

    const target = rolePaths[role];
    
    if (target) {
        window.location.replace(target);
    } else {
        alert('Role tidak dikenali: ' + role);
    }
}

// ==================== LOGOUT FUNCTION ====================
function logout() {
    localStorage.removeItem('userSession');
    sessionStorage.setItem('justLoggedOut', 'true');
    window.location.replace('index.html');
}

// ==================== NOTIFICATION FUNCTION ====================
function showNotification(message, type = 'success') {
    let container = document.getElementById('notification-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    let icon = '✅';
    if (type === 'error') icon = '❌';
    if (type === 'loading') icon = '⏳';

    notification.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
    container.appendChild(notification);

    if (type !== 'loading') {
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    return notification;
}

// ==================== DASHBOARD FUNCTIONS ====================
async function getDashboard(userId, role) {
    const response = await callAPI('getDashboard', { userId, role });
    return response.data;
}

// ==================== ABSENSI FUNCTIONS ====================
async function absen(siswa_id, latitude, longitude, status = 'hadir', bukti = "") {
    const response = await callAPI('absen', { siswa_id, latitude, longitude, status, bukti });
    return response.data;
}

// ==================== JURNAL FUNCTIONS ====================
async function getJurnal(siswa_id, nama_siswa) {
    const response = await callAPI('getJurnal', { siswa_id, nama_siswa });
    return response.data;
}

async function addJurnal(siswa_id, nama_siswa, kegiatan, catatan = "") {
    const response = await callAPI('addJurnal', { siswa_id, nama_siswa, kegiatan, catatan });
    return response.data;
}

async function updateJurnal(jurnalId, kegiatan) {
    const response = await callAPI('updateJurnal', { jurnalId, kegiatan });
    return response.data;
}

// ==================== TUGAS FUNCTIONS ====================
async function getTugas(params) {
    const response = await callAPI('getTugas', params);
    return response.data;
}

async function submitTugas(tugas_id, nama_siswa, link_drive) {
    const response = await callAPI('submitTugas', { tugas_id, nama_siswa, link_drive });
    return response.data;
}

// ==================== RIWAYAT ABSENSI ====================
async function getRiwayatAbsensi(siswa_id, nama_siswa) {
    const response = await callAPI('getRiwayatAbsensi', { siswa_id, nama_siswa });
    return response.data;
}

// ==================== PROFIL FUNCTIONS ====================
async function getUserProfile(userId) {
    const response = await callAPI('getUserProfile', { userId });
    return response.data;
}

async function updateProfile(userId, data) {
    const response = await callAPI('updateProfile', { userId, ...data });
    return response.data;
}

// ==================== ADMIN: USER MANAGEMENT ====================
async function getUsers() {
    const response = await callAPI('getUsers');
    return response.data;
}

async function addUser(userData) {
    const response = await callAPI('addUser', userData);
    return response.data;
}

async function updateUser(userData) {
    const response = await callAPI('updateUser', userData);
    return response.data;
}

async function deleteUser(id) {
    const response = await callAPI('deleteUser', { id });
    return response.data;
}

// ==================== ADMIN: CONFIG/GPS ====================
// FIX: Fungsi ini yang tadi hilang!
async function getConfig() {
    const response = await callAPI('getConfig');
    return response.data;
}

async function updateConfig(configData) {
    const response = await callAPI('updateConfig', configData);
    return response.data;
}