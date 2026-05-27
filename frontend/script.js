/* -------------------------------------------------------------
   Trustera Consulting - Client Side Script
   Supports Google Apps Script, REST API CORS, & local Offline Mocks
   ------------------------------------------------------------- */

// CONFIGURATION STATE
const CONFIG = {
  // Key for local storage persistence
  STORAGE_KEYS: {
    API_URL: 'trustera_api_url',
    ADMIN_SESSION: 'trustera_admin_session',
    MOCK_BOOKINGS: 'trustera_mock_bookings',
    MOCK_VISITORS: 'trustera_mock_visitors'
  },
  
  // Custom API Endpoint URL (Google Web App execution URL)
  apiUrl: localStorage.getItem('trustera_api_url') || '',
  
  // Admin credentials (mirrors backend config)
  adminUser: 'Siddh',
  adminPass: 'Siddh2525'
};

// GLOBAL APP STATE
let state = {
  isAdminLoggedIn: false,
  activeTab: 'tab-bookings',
  bookings: [],
  visitors: [],
  services: []
};

// INITIALIZATION
window.onload = function() {
  initApiUrlDisplay();
  logPageVisit();
  setupEventListeners();
  checkAdminSession();
};

// LOG VISIT ON LOAD
function logPageVisit() {
  const userAgent = navigator.userAgent;
  const page = "public";
  
  callApi('logVisit', { page: page, userAgent: userAgent }, function(response) {
    console.log("Visit logged successfully", response);
  });
}

// SETUP VIEW LISTENERS
function setupEventListeners() {
  // Mobile Nav Hamburger Toggle
  const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');
  
  if (mobileMenuBtn && navLinks) {
    mobileMenuBtn.addEventListener('click', () => {
      navLinks.style.display = navLinks.style.display === 'flex' ? 'none' : 'flex';
      navLinks.style.flexDirection = 'column';
      navLinks.style.position = 'absolute';
      navLinks.style.top = '70px';
      navLinks.style.left = '0';
      navLinks.style.width = '100%';
      navLinks.style.background = 'rgba(6, 9, 19, 0.95)';
      navLinks.style.padding = '20px';
      navLinks.style.borderBottom = '1px solid var(--glass-border)';
    });
  }

  // Smooth Scrolling Nav Highlight
  const sections = document.querySelectorAll('.scroll-section, #hero');
  const navItems = document.querySelectorAll('.nav-links a');
  
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.clientHeight;
      if (window.scrollY >= (sectionTop - 150)) {
        current = section.getAttribute('id');
      }
    });
    
    navItems.forEach(item => {
      item.classList.remove('active');
      if (item.getAttribute('href').slice(1) === current) {
        item.classList.add('active');
      }
    });
  });
}

// ================= API SERVICE CLIENT (HYBRID API) =================
/**
 * Executes a backend backend function.
 * 1. Checks if running inside Google Apps Script iframe environment (uses google.script.run).
 * 2. If running externally, checks if API URL is configured (uses standard CORS fetch POST).
 * 3. Bypasses to Offline Mock DB if offline/local preview mode.
 */
