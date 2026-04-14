/**
 * BLOOMFIELD YACHTING — Google Apps Script
 *
 * Handles:
 *   - Form submissions → Charter Tracker + PDF + Google Drive
 *   - Admin CRUD: update enquiry, delete enquiry
 *   - Yacht Database: add, update, delete, search yachts
 *
 * SETUP:
 * 1. Open Google Sheets: https://docs.google.com/spreadsheets/d/1YTf2mxlP_ztrqEJQrrlrdNrPKNiouM1w2CXAn0u-S-s
 * 2. Go to Extensions > Apps Script
 * 3. Replace ALL existing code with this entire file
 * 4. Click "Deploy" > "Manage deployments" > edit existing deployment
 * 5. Bump version to "New version"
 * 6. Click "Deploy"
 *
 * SHEETS REQUIRED:
 *   - "Charter Tracker" (existing) — columns A-AB
 *   - "Yacht Database" (new) — will be auto-created on first yacht add
 *
 * GOOGLE DRIVE: "Bloomfield Yachting Enquiries" folder for PDFs.
 */

const SPREADSHEET_ID = '1YTf2mxlP_ztrqEJQrrlrdNrPKNiouM1w2CXAn0u-S-s';

/* ───────────────────────── ROUTER ───────────────────────── */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var result;

    switch (action) {
      // ── Enquiry reads ──
      case 'getEnquiries':
        result = handleGetEnquiries();
        break;
      case 'getEnquiry':
        result = handleGetEnquiry(data.enquiryId);
        break;

      // ── Enquiry mutations ──
      case 'updateEnquiry':
        result = handleUpdateEnquiry(data.enquiryId, data.fields);
        break;
      case 'deleteEnquiry':
        result = handleDeleteEnquiry(data.enquiryId);
        break;

      // ── Yacht database ──
      case 'getYachts':
        result = handleGetYachts();
        break;
      case 'addYacht':
        result = handleAddYacht(data.yacht, data.enquiryId);
        break;
      case 'updateYacht':
        result = handleUpdateYacht(data.yachtId, data.fields);
        break;
      case 'deleteYacht':
        result = handleDeleteYacht(data.yachtId);
        break;
      case 'linkYachtToEnquiry':
        result = handleLinkYacht(data.enquiryId, data.yachtId, data.shortlisted);
        break;
      case 'unlinkYachtFromEnquiry':
        result = handleUnlinkYacht(data.enquiryId, data.yachtId);
        break;
      case 'getEnquiryYachts':
        result = handleGetEnquiryYachts(data.enquiryId);
        break;

      // ── Legacy: form submission (no action field) ──
      default:
        if (data.fullName || data.email) {
          result = handleFormSubmission(data);
        } else {
          result = { error: 'Unknown action: ' + action };
        }
    }

    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    // Fallback: try legacy form submission
    try {
      var data2 = JSON.parse(e.postData.contents);
      if (data2.fullName || data2.email) {
        var result2 = handleFormSubmission(data2);
        return ContentService
          .createTextOutput(JSON.stringify(result2))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } catch (e2) {}

    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


/* ═══════════════════════════════════════════════════════════
   CHARTER TRACKER — columns A through AB
   ═══════════════════════════════════════════════════════════
   A: First Name        N: Budget
   B: Last Name         O: Yacht Size
   C: Email             P: Yacht Style
   D: Status            Q: Adults
   E: Enquiry Form PDF  R: Children
   F: Start Date        S: Amenities
   G: End Date          T: Occasion
   H: Trip Length        U: Special Requirements
   I: (reserved)        V: Phone
   J: Vessel Type       W: Nationality
   K: Pick Up           X: Internal Notes
   L: Drop Off          Y: Linked Yacht IDs (comma-sep)
   M: Itinerary/Notes   Z: Referred By
                        AA: Member ID
                        AB: Dates Flexible
                        AC: Destination Flexible
   ═══════════════════════════════════════════════════════════ */

var COL = {
  FIRST_NAME: 1, LAST_NAME: 2, EMAIL: 3, STATUS: 4, PDF: 5,
  START_DATE: 6, END_DATE: 7, TRIP_DAYS: 8, RESERVED: 9,
  VESSEL_TYPE: 10, PICK_UP: 11, DROP_OFF: 12, ITINERARY: 13,
  BUDGET: 14, YACHT_SIZE: 15, YACHT_STYLE: 16, ADULTS: 17,
  CHILDREN: 18, AMENITIES: 19, OCCASION: 20, SPECIAL_REQ: 21,
  PHONE: 22, NATIONALITY: 23, INTERNAL_NOTES: 24,
  LINKED_YACHTS: 25, REFERRED_BY: 26, MEMBER_ID: 27,
  DATES_FLEXIBLE: 28, DEST_FLEXIBLE: 29
};

var TOTAL_COLS = 29;


/* ───────────── Form Submission (unchanged logic) ───────────── */

function handleFormSubmission(data) {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Charter Tracker');
  if (!sheet) return { error: 'Charter Tracker sheet not found' };

  var lastRow = sheet.getLastRow();
  var nextRow = Math.max(lastRow + 1, 3);

  var amenities = [];
  if (data.jacuzzi) amenities.push('Jacuzzi');
  if (data.spa) amenities.push('Spa');
  if (data.gym) amenities.push('Gym');
  if (data.helipad) amenities.push('Helipad');
  if (data.diveGear) amenities.push('Dive Gear');
  if (data.cinema) amenities.push('Cinema');
  if (data.beachClub) amenities.push('Beach Club');
  if (data.waterToys) amenities.push('Water Toys');
  if (data.fishing) amenities.push('Fishing');
  if (data.jetSkis) amenities.push('Jet Skis');

  var nameParts = (data.fullName || '').split(' ');
  var firstName = nameParts[0] || '';
  var lastName = nameParts.slice(1).join(' ') || '';

  var tripDays = '';
  if (data.startDate && data.endDate) {
    var start = new Date(data.startDate);
    var end = new Date(data.endDate);
    tripDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }

  sheet.getRange(nextRow, COL.FIRST_NAME).setValue(firstName);
  sheet.getRange(nextRow, COL.LAST_NAME).setValue(lastName);
  sheet.getRange(nextRow, COL.EMAIL).setValue(data.email || '');
  sheet.getRange(nextRow, COL.STATUS).setValue('Enquiry');
  sheet.getRange(nextRow, COL.START_DATE).setValue(data.startDate || '');
  sheet.getRange(nextRow, COL.END_DATE).setValue(data.endDate || '');
  sheet.getRange(nextRow, COL.TRIP_DAYS).setValue(tripDays);
  sheet.getRange(nextRow, COL.VESSEL_TYPE).setValue(data.yachtType || '');
  sheet.getRange(nextRow, COL.PICK_UP).setValue(data.destination || '');
  sheet.getRange(nextRow, COL.DROP_OFF).setValue(data.destination || '');
  sheet.getRange(nextRow, COL.ITINERARY).setValue(data.specialRequirements || '');
  sheet.getRange(nextRow, COL.BUDGET).setValue(data.budget || '');
  sheet.getRange(nextRow, COL.YACHT_SIZE).setValue(data.yachtSize || '');
  sheet.getRange(nextRow, COL.YACHT_STYLE).setValue(data.yachtStyle || '');
  sheet.getRange(nextRow, COL.ADULTS).setValue(data.adults || '');
  sheet.getRange(nextRow, COL.CHILDREN).setValue(data.children || 0);
  sheet.getRange(nextRow, COL.AMENITIES).setValue(amenities.join(', '));
  sheet.getRange(nextRow, COL.OCCASION).setValue(data.occasion || '');
  sheet.getRange(nextRow, COL.SPECIAL_REQ).setValue(data.specialRequirements || '');
  sheet.getRange(nextRow, COL.PHONE).setValue(data.phone || '');
  sheet.getRange(nextRow, COL.NATIONALITY).setValue(data.nationality || '');
  sheet.getRange(nextRow, COL.REFERRED_BY).setValue(data.referredBy || '');
  sheet.getRange(nextRow, COL.MEMBER_ID).setValue(data.memberId || '');
  sheet.getRange(nextRow, COL.DATES_FLEXIBLE).setValue(data.datesFlexible || 'No');
  sheet.getRange(nextRow, COL.DEST_FLEXIBLE).setValue(data.destinationFlexible || 'No');

  var pdfUrl = '';
  try {
    pdfUrl = generateAndSaveFormPDF(data, firstName, lastName, amenities, tripDays);
    sheet.getRange(nextRow, COL.PDF).setFormula('=HYPERLINK("' + pdfUrl + '","View PDF")');
  } catch (pdfErr) {
    sheet.getRange(nextRow, COL.PDF).setFormula('=HYPERLINK("https://bloomfield-yachting-form.vercel.app/","Open Form")');
  }

  return { success: true, row: nextRow, pdfUrl: pdfUrl };
}


/* ───────────── Get All Enquiries ───────────── */

function handleGetEnquiries() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Charter Tracker');
  if (!sheet) return { enquiries: [], error: 'Charter Tracker sheet not found' };

  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return { enquiries: [] };

  var numCols = Math.min(sheet.getLastColumn(), TOTAL_COLS);
  var data = sheet.getRange(3, 1, lastRow - 2, numCols).getValues();
  var formulas = sheet.getRange(3, 5, lastRow - 2, 1).getFormulas();

  var enquiries = data
    .map(function(row, idx) {
      var firstName = row[0] || '';
      var lastName = row[1] || '';
      if (!firstName && !lastName) return null;

      var pdfUrl = '';
      var formula = formulas[idx] ? formulas[idx][0] : '';
      if (formula) {
        var match = formula.match(/HYPERLINK\("([^"]+)"/);
        if (match) pdfUrl = match[1];
      }

      var formatDate = function(val) {
        if (!val) return '';
        try {
          return Utilities.formatDate(new Date(val), Session.getScriptTimeZone(), 'yyyy-MM-dd');
        } catch(e) { return String(val); }
      };

      return {
        id: String(idx + 3),
        firstName: firstName,
        lastName: lastName,
        email: row[2] || '',
        status: row[3] || 'Enquiry',
        pdfUrl: pdfUrl,
        startDate: formatDate(row[5]),
        endDate: formatDate(row[6]),
        tripDays: row[7] || '',
        yachtType: row[9] || '',
        pickUp: row[10] || '',
        dropOff: row[11] || '',
        itinerary: row[12] || '',
        budget: row[13] || '',
        yachtSize: row[14] || '',
        yachtStyle: row[15] || '',
        adults: row[16] || '',
        children: row[17] || '',
        amenities: row[18] || '',
        occasion: row[19] || '',
        specialRequirements: row[20] || '',
        phone: row[21] || '',
        nationality: row[22] || '',
        internalNotes: numCols >= 24 ? (row[23] || '') : '',
        linkedYachts: numCols >= 25 ? (row[24] || '') : '',
        referredBy: numCols >= 26 ? (row[25] || '') : '',
        memberId: numCols >= 27 ? (row[26] || '') : '',
        datesFlexible: numCols >= 28 ? (row[27] || '') : '',
        destinationFlexible: numCols >= 29 ? (row[28] || '') : ''
      };
    })
    .filter(Boolean);

  return { enquiries: enquiries };
}


