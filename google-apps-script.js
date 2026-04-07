/**
 * BLOOMFIELD YACHTING — Google Apps Script
 *
 * This script handles all Google Sheets operations for the yacht search system.
 *
 * SETUP:
 * 1. Open Google Sheets: https://docs.google.com/spreadsheets/d/1YTf2mxlP_ztrqEJQrrlrdNrPKNiouM1w2CXAn0u-S-s
 * 2. Go to Extensions > Apps Script
 * 3. Replace ALL existing code with this entire file
 * 4. Click "Deploy" > "New deployment"
 * 5. Select type: "Web app"
 * 6. Execute as: "Me"
 * 7. Who has access: "Anyone"
 * 8. Click "Deploy" and copy the new URL
 * 9. Update GOOGLE_SCRIPT_URL in Vercel environment variables with the new URL
 *
 * IMPORTANT: Create two new tabs in the spreadsheet:
 * - "Yacht Database" (for cached yacht data)
 * - "Search Results" (for tracking search status per enquiry)
 */

const SPREADSHEET_ID = '1YTf2mxlP_ztrqEJQrrlrdNrPKNiouM1w2CXAn0u-S-s';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    let result;

    switch (action) {
      case 'getEnquiries':
        result = handleGetEnquiries();
        break;
      case 'getEnquiry':
        result = handleGetEnquiry(data.enquiryId);
        break;
      case 'saveYachts':
        result = handleSaveYachts(data.yachts, data.enquiryId);
        break;
      case 'getYachts':
        result = handleGetYachts(data.query);
        break;
      case 'saveResults':
        result = handleSaveResults(data);
        break;
      case 'getResults':
        result = handleGetResults(data.enquiryId);
        break;
      case 'updateEnquiryStatus':
        result = handleUpdateEnquiryStatus(data.enquiryId, data.status, data.sentAt);
        break;
      case 'createSearchEntry':
        result = handleCreateSearchEntry(data);
        break;
      default:
        // Legacy: handle form submissions (no action field)
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
    // If no action field, try legacy form submission handling
    try {
      const data = JSON.parse(e.postData.contents);
      if (data.fullName || data.email) {
        const result = handleFormSubmission(data);
        return ContentService
          .createTextOutput(JSON.stringify(result))
          .setMimeType(ContentService.MimeType.JSON);
      }
    } catch (e2) {}

    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Legacy form submission handler
 * Writes form data to Charter Tracker tab
 */
function handleFormSubmission(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Charter Tracker');
  if (!sheet) return { error: 'Charter Tracker sheet not found' };

  // Determine next empty row (skip header rows 1-2)
  const lastRow = sheet.getLastRow();
  const nextRow = Math.max(lastRow + 1, 3);

  // Build amenities string
  const amenities = [];
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

  // Split full name into first/last
  const nameParts = (data.fullName || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Calculate trip length in days
  let tripDays = '';
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    tripDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }

  // Write to Charter Tracker columns: A=FirstName, B=LastName, C=Contact, D=Status,
  // E=EnquiryForm, F=StartDate, G=EndDate, H=TripLength, I=(blank), J=VesselType,
  // K=PickUp, L=DropOff, M=Itinerary
  // Columns A-M (existing Charter Tracker columns)
  sheet.getRange(nextRow, 1).setValue(firstName);                    // A: First Name
  sheet.getRange(nextRow, 2).setValue(lastName);                     // B: Last Name
  sheet.getRange(nextRow, 3).setValue(data.email || '');             // C: Contact
  sheet.getRange(nextRow, 4).setValue('Enquiry');                    // D: Status
  sheet.getRange(nextRow, 5).setFormula('=HYPERLINK("https://bloomfield-yachting-form.vercel.app/","Open Form")'); // E
  sheet.getRange(nextRow, 6).setValue(data.startDate || '');         // F: Start Date
  sheet.getRange(nextRow, 7).setValue(data.endDate || '');           // G: End Date
  sheet.getRange(nextRow, 8).setValue(tripDays);                     // H: Trip Length
  // I: (blank)
  sheet.getRange(nextRow, 10).setValue(data.yachtType || '');        // J: Vessel Type
  sheet.getRange(nextRow, 11).setValue(data.destination || '');       // K: Pick Up / Destination
  sheet.getRange(nextRow, 12).setValue(data.destination || '');       // L: Drop Off
  sheet.getRange(nextRow, 13).setValue(data.specialRequirements || ''); // M: Itinerary/Notes

  // Columns N onwards (extended enquiry fields for yacht search system)
  sheet.getRange(nextRow, 14).setValue(data.budget || '');            // N: Budget
  sheet.getRange(nextRow, 15).setValue(data.yachtSize || '');         // O: Yacht Size
  sheet.getRange(nextRow, 16).setValue(data.yachtStyle || '');        // P: Yacht Style
  sheet.getRange(nextRow, 17).setValue(data.adults || '');            // Q: Adults
  sheet.getRange(nextRow, 18).setValue(data.children || 0);           // R: Children
  sheet.getRange(nextRow, 19).setValue(amenities.join(', '));         // S: Amenities
  sheet.getRange(nextRow, 20).setValue(data.occasion || '');          // T: Occasion
  sheet.getRange(nextRow, 21).setValue(data.specialRequirements || ''); // U: Special Requirements
  sheet.getRange(nextRow, 22).setValue(data.phone || '');             // V: Phone
  sheet.getRange(nextRow, 23).setValue(data.nationality || '');       // W: Nationality

  return { success: true, row: nextRow };
}

/**
 * Get all enquiries from Charter Tracker
 */
function handleGetEnquiries() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Charter Tracker');
  if (!sheet) return { enquiries: [], error: 'Charter Tracker sheet not found' };

  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return { enquiries: [] };

  const data = sheet.getRange(3, 1, lastRow - 2, 25).getValues();

  // Also check Search Results for search status
  const searchSheet = ss.getSheetByName('Search Results');
  const searchStatuses = {};
  if (searchSheet && searchSheet.getLastRow() >= 2) {
    const searchData = searchSheet.getRange(2, 1, searchSheet.getLastRow() - 1, 4).getValues();
    for (const row of searchData) {
      if (row[0]) searchStatuses[row[0]] = { searchStatus: row[2], searchDate: row[3] };
    }
  }

  const enquiries = data
    .map((row, idx) => {
      const id = String(idx + 3); // Row number as ID
      const firstName = row[0] || '';
      const lastName = row[1] || '';
      if (!firstName && !lastName) return null;

      const searchInfo = searchStatuses[id] || {};

      return {
        id,
        firstName,
        lastName,
        email: row[2] || '',
        status: row[3] || 'Enquiry',
        startDate: row[5] ? Utilities.formatDate(new Date(row[5]), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
        endDate: row[6] ? Utilities.formatDate(new Date(row[6]), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
        tripDays: row[7] || '',
        yachtType: row[9] || '',
        destination: row[10] || '',
        dropOff: row[11] || '',
        itinerary: row[12] || '',
        // Extended fields (columns N onwards if available)
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
        // Search status from Search Results sheet
        searchStatus: searchInfo.searchStatus || 'pending',
        searchDate: searchInfo.searchDate || '',
      };
    })
    .filter(Boolean);

  return { enquiries };
}

/**
 * Get a single enquiry by row ID
 */
function handleGetEnquiry(enquiryId) {
  const result = handleGetEnquiries();
  const enquiry = result.enquiries.find(e => e.id === String(enquiryId));
  return { enquiry: enquiry || null };
}

/**
 * Save yachts to Yacht Database tab
 */
function handleSaveYachts(yachts, enquiryId) {
  if (!yachts || !Array.isArray(yachts)) return { error: 'No yachts provided' };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Yacht Database');

  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet('Yacht Database');
    sheet.getRange(1, 1, 1, 23).setValues([[
      'Yacht ID', 'Name', 'Type', 'Builder', 'Year Built', 'Length (m)',
      'Guests', 'Cabins', 'Crew', 'Base Location', 'Summer Location', 'Winter Location',
      'Weekly Rate (USD)', 'Rate Notes', 'Amenities', 'Style', 'Description',
      'Image URL', 'Source URL', 'Source Site', 'Last Verified', 'Date Added', 'Enquiry ID'
    ]]);
    sheet.getRange(1, 1, 1, 23).setFontWeight('bold');
  }

  const now = new Date().toISOString();
  let savedCount = 0;

  for (const yacht of yachts) {
    const nextRow = sheet.getLastRow() + 1;
    const yachtId = 'BY-' + nextRow.toString().padStart(4, '0');

    sheet.getRange(nextRow, 1, 1, 23).setValues([[
      yachtId,
      yacht.name || '',
      yacht.type || '',
      yacht.builder || '',
      yacht.yearBuilt || '',
      yacht.lengthM || '',
      yacht.guests || '',
      yacht.cabins || '',
      yacht.crew || '',
      yacht.baseLocation || '',
      yacht.summerLocation || '',
      yacht.winterLocation || '',
      yacht.weeklyRateUSD || '',
      '',
      yacht.amenities || '',
      yacht.style || '',
      yacht.description || '',
      yacht.imageUrl || '',
      yacht.sourceUrl || yacht.charterWorldUrl || yacht.yachtCharterFleetUrl || '',
      yacht.source || 'Claude AI',
      now,
      now,
      enquiryId || ''
    ]]);

    savedCount++;
  }

  return { success: true, savedCount };
}

/**
 * Search yacht database by criteria
 */
function handleGetYachts(query) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Yacht Database');
  if (!sheet || sheet.getLastRow() < 2) return { yachts: [] };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 23).getValues();

  let yachts = data.map(row => ({
    yachtId: row[0],
    name: row[1],
    type: row[2],
    builder: row[3],
    yearBuilt: row[4],
    lengthM: row[5],
    guests: row[6],
    cabins: row[7],
    crew: row[8],
    baseLocation: row[9],
    summerLocation: row[10],
    winterLocation: row[11],
    weeklyRateUSD: row[12],
    amenities: row[14],
    style: row[15],
    description: row[16],
    imageUrl: row[17],
    sourceUrl: row[18],
    sourceSite: row[19],
  })).filter(y => y.name);

  // Basic filtering if query provided
  if (query) {
    if (query.type) yachts = yachts.filter(y => y.type.toLowerCase().includes(query.type.toLowerCase()));
    if (query.location) yachts = yachts.filter(y =>
      (y.baseLocation + y.summerLocation + y.winterLocation).toLowerCase().includes(query.location.toLowerCase())
    );
    if (query.minLength) yachts = yachts.filter(y => Number(y.lengthM) >= Number(query.minLength));
    if (query.maxLength) yachts = yachts.filter(y => Number(y.lengthM) <= Number(query.maxLength));
  }

  return { yachts };
}

