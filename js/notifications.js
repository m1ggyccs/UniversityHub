document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/notifications', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const notifications = await res.json();
  const container = document.getElementById('notifications-list');
  container.innerHTML = '';
  if (!notifications.length) {
    container.innerHTML = '<div class="p-4 text-gray-500">No notifications.</div>';
    return;
  }
  notifications.forEach(n => {
    container.innerHTML += `
      <div class="p-4 hover:bg-gray-50 flex items-start">
        <div class="bg-blue-100 rounded-full p-2 mr-4 flex-shrink-0">
          <i class="fas fa-bell text-blue-600"></i>
        </div>
        <div class="flex-1">
          <div class="flex items-center justify-between">
            <h3 class="font-medium text-gray-900">${n.title}</h3>
            <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">${n.type.charAt(0).toUpperCase() + n.type.slice(1)}</span>
          </div>
          <p class="text-gray-600 text-sm mt-1">${n.message}</p>
          <div class="mt-2 flex items-center justify-between">
            <p class="text-xs text-gray-500">${new Date(n.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </div>
    `;
  });
}); 