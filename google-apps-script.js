/**
 * BLOOMFIELD YACHTING — Google Apps Script (Simplified)
 *
 * Handles: form submissions → Charter Tracker sheet + PDF generation + Google Drive storage
 *
 * SETUP:
 * 1. Open Google Sheets: https://docs.google.com/spreadsheets/d/1YTf2mxlP_ztrqEJQrrlrdNrPKNiouM1w2CXAn0u-S-s
 * 2. Go to Extensions > Apps Script
 * 3. Replace ALL existing code with this entire file
 * 4. Click "Deploy" > "Manage deployments" > edit existing deployment
 * 5. Bump version to "New version"
 * 6. Click "Deploy"
 *
 * GOOGLE DRIVE: Creates a "Bloomfield Yachting Enquiries" folder automatically.
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
 * Handle form submission:
 * 1. Write data to Charter Tracker sheet
 * 2. Generate PDF of the form submission
 * 3. Save PDF to Google Drive
 * 4. Put PDF link in column E (Enquiry Form)
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
  var tripDays = '';
  if (data.startDate && data.endDate) {
    var start = new Date(data.startDate);
    var end = new Date(data.endDate);
    tripDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
  }

  // Write to Charter Tracker columns
  sheet.getRange(nextRow, 1).setValue(firstName);                    // A: First Name
  sheet.getRange(nextRow, 2).setValue(lastName);                     // B: Last Name
  sheet.getRange(nextRow, 3).setValue(data.email || '');             // C: Contact
  sheet.getRange(nextRow, 4).setValue('Enquiry');                    // D: Status
  // E: Enquiry Form PDF — set below after PDF generation
  sheet.getRange(nextRow, 6).setValue(data.startDate || '');         // F: Start Date
  sheet.getRange(nextRow, 7).setValue(data.endDate || '');           // G: End Date
  sheet.getRange(nextRow, 8).setValue(tripDays);                     // H: Trip Length
  // I: (blank)
  sheet.getRange(nextRow, 10).setValue(data.yachtType || '');        // J: Vessel Type
  sheet.getRange(nextRow, 11).setValue(data.destination || '');      // K: Pick Up / Destination
  sheet.getRange(nextRow, 12).setValue(data.destination || '');      // L: Drop Off
  sheet.getRange(nextRow, 13).setValue(data.specialRequirements || ''); // M: Itinerary/Notes
  sheet.getRange(nextRow, 14).setValue(data.budget || '');           // N: Budget
  sheet.getRange(nextRow, 15).setValue(data.yachtSize || '');        // O: Yacht Size
  sheet.getRange(nextRow, 16).setValue(data.yachtStyle || '');       // P: Yacht Style
  sheet.getRange(nextRow, 17).setValue(data.adults || '');           // Q: Adults
  sheet.getRange(nextRow, 18).setValue(data.children || 0);          // R: Children
  sheet.getRange(nextRow, 19).setValue(amenities.join(', '));        // S: Amenities
  sheet.getRange(nextRow, 20).setValue(data.occasion || '');         // T: Occasion
  sheet.getRange(nextRow, 21).setValue(data.specialRequirements || ''); // U: Special Requirements
  sheet.getRange(nextRow, 22).setValue(data.phone || '');            // V: Phone
  sheet.getRange(nextRow, 23).setValue(data.nationality || '');      // W: Nationality

  // Generate PDF and save to Google Drive
  var pdfUrl = '';
  try {
    pdfUrl = generateAndSaveFormPDF(data, firstName, lastName, amenities, tripDays);
    // Set column E to PDF hyperlink
    sheet.getRange(nextRow, 5).setFormula('=HYPERLINK("' + pdfUrl + '","View PDF")');
  } catch (pdfErr) {
    // Fallback: link to form if PDF fails
    sheet.getRange(nextRow, 5).setFormula('=HYPERLINK("https://bloomfield-yachting-form.vercel.app/","Open Form")');
  }

  return { success: true, row: nextRow, pdfUrl: pdfUrl };
}

/**
 * Generate a branded PDF of the form submission and save to Google Drive.
 * Returns the shareable URL.
 */
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
    '<h2>CLIENT DETAILS</h2>' +
    '<table>' +
    '<tr><td>Full Name</td><td>' + (data.fullName || '-') + '</td></tr>' +
    '<tr><td>Email Address</td><td>' + (data.email || '-') + '</td></tr>' +
    '<tr><td>Phone Number</td><td>' + (data.phone || '-') + '</td></tr>' +
    '<tr><td>Nationality / Country</td><td>' + (data.nationality || '-') + '</td></tr>' +
    '<tr><td>Member ID</td><td>' + (data.memberId || '-') + '</td></tr>' +
    '<tr><td>Referred By</td><td>' + (data.referredBy || '-') + '</td></tr>' +
    '</table>' +
    '<h2>CHARTER PREFERENCES</h2>' +
    '<table>' +
    '<tr><td>Preferred Start Date</td><td>' + (data.startDate || '-') + '</td></tr>' +
    '<tr><td>Preferred End Date</td><td>' + (data.endDate || '-') + '</td></tr>' +
    '<tr><td>Trip Length</td><td>' + (tripDays ? tripDays + ' days' : '-') + '</td></tr>' +
    '<tr><td>Dates Flexible?</td><td>' + (data.datesFlexible || '-') + '</td></tr>' +
    '<tr><td>Destination</td><td>' + (data.destination || '-') + '</td></tr>' +
    '<tr><td>Destination Flexible?</td><td>' + (data.destinationFlexible || '-') + '</td></tr>' +
    '<tr><td>Adults</td><td>' + (data.adults || '-') + '</td></tr>' +
    '<tr><td>Children</td><td>' + (data.children || '0') + '</td></tr>' +
    '<tr><td>Weekly Budget (USD)</td><td>' + (data.budget ? '$' + data.budget : '-') + '</td></tr>' +
    '</table>' +
    '<h2>YACHT PREFERENCES</h2>' +
    '<table>' +
    '<tr><td>Yacht Type</td><td>' + (data.yachtType || '-') + '</td></tr>' +
    '<tr><td>Preferred Size</td><td>' + (data.yachtSize || '-') + '</td></tr>' +
    '<tr><td>Style</td><td>' + (data.yachtStyle || '-') + '</td></tr>' +
    '<tr><td>Desired Amenities</td><td>' + (amenities.length > 0 ? amenities.join(', ') : '-') + '</td></tr>' +
    '</table>' +
    '<h2>OCCASION &amp; SPECIAL REQUIREMENTS</h2>' +
    '<table>' +
    '<tr><td>Occasion</td><td>' + (data.occasion || '-') + '</td></tr>' +
    '<tr><td>Special Requirements</td><td>' + (data.specialRequirements || '-') + '</td></tr>' +
    '</table>' +
    '<div class="footer">Submitted via Bloomfield Yachting online charter enquiry form on ' +
    new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) +
    '.</div></div></body></html>';

  // Convert HTML to PDF blob
  var blob = HtmlService.createHtmlOutput(html).getAs('application/pdf');
  var filename = 'Enquiry_' + firstName + '_' + lastName + '_' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd') + '.pdf';
  blob.setName(filename);

  // Get or create the Google Drive folder
  var folder = getOrCreateFolder('Bloomfield Yachting Enquiries');

  // Save PDF to folder
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return file.getUrl();
}