/* ───────────── Get Single Enquiry ───────────── */

function handleGetEnquiry(enquiryId) {
  var result = handleGetEnquiries();
  var enquiry = null;
  for (var i = 0; i < result.enquiries.length; i++) {
    if (result.enquiries[i].id === String(enquiryId)) {
      enquiry = result.enquiries[i];
      break;
    }
  }
  return { enquiry: enquiry };
}


/* ───────────── Update Enquiry ───────────── */

function handleUpdateEnquiry(enquiryId, fields) {
  if (!enquiryId || !fields) return { error: 'Missing enquiryId or fields' };

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Charter Tracker');
  if (!sheet) return { error: 'Charter Tracker sheet not found' };

  var row = parseInt(enquiryId, 10);
  if (isNaN(row) || row < 3) return { error: 'Invalid enquiry ID' };

  // Map field names to column numbers
  var fieldMap = {
    firstName: COL.FIRST_NAME,
    lastName: COL.LAST_NAME,
    email: COL.EMAIL,
    status: COL.STATUS,
    startDate: COL.START_DATE,
    endDate: COL.END_DATE,
    tripDays: COL.TRIP_DAYS,
    yachtType: COL.VESSEL_TYPE,
    pickUp: COL.PICK_UP,
    dropOff: COL.DROP_OFF,
    itinerary: COL.ITINERARY,
    budget: COL.BUDGET,
    yachtSize: COL.YACHT_SIZE,
    yachtStyle: COL.YACHT_STYLE,
    adults: COL.ADULTS,
    children: COL.CHILDREN,
    amenities: COL.AMENITIES,
    occasion: COL.OCCASION,
    specialRequirements: COL.SPECIAL_REQ,
    phone: COL.PHONE,
    nationality: COL.NATIONALITY,
    internalNotes: COL.INTERNAL_NOTES,
    linkedYachts: COL.LINKED_YACHTS,
    referredBy: COL.REFERRED_BY,
    memberId: COL.MEMBER_ID,
    datesFlexible: COL.DATES_FLEXIBLE,
    destinationFlexible: COL.DEST_FLEXIBLE
  };

  var updated = [];
  for (var key in fields) {
    if (fields.hasOwnProperty(key) && fieldMap[key]) {
      sheet.getRange(row, fieldMap[key]).setValue(fields[key]);
      updated.push(key);
    }
  }

  // Recalculate trip days if dates changed
  if (fields.startDate || fields.endDate) {
    var sDate = fields.startDate || sheet.getRange(row, COL.START_DATE).getValue();
    var eDate = fields.endDate || sheet.getRange(row, COL.END_DATE).getValue();
    if (sDate && eDate) {
      var days = Math.ceil((new Date(eDate) - new Date(sDate)) / (1000 * 60 * 60 * 24));
      sheet.getRange(row, COL.TRIP_DAYS).setValue(days);
      updated.push('tripDays');
    }
  }

  return { success: true, updated: updated };
}


