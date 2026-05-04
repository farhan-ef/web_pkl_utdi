function loadSidebar(containerId, activePage = 'dashboard') {
    const container = document.getElementById(containerId);
    if (!container) return;

    const currentUser = JSON.parse(localStorage.getItem('userSession'));
    const userName = currentUser ? currentUser.nama : 'Siswa';

    container.innerHTML = `
        <aside class="sidebar" id="sidebar">
            <div class="sidebar-user">
                <div class="user-avatar">${userName.charAt(0).toUpperCase()}</div>
                <div class="user-info">
                    <div class="user-name">${userName}</div>
                    <div class="user-role">Siswa PKL</div>
                </div>
            </div>
            <nav class="sidebar-nav">
                <ul class="sidebar-menu">
                    <li class="${activePage === 'dashboard' ? 'active' : ''}">
                        <a href="index.html">
                            <i class="fas fa-home"></i>
                            <span>Dashboard</span>
                        </a>
                    </li>
                    <li class="${activePage === 'absensi' ? 'active' : ''}">
                        <a href="absensi.html">
                            <i class="fas fa-fingerprint"></i>
                            <span>Absensi</span>
                        </a>
                    </li>
                    <li class="${activePage === 'jurnal' ? 'active' : ''}">
                        <a href="jurnal.html">
                            <i class="fas fa-book"></i>
                            <span>Jurnal Harian</span>
                        </a>
                    </li>
                    <li class="${activePage === 'tugas' ? 'active' : ''}">
                        <a href="tugas.html">
                            <i class="fas fa-tasks"></i>
                            <span>Tugas</span>
                        </a>
                    </li>
                </ul>
            </nav>
            <div class="sidebar-footer">
                <button onclick="logout()" class="btn-logout">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Keluar</span>
                </button>
            </div>
        </aside>
        <div class="sidebar-overlay" onclick="closeSidebar()"></div>
    `;
}

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

function logout() {
    Swal.fire({
        title: 'Keluar dari sistem?',
        text: 'Anda akan logout dari akun ini.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: 'var(--accent)',
        cancelButtonColor: 'var(--text-muted)',
        confirmButtonText: 'Ya, Keluar',
        cancelButtonText: 'Batal',
        reverseButtons: true
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('userSession');
            sessionStorage.clear();
            sessionStorage.setItem('justLoggedOut', 'true');
            window.location.replace('../index.html');
        }
    });
}