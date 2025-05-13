// Dynamically load events into the dropdown
async function loadEventsDropdown() {
  const res = await fetch('/api/events');
  const events = await res.json();
  const select = document.getElementById('event-select');
  select.innerHTML = '<option value="">Select an event</option>' +
    events.map(ev => `<option value="${ev._id}">${ev.title} (${new Date(ev.date).toLocaleDateString()})</option>`).join('');
}

// Show event info, pubmat, QR code, and participants
async function onEventSelect() {
  const eventId = document.getElementById('event-select').value;
  // Clear all sections
  document.getElementById('event-info').innerHTML = '';
  document.getElementById('event-details').innerHTML = '';
  document.getElementById('qr-code').innerHTML = '';
  document.getElementById('attendees-list').innerHTML = '';
  document.getElementById('attendance-buttons').style.display = 'none';
  document.getElementById('checkin-stats-section').innerHTML = '';
  document.getElementById('recent-checkins-section').innerHTML = '';
  if (!eventId) return;
  const res = await fetch(`/api/events/${eventId}`);
  const event = await res.json();
  // Event info (left panel)
  document.getElementById('event-info').innerHTML = `
    <div class="bg-gray-50 rounded-lg p-4">
      <h3 class="font-medium text-gray-900 mb-2">Event Information</h3>
      <div class="text-sm text-gray-600 space-y-2">
        <p><i class="fas fa-map-marker-alt w-5 text-center"></i> ${event.location || ''}</p>
        <p><i class="fas fa-clock w-5 text-center"></i> ${event.time || ''}</p>
        <p><i class="fas fa-users w-5 text-center"></i> ${event.currentParticipants || 0} registered / ${event.maxParticipants || 0} capacity</p>
      </div>
    </div>
  `;
  // Event details (right panel)
  document.getElementById('event-details').innerHTML = `
    <div class="mb-2 font-semibold">Event Info</div>
    <div class="text-sm text-gray-600 space-y-2">
      <p><i class="fas fa-map-marker-alt w-5 text-center"></i> ${event.location || ''}</p>
      <p><i class="fas fa-clock w-5 text-center"></i> ${event.time || ''}</p>
      <p><i class="fas fa-users w-5 text-center"></i> ${event.currentParticipants || 0} registered / ${event.maxParticipants || 0} capacity</p>
    </div>
  `;
  // QR code
  const regUrl = event.customRegistrationLink || (window.location.origin + '/event-register.html?id=' + event._id);
  $("#qr-code").empty().qrcode({ width: 128, height: 128, text: regUrl });
  // Show participants with attendance status buttons
  showParticipants(eventId);
  // Show check-in stats
  showCheckinStats(eventId);
  // Show recent check-ins
  showRecentCheckins(eventId);
}

