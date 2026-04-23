// ======================== UTILITY FUNCTIONS ========================

/**
 * Tampilkan pesan notifikasi
 * @param {string} message - Pesan yang ingin ditampilkan
 * @param {string} type - 'error', 'success', 'loading'
 */
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

    // Auto-remove after 3 seconds unless it's loading
    if (type !== 'loading') {
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(20px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    return notification;
}

// Function alias for compatibility with requested spec
function showMessage(element, message, type) {
    showNotification(message, type);
}

// Format tanggal Indonesia (DD MMMM YYYY)
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// Cek apakah user login
function isLoggedIn() {
    try {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    } catch (e) {
        console.error("Session Corrupted:", e);
        localStorage.removeItem('user');
        return null;
    }
}

// Redirect ke dashboard sesuai role
function redirectByRole(user) {
    if (!user) {
        window.location.href = (window.location.pathname.includes('dashboard_')) ? '../index.html' : './index.html';
        return;
    }
    
    const rolePaths = {
        'admin': 'dashboard_admin/index.html',
        'siswa': 'dashboard_siswa/index.html',
        'mentor': 'dashboard_mentor/index.html'
    };

    const role = (user.role || '').toLowerCase();
    const target = rolePaths[role] || 'index.html';
    
    // Adjust path based on current location
    const isInsideDashboard = window.location.pathname.includes('dashboard_');
    const prefix = isInsideDashboard ? '../' : './';
    
    window.location.href = prefix + target;
}

// Check session at start of dashboard pages
function checkSession() {
    const user = isLoggedIn();
    if (!user) {
        window.location.href = '../index.html';
        return null;
    }
    return user;
}

// Logout
function logout() {
    const performLogout = () => {
        localStorage.removeItem('user');
        // Gunakan path absolut dari root agar lebih aman
        window.location.href = window.location.origin + window.location.pathname.split('/').slice(0, -2).join('/') + '/index.html';
        
        // Fallback jika origin/pathname bermasalah (misal di file://)
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 100);
    };

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Keluar Aplikasi?',
            text: "Anda akan diarahkan kembali ke halaman login.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#764ba2',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Ya, Keluar',
            cancelButtonText: 'Batal'
        }).then((result) => {
            if (result.isConfirmed) {
                performLogout();
            }
        });
    } else {
        if (confirm('Yakin ingin keluar?')) {
            performLogout();
        }
    }
}
