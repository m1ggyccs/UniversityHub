// Tab switching logic
const tabButtons = document.querySelectorAll('.tab-btn');
tabButtons.forEach(btn => {
    btn.addEventListener('click', function() {
        tabButtons.forEach(b => b.classList.remove('bg-indigo-600', 'text-white'));
        this.classList.add('bg-indigo-600', 'text-white');
        document.querySelectorAll('[id^="tab-"]').forEach(tab => tab.classList.add('hidden'));
        document.getElementById('tab-' + this.dataset.tab).classList.remove('hidden');
        // Load data for the selected tab
        if (this.dataset.tab === 'events') loadEvents();
        if (this.dataset.tab === 'departments') loadDepartments();
        if (this.dataset.tab === 'organizations') loadOrganizations();
        if (this.dataset.tab === 'users') loadUsers();
    });
});

// Add this at the top of the file, after the tab switching logic
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg text-white ${
        type === 'success' ? 'bg-green-500' : 'bg-red-500'
    }`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

// --- EVENTS LOGIC ---
async function loadEvents() {
    const res = await fetch('/api/events');
    const events = await res.json();
    const tbody = document.getElementById('events-tbody');
    tbody.innerHTML = '';
    events.forEach(event => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-2">${event.title}</td>
            <td class="px-4 py-2">${new Date(event.date).toLocaleDateString()}</td>
            <td class="px-4 py-2">${event.category}</td>
            <td class="px-4 py-2">${event.status || 'upcoming'}</td>
            <td class="px-4 py-2 space-x-2">
                <button class="btn btn-xs btn-primary edit-btn" data-id="${event._id}"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-xs btn-danger delete-btn" data-id="${event._id}"><i class="fas fa-trash"></i> Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    attachEventActions();
}
function attachEventActions() {
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            const res = await fetch(`/api/events/${id}`);
            const event = await res.json();
            document.getElementById('edit-event-id').value = event._id;
            document.getElementById('edit-title').value = event.title;
            document.getElementById('edit-date').value = event.date ? event.date.split('T')[0] : '';
            document.getElementById('edit-status').value = event.status || 'upcoming';
            document.getElementById('edit-description').value = event.description;
            document.getElementById('edit-modal').classList.remove('hidden');
        });
    });
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            if (!confirm('Are you sure you want to delete this event?')) return;
            const id = this.getAttribute('data-id');
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/events/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                loadEvents();
            } else {
                alert('Failed to delete event.');
            }
        });
    });
}
document.getElementById('close-edit-modal').onclick = function() {
    document.getElementById('edit-modal').classList.add('hidden');
};
document.getElementById('edit-event-form').onsubmit = async function(e) {
    e.preventDefault();
    const id = document.getElementById('edit-event-id').value;
    const token = localStorage.getItem('token');
    const data = {
        title: document.getElementById('edit-title').value,
        date: document.getElementById('edit-date').value,
        status: document.getElementById('edit-status').value,
        description: document.getElementById('edit-description').value
    };
    const res = await fetch(`/api/events/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (res.ok) {
        document.getElementById('edit-modal').classList.add('hidden');
        loadEvents();
    } else {
        alert('Failed to update event.');
    }
};

// --- DEPARTMENTS LOGIC ---
async function loadDepartments() {
    try {
        const res = await fetch('/api/departments');
        if (!res.ok) throw new Error(`Failed to fetch departments: ${res.status}`);
        const departments = await res.json();
        
        const tbody = document.getElementById('departments-tbody');
        tbody.innerHTML = departments.map(dep => `
            <tr>
                <td class="px-4 py-2">${dep.name}</td>
                <td class="px-4 py-2">${dep.description || ''}</td>
                <td class="px-4 py-2 space-x-2">
                    <button class="btn btn-xs btn-primary edit-department-btn" data-id="${dep._id}">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-xs btn-danger delete-department-btn" data-id="${dep._id}">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </td>
            </tr>
        `).join('');
        
        attachDepartmentActions();
    } catch (error) {
        console.error('Error loading departments:', error);
        showNotification('Failed to load departments', 'error');
    }
}