/* ───────────── Delete Enquiry ───────────── */

function handleDeleteEnquiry(enquiryId) {
  if (!enquiryId) return { error: 'Missing enquiryId' };

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Charter Tracker');
  if (!sheet) return { error: 'Charter Tracker sheet not found' };

  var row = parseInt(enquiryId, 10);
  if (isNaN(row) || row < 3) return { error: 'Invalid enquiry ID' };
  if (row > sheet.getLastRow()) return { error: 'Row does not exist' };

  sheet.deleteRow(row);
  return { success: true, deletedRow: row };
}


/* ═══════════════════════════════════════════════════════════
   YACHT DATABASE — separate sheet
   ═══════════════════════════════════════════════════════════
   A: Yacht ID (YCH-001)    H: Guests (max)
   B: Yacht Name             I: Cabins
   C: Type (Motor/Sailing)   J: Crew
   D: Size (metres)          K: Amenities
   E: Weekly Rate (USD)      L: Listing URL
   F: Builder/Brand          M: Home Port / Region
   G: Year Built             N: Notes
                              O: Date Added
                              P: Added From Enquiry ID
   ═══════════════════════════════════════════════════════════ */

var YACHT_COLS = {
  ID: 1, NAME: 2, TYPE: 3, SIZE: 4, RATE: 5, BUILDER: 6,
  YEAR: 7, GUESTS: 8, CABINS: 9, CREW: 10, AMENITIES: 11,
  URL: 12, REGION: 13, NOTES: 14, DATE_ADDED: 15, FROM_ENQUIRY: 16
};