/**
 * Get or create a Google Drive folder by name.
 */
function getOrCreateFolder(folderName) {
  var folders = DriveApp.getFoldersByName(folderName);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(folderName);
}

/**
 * Get all enquiries from Charter Tracker
 */
function handleGetEnquiries() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName('Charter Tracker');
  if (!sheet) return { enquiries: [], error: 'Charter Tracker sheet not found' };

  var lastRow = sheet.getLastRow();
  if (lastRow < 3) return { enquiries: [] };

  var data = sheet.getRange(3, 1, lastRow - 2, 23).getValues();
  var formulas = sheet.getRange(3, 5, lastRow - 2, 1).getFormulas();

  var enquiries = data
    .map(function(row, idx) {
      var firstName = row[0] || '';
      var lastName = row[1] || '';
      if (!firstName && !lastName) return null;

      // Extract PDF URL from HYPERLINK formula in column E
      var pdfUrl = '';
      var formula = formulas[idx] ? formulas[idx][0] : '';
      if (formula) {
        var match = formula.match(/HYPERLINK\("([^"]+)"/);
        if (match) pdfUrl = match[1];
      }

      return {
        id: String(idx + 3),
        firstName: firstName,
        lastName: lastName,
        email: row[2] || '',
        status: row[3] || 'Enquiry',
        pdfUrl: pdfUrl,
        startDate: row[5] ? Utilities.formatDate(new Date(row[5]), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
        endDate: row[6] ? Utilities.formatDate(new Date(row[6]), Session.getScriptTimeZone(), 'yyyy-MM-dd') : '',
        tripDays: row[7] || '',
        yachtType: row[9] || '',
        destination: row[10] || '',
        budget: row[13] || '',
        yachtSize: row[14] || '',
        yachtStyle: row[15] || '',
        adults: row[16] || '',
        children: row[17] || '',
        amenities: row[18] || '',
        occasion: row[19] || '',
        specialRequirements: row[20] || '',
        phone: row[21] || '',
        nationality: row[22] || ''
      };
    })
    .filter(Boolean);

  return { enquiries: enquiries };
}

/**
 * Get a single enquiry by row ID
 */
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
