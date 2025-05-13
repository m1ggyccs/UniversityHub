document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  if (!token) return;
  const res = await fetch('/api/users/me', { headers: { 'Authorization': `Bearer ${token}` } });
  const user = await res.json();

  // Use fallback/defaults if fields are missing
  document.getElementById('profile-pic').src = user.profilePic || 'assets/images/user.png';
  document.getElementById('profile-username').value = user.username || '';
  document.getElementById('profile-email').value = user.email || '';
  document.getElementById('current-username').textContent = user.username || '';
  document.getElementById('current-email').textContent = user.email || '';

  // Update sidebar username if present
  if (document.getElementById('sidebar-username')) {
    document.getElementById('sidebar-username').textContent = user.username || 'User';
  }

  // Save profile
  document.getElementById('save-profile').onclick = async () => {
    const username = document.getElementById('profile-username').value;
    const email = document.getElementById('profile-email').value;
    let profilePic = user.profilePic;
    const fileInput = document.getElementById('profile-pic-upload');
    if (fileInput.files[0]) {
      const reader = new FileReader();
      reader.onload = async function(e) {
        profilePic = e.target.result;
        await updateProfile(username, email, profilePic);
      };
      reader.readAsDataURL(fileInput.files[0]);
    } else {
      await updateProfile(username, email, profilePic);
    }
  };

  async function updateProfile(username, email, profilePic) {
    await fetch('/api/users/me', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ username, email, profilePic })
    });
    alert('Profile updated!');
    location.reload();
  }

  // Change password
  document.getElementById('change-password').onclick = async () => {
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    const res = await fetch('/api/users/me/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ oldPassword, newPassword })
    });
    if (res.ok) {
      alert('Password changed!');
      document.getElementById('old-password').value = '';
      document.getElementById('new-password').value = '';
    } else {
      alert('Password change failed');
    }
  };
}); 