var YACHT_TOTAL_COLS = 16;


function getOrCreateYachtSheet() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Yacht Database');
  if (sheet) return sheet;

  sheet = ss.insertSheet('Yacht Database');
  var headers = [
    'Yacht ID', 'Yacht Name', 'Type', 'Size (m)', 'Weekly Rate (USD)',
    'Builder/Brand', 'Year Built', 'Max Guests', 'Cabins', 'Crew',
    'Amenities', 'Listing URL', 'Home Port / Region', 'Notes',
    'Date Added', 'From Enquiry'
  ];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#020617')
    .setFontColor('#f97316');
  sheet.setFrozenRows(1);
  return sheet;
}


function generateYachtId(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'YCH-001';
  var lastId = sheet.getRange(lastRow, YACHT_COLS.ID).getValue() || '';
  var num = parseInt(String(lastId).replace('YCH-', ''), 10) || 0;
  return 'YCH-' + String(num + 1).padStart(3, '0');
}


/* ───────────── Get All Yachts ───────────── */

function handleGetYachts() {
  var sheet = getOrCreateYachtSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { yachts: [] };

  var data = sheet.getRange(2, 1, lastRow - 1, YACHT_TOTAL_COLS).getValues();

  var yachts = data
    .map(function(row) {
      if (!row[0] && !row[1]) return null;
      return {
        id: row[0] || '',
        name: row[1] || '',
        type: row[2] || '',
        size: row[3] || '',
        weeklyRate: row[4] || '',
        builder: row[5] || '',
        yearBuilt: row[6] || '',
        maxGuests: row[7] || '',
        cabins: row[8] || '',
        crew: row[9] || '',
        amenities: row[10] || '',
        listingUrl: row[11] || '',
        region: row[12] || '',
        notes: row[13] || '',
        dateAdded: row[14] ? Utilities.formatDate(new Date(row[14]), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
        fromEnquiry: row[15] || ''
      };
    })
    .filter(Boolean);

  return { yachts: yachts };
}


/* ───────────── Add Yacht ───────────── */

function handleAddYacht(yacht, enquiryId) {
  if (!yacht || !yacht.name) return { error: 'Yacht name is required' };

  var sheet = getOrCreateYachtSheet();
  var newId = generateYachtId(sheet);
  var nextRow = sheet.getLastRow() + 1;

  var row = [
    newId,
    yacht.name || '',
    yacht.type || '',
    yacht.size || '',
    yacht.weeklyRate || '',
    yacht.builder || '',
    yacht.yearBuilt || '',
    yacht.maxGuests || '',
    yacht.cabins || '',
    yacht.crew || '',
    yacht.amenities || '',
    yacht.listingUrl || '',
    yacht.region || '',
    yacht.notes || '',
    new Date(),
    enquiryId || ''
  ];

  sheet.getRange(nextRow, 1, 1, row.length).setValues([row]);
  return { success: true, yachtId: newId };
}


/* ───────────── Update Yacht ───────────── */

function handleUpdateYacht(yachtId, fields) {
  if (!yachtId || !fields) return { error: 'Missing yachtId or fields' };

  var sheet = getOrCreateYachtSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { error: 'Yacht not found' };

  // Find row by yacht ID
  var ids = sheet.getRange(2, YACHT_COLS.ID, lastRow - 1, 1).getValues();
  var targetRow = -1;
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === yachtId) { targetRow = i + 2; break; }
  }
  if (targetRow === -1) return { error: 'Yacht not found: ' + yachtId };

  var fieldMap = {
    name: YACHT_COLS.NAME, type: YACHT_COLS.TYPE, size: YACHT_COLS.SIZE,
    weeklyRate: YACHT_COLS.RATE, builder: YACHT_COLS.BUILDER,
    yearBuilt: YACHT_COLS.YEAR, maxGuests: YACHT_COLS.GUESTS,
    cabins: YACHT_COLS.CABINS, crew: YACHT_COLS.CREW,
    amenities: YACHT_COLS.AMENITIES, listingUrl: YACHT_COLS.URL,
    region: YACHT_COLS.REGION, notes: YACHT_COLS.NOTES
  };

  for (var key in fields) {
    if (fields.hasOwnProperty(key) && fieldMap[key]) {
      sheet.getRange(targetRow, fieldMap[key]).setValue(fields[key]);
    }
  }

  return { success: true };
}


