/* script.js */
'use strict'; // enable strict mode for safer JS [web:47][web:54]

document.addEventListener('DOMContentLoaded', () => { // ensure DOM exists before wiring [web:48][web:59]

  // Element references
  const form = document.getElementById('');
  const itineraryArea = document.getElementById('itineraryArea');
  const bookingsArea = document.getElementById('bookingsArea');
  const downloadBtn = document.getElementById('downloadItinerary');
  const saveBtn = document.getElementById('saveItinerary');
  const loadSavedBtn = document.getElementById('loadSaved');
  const clearAllBtn = document.getElementById('clearAll');
  const liveAlert = document.getElementById('liveAlert');

  // State
  let currentItinerary = null;

  // Utils
  const safeJSONParse = (str, fallback) => {
    try { return JSON.parse(str); } catch { return fallback; } // localStorage guard [web:27][web:33]
  };
  const sanitizeText = (s) => String(s || '').replace(/[<>]/g, ''); // very light sanitization

  // Date helpers
  const daysBetween = (a, b) => {
    const A = new Date(a), B = new Date(b);
    const diff = Math.ceil((B - A) / (1000*60*60*24)) + 1;
    return Math.max(1, diff);
  };

  // Templates
  const templates = {
    culture: [
      {title:'Heritage Walk', desc:'Local museum + historical site' },
      {title:'Local Market', desc:'Explore cultural markets and crafts' },
      {title:'Traditional Dinner', desc:'Try popular local cuisine' }
    ],
    adventure: [
      {title:'Trek/Trail', desc:'Short trek or nature trail' },
      {title:'Water Sports', desc:'Kayaking / river activity (if available)' },
      {title:'Sunset Point', desc:'Scenic viewpoint, good for photos' }
    ],
    food: [
      {title:'Street Food Tour', desc:'Taste local specialties' },
      {title:'Cafe Hopping', desc:'Popular cafes and bakeries' },
      {title:'Cooking Class', desc:'Local cooking experience' }
    ],
    nature: [
      {title:'Scenic Spot', desc:'Lake or viewpoint visit' },
      {title:'Botanical/Garden', desc:'Nature spot and relaxing walks' },
      {title:'Relaxation Evening', desc:'Chill at a peaceful spot' }
    ],
    shopping: [
      {title:'Local Bazaar', desc:'Handicrafts and local goods' },
      {title:'Mall/Market', desc:'Modern shopping and dining' },
      {title:'Souvenir Hunt', desc:'Collect local souvenirs' }
    ]
  };

  // Storage helpers
  const getBookings = () => safeJSONParse(localStorage.getItem('bookings') || '[]', []); // [web:27][web:33]
  const saveBookings = (list) => {
    // Demo only: do not store sensitive PII in localStorage [web:27][web:30]
    localStorage.setItem('bookings', JSON.stringify(list));
  };

  // Generators
  const generateItinerary = (name, dest, start, end, budget, interest) => {
    const days = daysBetween(start, end);
    const baseTemplates = templates[interest] || templates.culture;
    const items = [];
    for (let d = 1; d <= days; d++) {
      const main = baseTemplates[(d - 1) % baseTemplates.length];
      const costPerDay = Math.max(500, Math.round((Number(budget) || 0) / Math.max(1, days) * (0.6 + (Math.random() * 0.6))));
      const date = (() => { const dt = new Date(start); dt.setDate(dt.getDate() + (d - 1)); return dt.toISOString().slice(0,10); })();
      items.push({
        day: d,
        title: `${main.title}`,
        desc: `${main.desc} • Estimated cost: ₹${costPerDay}`,
        date
      });
    }
    return { owner: name, destination: dest, start, end, days, budget, interest, items };
  };

  // Renderers
  const renderBookings = () => {
    const list = getBookings();
    bookingsArea.innerHTML = '';
    if (!list.length) {
      bookingsArea.innerHTML = '<p class="empty">No bookings yet.</p>';
      return;
    }
    list.forEach((b, idx) => {
      const div = document.createElement('div');
      div.className = 'booking-item';
      const safeTitle = sanitizeText(b.title);
      const safeDate = sanitizeText(b.date);
      const safeType = sanitizeText(b.type);
      div.innerHTML = `
        <div>
          <strong>${safeTitle}</strong>
          <div style="color:#94a3b8;font-size:13px">${safeDate} • ${safeType}</div>
        </div>
        <div>
          <button class="book-btn" data-idx="${idx}" aria-label="Cancel booking ${safeTitle}">Cancel</button>
        </div>`;
      bookingsArea.appendChild(div);
    });

    // Cancel handler
    bookingsArea.querySelectorAll('.book-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx);
        const list = getBookings();
        list.splice(idx, 1);
        saveBookings(list);
        renderBookings();
      });
    });
  };

  const renderItinerary = (it) => {
    itineraryArea.innerHTML = '';
    if (!it || !it.items || !it.items.length) {
      itineraryArea.innerHTML = '<p class="empty">No itinerary yet. Click Generate!</p>';
      downloadBtn.disabled = true;
      saveBtn.disabled = true;
      return;
    }
    it.items.forEach((itx, idx) => {
      const div = document.createElement('div');
      div.className = 'it-item';
      const safeTitle = sanitizeText(itx.title);
      const safeDesc = sanitizeText(itx.desc);
      const safeDate = sanitizeText(itx.date);
      div.innerHTML = `
        <div class="it-left">
          <div class="it-title">Day ${itx.day} — ${safeTitle}</div>
          <div class="it-desc">${safeDesc} <span style="color:#94a3b8">• ${safeDate}</span></div>
        </div>
        <div style="min-width:120px;text-align:right">
          <button class="book-btn" data-idx="${idx}" aria-pressed="false" aria-label="Book ${safeTitle} on ${safeDate}">Book</button>
        </div>`;
      itineraryArea.appendChild(div);
    });

    // Attach book handlers
    itineraryArea.querySelectorAll('.book-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx);
        const item = currentItinerary.items[idx];
        const list = getBookings();
        list.push({
          title: `${currentItinerary.destination} • ${item.title}`,
          date: item.date,
          type: 'Activity'
        });
        saveBookings(list);
        renderBookings();
        e.currentTarget.disabled = true;
        e.currentTarget.textContent = 'Booked';
        e.currentTarget.classList.add('booked-tag');
        e.currentTarget.setAttribute('aria-pressed', 'true');
      });
    });

    downloadBtn.disabled = false;
    saveBtn.disabled = false;
  };

  // Download (JSON)
  const downloadJSON = (it) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(it, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `${sanitizeText(it.owner || 'itinerary')}-${sanitizeText(it.destination || 'trip')}.json`;
    a.click();
  };

  // Save/Load
  const saveOffline = (it) => {
    localStorage.setItem('savedItinerary', JSON.stringify(it)); // avoid sensitive data [web:27][web:30]
    alert('Itinerary saved for offline use.');
  };
  const loadSaved = () => {
    const s = localStorage.getItem('savedItinerary');
    if (!s) { alert('No saved itinerary found.'); return; }
    currentItinerary = safeJSONParse(s, null);
    if (!currentItinerary) { alert('Saved data invalid.'); return; }
    renderItinerary(currentItinerary);
  };
  const clearAll = () => {
    if (!confirm('Clear saved itinerary and bookings?')) return;
    localStorage.removeItem('savedItinerary');
    localStorage.removeItem('bookings');
    currentItinerary = null;
    renderItinerary(null);
    renderBookings();
    alert('Cleared saved data.');
  };

  // Alerts
  const simulatedAlerts = [
    'Weather alert: Light showers expected tomorrow evening.',
    'Flight update: Your airline reports a possible 45-min delay.',
    'Price drop: Hotel prices lowered for certain dates.',
    'Traffic alert: Road diversion near main tourist spot today.'
  ];
  const startAlerts = () => {
    const showRandom = () => {
      const text = simulatedAlerts[Math.floor(Math.random() * simulatedAlerts.length)];
      if (liveAlert) {
        liveAlert.textContent = text;
        liveAlert.style.background = 'linear-gradient(90deg, rgba(45,212,191,0.08), rgba(255,255,255,0.02))';
        setTimeout(() => { liveAlert.style.background = 'transparent'; }, 4000);
      }
      const next = 20000 + Math.floor(Math.random() * 15000);
      setTimeout(showRandom, next);
    };
    setTimeout(showRandom, 4000);
  };

  // Form submit
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const dest = document.getElementById('destination').value.trim();
      const start = document.getElementById('startDate').value;
      const end = document.getElementById('endDate').value;
      const budget = Number(document.getElementById('budget').value || 0);
      const interest = document.getElementById('interest').value;

      if (!name || !dest || !start || !end) { alert('Please fill all fields.'); return; }
      if (new Date(end) < new Date(start)) { alert('End date must be same or after start date.'); return; }

      currentItinerary = generateItinerary(name, dest, start, end, budget, interest);
      renderItinerary(currentItinerary);
    });
  }

  // Buttons
  if (downloadBtn) downloadBtn.addEventListener('click', () => { if (currentItinerary) downloadJSON(currentItinerary); });
  if (saveBtn) saveBtn.addEventListener('click', () => { if (currentItinerary) saveOffline(currentItinerary); });
  if (loadSavedBtn) loadSavedBtn.addEventListener('click', loadSaved);
  if (clearAllBtn) clearAllBtn.addEventListener('click', clearAll);

  // Initial boot
  renderBookings();
  renderItinerary(null);
  startAlerts();

}); // DOMContentLoaded [web:48][web:59]