function callApi(action, params, callback, failureCallback) {
  // Case A: Running directly inside Google Apps Script (GAS Web App direct view)
  if (typeof google !== 'undefined' && google.script && google.script.run) {
    console.log(`[GAS Env] Dispatching action: ${action}`);
    
    // Dynamically call server function by name
    const serverCall = google.script.run
      .withSuccessHandler(function(res) {
        if (callback) callback({ success: true, data: res });
      })
      .withFailureHandler(function(err) {
        console.error(`GAS Server Error: ${err}`);
        if (failureCallback) failureCallback(err);
      });
      
    // Execute calls with parameters depending on the signature
    if (action === 'getDashboardSummary') serverCall.getDashboardSummary();
    else if (action === 'getBookings') serverCall.getBookings();
    else if (action === 'getVisitors') serverCall.getVisitors();
    else if (action === 'getServices') serverCall.getServices();
    else if (action === 'addBooking') serverCall.addBooking(params);
    else if (action === 'updateBookingStatus') serverCall.updateBookingStatus(params.row, params.status);
    else if (action === 'logVisit') serverCall.logVisit(params.page, params.userAgent);
    else if (action === 'authenticate') {
      google.script.run
        .withSuccessHandler(function(authenticated) {
          if (callback) callback({ success: true, authenticated: authenticated });
        })
        .authenticate(params.username, params.password);
    }
    return;
  }
  
  // Case B: Configured External REST API Mode (CORS)
  if (CONFIG.apiUrl) {
    console.log(`[API Env] Dispatching action: ${action}`);
    
    // We send payload as text/plain to prevent CORS preflight check OPTIONS block.
    // Apps Script parse text/plain doPost content perfectly.
    const requestData = { action: action, ...params };
    
    fetch(CONFIG.apiUrl, {
      method: 'POST',
      mode: 'cors',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(requestData)
    })
    .then(response => {
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return response.json();
    })
    .then(result => {
      if (callback) callback(result);
    })
    .catch(error => {
      console.error(`[API Env] Connection Error: ${error}`);
      if (failureCallback) failureCallback(error);
      else {
        // Soft fail alert notification
        showNotification("Failed to connect to spreadsheet database API. Reverting temporarily to local cache.", "warning");
        callMockDatabase(action, params, callback);
      }
    });
    return;
  }
  
  // Case C: Offline Local Preview Mode (Mock DB)
  console.log(`[Local Mock Env] Dispatching action: ${action}`);
  callMockDatabase(action, params, callback);
}

// ================= OFFLINE MOCK DATABASE SYSTEM =================
/**
 * Emulates the Google Spreadsheet database locally using localStorage.
 * Enables full site testing (booking submittals, dashboard, admin) on preview.
 */
function callMockDatabase(action, params, callback) {
  // Initialize mock arrays if empty
  if (!localStorage.getItem(CONFIG.STORAGE_KEYS.MOCK_BOOKINGS)) {
    const defaultBookings = [
      { Timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), Name: 'Raj Patel', 'Contact Number': '9876543210', Email: 'raj.patel@gmail.com', Service: 'Salary Automation', Description: 'Looking to link employee logs to payout sheets automatically.', 'End Date': '2026-06-15', Status: 'New', row: 2 },
      { Timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), Name: 'Priya Sharma', 'Contact Number': '9123456780', Email: 'priya@outfitters.in', Service: 'Employee Portal', Description: 'Need a central spreadsheet dashboard for employee profiles.', 'End Date': '2026-06-30', Status: 'In Progress', row: 3 },
      { Timestamp: new Date(Date.now() - 3600000 * 48).toISOString(), Name: 'Amit Mehta', 'Contact Number': '9988776655', Email: 'amit@mehtatech.co.in', Service: 'Attendance Automation', Description: 'Automated card scanning logs parser.', 'End Date': '2026-06-10', Status: 'Completed', row: 4 }
    ];
    localStorage.setItem(CONFIG.STORAGE_KEYS.MOCK_BOOKINGS, JSON.stringify(defaultBookings));
  }
  
  if (!localStorage.getItem(CONFIG.STORAGE_KEYS.MOCK_VISITORS)) {
    const defaultVisitors = [
      { Timestamp: new Date(Date.now() - 600000).toISOString(), Page: 'public', UserAgent: navigator.userAgent },
      { Timestamp: new Date(Date.now() - 1200000).toISOString(), Page: 'public', UserAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)' },
      { Timestamp: new Date(Date.now() - 7200000).toISOString(), Page: 'public', UserAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' }
    ];
    localStorage.setItem(CONFIG.STORAGE_KEYS.MOCK_VISITORS, JSON.stringify(defaultVisitors));
  }

  // Get data arrays
  let bookings = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.MOCK_BOOKINGS));
  let visitors = JSON.parse(localStorage.getItem(CONFIG.STORAGE_KEYS.MOCK_VISITORS));

  let response = { success: false };

  switch (action) {
    case 'getDashboardSummary':
      let newCount = bookings.filter(b => b.Status === 'New').length;
      let progressCount = bookings.filter(b => b.Status === 'In Progress' || b.Status === 'Contacted').length;
      let completedCount = bookings.filter(b => b.Status === 'Completed').length;
      response = {
        success: true,
        data: {
          totalBookings: bookings.length,
          totalVisitors: visitors.length,
          newBookings: newCount,
          progressBookings: progressCount,
          completedBookings: completedCount
        }
      };
      break;
      
    case 'getBookings':
      response = { success: true, data: bookings };
      break;
      
    case 'getVisitors':
      response = { success: true, data: visitors };
      break;
      
    case 'addBooking':
      const newBooking = {
        Timestamp: new Date().toISOString(),
        Name: params.name,
        'Contact Number': params.contact,
        Email: params.email,
        Service: params.service,
        Description: params.description,
        'End Date': params.endDate,
        Status: 'New',
        row: bookings.length + 2
      };
      bookings.push(newBooking);
      localStorage.setItem(CONFIG.STORAGE_KEYS.MOCK_BOOKINGS, JSON.stringify(bookings));
      response = { success: true };
      break;
      
    case 'updateBookingStatus':
      const rowTarget = parseInt(params.row);
      bookings = bookings.map(b => {
        if (b.row === rowTarget) {
          b.Status = params.status;
        }
        return b;
      });
      localStorage.setItem(CONFIG.STORAGE_KEYS.MOCK_BOOKINGS, JSON.stringify(bookings));
      response = { success: true };
      break;
      
    case 'logVisit':
      const newVisit = {
        Timestamp: new Date().toISOString(),
        Page: params.page || 'public',
        UserAgent: params.userAgent || 'Unknown'
      };
      visitors.push(newVisit);
      localStorage.setItem(CONFIG.STORAGE_KEYS.MOCK_VISITORS, JSON.stringify(visitors));
      response = { success: true };
      break;
      
    case 'authenticate':
      const authSuccess = (params.username === CONFIG.adminUser && params.password === CONFIG.adminPass);
      response = { success: true, authenticated: authSuccess };
      break;
      
    default:
      response = { success: false, error: 'Mock action not recognized' };
  }

  // Simulate server response delay of 150ms for realistic UI feel
  setTimeout(() => {
    if (callback) callback(response);
  }, 150);
}

