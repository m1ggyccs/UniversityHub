// Fetch and display all categories in a dropdown
function loadCategories() {
  fetch('http://localhost:3000/api/categories')
    .then(res => res.json())
    .then(categories => {
      const select = document.getElementById('category-select');
      if (!select) return;
      select.innerHTML = '';
      categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.name;
        option.textContent = cat.name;
        select.appendChild(option);
      });
    });
}

// Fetch all events and update filter counts
function updateFilterCounts() {
  fetch('http://localhost:3000/api/events')
    .then(res => res.json())
    .then(events => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      let countAll = events.length;
      let countUpcoming = events.filter(ev => ev.date >= todayStr).length;
      let countToday = events.filter(ev => ev.date === todayStr).length;
      let countPast = events.filter(ev => ev.date < todayStr).length;
      document.getElementById('count-all').textContent = countAll;
      document.getElementById('count-upcoming').textContent = countUpcoming;
      document.getElementById('count-today').textContent = countToday;
      document.getElementById('count-past').textContent = countPast;
    });
}

// Fetch and display events, optionally filtered by category, date, or filter type
function fetchEvents(category = '', date = '', filterType = 'all') {
  let url = 'http://localhost:3000/api/events?';
  if (category) url += `category=${encodeURIComponent(category)}&`;
  if (date) url += `date=${encodeURIComponent(date)}`;
  fetch(url)
    .then(res => res.json())
    .then(events => {
      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      let filteredEvents = events;
      // Filter out pending events for everyone (frontend safety net)
      filteredEvents = filteredEvents.filter(ev => ev.status !== 'pending');
      console.log('All events fetched:', events);
      if (filterType === 'upcoming') {
        filteredEvents = events.filter(ev => new Date(ev.date).toISOString().split('T')[0] > todayStr);
        console.log('Upcoming events:', filteredEvents);
      } else if (filterType === 'today') {
        filteredEvents = events.filter(ev => new Date(ev.date).toISOString().split('T')[0] === todayStr);
        console.log('Events for today:', filteredEvents);
      } else if (filterType === 'past') {
        filteredEvents = events.filter(ev => new Date(ev.date).toISOString().split('T')[0] < todayStr);
        console.log('Past events:', filteredEvents);
      }
      const list = document.getElementById('events-list');
      if (!list) return;
      list.innerHTML = '';
      if (filteredEvents.length === 0) {
        list.innerHTML = '<div class="col-span-3 p-6 text-gray-500">No events found.</div>';
        return;
      }
      filteredEvents.forEach(event => {
        // Determine image: pubmat > logo > icon
        let imageHtml = '';
        if (event.pubmat) {
          imageHtml = `<img src="${event.pubmat}" alt="Event Pubmat" class="object-cover w-full h-full rounded-t-lg" style="max-height:160px;" />`;
        } else if (event.category === 'school') {
          imageHtml = `<img src="assets/tip-logo.png" alt="School Logo" class="object-cover w-24 h-24 rounded-full shadow mx-auto mt-6" />`;
        } else if (event.department && event.department.logo) {
          imageHtml = `<img src="${event.department.logo}" alt="Department Logo" class="object-cover w-24 h-24 rounded-full shadow mx-auto mt-6" />`;
        } else if (event.organization && event.organization.logo) {
          imageHtml = `<img src="${event.organization.logo}" alt="Organization Logo" class="object-cover w-24 h-24 rounded-full shadow mx-auto mt-6" />`;
        } else {
          imageHtml = `<div class='absolute inset-0 flex items-center justify-center'><i class="fas fa-calendar-alt text-white text-5xl opacity-25"></i></div>`;
        }
        const card = document.createElement('div');
        card.className = `card theme-${event.category ? event.category.toLowerCase() : 'default'}`;
        card.innerHTML = `
          <div class="h-40 bg-gradient-to-r from-blue-400 to-blue-600 relative overflow-hidden rounded-t-lg">
            ${imageHtml}
            <div class="absolute top-4 right-4">
              <span class="badge badge-${event.category ? event.category.toLowerCase() : 'default'}">${event.category || ''}</span>
            </div>
            <div class="absolute bottom-4 left-4 right-4 flex justify-between items-center">
              <div class="bg-white rounded-lg px-3 py-1 text-sm font-medium text-gray-800">
                <i class="far fa-calendar-alt mr-1"></i> ${formatEventDate(event.date)}
              </div>
              <div class="flex space-x-2">
                <button class="bg-white rounded-full h-8 w-8 flex items-center justify-center">
                  <i class="far fa-heart text-gray-600"></i>
                </button>
                <button class="bg-white rounded-full h-8 w-8 flex items-center justify-center">
                  <i class="fas fa-share-alt text-gray-600"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="p-4">
            <h3 class="font-medium text-lg text-gray-900">${event.title}</h3>
            <div class="flex items-center text-sm text-gray-500 mt-2">
              <i class="fas fa-clock mr-2"></i>
              <span>${event.time || ''}</span>
            </div>
            <div class="flex items-center text-sm text-gray-500 mt-1">
              <i class="fas fa-map-marker-alt mr-2"></i>
              <span>${event.location || ''}</span>
            </div>
            <p class="text-gray-600 text-sm mt-3">${event.description || ''}</p>
            <div class="mt-4 flex justify-between items-center">
              <div class="flex -space-x-2">
                <div class="h-7 w-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-500">+${event.currentParticipants || 0}</div>
              </div>
              <a href="event-details.html?id=${event._id}" class="btn btn-primary text-xs px-3 py-1">View Details</a>
            </div>
          </div>
        `;
        list.appendChild(card);
      });
    });
}

function formatEventDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// On page load, load categories, events, and filter counts
window.addEventListener('DOMContentLoaded', () => {
  loadCategories();
  fetchEvents();
  updateFilterCounts();

  // Add filter event listeners if present
  const select = document.getElementById('category-select');
  const dateInput = document.getElementById('date-filter');
  if (select && dateInput) {
    select.addEventListener('change', () => fetchEvents(select.value, dateInput.value));
    dateInput.addEventListener('change', () => fetchEvents(select.value, dateInput.value));
  }

  // Add event filter button listeners
  const filterBar = document.getElementById('event-filters');
  if (filterBar) {
    filterBar.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', function () {
        filterBar.querySelectorAll('button').forEach(b => b.classList.remove('active-filter'));
        this.classList.add('active-filter');
        const filterType = this.getAttribute('data-filter');
        fetchEvents(select ? select.value : '', dateInput ? dateInput.value : '', filterType);
      });
    });
  }
});