/* ───────────── Delete Yacht ───────────── */

function handleDeleteYacht(yachtId) {
  if (!yachtId) return { error: 'Missing yachtId' };

  var sheet = getOrCreateYachtSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return { error: 'Yacht not found' };

  var ids = sheet.getRange(2, YACHT_COLS.ID, lastRow - 1, 1).getValues();
  var targetRow = -1;
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === yachtId) { targetRow = i + 2; break; }
  }
  if (targetRow === -1) return { error: 'Yacht not found: ' + yachtId };

  sheet.deleteRow(targetRow);
  return { success: true };
}


/* ───────────── Link/Unlink Yacht to Enquiry ───────────── */

function handleLinkYacht(enquiryId, yachtId, shortlisted) {
  if (!enquiryId || !yachtId) return { error: 'Missing enquiryId or yachtId' };

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Charter Tracker');
  var row = parseInt(enquiryId, 10);
  if (isNaN(row) || row < 3) return { error: 'Invalid enquiry ID' };

  var current = sheet.getRange(row, COL.LINKED_YACHTS).getValue() || '';
  var ids = current ? current.split(',').map(function(s) { return s.trim(); }) : [];

  if (ids.indexOf(yachtId) === -1) {
    ids.push(yachtId);
    sheet.getRange(row, COL.LINKED_YACHTS).setValue(ids.join(','));
  }

  return { success: true, linkedYachts: ids.join(',') };
}

