// ======================== UTILITY FUNCTIONS ========================

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
            notification.style.transform = 'translateX(20px)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    return notification;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

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
        console.error("Session Corrupted:", e);
        localStorage.removeItem('userSession');
        return null;
    }
}

function redirectByRole(user) {
    if (!user || !user.role) {
        const target = window.location.pathname.includes('dashboard_') ? '../index.html' : 'index.html';
        window.location.replace(target);
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
    
    if (!target) {
        console.error('Role tidak dikenali:', role);
        showNotification('Role user tidak valid', 'error');
        return;
    }
    
    const isInsideDashboard = window.location.pathname.includes('dashboard_');
    const prefix = isInsideDashboard ? '../' : '';
    
    console.log(`Redirecting ${role} to ${prefix}${target}`);
    window.location.replace(prefix + target);
}

function checkSession() {
    const user = isLoggedIn();
    if (!user) {
        window.location.replace('../index.html');
        return null;
    }
    return user;
}

function logout() {
    const performLogout = () => {
        localStorage.removeItem('userSession');
        sessionStorage.setItem('justLoggedOut', 'true');
        window.location.replace('../index.html');
    };

    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Keluar Aplikasi?',
            text: "Anda akan diarahkan kembali ke halaman login.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: 'var(--accent)',
            cancelButtonColor: 'var(--text-muted)',
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