function attachDepartmentActions() {
    document.querySelectorAll('.edit-department-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            try {
                const id = this.getAttribute('data-id');
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/departments/${id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!res.ok) throw new Error(`Failed to fetch department: ${res.status}`);
                const dep = await res.json();
                
                document.getElementById('department-id').value = dep._id;
                document.getElementById('department-name').value = dep.name;
                document.getElementById('department-description').value = dep.description || '';
                if (dep.logo) {
                    document.getElementById('department-logo-preview').src = dep.logo;
                    document.getElementById('department-logo-preview').classList.remove('hidden');
                    document.getElementById('department-logo-dropzone-content').classList.add('hidden');
                }
                document.getElementById('department-modal-title').textContent = 'Edit Department';
                document.getElementById('department-modal').classList.remove('hidden');
            } catch (error) {
                console.error('Error fetching department:', error);
                showNotification('Failed to fetch department details', 'error');
            }
        });
    });

    document.querySelectorAll('.delete-department-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            if (!confirm('Are you sure you want to delete this department?')) return;
            
            try {
                const id = this.getAttribute('data-id');
                const token = localStorage.getItem('token');
                const res = await fetch(`/api/departments/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (!res.ok) throw new Error(`Failed to delete department: ${res.status}`);
                
                await loadDepartments();
                showNotification('Department deleted successfully');
            } catch (error) {
                console.error('Error deleting department:', error);
                showNotification('Failed to delete department', 'error');
            }
        });
    });
}

document.getElementById('add-department-btn').onclick = function() {
    document.getElementById('department-id').value = '';
    document.getElementById('department-name').value = '';
    document.getElementById('department-description').value = '';
    document.getElementById('department-modal-title').textContent = 'Add Department';
    document.getElementById('department-modal').classList.remove('hidden');
};
document.getElementById('close-department-modal').onclick = function() {
    document.getElementById('department-modal').classList.add('hidden');
};
document.getElementById('department-form').onsubmit = async function(e) {
    e.preventDefault();
    
    const id = document.getElementById('department-id').value;
    const name = document.getElementById('department-name').value;
    const description = document.getElementById('department-description').value;
    const token = localStorage.getItem('token');
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/departments/${id}` : '/api/departments';

    try {
        let data = { name, description };
        
        // Handle logo upload if present
        if (depFileInput.files && depFileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = async function(e) {
                data.logo = e.target.result;
                await submitDepartment(data);
            };
            reader.readAsDataURL(depFileInput.files[0]);
            return;
        }
        
        await submitDepartment(data);
    } catch (error) {
        console.error('Error saving department:', error);
        showNotification('Failed to save department', 'error');
    }

    async function submitDepartment(data) {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.message || 'Failed to save department');
        }

        document.getElementById('department-modal').classList.add('hidden');
        await loadDepartments();
        showNotification('Department saved successfully');
    }
};

