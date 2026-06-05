// -------------------------------------------------------------------
// Trustera Consulting - Enhanced Web App Backend & API
// -------------------------------------------------------------------
// This script serves as the backend database adapter (Google Sheets)
// and handles both native GAS execution and external REST API requests.

// SPREADSHEET CONFIGURATION
// Replace the ID below with your active Google Spreadsheet ID if needed.
const SPREADSHEET_ID = "1podni8jkJb1oRzuk4d5wYHXIyBmpWwUsTaMASsqaxHI";

// EMAIL REPORT CONFIGURATION
// Default email recipient for daily status reports
const REPORT_EMAIL = "siddhkhatri17@gmail.com";

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
      case 'setReportEmail':
        const email = params.email;
        if (email) {
          PropertiesService.getScriptProperties().setProperty('REPORT_EMAIL', email.trim());
          result = { success: true };
        } else {
          result = { success: false, error: "Email address is required" };
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

// ---------- Email Daily Report Automation ----------

/**
 * Sends a daily status report to the configured email.
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
    
    // Get target email address
    const emailAddress = PropertiesService.getScriptProperties().getProperty('REPORT_EMAIL') || REPORT_EMAIL;
    
    // Build the HTML email
    let inquiriesHtml = "";
    if (bookingsTodayCount > 0) {
      inquiriesHtml += `<h2 style="font-size: 18px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px; font-family: sans-serif;">📝 Today's New Inquiries</h2>`;
      inquiriesHtml += `<table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-family: sans-serif;">`;
      inquiriesHtml += `<tr style="background-color: #f1f5f9; text-align: left; font-size: 12px; color: #475569;">`;
      inquiriesHtml += `<th style="padding: 8px; border: 1px solid #cbd5e1;">Client</th>`;
      inquiriesHtml += `<th style="padding: 8px; border: 1px solid #cbd5e1;">Service</th>`;
      inquiriesHtml += `<th style="padding: 8px; border: 1px solid #cbd5e1;">Contact</th>`;
      inquiriesHtml += `</tr>`;
      
      bookingsToday.forEach(b => {
        inquiriesHtml += `<tr style="font-size: 13px; color: #334155;">`;
        inquiriesHtml += `<td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: bold;">${escapeHtmlForGas(b.name)}</td>`;
        inquiriesHtml += `<td style="padding: 8px; border: 1px solid #cbd5e1;"><span style="background-color: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-size: 11px; font-weight: 600;">${escapeHtmlForGas(b.service)}</span></td>`;
        inquiriesHtml += `<td style="padding: 8px; border: 1px solid #cbd5e1;">${escapeHtmlForGas(b.contact)}</td>`;
        inquiriesHtml += `</tr>`;
      });
      inquiriesHtml += `</table>`;
    }
    
    const htmlBody = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #f8fafc; color: #1e293b;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 2px solid #e2e8f0; margin-bottom: 20px;">
        <h1 style="color: #2563eb; margin: 0; font-size: 24px; font-family: sans-serif;">Trustera Consulting</h1>
        <p style="margin: 5px 0 0 0; color: #64748b; font-size: 14px; font-family: sans-serif;">Daily Activity & Status Report</p>
      </div>
      
      <div style="margin-bottom: 20px; font-family: sans-serif;">
        <span style="font-size: 14px; background-color: #dbeafe; color: #1e40af; padding: 4px 8px; border-radius: 6px; font-weight: bold;">Date: ${dateFormatted} (IST)</span>
      </div>

      <h2 style="font-size: 18px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px; font-family: sans-serif;">📈 Today's Activity</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-family: sans-serif;">
        <tr>
          <td style="padding: 8px 0; color: #475569;">Website Visitors Today:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0f172a;">${visitorsTodayCount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #475569;">New Inquiries Today:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #2563eb;">${bookingsTodayCount}</td>
        </tr>
      </table>

      ${inquiriesHtml}

      <h2 style="font-size: 18px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px; margin-bottom: 12px; font-family: sans-serif;">💼 Overall Database Summary</h2>
      <table style="width: 100%; border-collapse: collapse; font-family: sans-serif;">
        <tr>
          <td style="padding: 8px 0; color: #475569;">New Bookings:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #d97706;">${newCount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #475569;">In Progress:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #0891b2;">${progressCount}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #475569;">Completed:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #16a34a;">${completedCount}</td>
        </tr>
        <tr style="border-top: 1px solid #e2e8f0; font-size: 16px;">
          <td style="padding: 12px 0 0 0; font-weight: bold; color: #0f172a;">Total Database Inquiries:</td>
          <td style="padding: 12px 0 0 0; text-align: right; font-weight: bold; color: #0f172a;">${totalBookings}</td>
        </tr>
      </table>
      
      <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-size: 12px; color: #94a3b8; text-align: center; font-family: sans-serif;">
        This is an automated status update generated by the Trustera Booking Engine.
      </div>
    </div>
    `;

    // Send email using MailApp
    MailApp.sendEmail({
      to: emailAddress,
      subject: `📊 Trustera Consulting - Daily Status Report [${dateFormatted}]`,
      htmlBody: htmlBody
    });

    Logger.log("Daily report email sent successfully to " + emailAddress);
    return { success: true, message: "Daily report email sent successfully to " + emailAddress };
    
  } catch (error) {
    Logger.log("Error sending daily report email: " + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Escapes HTML characters for safety in Apps Script template injections.
 */
function escapeHtmlForGas(text) {
  if (!text) return '';
  return text.toString()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