// ================= MODAL CONTROLLER FUNCTIONS =================
function openBookingModal(serviceName = "") {
  const modal = document.getElementById('booking-modal');
  const title = document.getElementById('modal-title');
  const serviceInput = document.getElementById('service-input');
  
  if (serviceName) {
    title.textContent = `Customize: ${serviceName}`;
    serviceInput.value = serviceName;
  } else {
    title.textContent = "Book a Service";
    serviceInput.value = "General Consultation";
  }
  
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden'; // Lock background scroll
}

function closeBookingModal() {
  const modal = document.getElementById('booking-modal');
  modal.style.display = 'none';
  document.body.style.overflow = ''; // Unlock scroll
  document.getElementById('booking-form').reset();
}

// Submit Service inquiry booking
function submitBooking(event) {
  event.preventDefault();
  
  const submitBtn = document.getElementById('btn-booking-submit');
  const textSpan = submitBtn.querySelector('.btn-text');
  const spinnerSpan = submitBtn.querySelector('.btn-loading-spinner');
  
  // Gather variables
  const bookingData = {
    name: document.getElementById('client-name').value,
    contact: document.getElementById('client-contact').value,
    email: document.getElementById('client-email').value,
    service: document.getElementById('service-input').value,
    description: document.getElementById('requirement-desc').value,
    endDate: document.getElementById('target-date').value
  };

  // Lock buttons
  submitBtn.disabled = true;
  textSpan.style.display = 'none';
  spinnerSpan.style.display = 'inline-block';

  callApi('addBooking', { booking: bookingData }, function(response) {
    // Unlock button
    submitBtn.disabled = false;
    textSpan.style.display = 'inline-block';
    spinnerSpan.style.display = 'none';
    
    if (response.success) {
      showNotification("Inquiry Saved! Redirecting to WhatsApp to send message...", "success");
      closeBookingModal();
      
      // WhatsApp message formatting
      const whatsappMsg = `Hello Trustera Consulting, I would like to book a service:\n\n` +
                          `*Name:* ${bookingData.name}\n` +
                          `*Contact:* ${bookingData.contact}\n` +
                          `*Email:* ${bookingData.email}\n` +
                          `*Service:* ${bookingData.service}\n` +
                          `*Description:* ${bookingData.description}\n` +
                          `*Target Deadline:* ${bookingData.endDate || 'Not specified'}`;
      
      const encodedMsg = encodeURIComponent(whatsappMsg);
      const whatsappUrl = `https://wa.me/919638312502?text=${encodedMsg}`;
      
      // Open WhatsApp link in a new tab
      window.open(whatsappUrl, '_blank');
    } else {
      showNotification(`Submission error: ${response.error || "Please try again"}`, "error");
    }
  }, function(err) {
    submitBtn.disabled = false;
    textSpan.style.display = 'inline-block';
    spinnerSpan.style.display = 'none';
    showNotification("Error sending request. Check network connection.", "error");
  });
}

