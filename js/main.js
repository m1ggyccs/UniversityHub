// Fetch and display event location details
function fetchEventLocation(eventId) {
  fetch(`http://localhost:3000/api/events/${eventId}/location`)
    .then(res => res.json())
    .then(location => {
      const locDiv = document.getElementById('event-location');
      if (!locDiv) return;
      locDiv.textContent = `Location: ${location.location || ''}, Building: ${location.building || ''}, Room: ${location.room || ''}, Coordinates: ${location.coordinates ? location.coordinates.lat + ',' + location.coordinates.lng : ''}`;
    });
}

// Fetch and display event QR code
function fetchEventQRCode(eventId) {
  fetch(`http://localhost:3000/api/events/${eventId}/qr`)
    .then(res => res.json())
    .then(data => {
      const img = document.getElementById('event-qr');
      if (!img) return;
      img.src = data.qr;
    });
}

// Example usage (call these functions with the event ID when showing event details)
// fetchEventLocation('EVENT_ID_HERE');
// fetchEventQRCode('EVENT_ID_HERE');

// Fetch and display today's events on the dashboard
function fetchTodaysEvents() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  fetch(`/api/events`)
    .then(res => res.json())
    .then(events => {
      console.log('All events fetched:', events);
      // Robust filtering for today's events
      const todaysEvents = events.filter(ev => new Date(ev.date).toISOString().split('T')[0] === todayStr);
      console.log('Events for today:', todaysEvents);
      const container = document.getElementById('todays-events-list');
      if (!container) return;
      container.innerHTML = '';
      if (todaysEvents.length === 0) {
        container.innerHTML = '<div class="p-6 text-gray-500">No events today.</div>';
        return;
      }
      todaysEvents.forEach(event => {
        // Determine logo
        let logo = '';
        if (event.category === 'school') {
          logo = 'assets/tip-logo.png'; // Use the provided school logo (place in assets folder)
        } else if (event.department && event.department.logo) {
          logo = event.department.logo;
        } else if (event.organization && event.organization.logo) {
          logo = event.organization.logo;
        }
        const card = document.createElement('a');
        card.className = `block p-6 hover:bg-gray-50 transition-colors theme-${event.category ? event.category.toLowerCase() : 'default'}`;
        card.href = `event-details.html?id=${event._id}`;
        card.innerHTML = `
          <div class="flex items-start">
            <div class="bg-blue-100 rounded-lg h-14 w-14 flex items-center justify-center flex-shrink-0 overflow-hidden">
              ${logo ? `<img src="${logo}" alt="Logo" class="w-12 h-12 object-cover rounded-full" />` : `<span class="text-xl font-bold text-blue-600">${formatTime(event.time).hour}</span><span class="text-xs font-medium text-blue-600">${formatTime(event.time).ampm}</span>`}
            </div>
            <div class="ml-4 flex-1">
              <div class="flex items-center justify-between">
                <h3 class="font-medium text-gray-900">${event.title}</h3>
                <span class="badge badge-${event.category ? event.category.toLowerCase() : 'default'}">${event.category || ''}</span>
              </div>
              <p class="text-gray-600 text-sm mt-1">${event.description || ''}</p>
              <div class="flex items-center mt-3 text-sm text-gray-500">
                <i class="fas fa-map-marker-alt mr-1"></i>
                <span>${event.location || ''}</span>
                <span class="mx-2">•</span>
                <i class="fas fa-clock mr-1"></i>
                <span>${event.time || ''}</span>
              </div>
            </div>
          </div>
        `;
        container.appendChild(card);
      });
    });
}

function formatTime(timeStr) {
  // Expects time in format 'HH:MM AM/PM - HH:MM AM/PM' or 'HH:MM AM/PM'
  if (!timeStr) return { hour: '', ampm: '' };
  const match = timeStr.match(/(\d{1,2}):\d{2}\s*(AM|PM)/i);
  if (match) {
    return { hour: match[1], ampm: match[2].toUpperCase() };
  }
  return { hour: '', ampm: '' };
}

// Set today's date
function setTodayDate() {
  const today = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateStr = today.toLocaleDateString(undefined, options);
  const dateElem = document.getElementById('today-date');
  if (dateElem) dateElem.textContent = dateStr;
}

