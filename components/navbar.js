// ======================== NAVBAR COMPONENT ========================

/**
 * Membuat string HTML untuk navbar
 * @param {string} title - Judul halaman dashboard
 * @returns {string}
 */
function createNavbar(title) {
    const user = isLoggedIn() || { nama: 'User' };
    
    return `
        <nav class="navbar">
            <div class="nav-brand">
                <img src="${(window.location.pathname.includes('dashboard_')) ? '../assets/img/logo.png' : 'assets/img/logo.png'}" alt="Logo">
                <span>${CONFIG.APP_NAME}</span>
            </div>
            <div class="nav-user">
                <span>${title} | <strong>${user.nama}</strong></span>
                <button onclick="logout()" class="logout-btn">Keluar</button>
            </div>
        </nav>
    `;
}

/**
 * Inject navbar ke dalam elemen
 * @param {string} elementId - ID element target (biasanya 'navbar-container')
 * @param {string} title - Judul dashboard
 */
function loadNavbar(elementId, title) {
    const container = document.getElementById(elementId);
    if (container) {
        container.innerHTML = createNavbar(title);
    }
}