/**
 * Save search results for an enquiry
 */
function handleSaveResults(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Search Results');

  if (!sheet) {
    sheet = ss.insertSheet('Search Results');
    sheet.getRange(1, 1, 1, 6).setValues([[
      'Enquiry ID', 'Client Name', 'Search Status', 'Search Date', 'Result Count', 'Results JSON'
    ]]);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }

  const nextRow = sheet.getLastRow() + 1;
  sheet.getRange(nextRow, 1, 1, 6).setValues([[
    data.enquiryId || '',
    data.clientName || '',
    data.searchStatus || 'complete',
    new Date().toISOString(),
    data.resultCount || 0,
    JSON.stringify(data.results || [])
  ]]);

  return { success: true };
}

/**
 * Get search results for an enquiry
 */
function handleGetResults(enquiryId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Search Results');
  if (!sheet || sheet.getLastRow() < 2) return { results: [] };

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();

  for (const row of data) {
    if (String(row[0]) === String(enquiryId)) {
      let results = [];
      try { results = JSON.parse(row[5]); } catch (e) {}
      return {
        enquiryId: row[0],
        clientName: row[1],
        searchStatus: row[2],
        searchDate: row[3],
        resultCount: row[4],
        results
      };
    }
  }

  return { results: [] };
}

/**
 * Update enquiry status in Search Results
 */
