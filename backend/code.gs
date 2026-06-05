// -------------------------------------------------------------------
// Trustera Consulting - Enhanced Web App Backend & API
// -------------------------------------------------------------------
// This script serves as the backend database adapter (Google Sheets)
// and handles both native GAS execution and external REST API requests.

// SPREADSHEET CONFIGURATION
// Replace the ID below with your active Google Spreadsheet ID if needed.
const SPREADSHEET_ID = "1podni8jkJb1oRzuk4d5wYHXIyBmpWwUsTaMASsqaxHI";

// CALLMEBOT WHATSAPP CONFIGURATION
// Your WhatsApp phone number (must include country code, e.g. +919638312502)
const WHATSAPP_PHONE = "+919638312502";
// Default CallMeBot API key (can also be overridden using script properties)
const CALLMEBOT_API_KEY = "3235650";

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
      case 'setupDailyTrigger':
        const triggerMsg = setupDailyTrigger();
        result = { success: true, message: triggerMsg };
        break;
      case 'sendDailyReport':
        const reportResult = sendDailyReport();
        result = reportResult;
        break;
      case 'setCallMeBotApiKey':
        const apiKey = params.apiKey;
        if (apiKey) {
          PropertiesService.getScriptProperties().setProperty('CALLMEBOT_API_KEY', apiKey.trim());
          result = { success: true };
        } else {
          result = { success: false, error: "API Key is required" };
        }
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

  let totalBookings = 0;
  let totalVisitors = visitors.length;

  let newCount = 0;
  let progressCount = 0;
  let completedCount = 0;

  bookings.forEach(b => {
    let name = b[1] ? b[1].toString().trim() : '';
    if (!name || !/[a-zA-Z0-9]/.test(name)) return; // Skip empty/dummy rows
    
    // Skip if contact details and service/description are all empty too
    let contact = b[2] ? b[2].toString().trim() : '';
    let email = b[3] ? b[3].toString().trim() : '';
    let service = b[4] ? b[4].toString().trim() : '';
    let desc = b[5] ? b[5].toString().trim() : '';
    if (contact === '' && email === '' && service === '' && desc === '') return;

    totalBookings++;
    let status = b[7] ? b[7].toString().trim() : 'New';
    if (status == "New" || !status) newCount++;
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
  }).filter(obj => {
    if (!obj.Name) return false;
    const nameStr = obj.Name.toString().trim();
    // Must contain at least one alphanumeric character
    if (!/[a-zA-Z0-9]/.test(nameStr)) return false;
    
    // Check if other fields are also completely empty (dummy rows)
    const contact = obj['Contact Number'] ? obj['Contact Number'].toString().trim() : '';
    const email = obj.Email ? obj.Email.toString().trim() : '';
    const service = obj.Service ? obj.Service.toString().trim() : '';
    const desc = obj.Description ? obj.Description.toString().trim() : '';
    
    if (contact === '' && email === '' && service === '' && desc === '') {
      return false;
    }
    return true;
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

// ---------- WhatsApp Daily Report Automation ----------

/**
 * Sends a daily status report to the user's WhatsApp via CallMeBot API.
 */
function sendDailyReport() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const bookingsSheet = ss.getSheetByName("Bookings");
    const visitorsSheet = ss.getSheetByName("Visitors");
    
    let bookings = [];
    let visitors = [];
    
    if (bookingsSheet) {
      bookings = bookingsSheet.getDataRange().getValues();
      bookings.shift(); // Remove header row
    }
    
    if (visitorsSheet) {
      visitors = visitorsSheet.getDataRange().getValues();
      visitors.shift(); // Remove header row
    }
    
    const today = new Date();
    const todayStr = Utilities.formatDate(today, "GMT+5:30", "yyyy-MM-dd");
    
    // Filter bookings and calculate metrics
    let totalBookings = 0;
    let newCount = 0;
    let progressCount = 0;
    let completedCount = 0;
    
    let bookingsToday = [];
    let bookingsTodayCount = 0;
    
    bookings.forEach(b => {
      let name = b[1] ? b[1].toString().trim() : '';
      if (!name || !/[a-zA-Z0-9]/.test(name)) return; // Skip dummy entries
      
      let contact = b[2] ? b[2].toString().trim() : '';
      let email = b[3] ? b[3].toString().trim() : '';
      let service = b[4] ? b[4].toString().trim() : '';
      let desc = b[5] ? b[5].toString().trim() : '';
      if (contact === '' && email === '' && service === '' && desc === '') return;
      
      totalBookings++;
      let status = b[7] ? b[7].toString().trim() : 'New';
      if (status === "New") newCount++;
      if (status === "In Progress" || status === "Contacted") progressCount++;
      if (status === "Completed") completedCount++;
      
      // Check if this booking was created today (IST)
      if (b[0] instanceof Date) {
        const bookingDateStr = Utilities.formatDate(b[0], "GMT+5:30", "yyyy-MM-dd");
        if (bookingDateStr === todayStr) {
          bookingsTodayCount++;
          bookingsToday.push({
            name: name,
            service: service,
            contact: contact
          });
        }
      }
    });
    
    // Count visitors today (IST)
    let visitorsTodayCount = 0;
    visitors.forEach(v => {
      if (v[0] instanceof Date) {
        const visitDateStr = Utilities.formatDate(v[0], "GMT+5:30", "yyyy-MM-dd");
        if (visitDateStr === todayStr) {
          visitorsTodayCount++;
        }
      }
    });
    
    // Format the date nicely for report
    const dateFormatted = Utilities.formatDate(today, "GMT+5:30", "dd MMM yyyy, hh:mm a");
    
    // Build the WhatsApp message
    let message = `📊 *TRUSTERA DAILY REPORT* 📊\n` +
                  `*Date:* ${dateFormatted} (IST)\n\n` +
                  `📈 *Today's Activity:* \n` +
                  `• Website Visitors: ${visitorsTodayCount}\n` +
                  `• New Inquiries: ${bookingsTodayCount}\n\n`;
                  
    if (bookingsTodayCount > 0) {
      message += `📝 *Today's New Inquiries:* \n`;
      bookingsToday.forEach((b, idx) => {
        message += `${idx + 1}. *${b.name}*\n` +
                   `   Service: ${b.service || 'N/A'}\n` +
                   `   Contact: ${b.contact || 'N/A'}\n`;
      });
      message += `\n`;
    }
    
    message += `💼 *Overall Bookings Status:* \n` +
               `• New: ${newCount}\n` +
               `• In Progress: ${progressCount}\n` +
               `• Completed: ${completedCount}\n` +
               `• Total Database: ${totalBookings}\n\n` +
               `Generated automatically by Trustera Backend.`;
               
    // Send the WhatsApp report
    return sendWhatsAppMessage(WHATSAPP_PHONE, message);
    
  } catch (error) {
    Logger.log("Error sending daily report: " + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Sends a message via CallMeBot WhatsApp API.
 */
function sendWhatsAppMessage(phone, message) {
  try {
    const apikey = PropertiesService.getScriptProperties().getProperty('CALLMEBOT_API_KEY') || CALLMEBOT_API_KEY;
    
    if (!apikey || apikey === "3235650" || apikey === "") {
      Logger.log("CallMeBot API Key is default or not configured.");
      return { success: false, error: "CallMeBot API Key not configured. Please set CALLMEBOT_API_KEY in script properties." };
    }
    
    let cleanedPhone = phone.replace(/[^0-9]/g, "");
    if (cleanedPhone.length === 10) {
      cleanedPhone = "91" + cleanedPhone; // Default to India country code
    }
    
    const url = "https://api.callmebot.com/whatsapp.php?phone=" + cleanedPhone + 
                "&text=" + encodeURIComponent(message) + 
                "&apikey=" + apikey;
                
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const responseCode = response.getResponseCode();
    const content = response.getContentText();
    
    if (responseCode === 200) {
      Logger.log("WhatsApp message API status: OK");
      return { success: true, response: content };
    } else {
      Logger.log("CallMeBot error: " + content);
      return { success: false, error: content, code: responseCode };
    }
  } catch (error) {
    Logger.log("HTTP exception during WhatsApp send: " + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Sets up a time-driven trigger to run sendDailyReport daily at 12:00 PM (IST).
 */
function setupDailyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  for (let i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sendDailyReport') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  ScriptApp.newTrigger('sendDailyReport')
    .timeBased()
    .everyDays(1)
    .atHour(12)
    .nearMinute(0)
    .inTimezone("Asia/Kolkata")
    .create();
    
  Logger.log("Scheduled daily report trigger for 12:00 PM IST.");
  return "Scheduled daily report trigger for 12:00 PM IST.";
}