// Close modals if click happens on background
window.onclick = function(event) {
  const bookingModal = document.getElementById('booking-modal');
  const apiModal = document.getElementById('api-config-modal');
  
  if (event.target === bookingModal) closeBookingModal();
  if (event.target === apiModal) closeApiConfigModal();
};

// ================= ADMIN PORTAL CONTROLS =================
function toggleAdminView() {
  const publicView = document.getElementById('public-view');
  const adminView = document.getElementById('admin-view');
  const isCurrentlyPublic = (publicView.style.display !== 'none');
  
  if (isCurrentlyPublic) {
    publicView.style.display = 'none';
    adminView.style.display = 'block';
    
    // Toggle navigation indicator state
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    document.querySelector('.btn-admin-nav').style.background = 'var(--accent-blue)';
    
    if (state.isAdminLoggedIn) {
      document.getElementById('admin-login').style.display = 'none';
      document.getElementById('admin-dashboard').style.display = 'block';
      loadAdminData();
    } else {
      document.getElementById('admin-login').style.display = 'block';
      document.getElementById('admin-dashboard').style.display = 'none';
    }
  } else {
    // Return to public page
    publicView.style.display = 'block';
    adminView.style.display = 'none';
    document.querySelector('.btn-admin-nav').style.background = 'rgba(74, 122, 255, 0.15)';
    document.querySelector('.nav-links a[href="#hero"]').classList.add('active');
  }
}

// Secure Login request
function handleAdminLogin(event) {
  event.preventDefault();
  
  const user = document.getElementById('username').value;
  const pass = document.getElementById('password').value;
  const loginError = document.getElementById('login-error');
  const loginSubmitBtn = document.getElementById('btn-login-submit');
  
  loginError.textContent = "";
  loginSubmitBtn.disabled = true;
  loginSubmitBtn.textContent = "Verifying Signatures...";

  callApi('authenticate', { username: user, password: pass }, function(response) {
    loginSubmitBtn.disabled = false;
    loginSubmitBtn.textContent = "Login Secured Portal";
    
    if (response.success && response.authenticated) {
      state.isAdminLoggedIn = true;
      sessionStorage.setItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION, 'active');
      
      document.getElementById('admin-login').style.display = 'none';
      document.getElementById('admin-dashboard').style.display = 'block';
      loadAdminData();
      showNotification("Authorized access approved.", "success");
    } else {
      loginError.textContent = "Invalid username or password configuration.";
      showNotification("Access Denied.", "error");
    }
  }, function(err) {
    loginSubmitBtn.disabled = false;
    loginSubmitBtn.textContent = "Login Secured Portal";
    loginError.textContent = "Connection to authentication servers failed.";
  });
}

function handleAdminLogout() {
  state.isAdminLoggedIn = false;
  sessionStorage.removeItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION);
  document.getElementById('admin-login').style.display = 'block';
  document.getElementById('admin-dashboard').style.display = 'none';
  showNotification("Logged out successfully.", "info");
}

function checkAdminSession() {
  const activeSession = sessionStorage.getItem(CONFIG.STORAGE_KEYS.ADMIN_SESSION);
  if (activeSession === 'active') {
    state.isAdminLoggedIn = true;
  }
}

