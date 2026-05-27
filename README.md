# Trustera Consulting - Web App & Admin Portal

This repository contains the complete frontend codebase and Google Apps Script backend template for **Trustera Consulting**. The system uses a decoupled architecture allowing **100% free hosting** using:
* **GitHub Pages** (Frontend hosting - static, fast, secure)
* **Google Apps Script & Google Sheets** (Backend logic & database storage)

---

## Features
1. **Interactive Client Interface:** High-converting landing page, corporate branding, reactive responsive layout, and service catalog.
2. **Dynamic Inquiries Modal:** Instant validation, calendar deadlines selection, and floating-label forms.
3. **Glassmorphic Admin Dashboard:** Real-time stats counting (Visits, Bookings, Completed, etc.), active client bookings log table, traffic logs, and inline status dropdown editors.
4. **Hybrid Database Client:** Smart client script automatically chooses between direct Apps Script execution (if compiled directly inside GAS) or external REST calls (if hosted on GitHub Pages). If no server is connected, it runs in a high-fidelity **Offline Demo Mode** using local storage cache.

---

## Project Structure
```text
trustera-website/
├── backend/
│   └── code.gs          # Apps Script Database Adapter & CORS API Handler
├── frontend/
│   ├── index.html       # Static webpage structure with dashboard views
│   ├── style.css        # Premium glassmorphic styling system & animations
│   └── script.js        # Dynamic routing, states manager, & API connectors
└── README.md            # Installation & setup guide
```

---

## 🛠️ Step-by-Step Installation Guide

### Phase 1: Setting up the Google Sheet Database
1. Go to [Google Sheets](https://sheets.google.com) and create a **Blank Spreadsheet**.
2. Name the spreadsheet (e.g. `Trustera Consulting Database`).
3. Make a note of the spreadsheet's ID. You can find this in the URL of the sheet:
   `https://docs.google.com/spreadsheets/d/YOUR_SPREADSHEET_ID/edit`
4. Copy `YOUR_SPREADSHEET_ID` and keep it handy.

### Phase 2: Installing the Backend Code
1. In your Google Sheet, click on **Extensions** -> **Apps Script** in the top menu.
2. Delete any code inside the default editor window (`Code.gs`).
3. Open the local [backend/code.gs](backend/code.gs) file, copy the entire contents, and paste it into the Apps Script editor.
4. Locate the constant `SPREADSHEET_ID` on line 8:
   ```javascript
   const SPREADSHEET_ID = "YOUR_SPREADSHEET_ID";
   ```
   Replace the placeholder value with your actual Google Spreadsheet ID copied in Phase 1.
5. Click the **Save icon** (floppy disk) to save the code.

### Phase 3: Deploying the Web App API
1. In the upper right corner of the Apps Script dashboard, click the **Deploy** button -> choose **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in the deployment details:
   * **Description:** `Trustera API Version 1.0`
   * **Execute as:** `Me (your email)`
   * **Who has access:** `Anyone` *(Crucial: This allows the webpage to submit inquiries without asking users to sign in to Google).*
4. Click **Deploy**.
5. Google will ask you to authorize access. Click **Authorize Access**, log in to your Google Account, click **Advanced** (at the bottom), and choose **Go to Trustera Consulting (unsafe)** to approve the permissions.
6. Once deployed, copy the **Web app URL** provided in the confirmation popup. It should look like this:
   `https://script.google.com/macros/s/AKfycb.../exec`

---

## 🚀 Publishing the Frontend to GitHub Pages (For Free!)

### Step 1: Create a GitHub Repository
1. Log in to your [GitHub Account](https://github.com).
2. Click **New** to create a repository.
3. Name it (e.g. `trustera-website`), make it **Public**, and click **Create repository**.

### Step 2: Push code to GitHub
Run these commands in your local project folder to initialize and push:
```bash
# Navigate to the frontend directory
cd frontend

# Initialize Git
git init

# Add all files
git add .

# Create initial commit
git commit -m "feat: initial commit of trustera website"

# Link your repository
git remote add origin https://github.com/YOUR_USERNAME/trustera-website.git

# Push code to GitHub (You may need to log in to GitHub CLI or Git Credentials)
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. Go to your repository page on GitHub.
2. Click on **Settings** in the tab menu.
3. In the left sidebar under "Code and automation", click on **Pages**.
4. Under "Build and deployment" -> "Source", select **Deploy from a branch**.
5. Select **main** (or your primary branch) and the `/ (root)` folder.
6. Click **Save**.
7. Wait 1-2 minutes. GitHub will display your free live website URL at the top:
   `https://YOUR_USERNAME.github.io/trustera-website/`

---

## ⚡ Linking the Frontend to your Live Database API
Once you open your live site or preview it locally:
1. Click the **Admin Portal** button in the navbar.
2. Log in using default developer credentials:
   * **Username:** `Siddh`
   * **Password:** `Siddh2525`
3. Click the **Setup API Link** button in the upper-right corner of the dashboard.
4. Paste your **Google Web app URL** (copied from Phase 3, Step 6) and click **Save & Connect**.
5. Your frontend is now connected to your Google Sheet! Try submitting a booking on the home screen; it will immediately write to your sheet and display in your admin panel!