async function showParticipants(eventId) {
  const res = await fetch(`/api/events/${eventId}/participants`);
  const participants = await res.json();
  let html = '';
  const token = localStorage.getItem('token');
  let currentUserId = null;
  let currentUserRole = null;
  if (token) {
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      currentUserId = decoded.userId || decoded.id || decoded._id;
      currentUserRole = decoded.role;
    } catch (e) { /* ignore */ }
  }

  // Find if current user is a participant
  const myParticipant = participants.find(p => String(p.user?._id) === String(currentUserId));
  const isParticipant = !!myParticipant;
  const hasResponded = isParticipant && !!myParticipant.attendanceStatus;

  // For students/student_leaders, show only their own controls
  if (currentUserRole === 'student' || currentUserRole === 'student_leader') {
    if (!isParticipant) {
      // Show Join Event button
      html += `<button class="btn btn-primary" onclick="joinEvent('${eventId}')">Join Event</button>`;
    } else if (!hasResponded) {
      // Show attendance buttons ONLY for the current user
      html += `
        <button onclick="updateAttendance('${eventId}', '${currentUserId}', 'confirmed')" class="btn btn-xs btn-secondary">Confirm</button>
        <button onclick="updateAttendance('${eventId}', '${currentUserId}', 'not_sure')" class="btn btn-xs btn-secondary">Not Sure</button>
        <button onclick="updateAttendance('${eventId}', '${currentUserId}', 'not_attending')" class="btn btn-xs btn-secondary">Will Not Attend</button>
      `;
    } else {
      // Show status only
      html += `<span class="text-green-600">(${myParticipant.attendanceStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())})</span>`;
    }
    document.getElementById('attendees-list').innerHTML = html;
    document.getElementById('attendance-buttons').style.display = 'none';
    return;
  }

  // For admin/faculty/staff: show all participants and controls in a table
  if (!participants.length) {
    html += '<div class="text-gray-500 mb-2">No registered attendees.</div>';
    document.getElementById('attendance-buttons').style.display = '';
  } else {
    html += `<table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50">
        <tr>
          <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
          <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
          <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">My Attendance</th>
        </tr>
      </thead>
      <tbody class="bg-white divide-y divide-gray-200">`;
    participants.forEach(p => {
      const hasResponded = !!p.attendanceStatus;
      const isSelf = currentUserId && String(p.user?._id) === String(currentUserId);
      const isStudent = p.user && (p.user.role === 'student' || p.user.role === 'student_leader');
      html += `
        <tr>
          <td class="px-4 py-2 font-medium">${p.user?.fullName || p.user?.username || 'Unknown'}</td>
          <td class="px-4 py-2 text-xs text-gray-500">${p.user?.email || ''}</td>
          <td class="px-4 py-2">${hasResponded ? `<span class=\"text-green-600\">${p.attendanceStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>` : ''}</td>
          <td class="px-4 py-2">
            ${isSelf && isStudent ? `
              <button onclick=\"updateAttendance('${eventId}', '${currentUserId}', 'confirmed')\" class=\"btn btn-xs btn-secondary\">Confirm</button>
              <button onclick=\"updateAttendance('${eventId}', '${currentUserId}', 'not_sure')\" class=\"btn btn-xs btn-secondary\">Not Sure</button>
              <button onclick=\"updateAttendance('${eventId}', '${currentUserId}', 'not_attending')\" class=\"btn btn-xs btn-secondary\">Will Not Attend</button>
            ` : ''}
          </td>
        </tr>
      `;
    });
    html += '</tbody></table>';
    document.getElementById('attendance-buttons').style.display = 'none';
  }
  document.getElementById('attendees-list').innerHTML = html;
}

// Make updateAttendance function global
window.updateAttendance = async function(eventId, userId, status) {
  const token = localStorage.getItem('token');
  let currentUserId = null;
  if (token) {
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
      currentUserId = decoded.userId || decoded.id || decoded._id;
    } catch (e) { /* ignore */ }
  }

  try {
    // Debug logging
    console.log('Updating attendance:', {
      eventId,
      userId,
      status,
      currentUserId,
      isSelf: String(userId) === String(currentUserId)
    });

    const response = await fetch(`/api/events/${eventId}/participants/${userId}/attendance`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ status })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update attendance');
    }
    
    // Refresh the display
    showParticipants(eventId);
    showCheckinStats(eventId);
    showRecentCheckins(eventId);
  } catch (error) {
    console.error('Error updating attendance:', error);
    alert('Failed to update attendance. Please try again.');
  }
};

// Make joinEvent function global
window.joinEvent = async function(eventId) {
  const token = localStorage.getItem('token');
  try {
    const response = await fetch(`/api/events/${eventId}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      throw new Error('Failed to join event');
    }
    // After joining, reload participants
    showParticipants(eventId);
    showCheckinStats(eventId);
    showRecentCheckins(eventId);
  } catch (error) {
    console.error('Error joining event:', error);
    alert('Failed to join event. Please try again.');
  }
};

async function showCheckinStats(eventId) {
  const res = await fetch(`/api/events/${eventId}/participants`);
  const participants = await res.json();
  const total = participants.length;
  const confirmed = participants.filter(p => p.attendanceStatus === 'confirmed').length;
  const notSure = participants.filter(p => p.attendanceStatus === 'not_sure').length;
  const notAttending = participants.filter(p => p.attendanceStatus === 'not_attending').length;
  let html = `<div class="flex space-x-4">
    <div class="bg-green-50 p-4 rounded-lg text-center flex-1">
      <span class="block text-sm font-medium text-green-800">Confirmed</span>
      <span class="block text-2xl font-bold text-green-800">${confirmed}</span>
    </div>
    <div class="bg-yellow-50 p-4 rounded-lg text-center flex-1">
      <span class="block text-sm font-medium text-yellow-800">Not Sure</span>
      <span class="block text-2xl font-bold text-yellow-800">${notSure}</span>
    </div>
    <div class="bg-red-50 p-4 rounded-lg text-center flex-1">
      <span class="block text-sm font-medium text-red-800">Will Not Attend</span>
      <span class="block text-2xl font-bold text-red-800">${notAttending}</span>
    </div>
    <div class="bg-blue-50 p-4 rounded-lg text-center flex-1">
      <span class="block text-sm font-medium text-blue-800">Total</span>
      <span class="block text-2xl font-bold text-blue-800">${total}</span>
    </div>
  </div>`;
  document.getElementById('checkin-stats-section').innerHTML = html;
}

async function showRecentCheckins(eventId) {
  const res = await fetch(`/api/events/${eventId}/participants`);
  const participants = await res.json();
  let html = `<table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th></tr></thead><tbody class="bg-white divide-y divide-gray-200">`;
  participants.slice(-5).reverse().forEach(p => {
    html += `<tr><td class="px-6 py-4 whitespace-nowrap">${p.user?.fullName || p.user?.username || 'Unknown'}</td><td class="px-6 py-4 whitespace-nowrap">${p.attendanceStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</td></tr>`;
  });
  html += '</tbody></table>';
  document.getElementById('recent-checkins-section').innerHTML = html;
}

document.addEventListener('DOMContentLoaded', function() {
  loadEventsDropdown();
  document.getElementById('event-select').addEventListener('change', onEventSelect);
  // Hide attendance buttons initially
  document.getElementById('attendance-buttons').style.display = 'none';
}); 