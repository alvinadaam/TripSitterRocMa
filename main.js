// TripSitter - Psychedelic Trip Journal
// --- Trip Data Structure ---
// {
//   date: string,
//   substance: string,
//   dose: string,
//   location: string,
//   notes: string,
//   timeline: [{ time: string, entry: string }]
// }

const tripForm = document.getElementById('tripForm');
const tripList = document.getElementById('tripList');
const exportJsonBtn = document.getElementById('exportJson');
const exportCsvBtn = document.getElementById('exportCsv');

// --- Helper Functions ---
function getTrips() {
  return JSON.parse(localStorage.getItem('trips') || '[]');
}

function saveTrips(trips) {
  localStorage.setItem('trips', JSON.stringify(trips));
}

function addTrip(trip) {
  const trips = getTrips();
  trips.push(trip);
  saveTrips(trips);
}

function clearForm() {
  tripForm.reset();
  document.getElementById('timelineEntries').innerHTML = '';
  addTimelineEntry();
}

// --- Trippy Animated Background: Floating Stars ---
function createStars(num = 24) {
  const bg = document.getElementById('trippy-bg');
  if (!bg) return;
  bg.innerHTML = '';
  for (let i = 0; i < num; i++) {
    const star = document.createElement('div');
    star.className = 'star';
    const size = Math.random() * 4 + 2;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    star.style.animationDelay = `${Math.random() * 12}s`;
    bg.appendChild(star);
  }
}
createStars();
window.addEventListener('resize', () => createStars());

// --- File Import (JSON/CSV) ---
const loadFileBtn = document.getElementById('loadFileBtn');
const fileInput = document.getElementById('fileInput');

if (loadFileBtn && fileInput) {
  loadFileBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', handleFileUpload);
}

function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(event) {
    const text = event.target.result;
    let trips = [];
    try {
      if (file.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          trips = parsed;
        } else {
          throw new Error('JSON must be an array of trips');
        }
      } else if (file.name.endsWith('.csv')) {
        trips = parseCSVTrips(text);
      } else {
        throw new Error('Unsupported file type');
      }
      saveTrips(trips);
      renderTrips();
      showToast('Trips loaded!', 'success', '📥');
      loadFileBtn.textContent = '✅ Loaded!';
      setTimeout(() => {
        loadFileBtn.innerHTML = '<span>📂</span>Load JSON/CSV';
      }, 2000);
    } catch (err) {
      alert('Failed to load trips: ' + err.message);
      showToast('Failed to load trips!', 'error', '❌');
      loadFileBtn.textContent = '❌ Error';
      setTimeout(() => {
        loadFileBtn.innerHTML = '<span>📂</span>Load JSON/CSV';
      }, 2000);
    }
    fileInput.value = '';
  };
  reader.readAsText(file);
}

function parseCSVTrips(csv) {
  // Very basic CSV parser for this structure
  const lines = csv.trim().split(/\r?\n/);
  const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const trips = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].match(/("[^"]*"|[^,])+/g);
    if (!row || row.length < 6) continue;
    const [date, substance, dose, location, notes, timeline] = row.map(cell => cell.replace(/^"|"$/g, ''));
    const timelineArr = timeline
      ? timeline.split(' | ').map(pair => {
          const idx = pair.indexOf(':');
          if (idx === -1) return { time: '', entry: pair };
          return { time: pair.slice(0, idx).trim(), entry: pair.slice(idx + 1).trim() };
        })
      : [];
    trips.push({ date, substance, dose, location, notes, timeline: timelineArr });
  }
  return trips;
}

// --- Search & Filter Logic ---
const searchInput = document.getElementById('searchInput');
const substanceFilter = document.getElementById('substanceFilter');
const dateFrom = document.getElementById('dateFrom');
dateFrom.value = '';
const dateTo = document.getElementById('dateTo');
dateTo.value = '';
const tagFilter = document.getElementById('tagFilter');
const tripSummary = document.getElementById('tripSummary');

function getFilteredTrips() {
  let trips = getTrips();
  // Search
  const q = (searchInput?.value || '').toLowerCase();
  if (q) {
    trips = trips.filter(trip =>
      (trip.substance || '').toLowerCase().includes(q) ||
      (trip.date || '').toLowerCase().includes(q) ||
      (trip.notes || '').toLowerCase().includes(q)
    );
  }
  // Substance filter
  const sub = substanceFilter?.value;
  if (sub) {
    trips = trips.filter(trip => trip.substance === sub);
  }
  // Date range filter
  const from = dateFrom?.value;
  const to = dateTo?.value;
  if (from) {
    trips = trips.filter(trip => trip.date && trip.date >= from);
  }
  if (to) {
    trips = trips.filter(trip => trip.date && trip.date <= to);
  }
  // Tag filter
  const tag = tagFilter?.value;
  if (tag) {
    trips = trips.filter(trip => Array.isArray(trip.tags) && trip.tags.includes(tag));
  }
  return trips;
}