function handleUpdateEnquiryStatus(enquiryId, status, sentAt) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Search Results');
  if (!sheet) return { error: 'Search Results sheet not found' };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { error: 'No search entries found' };

  const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]) === String(enquiryId)) {
      sheet.getRange(i + 2, 3).setValue(status);
      if (sentAt) sheet.getRange(i + 2, 4).setValue(sentAt);
      return { success: true };
    }
  }

  return { error: 'Enquiry not found' };
}

/**
 * Create a search tracking entry when form is submitted
 */
function handleCreateSearchEntry(data) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName('Search Results');

  if (!sheet) {
    sheet = ss.insertSheet('Search Results');
    sheet.getRange(1, 1, 1, 6).setValues([[
      'Enquiry ID', 'Client Name', 'Search Status', 'Search Date', 'Result Count', 'Results JSON'
    ]]);
    sheet.getRange(1, 1, 1, 6).setFontWeight('bold');
  }

  // Find the corresponding Charter Tracker row for this submission
  const trackerSheet = ss.getSheetByName('Charter Tracker');
  let enquiryId = '';
  if (trackerSheet) {
    enquiryId = String(trackerSheet.getLastRow()); // Most recent entry
  }

  const nextRow = sheet.getLastRow() + 1;
  sheet.getRange(nextRow, 1, 1, 6).setValues([[
    enquiryId,
    data.fullName || '',
    data.searchStatus || 'pending',
    data.createdAt || new Date().toISOString(),
    0,
    '[]'
  ]]);

  return { success: true, enquiryId };
}