// --- ORGANIZATIONS LOGIC ---
async function loadOrganizations() {
    const res = await fetch('/api/events/organizations/all');
    const orgs = await res.json();
    const tbody = document.getElementById('organizations-tbody');
    tbody.innerHTML = '';
    orgs.forEach(org => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="px-4 py-2">${org.name}</td>
            <td class="px-4 py-2">${org.description || ''}</td>
            <td class="px-4 py-2 space-x-2">
                <button class="btn btn-xs btn-primary edit-organization-btn" data-id="${org._id}"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn btn-xs btn-danger delete-organization-btn" data-id="${org._id}"><i class="fas fa-trash"></i> Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    attachOrganizationActions();
}
function attachOrganizationActions() {
    document.querySelectorAll('.edit-organization-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const id = this.getAttribute('data-id');
            const res = await fetch(`/api/events/organizations/all`);
            const orgs = await res.json();
            const org = orgs.find(o => o._id === id);
            document.getElementById('organization-id').value = org._id;
            document.getElementById('organization-name').value = org.name;
            document.getElementById('organization-description').value = org.description || '';
            document.getElementById('organization-modal-title').textContent = 'Edit Organization';
            document.getElementById('organization-modal').classList.remove('hidden');
        });
    });
    document.querySelectorAll('.delete-organization-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            if (!confirm('Are you sure you want to delete this organization?')) return;
            const id = this.getAttribute('data-id');
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/organizations/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                loadOrganizations();
            } else {
                alert('Failed to delete organization.');
            }
        });
    });
}
document.getElementById('add-organization-btn').onclick = function() {
    document.getElementById('organization-id').value = '';
    document.getElementById('organization-name').value = '';
    document.getElementById('organization-description').value = '';
    document.getElementById('organization-modal-title').textContent = 'Add Organization';
    document.getElementById('organization-modal').classList.remove('hidden');
};
document.getElementById('close-organization-modal').onclick = function() {
    document.getElementById('organization-modal').classList.add('hidden');
};
document.getElementById('organization-form').onsubmit = async function(e) {
    e.preventDefault();
    const id = document.getElementById('organization-id').value;
    const name = document.getElementById('organization-name').value;
    const description = document.getElementById('organization-description').value;
    const token = localStorage.getItem('token');
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/organizations/${id}` : '/api/organizations';
    let logo = '';
    if (orgFileInput.files && orgFileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = async function(e) {
            logo = e.target.result;
            await submitOrganization({ name, description, logo });
        };
        reader.readAsDataURL(orgFileInput.files[0]);
        return;
    }
    await submitOrganization({ name, description, logo });
    async function submitOrganization(data) {
        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });
        if (res.ok) {
            document.getElementById('organization-modal').classList.add('hidden');
            loadOrganizations();
        } else {
            alert('Failed to save organization.');
        }
    }
};

// --- LOGO UPLOAD LOGIC ---
// Department logo upload
const depDropzone = document.getElementById('department-logo-dropzone');
const depFileInput = document.getElementById('department-logo');
const depPreviewImg = document.getElementById('department-logo-preview');
const depDropzoneContent = document.getElementById('department-logo-dropzone-content');
depDropzone.addEventListener('click', () => depFileInput.click());
depDropzone.addEventListener('dragover', e => { e.preventDefault(); depDropzone.classList.add('border-indigo-400'); });
depDropzone.addEventListener('dragleave', e => { e.preventDefault(); depDropzone.classList.remove('border-indigo-400'); });
depDropzone.addEventListener('drop', e => {
    e.preventDefault(); depDropzone.classList.remove('border-indigo-400');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        depFileInput.files = e.dataTransfer.files;
        showDepLogoPreview(depFileInput.files[0]);
    }
});
depFileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) showDepLogoPreview(this.files[0]);
});
function showDepLogoPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        depPreviewImg.src = e.target.result;
        depPreviewImg.classList.remove('hidden');
        depDropzoneContent.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}
// Organization logo upload
const orgDropzone = document.getElementById('organization-logo-dropzone');
const orgFileInput = document.getElementById('organization-logo');
const orgPreviewImg = document.getElementById('organization-logo-preview');
const orgDropzoneContent = document.getElementById('organization-logo-dropzone-content');
orgDropzone.addEventListener('click', () => orgFileInput.click());
orgDropzone.addEventListener('dragover', e => { e.preventDefault(); orgDropzone.classList.add('border-indigo-400'); });
orgDropzone.addEventListener('dragleave', e => { e.preventDefault(); orgDropzone.classList.remove('border-indigo-400'); });
orgDropzone.addEventListener('drop', e => {
    e.preventDefault(); orgDropzone.classList.remove('border-indigo-400');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        orgFileInput.files = e.dataTransfer.files;
        showOrgLogoPreview(orgFileInput.files[0]);
    }
});
orgFileInput.addEventListener('change', function() {
    if (this.files && this.files[0]) showOrgLogoPreview(this.files[0]);
});
function showOrgLogoPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        orgPreviewImg.src = e.target.result;
        orgPreviewImg.classList.remove('hidden');
        orgDropzoneContent.classList.add('hidden');
    };
    reader.readAsDataURL(file);
}

// --- USER MANAGEMENT LOGIC ---
async function loadUsers() {
    try {
        const token = localStorage.getItem('token');
        const [usersRes, depRes, orgRes] = await Promise.all([
            fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch('/api/departments'),
            fetch('/api/organizations')
        ]);
        
        if (!usersRes.ok) {
            throw new Error(`Failed to fetch users: ${usersRes.status}`);
        }

        const [users, departments, organizations] = await Promise.all([
            usersRes.json(),
            depRes.json(),
            orgRes.json()
        ]);

        // Populate departments and organizations dropdowns
        const depSelect = document.getElementById('user-department');
        const orgSelect = document.getElementById('user-organization');
        
        depSelect.innerHTML = departments.map(dep => 
            `<option value="${dep._id}">${dep.name}</option>`
        ).join('');
        
        orgSelect.innerHTML = `<option value="">None</option>` + organizations.map(org => 
            `<option value="${org._id}">${org.name}</option>`
        ).join('');

        // Populate users table
        const tbody = document.getElementById('users-list');
        tbody.innerHTML = users.map(user => `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap">${user.username}</td>
                <td class="px-6 py-4 whitespace-nowrap">${user.fullName}</td>
                <td class="px-6 py-4 whitespace-nowrap">${user.email}</td>
                <td class="px-6 py-4 whitespace-nowrap">${formatRole(user.role)}</td>
                <td class="px-6 py-4 whitespace-nowrap">${departments.find(d => d._id === user.department)?.name || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap">${organizations.find(o => o._id === user.organization)?.name || 'N/A'}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <button class="text-indigo-600 hover:text-indigo-900 mr-3 edit-user-btn" data-id="${user._id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="text-red-600 hover:text-red-900 delete-user-btn" data-id="${user._id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        // Attach event handlers to the new buttons
        document.querySelectorAll('.edit-user-btn').forEach(btn => {
            btn.addEventListener('click', () => editUser(btn.dataset.id));
        });

        document.querySelectorAll('.delete-user-btn').forEach(btn => {
            btn.addEventListener('click', () => deleteUser(btn.dataset.id));
        });
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error loading users', 'error');
    }
}

function formatRole(role) {
    return role.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

async function editUser(userId) {
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) throw new Error(`Failed to fetch user: ${res.status}`);
        
        const user = await res.json();
        
        // Populate modal fields
        document.getElementById('user-id').value = user._id;
        document.getElementById('user-username').value = user.username;
        document.getElementById('user-fullname').value = user.fullName;
        document.getElementById('user-email').value = user.email;
        document.getElementById('user-role').value = user.role;
        document.getElementById('user-department').value = user.department || '';
        document.getElementById('user-organization').value = user.organization || '';
        
        // Show modal
        document.getElementById('user-modal').classList.remove('hidden');
    } catch (error) {
        console.error('Error fetching user:', error);
        showNotification('Error fetching user details', 'error');
    }
}

