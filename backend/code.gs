// -------------------------------------------------------------------
// Trustera Consulting - Enhanced Web App Backend & API
// -------------------------------------------------------------------
// This script serves as the backend database adapter (Google Sheets)
// and handles both native GAS execution and external REST API requests.

// SPREADSHEET CONFIGURATION
// Replace the ID below with your active Google Spreadsheet ID if needed.
const SPREADSHEET_ID = "1podni8jkJb1oRzuk4d5wYHXIyBmpWwUsTaMASsqaxHI";

/**
 * Serves the web application directly if hosted on Google Apps Script.
 * Also handles GET requests from external API clients.
 */
function doGet(e) {
  // If an action parameter is provided, treat it as an API request.
  if (e && e.parameter && e.parameter.action) {
    return handleApiRequest(e.parameter.action, e.parameter);
  }

  // Otherwise, render the integrated index.html template (for GAS Web App hosting).
  try {
    return HtmlService.createTemplateFromFile('index')
      .evaluate()
      .setTitle('Trustera Consulting')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch(err) {
    // If running locally, return a standard success/info page.
    return HtmlService.createHtmlOutput("<h3>Trustera Consulting API is active!</h3><p>To view the full website, visit your GitHub Pages URL or deploy index.html to Apps Script.</p>");
  }
}

/**
 * Handles POST requests from external API clients.
 * Uses simple requests (text/plain) to bypass CORS preflight OPTIONS block.
 */
function doPost(e) {
  let params = {};
  
  if (e && e.postData && e.postData.contents) {
    try {
      params = JSON.parse(e.postData.contents);
    } catch (err) {
      // Fallback for form-url-encoded or raw formats
      params = e.parameter;
    }
  } else if (e && e.parameter) {
    params = e.parameter;
  }

  const action = params.action;
  return handleApiRequest(action, params);
}

/**
 * Directs API actions to the correct controller functions and outputs JSON.
 */
function handleApiRequest(action, params) {
  let result = { success: false, error: "Invalid action" };
  
  try {
    switch (action) {
      case 'getDashboardSummary':
        result = { success: true, data: getDashboardSummary() };
        break;
      case 'getBookings':
        result = { success: true, data: getBookings() };
        break;
      case 'addBooking':
        const booking = params.booking || params;
        const addSuccess = addBooking(booking);
        result = { success: addSuccess };
        break;
      case 'updateBookingStatus':
        const row = parseInt(params.row);
        const status = params.status;
        updateBookingStatus(row, status);
        result = { success: true };
        break;
      case 'logVisit':
        const page = params.page || "public";
        const userAgent = params.userAgent || "";
        logVisit(page, userAgent);
        result = { success: true };
        break;
      case 'getVisitors':
        result = { success: true, data: getVisitors() };
        break;
      case 'getServices':
        result = { success: true, data: getServices() };
        break;
      case 'authenticate':
        const username = params.username;
        const password = params.password;
        const authenticated = authenticate(username, password);
        result = { success: true, authenticated: authenticated };
        break;
      default:
        result = { success: false, error: `Action '${action}' not found` };
    }
  } catch (error) {
    result = { success: false, error: error.toString() };
  }

  // Set CORS headers by outputting JSON string
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Injects sub-files into the template for direct Google Web App hosting.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ---------- Admin Authentication ----------
function authenticate(username, password) {
  return username === 'Siddh' && password === 'Siddh2525';
}

// ---------- Dashboard Summary ----------
function getDashboardSummary() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let bookingsSheet = ss.getSheetByName("Bookings");
  let visitorsSheet = ss.getSheetByName("Visitors");

  let bookings = [];
  let visitors = [];

  if (bookingsSheet) {
    bookings = bookingsSheet.getDataRange().getValues();
    bookings.shift(); // Remove headers
  }

  if (visitorsSheet) {
    visitors = visitorsSheet.getDataRange().getValues();
    visitors.shift(); // Remove headers
  }

  let totalBookings = bookings.length;
  let totalVisitors = visitors.length;

  let newCount = 0;
  let progressCount = 0;
  let completedCount = 0;

  bookings.forEach(b => {
    let status = b[7];
    if (status == "New") newCount++;
    if (status == "In Progress" || status == "Contacted") progressCount++;
    if (status == "Completed") completedCount++;
  });

  return {
    totalBookings: totalBookings,
    totalVisitors: totalVisitors,
    newBookings: newCount,
    progressBookings: progressCount,
    completedBookings: completedCount
  };
}

// ---------- Bookings ----------
function getBookings() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Bookings');

  if (!sheet) {
    sheet = ss.insertSheet('Bookings');
    sheet.appendRow(['Timestamp', 'Name', 'Contact Number', 'Email', 'Service', 'Description', 'End Date', 'Status', 'AdminNotes']);
    return [];
  }

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  return data.map((row, index) => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    obj.row = index + 2; // Rows are 1-indexed, and header was shifted
    
    // Format timestamp nicely for frontend JSON parsing
    if (obj.Timestamp instanceof Date) {
      obj.Timestamp = obj.Timestamp.toISOString();
    }
    return obj;
  });
}