function updateSubstanceFilter() {
  const trips = getTrips();
  const substances = Array.from(new Set(trips.map(t => t.substance).filter(Boolean)));
  substanceFilter.innerHTML = '<option value="">All Substances</option>' + substances.map(s => `<option value="${s}">${s}</option>`).join('');
}

function updateTagFilter() {
  const trips = getTrips();
  const tags = Array.from(new Set(trips.flatMap(t => Array.isArray(t.tags) ? t.tags : [])));
  tagFilter.innerHTML = '<option value="">All Tags</option>' + tags.map(t => `<option value="${t}">${t}</option>`).join('');
}

function updateTripSummary() {
  const trips = getTrips();
  const filtered = getFilteredTrips();
  if (!tripSummary) return;
  if (trips.length === 0) {
    tripSummary.innerHTML = '<span>No trips yet.</span>';
    return;
  }
  // Most used substance
  const substanceCounts = {};
  trips.forEach(t => { if (t.substance) substanceCounts[t.substance] = (substanceCounts[t.substance] || 0) + 1; });
  const mostUsed = Object.entries(substanceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  tripSummary.innerHTML = `
    <span>Total trips: <b>${trips.length}</b></span>
    <span>Filtered: <b>${filtered.length}</b></span>
    <span>Most used substance: <b>${mostUsed}</b></span>
  `;
}

// --- Timeline Entry Logic ---
function addTimelineEntry(time = '', entry = '') {
  const timelineEntries = document.getElementById('timelineEntries');
  const div = document.createElement('div');
  div.className = 'flex gap-2 mb-2';
  div.innerHTML = `
    <input type="text" name="timelineTime" placeholder="Time (e.g. 1h 30m)" value="${time}" class="w-1/3 px-2 py-1 rounded bg-gray-700 text-psychedelic-200" />
    <input type="text" name="timelineEntry" placeholder="What happened?" value="${entry}" class="w-2/3 px-2 py-1 rounded bg-gray-700 text-psychedelic-100" />
    <button type="button" class="remove-timeline text-red-400 hover:text-red-200" title="Remove timeline entry">✖</button>
  `;
  timelineEntries.appendChild(div);
  div.querySelector('.remove-timeline').addEventListener('click', function() {
    div.remove();
  });
}

// --- Form HTML ---
tripForm.innerHTML = `
  <label class="block">
    <span class="text-psychedelic-300">Date & Time Started</span>
    <input type="datetime-local" name="date" required class="mt-1 block w-full rounded bg-gray-700 text-psychedelic-100 px-2 py-1" />
  </label>
  <label class="block">
    <span class="text-psychedelic-300">Substance</span>
    <input type="text" name="substance" required placeholder="e.g. LSD, Mushrooms" class="mt-1 block w-full rounded bg-gray-700 text-psychedelic-100 px-2 py-1" />
  </label>
  <label class="block">
    <span class="text-psychedelic-300">Dose</span>
    <input type="text" name="dose" required placeholder="e.g. 100ug, 3g" class="mt-1 block w-full rounded bg-gray-700 text-psychedelic-100 px-2 py-1" />
  </label>
  <label class="block">
    <span class="text-psychedelic-300">Location</span>
    <input type="text" name="location" placeholder="e.g. Home, Forest" class="mt-1 block w-full rounded bg-gray-700 text-psychedelic-100 px-2 py-1" />
  </label>
  <label class="block">
    <span class="text-psychedelic-300">Notes / Experiences</span>
    <textarea name="notes" rows="3" placeholder="Describe your trip..." class="mt-1 block w-full rounded bg-gray-700 text-psychedelic-100 px-2 py-1"></textarea>
  </label>
  <label class="block">
    <span class="text-psychedelic-300">Tags</span>
    <input type="text" name="tags" placeholder="e.g. solo, nature, music" class="mt-1 block w-full rounded bg-gray-700 text-psychedelic-100 px-2 py-1" />
    <span class="text-xs text-psychedelic-400">Separate tags with commas</span>
  </label>
  <div>
    <span class="text-psychedelic-300">Timeline Entries</span>
    <div id="timelineEntries"></div>
    <button type="button" id="addTimelineBtn" class="mt-2 bg-psychedelic-400 hover:bg-psychedelic-300 text-gray-900 font-bold py-1 px-3 rounded transition">+ Add Timeline Entry</button>
  </div>
  <button type="submit" class="w-full mt-4 bg-psychedelic-200 hover:bg-psychedelic-400 text-gray-900 font-bold py-2 px-4 rounded transition">Save Trip</button>
`;

document.getElementById('addTimelineBtn').addEventListener('click', () => addTimelineEntry());
addTimelineEntry();

// --- Form Submission ---
tripForm.onsubmit = function(e) {
  e.preventDefault();
  const form = e.target;
  const tags = (form.tags.value || '').split(',').map(t => t.trim()).filter(Boolean);
  const trip = {
    date: form.date.value,
    substance: form.substance.value,
    dose: form.dose.value,
    location: form.location.value,
    notes: form.notes.value,
    tags,
    timeline: []
  };
  const timelineDivs = document.getElementById('timelineEntries').children;
  for (let div of timelineDivs) {
    const time = div.querySelector('input[name="timelineTime"]').value;
    const entry = div.querySelector('input[name="timelineEntry"]').value;
    if (time || entry) {
      trip.timeline.push({ time, entry });
    }
  }
  addTrip(trip);
  clearForm();
  renderTrips();
  showToast('Trip saved!', 'success', '💾');
  // UI feedback
  tripForm.querySelector('button[type="submit"]').textContent = 'Saved!';
  setTimeout(() => {
    tripForm.querySelector('button[type="submit"]').textContent = 'Save Trip';
  }, 1200);
};

// --- Export Functions ---
function download(filename, text) {
  const element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);
  element.style.display = 'none';
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

// --- Toast/Notification System ---
function showToast(message, type = 'info', icon = '') {
  const toastContainer = document.getElementById('toastContainer');
  if (!toastContainer) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = icon ? `<span>${icon}</span> <span>${message}</span>` : `<span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.pointerEvents = 'none';
    setTimeout(() => toast.remove(), 1000);
  }, 3000);
}

// --- Animate Timeline Entries ---
function animateTimelineEntries(ul) {
  if (!ul) return;
  Array.from(ul.children).forEach((li, i) => {
    li.style.opacity = '0';
    li.style.transform = 'translateY(20px)';
    setTimeout(() => {
      li.style.transition = 'opacity 0.5s, transform 0.5s';
      li.style.opacity = '1';
      li.style.transform = 'translateY(0)';
    }, 100 + i * 80);
  });
}

// --- Update renderTrips to animate timeline and show toasts ---
function renderTrips() {
  updateSubstanceFilter();
  updateTagFilter();
  updateTripSummary();
  const trips = getFilteredTrips();
  tripList.innerHTML = '';
  if (trips.length === 0) {
    tripList.innerHTML = '<p class="text-psychedelic-400">No trips found. ✨</p>';
    return;
  }
  trips.forEach((trip, idx) => {
    const card = document.createElement('div');
    card.className = 'transition-all duration-300 bg-gray-900 bg-opacity-80 rounded-lg border border-psychedelic-400 shadow mb-4 overflow-hidden trip-card';
    card.style.cursor = 'pointer';
    // Header (always visible)
    const header = document.createElement('div');
    header.className = 'flex justify-between items-center p-4 select-none';
    header.innerHTML = `
      <div>
        <span class="font-bold text-psychedelic-200 text-lg">${trip.date}</span>
        <span class="ml-2 text-psychedelic-300">${trip.substance}</span>
        <span class="ml-2 text-psychedelic-400">${trip.dose}</span>
        <span class="ml-2 text-psychedelic-500">${trip.location}</span>
        <span class="ml-2 text-psychedelic-600">${(trip.tags || []).map(t => `<span class='bg-psychedelic-700 text-xs px-2 py-1 rounded mr-1'>#${t}</span>`).join('')}</span>
      </div>
      <div class="flex items-center gap-2">
        <button class="delete-btn text-xs text-red-400 hover:text-red-200 px-2 py-1 rounded transition" data-idx="${idx}" title="Delete">🗑️</button>
        <span class="expand-icon text-psychedelic-400 transition-transform">▼</span>
      </div>
    `;
    card.appendChild(header);
    // Details (hidden by default)
    const details = document.createElement('div');
    details.className = 'trip-details px-4 pb-4 pt-0 max-h-0 opacity-0 pointer-events-none transition-all duration-300 ease-in-out';
    details.innerHTML = `
      <div class="mt-2"><b>🧪 Dose:</b> <span class="text-psychedelic-100">${trip.dose}</span></div>
      <div><b>📍 Location:</b> <span class="text-psychedelic-100">${trip.location}</span></div>
      <div><b>📝 Notes:</b> <span class="text-psychedelic-100">${trip.notes}</span></div>
      <div><b>🏷️ Tags:</b> <span>${(trip.tags || []).map(t => `<span class='bg-psychedelic-700 text-xs px-2 py-1 rounded mr-1'>#${t}</span>`).join('') || 'None'}</span></div>
      <div><b>⏳ Timeline:</b>
        <ul class="list-disc list-inside text-psychedelic-400 timeline-ul">
          ${trip.timeline.map(t => `<li><span class='text-psychedelic-300'>${t.time}</span>: ${t.entry}</li>`).join('')}
        </ul>
      </div>
    `;
    card.appendChild(details);
    // Accordion logic
    header.addEventListener('click', function(e) {
      if (e.target.classList.contains('delete-btn')) return;
      const expanded = details.classList.contains('open');
      document.querySelectorAll('.trip-details.open').forEach(el => {
        el.classList.remove('open');
        el.style.maxHeight = '0px';
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        el.previousSibling.querySelector('.expand-icon').style.transform = 'rotate(0deg)';
      });
      if (!expanded) {
        details.classList.add('open');
        details.style.maxHeight = details.scrollHeight + 40 + 'px';
        details.style.opacity = '1';
        details.style.pointerEvents = 'auto';
        header.querySelector('.expand-icon').style.transform = 'rotate(180deg)';
        setTimeout(() => {
          card.scrollIntoView({ behavior: 'smooth', block: 'center' });
          animateTimelineEntries(details.querySelector('.timeline-ul'));
        }, 200);
      }
    });
    header.querySelector('.delete-btn').addEventListener('click', function(e) {
      e.stopPropagation();
      deleteTrip(idx);
      showToast('Trip deleted!', 'success', '🗑️');
    });
    tripList.appendChild(card);
  });
}

function deleteTrip(idx) {
  const trips = getTrips();
  trips.splice(idx, 1);
  saveTrips(trips);
  renderTrips();
}

// --- PIN/Password Protection ---
const pinModal = document.getElementById('pinModal');
const pinInput = document.getElementById('pinInput');
const submitPin = document.getElementById('submitPin');
const setPinLink = document.getElementById('setPinLink');
const pinError = document.getElementById('pinError');
const togglePinVisibility = document.getElementById('togglePinVisibility');

function hashPin(pin) {
  // Simple hash for demo (not cryptographically secure)
  let hash = 0, i, chr;
  if (pin.length === 0) return hash;
  for (i = 0; i < pin.length; i++) {
    chr = pin.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString();
}

function isPinSet() {
  return !!localStorage.getItem('trips_pin_hash');
}

function checkPin(pin) {
  return hashPin(pin) === localStorage.getItem('trips_pin_hash');
}

function showPinModal() {
  pinModal.classList.remove('hidden');
  pinInput.value = '';
  pinError.textContent = '';
  pinInput.focus();
}

function hidePinModal() {
  pinModal.classList.add('hidden');
}

function setPin(pin) {
  localStorage.setItem('trips_pin_hash', hashPin(pin));
}

function clearPin() {
  localStorage.removeItem('trips_pin_hash');
}

// Show/hide PIN
let pinVisible = false;
togglePinVisibility.addEventListener('click', () => {
  pinVisible = !pinVisible;
  pinInput.type = pinVisible ? 'text' : 'password';
  togglePinVisibility.textContent = pinVisible ? 'Hide' : 'Show';
});

// Submit PIN
submitPin.addEventListener('click', tryUnlock);
pinInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });

function tryUnlock() {
  const pin = pinInput.value;
  if (!isPinSet()) {
    pinError.textContent = 'No PIN set. Click below to set one.';
    return;
  }
  if (checkPin(pin)) {
    hidePinModal();
    sessionStorage.setItem('trips_unlocked', '1');
    showToast('Unlocked!', 'success', '🔓');
  } else {
    pinError.textContent = 'Incorrect PIN. Try again.';
    pinInput.value = '';
    pinInput.focus();
    showToast('Incorrect PIN!', 'error', '❌');
  }
}

// Set/Change PIN
setPinLink.addEventListener('click', () => {
  const newPin = prompt('Set a new PIN/password (leave blank to remove):');
  if (newPin === null) return;
  if (newPin.trim() === '') {
    clearPin();
    alert('PIN removed.');
    hidePinModal();
    sessionStorage.setItem('trips_unlocked', '1');
    showToast('PIN removed!', 'info', '🔓');
    return;
  }
  setPin(newPin.trim());
  alert('PIN set!');
  hidePinModal();
  sessionStorage.setItem('trips_unlocked', '1');
  showToast('PIN set!', 'success', '🔒');
});

// On load, show modal if PIN is set and not unlocked
window.addEventListener('DOMContentLoaded', () => {
  if (isPinSet() && sessionStorage.getItem('trips_unlocked') !== '1') {
    showPinModal();
  }
});

// --- Initial Render ---
renderTrips(); 