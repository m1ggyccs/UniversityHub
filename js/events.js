// Get the base URL from the environment or use a default
const BASE_URL = window.API_URL || 'http://localhost:3000' || 'https://universityhub.onrender.com';

// Global state
let currentState = {
  page: 1,
  category: '',
  date: '',
  filterType: 'all',
  searchTerm: '',
  itemsPerPage: 9
};

// Show error message in the events list
function showError(message) {
  const list = document.getElementById('events-list');
  if (list) {
    list.innerHTML = `
      <div class="col-span-3 p-6 text-center">
        <div class="text-red-500 mb-2">
          <i class="fas fa-exclamation-circle text-xl"></i>
        </div>
        <p class="text-gray-700">${message}</p>
        <button onclick="fetchEvents()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">
          Try Again
        </button>
      </div>
    `;
  }
}

// Filter events by date type (all, upcoming, today, past)
function filterEventsByDate(events, filterType) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Only work with approved events
  const approvedEvents = events.filter(event => event.status === 'approved');

  return approvedEvents.filter(event => {
    const eventDate = new Date(event.date);
    switch (filterType) {
      case 'upcoming':
        return eventDate >= today;
      case 'today':
        return eventDate >= today && eventDate < tomorrow;
      case 'past':
        return eventDate < today;
      default:
        return true;
    }
  });
}

// Filter events by search term
function filterEventsBySearch(events, searchTerm) {
  if (!searchTerm) return events;
  
  const searchLower = searchTerm.toLowerCase();
  return events.filter(event => {
    return (
      (event.title && event.title.toLowerCase().includes(searchLower)) ||
      (event.description && event.description.toLowerCase().includes(searchLower)) ||
      (event.location && event.location.toLowerCase().includes(searchLower)) ||
      (event.category && event.category.toLowerCase().includes(searchLower))
    );
  });
}

// Initialize the page
function initializePage() {
  // Load initial state from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  currentState.page = parseInt(urlParams.get('page')) || 1;
  currentState.category = urlParams.get('category') || '';
  currentState.date = urlParams.get('date') || '';
  currentState.filterType = urlParams.get('filter') || 'all';
  currentState.searchTerm = urlParams.get('search') || '';

  // Set up search input
  const searchInput = document.querySelector('#search-input');
  if (searchInput) {
    searchInput.value = currentState.searchTerm;
    searchInput.addEventListener('input', debounce((e) => {
      fetchEvents({ searchTerm: e.target.value, page: 1 });
    }, 300));
  }

  // Set up filter buttons
  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(btn => {
        btn.classList.remove('active-filter');
      });
      button.classList.add('active-filter');
      fetchEvents({ filterType: button.dataset.filter, page: 1 });
    });
  });

  // Set up pagination
  document.getElementById('prev-page')?.addEventListener('click', () => {
    if (currentState.page > 1) {
      fetchEvents({ page: currentState.page - 1 });
    }
  });

  document.getElementById('next-page')?.addEventListener('click', () => {
    fetchEvents({ page: currentState.page + 1 });
  });

  // Load initial data
  loadCategories();
  fetchEvents();
}

// Debounce function for search input
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Fetch and display all categories in a dropdown
function loadCategories() {
  fetch(`${BASE_URL}/api/categories`)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
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
    })
    .catch(error => {
      console.error('Error loading categories:', error);
    });
}

// Format date for display, handling various date formats
function formatEventDate(dateStr) {
  if (!dateStr) return '';
  try {
    let d;
    if (dateStr.includes('T00:00:00.000Z')) {
      d = new Date(dateStr);
    } else if (dateStr.includes('T')) {
      d = new Date(dateStr);
    } else {
      d = new Date(dateStr.replace(/-/g, '/'));
    }
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) {
    console.warn('Invalid date format:', dateStr);
    return dateStr;
  }
}