function handleUnlinkYacht(enquiryId, yachtId) {
  if (!enquiryId || !yachtId) return { error: 'Missing enquiryId or yachtId' };

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Charter Tracker');
  var row = parseInt(enquiryId, 10);
  if (isNaN(row) || row < 3) return { error: 'Invalid enquiry ID' };

  var current = sheet.getRange(row, COL.LINKED_YACHTS).getValue() || '';
  var ids = current ? current.split(',').map(function(s) { return s.trim(); }) : [];
  ids = ids.filter(function(id) { return id !== yachtId; });
  sheet.getRange(row, COL.LINKED_YACHTS).setValue(ids.join(','));

  return { success: true, linkedYachts: ids.join(',') };
}


/* ───────────── Get Yachts Linked to Enquiry ───────────── */

function handleGetEnquiryYachts(enquiryId) {
  if (!enquiryId) return { error: 'Missing enquiryId' };

  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Charter Tracker');
  var row = parseInt(enquiryId, 10);
  if (isNaN(row) || row < 3) return { error: 'Invalid enquiry ID' };

  var current = sheet.getRange(row, COL.LINKED_YACHTS).getValue() || '';
  var linkedIds = current ? current.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];

  if (linkedIds.length === 0) return { yachts: [] };

  // Fetch full yacht details
  var allYachts = handleGetYachts().yachts || [];
  var matched = allYachts.filter(function(y) { return linkedIds.indexOf(y.id) !== -1; });

  return { yachts: matched };
}


/* ───────────── PDF Generation (unchanged) ───────────── */