// Load stats & grid data
function loadAdminData(forceRefresh = false) {
  if (forceRefresh) {
    showNotification("Syncing spreadsheet records...", "info");
  }
  
  // 1. Fetch dashboard numerical summaries
  callApi('getDashboardSummary', {}, function(response) {
    if (response.success && response.data) {
      const summary = response.data;
      document.getElementById('stat-total-visitors').textContent = summary.totalVisitors;
      document.getElementById('stat-total-bookings').textContent = summary.totalBookings;
      document.getElementById('stat-new-bookings').textContent = summary.newBookings;
      document.getElementById('stat-completed-bookings').textContent = summary.completedBookings;
    }
  });

  // 2. Fetch inquiry log and draw table
  callApi('getBookings', {}, function(response) {
    if (response.success && response.data) {
      state.bookings = response.data;
      renderBookingsTable(state.bookings);
    }
  });

  // 3. Fetch visitor logs and draw table
  callApi('getVisitors', {}, function(response) {
    if (response.success && response.data) {
      state.visitors = response.data;
      renderVisitorsTable(state.visitors);
    }
  });
}

// Tab controller logic
function switchDashboardTab(tabId) {
  state.activeTab = tabId;
  
  // Toggle tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.outerHTML.includes(tabId)) btn.classList.add('active');
  });
  
  // Toggle tab panels
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active-content');
  });
  document.getElementById(tabId).classList.add('active-content');
}