// Format time range for display
function formatEventTime(startTime, endTime) {
  if (!startTime && !endTime) return '';
  
  function formatTime(timeStr) {
    if (!timeStr) return '';
    try {
      if (timeStr.match(/^\d{2}:\d{2}$/)) {
        const [hours, minutes] = timeStr.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
      }
      return timeStr;
    } catch (e) {
      return timeStr;
    }
  }

  const start = formatTime(startTime);
  const end = formatTime(endTime);
  
  if (start && end) {
    return `${start} - ${end}`;
  }
  return start || end || 'Time not specified';
}

// Update URL with current state
function updateURL() {
  const params = new URLSearchParams();
  if (currentState.page > 1) params.set('page', currentState.page);
  if (currentState.category) params.set('category', currentState.category);
  if (currentState.date) params.set('date', currentState.date);
  if (currentState.filterType !== 'all') params.set('filter', currentState.filterType);
  if (currentState.searchTerm) params.set('search', currentState.searchTerm);
  
  const newURL = `${window.location.pathname}?${params.toString()}`;
  window.history.pushState({}, '', newURL);
}

// Fetch and display events based on current state
function fetchEvents(newState = {}) {
  // Update state with new values while preserving existing ones
  currentState = { ...currentState, ...newState };
  
  // Update URL to reflect current state
  updateURL();
  
  // Show loading state
  const list = document.getElementById('events-list');
  if (list) {
    list.innerHTML = `
      <div class="col-span-3 p-6 text-center text-gray-500">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
        Loading events...
      </div>
    `;
  }

  // Build the query string
  const queryParams = new URLSearchParams({
    page: currentState.page,
    limit: currentState.itemsPerPage,
    status: 'approved' // Always fetch only approved events for the event list
  });

  if (currentState.category && currentState.category !== 'all') {
    queryParams.append('category', currentState.category);
  }

  if (currentState.searchTerm) {
    queryParams.append('search', currentState.searchTerm);
  }

  const url = `${BASE_URL}/api/events?${queryParams.toString()}`;

  // Fetch events from API
  fetch(url)
    .then(response => response.json())
    .then(events => {
      // Filter events based on date
      const filteredEvents = filterEventsByDate(events, currentState.filterType);
      
      // Update filter counts
      updateFilterCounts(events);
      
      // Clear the events list
      if (!list) return;
      list.innerHTML = '';

      // If no events found
      if (filteredEvents.length === 0) {
        list.innerHTML = `
          <div class="col-span-3 p-6 text-center text-gray-500">
            <i class="fas fa-calendar-times text-4xl mb-4"></i>
            <p>No events found</p>
          </div>
        `;
        return;
      }

      // Create event cards
      filteredEvents.forEach(event => {
        // Determine image: pubmat > logo > icon
        let imageHtml = '';
        if (event.pubmat) {
          imageHtml = `<img src="${event.pubmat}" alt="Event Pubmat" class="object-cover w-full h-full rounded-t-lg" style="max-height:160px;" />`;
        } else if (event.category?.toLowerCase() === 'school') {
          imageHtml = `<img src="../assets/tip-logo.png" alt="School Logo" class="object-cover w-24 h-24 rounded-full shadow mx-auto mt-6" />`;
        } else if (event.department?.logo) {
          imageHtml = `<img src="${event.department.logo}" alt="Department Logo" class="object-cover w-24 h-24 rounded-full shadow mx-auto mt-6" />`;
        } else if (event.organization?.logo) {
          imageHtml = `<img src="${event.organization.logo}" alt="Organization Logo" class="object-cover w-24 h-24 rounded-full shadow mx-auto mt-6" />`;
        } else {
          imageHtml = `<div class='absolute inset-0 flex items-center justify-center'><i class="fas fa-calendar-alt text-white text-5xl opacity-25"></i></div>`;
        }

        const card = document.createElement('div');
        card.className = `card theme-${event.category ? event.category.toLowerCase() : 'default'} bg-white rounded-lg shadow-sm overflow-hidden`;
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
                <button class="bg-white rounded-full h-8 w-8 flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <i class="far fa-heart text-gray-600"></i>
                </button>
                <button class="bg-white rounded-full h-8 w-8 flex items-center justify-center hover:bg-gray-100 transition-colors">
                  <i class="fas fa-share-alt text-gray-600"></i>
                </button>
              </div>
            </div>
          </div>
          <div class="p-4">
            <h3 class="font-medium text-lg text-gray-900">${event.title || 'Untitled Event'}</h3>
            <div class="flex items-center text-sm text-gray-500 mt-2">
              <i class="fas fa-clock mr-2"></i>
              <span>${formatEventTime(event.startTime, event.endTime) || 'Time not specified'}</span>
            </div>
            <div class="flex items-center text-sm text-gray-500 mt-1">
              <i class="fas fa-map-marker-alt mr-2"></i>
              <span>${event.location || 'Location not specified'}</span>
            </div>
            <p class="text-gray-600 text-sm mt-3 line-clamp-2">${event.description || 'No description available'}</p>
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

      // Update pagination
      updatePagination(events.total, currentState.page, currentState.itemsPerPage);
      
      // Update active category
      document.querySelectorAll('#category-tabs button').forEach(button => {
        const isActive = (button.textContent === currentState.category) || 
                        (!currentState.category && button.textContent === 'All Categories');
        button.classList.toggle('border-indigo-500', isActive);
        button.classList.toggle('border-transparent', !isActive);
      });
    })
    .catch(error => {
      console.error('Error fetching events:', error);
      showError('Error loading events. Please try again.');
    });
}

// Update pagination controls based on total events
function updatePagination(totalEvents, currentPage, itemsPerPage) {
  const totalPages = Math.ceil(totalEvents / itemsPerPage);
  const prevButton = document.getElementById('prev-page');
  const nextButton = document.getElementById('next-page');
  const paginationNumbers = document.getElementById('pagination-numbers');

  // Update prev/next buttons
  if (prevButton) {
    prevButton.disabled = currentPage <= 1;
  }
  if (nextButton) {
    nextButton.disabled = currentPage >= totalPages;
  }

  // Update pagination numbers
  if (paginationNumbers) {
    paginationNumbers.innerHTML = '';
    
    // Calculate range of pages to show
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Adjust start if we're near the end
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    // Add first page if not in range
    if (startPage > 1) {
      const firstBtn = createPaginationButton(1);
      paginationNumbers.appendChild(firstBtn);
      
      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'px-2 text-gray-500';
        ellipsis.textContent = '...';
        paginationNumbers.appendChild(ellipsis);
      }
    }

    // Add page numbers
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = createPaginationButton(i);
      paginationNumbers.appendChild(pageBtn);
    }

    // Add last page if not in range
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'px-2 text-gray-500';
        ellipsis.textContent = '...';
        paginationNumbers.appendChild(ellipsis);
      }
      const lastBtn = createPaginationButton(totalPages);
      paginationNumbers.appendChild(lastBtn);
    }
  }
}

// Create a pagination button
function createPaginationButton(pageNum) {
  const button = document.createElement('button');
  button.className = `px-3 py-1 rounded-md ${
    pageNum === currentState.page
      ? 'bg-blue-500 text-white'
      : 'text-gray-700 hover:bg-gray-100'
  }`;
  button.textContent = pageNum;
  button.addEventListener('click', () => {
    if (pageNum !== currentState.page) {
      fetchEvents({ page: pageNum });
    }
  });
  return button;
}

// Update filter counts based on current events
function updateFilterCounts(events) {
  if (!events) return;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const counts = {
    all: events.length,
    upcoming: events.filter(event => new Date(event.date) >= today).length,
    today: events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate >= today && eventDate < tomorrow;
    }).length,
    past: events.filter(event => new Date(event.date) < today).length
  };

  // Update count badges
  Object.entries(counts).forEach(([key, count]) => {
    const element = document.getElementById(`count-${key}`);
    if (element) {
      element.textContent = count;
    }
  });

  // Update active filter button
  document.querySelectorAll('[data-filter]').forEach(button => {
    const isActive = button.dataset.filter === currentState.filterType;
    button.classList.toggle('active-filter', isActive);
  });
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);