function generateAndSaveFormPDF(data, firstName, lastName, amenities, tripDays) {
  var html = '<html><head><style>' +
    'body { font-family: Georgia, serif; max-width: 700px; margin: 0 auto; color: #1a2a3a; padding: 0; }' +
    '.header { background: linear-gradient(135deg, #0c2340 0%, #1a3a5c 100%); padding: 30px; text-align: center; }' +
    '.header h1 { color: #c9a84c; margin: 0; font-size: 28px; letter-spacing: 2px; }' +
    '.header p { color: #8fa8c8; margin: 8px 0 0; font-size: 14px; letter-spacing: 3px; }' +
    '.content { padding: 30px; }' +
    'h2 { color: #0c2340; border-bottom: 2px solid #c9a84c; padding-bottom: 8px; font-size: 16px; letter-spacing: 1px; margin-top: 24px; }' +
    'table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }' +
    'td { padding: 8px 0; font-size: 14px; }' +
    'td:first-child { color: #666; width: 40%; }' +
    'td:last-child { font-weight: bold; }' +
    '.footer { color: #999; font-size: 11px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0; }' +
    '</style></head><body>' +
    '<div class="header"><h1>BLOOMFIELD YACHTING</h1><p>CHARTER ENQUIRY FORM</p></div>' +
    '<div class="content">' +
    '<h2>CLIENT DETAILS</h2><table>' +
    '<tr><td>Full Name</td><td>' + (data.fullName || '-') + '</td></tr>' +
    '<tr><td>Email Address</td><td>' + (data.email || '-') + '</td></tr>' +
    '<tr><td>Phone Number</td><td>' + (data.phone || '-') + '</td></tr>' +
    '<tr><td>Nationality / Country</td><td>' + (data.nationality || '-') + '</td></tr>' +
    '<tr><td>Member ID</td><td>' + (data.memberId || '-') + '</td></tr>' +
    '<tr><td>Referred By</td><td>' + (data.referredBy || '-') + '</td></tr>' +
    '</table>' +
    '<h2>CHARTER PREFERENCES</h2><table>' +
    '<tr><td>Preferred Start Date</td><td>' + (data.startDate || '-') + '</td></tr>' +
    '<tr><td>Preferred End Date</td><td>' + (data.endDate || '-') + '</td></tr>' +
    '<tr><td>Trip Length</td><td>' + (tripDays ? tripDays + ' days' : '-') + '</td></tr>' +
    '<tr><td>Dates Flexible?</td><td>' + (data.datesFlexible || '-') + '</td></tr>' +
    '<tr><td>Destination</td><td>' + (data.destination || '-') + '</td></tr>' +
    '<tr><td>Destination Flexible?</td><td>' + (data.destinationFlexible || '-') + '</td></tr>' +
    '<tr><td>Adults</td><td>' + (data.adults || '-') + '</td></tr>' +
    '<tr><td>Children</td><td>' + (data.children || '0') + '</td></tr>' +
    '<tr><td>Weekly Budget (USD)</td><td>' + (data.budget || '-') + '</td></tr>' +
    '</table>' +
    '<h2>YACHT PREFERENCES</h2><table>' +
    '<tr><td>Yacht Type</td><td>' + (data.yachtType || '-') + '</td></tr>' +
    '<tr><td>Preferred Size</td><td>' + (data.yachtSize || '-') + '</td></tr>' +
    '<tr><td>Style</td><td>' + (data.yachtStyle || '-') + '</td></tr>' +
    '<tr><td>Desired Amenities</td><td>' + (amenities.length > 0 ? amenities.join(', ') : '-') + '</td></tr>' +
    '</table>' +
    '<h2>OCCASION &amp; SPECIAL REQUIREMENTS</h2><table>' +
    '<tr><td>Occasion</td><td>' + (data.occasion || '-') + '</td></tr>' +
    '<tr><td>Special Requirements</td><td>' + (data.specialRequirements || '-') + '</td></tr>' +
    '</table>' +
    '<div class="footer">Submitted via Bloomfield Yachting online charter enquiry form on ' +
    new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) +
    '.</div></div></body></html>';

  var blob = HtmlService.createHtmlOutput(html).getAs('application/pdf');
  var filename = 'Enquiry_' + firstName + '_' + lastName + '_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd') + '.pdf';
  blob.setName(filename);

  var folder = getOrCreateFolder('Bloomfield Yachting Enquiries');
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return file.getUrl();
}

function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(folderName);
}