async function saveUser(event) {
    event.preventDefault();
    
    const userId = document.getElementById('user-id').value;
    const organizationValue = document.getElementById('user-organization').value;
    const role = document.getElementById('user-role').value;
    const departmentValue = document.getElementById('user-department').value;
    
    const userData = {
        username: document.getElementById('user-username').value,
        fullName: document.getElementById('user-fullname').value,
        email: document.getElementById('user-email').value,
        role: role,
        department: departmentValue || null,
        ...(organizationValue && organizationValue !== "None" ? { organization: organizationValue } : {}),
        // Set leadership flags based on role and assignments
        isDepartmentLeader: role === 'student_leader' && departmentValue ? true : false,
        isOrganizationLeader: role === 'student_leader' && organizationValue && organizationValue !== "None" ? true : false
    };

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userData)
        });
        
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || `Failed to update user: ${res.status}`);
        }

        // Close modal and reload users
        document.getElementById('user-modal').classList.add('hidden');
        await loadUsers();
        showNotification('User updated successfully');
    } catch (error) {
        console.error('Error updating user:', error);
        showNotification(error.message || 'Error updating user', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || `Failed to delete user: ${res.status}`);
        }
        
        await loadUsers();
        showNotification('User deleted successfully');
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification(error.message || 'Error deleting user', 'error');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load initial data
    loadUsers();

    // Setup form handlers
    document.getElementById('user-form').addEventListener('submit', saveUser);
    
    // Setup modal close handler
    document.getElementById('close-user-modal').addEventListener('click', () => {
        document.getElementById('user-modal').classList.add('hidden');
    });
});

// --- AUTH & LOGOUT ---
function logout() {
    localStorage.removeItem('token');
    window.location.href = 'login.html';
}

// --- AUTH CHECK & INIT ---
function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    fetch('/api/auth/me', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(res => res.json())
    .then(user => {
        if (user.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return;
        }
        document.getElementById('user-name').textContent = user.fullName;
        // Load default tab
        const currentTab = document.querySelector('.tab-btn.bg-indigo-600')?.dataset.tab || 'events';
        if (currentTab === 'events') loadEvents();
        if (currentTab === 'departments') loadDepartments();
        if (currentTab === 'organizations') loadOrganizations();
        if (currentTab === 'users') loadUsers();
    })
    .catch(() => {
        window.location.href = 'login.html';
    });
}
document.addEventListener('DOMContentLoaded', checkAuth); 