// Fetch and display stats overview
function fetchStatsOverview() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  // Get start and end of week (Monday to Sunday)
  const firstDay = new Date(today.setDate(today.getDate() - today.getDay() + 1));
  const lastDay = new Date(today.setDate(firstDay.getDate() + 6));
  const weekStart = `${firstDay.getFullYear()}-${String(firstDay.getMonth() + 1).padStart(2, '0')}-${String(firstDay.getDate()).padStart(2, '0')}`;
  const weekEnd = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

  Promise.all([
    fetch(`/api/events`).then(res => res.json()),
  ]).then(([allEvents]) => {
    // Robust filtering for today's events
    const todaysEvents = allEvents.filter(ev => new Date(ev.date).toISOString().split('T')[0] === todayStr);
    // This Week's Events
    const weekEvents = allEvents.filter(ev => {
      const eventDateStr = new Date(ev.date).toISOString().split('T')[0];
      return eventDateStr >= weekStart && eventDateStr <= weekEnd;
    });
    // Registrations: sum of all currentParticipants
    const registrations = allEvents.reduce((sum, ev) => sum + (ev.currentParticipants || 0), 0);
    // Pending: events with status 'pending' (if you use such a status)
    const pending = allEvents.filter(ev => ev.status === 'pending').length;

    const stats = [
      {
        icon: 'fa-calendar-day',
        color: 'blue',
        label: "Today's Events",
        value: todaysEvents.length
      },
      {
        icon: 'fa-calendar-week',
        color: 'green',
        label: 'This Week',
        value: weekEvents.length
      },
      {
        icon: 'fa-users',
        color: 'purple',
        label: 'Registrations',
        value: registrations
      },
      {
        icon: 'fa-clock',
        color: 'yellow',
        label: 'Pending',
        value: pending
      }
    ];
    const statsDiv = document.getElementById('stats-overview');
    if (statsDiv) {
      statsDiv.innerHTML = '';
      stats.forEach(stat => {
        statsDiv.innerHTML += `
          <div class="bg-white rounded-lg shadow-sm p-6">
            <div class="flex items-center">
              <div class="rounded-full bg-${stat.color}-100 p-3">
                <i class="fas ${stat.icon} text-${stat.color}-600"></i>
              </div>
              <div class="ml-4">
                <h3 class="text-gray-500 text-sm uppercase">${stat.label}</h3>
                <p class="text-2xl font-semibold">${stat.value}</p>
              </div>
            </div>
          </div>
        `;
      });
    }
  });
}

// Fetch and display announcements (placeholder: empty)
function fetchAnnouncements() {
  const annDiv = document.getElementById('announcements-list');
  if (annDiv) {
    annDiv.innerHTML = '<div class="p-4 text-gray-500">No announcements.</div>';
  }
}

// Fetch and display upcoming events on the dashboard
function fetchUpcomingEvents() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const todayStr = `${yyyy}-${mm}-${dd}`;

  fetch(`/api/events`)
    .then(res => res.json())
    .then(events => {
      // Filter for events after today
      const upcoming = events.filter(ev => new Date(ev.date).toISOString().split('T')[0] > todayStr);
      // Sort by soonest
      upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));
      // Take next 3
      const nextEvents = upcoming.slice(0, 3);
      const container = document.getElementById('upcoming-events-list');
      if (!container) return;
      container.innerHTML = '';
      if (nextEvents.length === 0) {
        container.innerHTML = '<div class="p-6 text-gray-500">No upcoming events.</div>';
        return;
      }
      nextEvents.forEach(event => {
        // Determine logo
        let logo = '';
        if (event.category === 'school') {
          logo = 'assets/tip-logo.png';
        } else if (event.department && event.department.logo) {
          logo = event.department.logo;
        } else if (event.organization && event.organization.logo) {
          logo = event.organization.logo;
        }
        const card = document.createElement('a');
        card.className = 'flex items-center p-4 hover:bg-gray-50 transition-colors';
        card.href = `event-details.html?id=${event._id}`;
        card.innerHTML = `
          <div class="bg-blue-100 rounded-lg h-12 w-12 flex items-center justify-center flex-shrink-0 overflow-hidden">
            ${logo ? `<img src="${logo}" alt="Logo" class="w-10 h-10 object-cover rounded-full" />` : `<i class='fas fa-calendar text-blue-600 text-xl'></i>`}
          </div>
          <div class="ml-4 flex-1">
            <div class="font-medium text-gray-900">${event.title}</div>
            <div class="text-gray-500 text-sm">${formatDate(event.date)}</div>
          </div>
        `;
        container.appendChild(card);
      });
    });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

window.addEventListener('DOMContentLoaded', () => {
  setTodayDate();
  fetchStatsOverview();
  fetchTodaysEvents();
  fetchUpcomingEvents();
  fetchAnnouncements();
});