// Draw Bookings management table
function renderBookingsTable(data) {
  const tbody = document.querySelector('#bookings-table tbody');
  tbody.innerHTML = '';
  
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="loading-cell">No inquiries found in database.</td></tr>`;
    return;
  }

  // Sort descending by timestamp (newest first)
  const sorted = [...data].sort((a,b) => new Date(b.Timestamp) - new Date(a.Timestamp));

  sorted.forEach(row => {
    const tr = document.createElement('tr');
    
    // Format timestamp nicely
    const dateFormatted = new Date(row.Timestamp).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
    
    // Status color pill class
    let statusClass = 'new';
    if (row.Status === 'Contacted' || row.Status === 'In Progress') statusClass = 'contacted';
    if (row.Status === 'Completed') statusClass = 'completed';

    tr.innerHTML = `
      <td>${dateFormatted}</td>
      <td><strong>${escapeHtml(row.Name)}</strong></td>
      <td>
        <div style="font-size: 0.85rem;"><i class="fas fa-phone-alt"></i> ${escapeHtml(row['Contact Number'] || '')}</div>
        <div style="font-size: 0.85rem; opacity: 0.7;"><i class="fas fa-envelope"></i> ${escapeHtml(row.Email || '')}</div>
      </td>
      <td><span class="section-badge" style="margin-bottom:0;">${escapeHtml(row.Service)}</span></td>
      <td><div style="max-height: 80px; overflow-y: auto; font-size: 0.85rem;">${escapeHtml(row.Description || '')}</div></td>
      <td>${row['End Date'] ? new Date(row['End Date']).toLocaleDateString('en-IN', {day:'numeric', month:'short'}) : 'None'}</td>
      <td><span class="status-badge ${statusClass}">${row.Status || 'New'}</span></td>
      <td>
        <select class="status-select" onchange="updateBookingStatus(${row.row}, this.value)">
          <option value="New" ${row.Status === 'New' ? 'selected' : ''}>New</option>
          <option value="Contacted" ${row.Status === 'Contacted' ? 'selected' : ''}>Contacted</option>
          <option value="Completed" ${row.Status === 'Completed' ? 'selected' : ''}>Completed</option>
        </select>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Inline status adjustment API callback
function updateBookingStatus(rowNum, newStatus) {
  callApi('updateBookingStatus', { row: rowNum, status: newStatus }, function(response) {
    if (response.success) {
      showNotification(`Booking status updated to: ${newStatus}`, "success");
      loadAdminData(); // Refresh summary calculations & states
    } else {
      showNotification(`Failure updating record: ${response.error}`, "error");
    }
  });
}

// Draw Visitor analytics table
function renderVisitorsTable(data) {
  const tbody = document.querySelector('#visitors-table tbody');
  tbody.innerHTML = '';
  
  if (data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="loading-cell">No traffic records in logs.</td></tr>`;
    return;
  }

  // Sort descending by timestamp (newest first)
  const sorted = [...data].sort((a,b) => new Date(b.Timestamp) - new Date(a.Timestamp));
  
  // Cap table output to last 50 entries to keep it light
  const limit = sorted.slice(0, 50);

  limit.forEach(row => {
    const tr = document.createElement('tr');
    const dateFormatted = new Date(row.Timestamp).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });

    tr.innerHTML = `
      <td style="font-weight: 500;">${dateFormatted}</td>
      <td><span class="status-badge contacted">${escapeHtml(row.Page)}</span></td>
      <td style="font-size: 0.8rem; opacity: 0.7; max-width: 500px;" title="${escapeHtml(row.UserAgent)}">${escapeHtml(row.UserAgent)}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ================= API SETTINGS CONFIGURATION =================
function openApiConfigModal() {
  const modal = document.getElementById('api-config-modal');
  const input = document.getElementById('api-url-input');
  
  input.value = CONFIG.apiUrl;
  modal.style.display = 'flex';
}

function closeApiConfigModal() {
  document.getElementById('api-config-modal').style.display = 'none';
}

function saveApiUrl() {
  const inputVal = document.getElementById('api-url-input').value.trim();
  
  if (inputVal) {
    if (!inputVal.startsWith('https://script.google.com/macros/')) {
      showNotification("Invalid Apps Script URL format. Enter the Deployment execution link.", "error");
      return;
    }
    CONFIG.apiUrl = inputVal;
    localStorage.setItem(CONFIG.STORAGE_KEYS.API_URL, inputVal);
    showNotification("Connected API endpoint successfully. Re-syncing database...", "success");
  } else {
    resetApiUrlToMock();
  }
  
  closeApiConfigModal();
  loadAdminData();
}

function resetApiUrlToMock() {
  CONFIG.apiUrl = '';
  localStorage.removeItem(CONFIG.STORAGE_KEYS.API_URL);
  showNotification("Reverted to Offline Mock Database mode.", "info");
  closeApiConfigModal();
  loadAdminData();
}

function initApiUrlDisplay() {
  const configBtn = document.querySelector('.btn-secondary[onclick="openApiConfigModal()"]');
  if (configBtn) {
    if (CONFIG.apiUrl) {
      configBtn.innerHTML = '<i class="fas fa-plug" style="color:var(--accent-cyan)"></i> API Connected';
    } else {
      configBtn.innerHTML = '<i class="fas fa-plug"></i> Demo/Mock Mode';
    }
  }
}

// ================= UTILITIES & NOTIFICATIONS =================
function showNotification(message, type = "info") {
  // Remove existing notification if any
  const oldToast = document.querySelector('.toast-notification');
  if (oldToast) oldToast.remove();
  
  const toast = document.createElement('div');
  toast.className = `toast-notification glass-card ${type}`;
  
  let icon = '<i class="fas fa-info-circle"></i>';
  if (type === 'success') icon = '<i class="fas fa-check-circle"></i>';
  if (type === 'error') icon = '<i class="fas fa-exclamation-triangle"></i>';
  if (type === 'warning') icon = '<i class="fas fa-exclamation-circle"></i>';
  
  toast.innerHTML = `${icon} <span>${message}</span>`;
  document.body.appendChild(toast);
  
  // Custom toast notification styling injections dynamically
  if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
      .toast-notification {
        position: fixed;
        bottom: 30px;
        right: 30px;
        padding: 16px 24px;
        border-radius: 12px;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 12px;
        font-weight: 500;
        animation: toastIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        max-width: 380px;
      }
      .toast-notification.success { border-color: rgba(16, 185, 129, 0.4); color: #a7f3d0; background: rgba(16, 185, 129, 0.1); }
      .toast-notification.error { border-color: rgba(239, 68, 68, 0.4); color: #fca5a5; background: rgba(239, 68, 68, 0.1); }
      .toast-notification.warning { border-color: rgba(245, 158, 11, 0.4); color: #fde68a; background: rgba(245, 158, 11, 0.1); }
      .toast-notification.info { border-color: rgba(74, 122, 255, 0.4); color: #bfdbfe; background: rgba(74, 122, 255, 0.1); }
      @keyframes toastIn {
        from { transform: translateY(20px) scale(0.9); opacity: 0; }
        to { transform: translateY(0) scale(1); opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  }

  // Remove after timeout
  setTimeout(() => {
    toast.style.animation = 'toastIn 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(text) {
  if (!text) return '';
  return text.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
