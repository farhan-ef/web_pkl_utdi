// ======================== CORE API FUNCTIONS ========================

/**
 * Fungsi utama untuk fetch POST ke backend Google Apps Script
 */
async function callAPI(action, data = {}) {
    try {
        const response = await fetch(CONFIG.API_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8' // Menggunakan text/plain untuk bypass CORS preflight di GAS
            },
            body: JSON.stringify({ action, ...data })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.status === 'success') {
            return result.data;
        } else {
            throw new Error(result.message || 'Terjadi kesalahan pada server');
        }
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// 1. Auth
async function login(email, password) {
    if (!email || !password) throw new Error('Email dan password wajib diisi');
    const result = await callAPI('login', { email, password });
    if (result) {
        localStorage.setItem('user', JSON.stringify(result));
    }
    return result;
}

// 2. Dashboard Stats
async function getDashboard(userId, role) {
    return await callAPI('getDashboard', { userId, role });
}

// 3. Siswa: Absensi & Jurnal
async function absen(siswa_id, latitude, longitude, status = 'hadir', bukti = "") {
    return await callAPI('absen', { siswa_id, latitude, longitude, status, bukti });
}

async function getJurnal(siswa_id, nama_siswa) {
    return await callAPI('getJurnal', { siswa_id, nama_siswa });
}

async function addJurnal(siswa_id, nama_siswa, kegiatan, catatan = "") {
    return await callAPI('addJurnal', { siswa_id, nama_siswa, kegiatan, catatan });
}

// 4. Tugas (Shared)
async function getTugas(params) {
    return await callAPI('getTugas', params);
}

async function createTugas(mentor_id, judul, deskripsi, deadline, target_siswa = "all") {
    return await callAPI('createTugas', { mentor_id, judul, deskripsi, deadline, target_siswa });
}

async function submitTugas(tugas_id, nama_siswa, link_drive) {
    return await callAPI('submitTugas', { tugas_id, nama_siswa, link_drive });
}

async function getPengumpulan(params) {
    return await callAPI('getPengumpulan', params);
}

// 5. Admin: User Management
async function getUsers() {
    return await callAPI('getUsers');
}

async function addUser(userData) {
    return await callAPI('addUser', userData);
}

async function updateUser(userData) {
    return await callAPI('updateUser', userData);
}

async function deleteUser(id) {
    return await callAPI('deleteUser', { id });
}

// 6. Admin: Config/GPS
async function getConfig() {
    return await callAPI('getConfig');
}

async function updateConfig(configData) {
    return await callAPI('updateConfig', configData);
}
