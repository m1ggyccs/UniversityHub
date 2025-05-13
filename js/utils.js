// Utility function to set page titles consistently
const setPageTitle = (pageTitle) => {
    document.title = `${pageTitle} | UniversityHub`;
};

// Export the utility function
window.setPageTitle = setPageTitle;

// Navigate within the SPA
function navigateTo(page) {
    // If we're in the iframe
    if (window !== window.top) {
        window.top.location.href = '/index.html#' + page;
    } else {
        // If we're the top window, update the iframe src
        const contentFrame = document.getElementById('content-frame');
        if (contentFrame) {
            contentFrame.src = page + '.html';
            // Update URL hash for history
            window.location.hash = page;
        } else {
            // If no iframe found, we're probably on login/register page
            window.location.href = '/index.html#' + page;
        }
    }
}

// Redirect to login page
function redirectToLogin() {
    // Always do a full redirect for login
    window.top.location.href = '/login.html';
}

// Redirect to dashboard
function redirectToDashboard() {
    navigateTo('dashboard');
}

// Handle logout
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    redirectToLogin();
}

// Export functions
window.navigateTo = navigateTo;
window.redirectToLogin = redirectToLogin;
window.redirectToDashboard = redirectToDashboard;
window.logout = logout; 