function addBooking(booking) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Bookings');

  if (!sheet) {
    sheet = ss.insertSheet('Bookings');
    sheet.appendRow(['Timestamp', 'Name', 'Contact Number', 'Email', 'Service', 'Description', 'End Date', 'Status', 'AdminNotes']);
  }

  sheet.appendRow([
    new Date(),
    booking.name || "",
    booking.contact || "",
    booking.email || "",
    booking.service || "",
    booking.description || "",
    booking.endDate || "",
    "New",
    ""
  ]);

  // Send a free email alert to trusteraconsulanting@gmail.com
  try {
    const subject = `New Trustera Inquiry: ${booking.service || 'General'} from ${booking.name || 'Client'}`;
    const body = `Hello Siddh,\n\nYou have received a new service inquiry on Trustera Consulting:\n\n` +
                 `Client Name: ${booking.name || 'N/A'}\n` +
                 `Contact Number: ${booking.contact || 'N/A'}\n` +
                 `Email Address: ${booking.email || 'N/A'}\n` +
                 `Service Requested: ${booking.service || 'N/A'}\n` +
                 `Requirements: ${booking.description || 'N/A'}\n` +
                 `Deadline Timeline: ${booking.endDate || 'Not specified'}\n\n` +
                 `This record has been successfully logged into your Google Sheet and Admin Portal.\n\n` +
                 `Best regards,\nTrustera Automation Engine`;
    
    MailApp.sendEmail("trusteraconsulanting@gmail.com", subject, body);
  } catch (error) {
    Logger.log("Failed to send email alert: " + error.toString());
  }

  return true;
}

function updateBookingStatus(row, status) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Bookings');

  if (sheet) {
    sheet.getRange(row, 8).setValue(status);
  }
}

// ---------- Visitors ----------
function logVisit(page, userAgent) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Visitors");

  if (!sheet) {
    sheet = ss.insertSheet("Visitors");
    sheet.appendRow(["Timestamp", "Page", "UserAgent"]);
  }

  sheet.appendRow([new Date(), page || "public", userAgent || ""]);
}

function getVisitors() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName("Visitors");

  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  const headers = data.shift();

  return data.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    
    if (obj.Timestamp instanceof Date) {
      obj.Timestamp = obj.Timestamp.toISOString();
    }
    return obj;
  });
}

// ---------- Services List ----------
function getServices() {
  return [
    { name: "Salary Automation", price: "₹500 - ₹1000", description: "Automate salary calculations, tax deductions, and payslip generation." },
    { name: "Attendance Automation", price: "₹500 - ₹1000", description: "Track attendance, leave, and overtime with real-time reports." },
    { name: "Recruitment Tracker", price: "₹500 - ₹800", description: "Manage job postings, applicants, and interview pipelines." },
    { name: "Policies Making", price: "₹500 - ₹600", description: "Draft and update HR policies with collaborative tools." },
    { name: "On-Off Boarding Automation", price: "₹500 - ₹1000", description: "Streamline employee joining and exit processes." },
    { name: "Data Storage & Maintenance", price: "₹500 - ₹1000", description: "Secure, organised storage for all employee records." },
    { name: "Employee Portal / Google Sheet Based Portal", price: "₹1000 - ₹2000", description: "Custom employee management portal built on Google Sheets with automation for HR operations." }
  ];
}
