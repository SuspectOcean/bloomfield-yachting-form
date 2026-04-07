import { PDFDocument, rgb, PDFPage } from 'pdf-lib';

const NAVY = rgb(2 / 255, 6 / 255, 23 / 255);
const ORANGE = rgb(249 / 255, 115 / 255, 22 / 255);
const LIGHT_GRAY = rgb(232 / 255, 232 / 255, 232 / 255);
const DARK_TEXT = rgb(15 / 255, 23 / 255, 42 / 255);
const WHITE = rgb(1, 1, 1);

export async function generatePDF(enquiry, rankedYachts) {
  const doc = await PDFDocument.create();

  // Cover page
  await addCoverPage(doc, enquiry);

  // Enquiry summary page
  await addEnquirySummaryPage(doc, enquiry);

  // Yacht profile pages (one per yacht, max 10)
  const yachtsToShow = rankedYachts.slice(0, 10);
  for (const yacht of yachtsToShow) {
    await addYachtProfilePage(doc, yacht);
  }

  // Disclaimer page
  await addDisclaimerPage(doc);

  // Add page numbers
  await addPageNumbers(doc);

  const pdfBytes = await doc.save();
  return pdfBytes;
}

async function addCoverPage(doc, enquiry) {
  const page = doc.addPage([595, 842]); // A4 portrait (72 DPI)
  const { width, height } = page.getSize();

  // Navy background header
  const headerHeight = 250;
  page.drawRectangle({
    x: 0,
    y: height - headerHeight,
    width,
    height: headerHeight,
    color: NAVY,
  });

  // Brand title
  page.drawText('BLOOMFIELD YACHTING', {
    x: 40,
    y: height - 100,
    size: 48,
    font: await doc.embedFont('TimesRoman'),
    color: WHITE,
  });

  // Subtitle
  page.drawText('Charter Yacht Selection', {
    x: 40,
    y: height - 160,
    size: 24,
    font: await doc.embedFont('Helvetica'),
    color: ORANGE,
  });

  // Client details
  const bodyY = height - 350;
  page.drawText(enquiry.firstName + ' ' + enquiry.lastName, {
    x: 40,
    y: bodyY,
    size: 20,
    font: await doc.embedFont('TimesRoman'),
    color: DARK_TEXT,
  });

  page.drawText('Destination: ' + (enquiry.destination || 'TBD'), {
    x: 40,
    y: bodyY - 40,
    size: 14,
    font: await doc.embedFont('Helvetica'),
    color: DARK_TEXT,
  });

  page.drawText(
    'Dates: ' + (enquiry.startDate || 'TBD') + ' to ' + (enquiry.endDate || 'TBD'),
    {
      x: 40,
      y: bodyY - 70,
      size: 14,
      font: await doc.embedFont('Helvetica'),
      color: DARK_TEXT,
    }
  );

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  page.drawText('Date Prepared: ' + dateStr, {
    x: 40,
    y: 60,
    size: 12,
    font: await doc.embedFont('Helvetica'),
    color: DARK_TEXT,
  });
}

async function addEnquirySummaryPage(doc, enquiry) {
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const headerFont = await doc.embedFont('TimesRoman');
  const bodyFont = await doc.embedFont('Helvetica');

  let y = height - 40;

  // Header
  page.drawText('ENQUIRY SUMMARY', {
    x: 40,
    y,
    size: 18,
    font: headerFont,
    color: NAVY,
  });

  // Orange line
  page.drawLine({
    start: { x: 40, y: y - 10 },
    end: { x: width - 40, y: y - 10 },
    color: ORANGE,
    thickness: 2,
  });

  y -= 40;

  // Section: Client & Dates
  page.drawText('Client & Dates', {
    x: 40,
    y,
    size: 12,
    font: bodyFont,
    color: DARK_TEXT,
    bold: true,
  });
  y -= 20;

  const summaryData = [
    ['Name: ' + enquiry.firstName + ' ' + enquiry.lastName],
    ['Destination: ' + (enquiry.destination || 'Not specified')],
    ['Check-in: ' + (enquiry.startDate || 'Not specified')],
    ['Check-out: ' + (enquiry.endDate || 'Not specified')],
    [''],
    ['Guests & Budget'],
    ['Adults: ' + (enquiry.adults || 0)],
    ['Children: ' + (enquiry.children || 0)],
    ['Budget: $' + (enquiry.budget || 0) + '/week'],
    [''],
    ['Yacht Preferences'],
    ['Type: ' + (enquiry.yachtType || 'Any')],
    ['Size: ' + (enquiry.yachtSize || 'Any')],
    ['Style: ' + (enquiry.yachtStyle || 'Any')],
    [''],
    ['Amenities Desired'],
    [
      enquiry.amenities && typeof enquiry.amenities === 'string'
        ? enquiry.amenities
        : Array.isArray(enquiry.amenities)
          ? enquiry.amenities.join(', ')
          : 'None specified',
    ],
    [''],
    ['Occasion & Special Requirements'],
    ['Occasion: ' + (enquiry.occasion || 'Not specified')],
    [
      'Special Needs: ' + (enquiry.specialRequirements || 'None'),
    ],
  ];

  for (const line of summaryData) {
    if (line[0] === '') {
      y -= 10;
    } else if (
      line[0].match(/^(Client & Dates|Guests & Budget|Yacht Preferences|Amenities Desired|Occasion & Special Requirements)/)
    ) {
      page.drawText(line[0], {
        x: 40,
        y,
        size: 11,
        font: bodyFont,
        color: DARK_TEXT,
        bold: true,
      });
      y -= 18;
    } else {
      page.drawText(line[0], {
        x: 60,
        y,
        size: 10,
        font: bodyFont,
        color: DARK_TEXT,
      });
      y -= 16;
    }

    if (y < 80) {
      break;
    }
  }
}

async function addYachtProfilePage(doc, yacht) {
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const headerFont = await doc.embedFont('TimesRoman');
  const bodyFont = await doc.embedFont('Helvetica');

  let y = height - 40;

  // Yacht name heading
  page.drawText(yacht.name, {
    x: 40,
    y,
    size: 18,
    font: headerFont,
    color: NAVY,
  });

  // Orange accent line
  page.drawLine({
    start: { x: 40, y: y - 10 },
    end: { x: width - 40, y: y - 10 },
    color: ORANGE,
    thickness: 2,
  });

  y -= 35;

  // Two-column layout
  const leftColX = 40;
  const rightColX = 310;
  const colWidth = 230;

  // Left column
  y = addYachtDetailsColumn(
    page,
    bodyFont,
    leftColX,
    y,
    yacht,
    'left'
  );

  // Right column (start from same Y as left for side-by-side effect)
  addYachtDetailsColumn(
    page,
    bodyFont,
    rightColX,
    height - 75,
    yacht,
    'right'
  );

  y = Math.min(y, height - 200);

  // Description
  y -= 20;
  if (yacht.description) {
    page.drawText('Description', {
      x: 40,
      y,
      size: 11,
      font: bodyFont,
      color: DARK_TEXT,
      bold: true,
    });
    y -= 16;

    // Wrap description text
    const maxWidth = width - 80;
    const descLines = wrapText(yacht.description, 55);
    for (const line of descLines) {
      if (y < 100) break;
      page.drawText(line, {
        x: 40,
        y,
        size: 9,
        font: bodyFont,
        color: DARK_TEXT,
      });
      y -= 14;
    }
  }

  // Match score and rationale
  y -= 10;
  page.drawRectangle({
    x: 40,
    y: y - 60,
    width: width - 80,
    height: 60,
    color: LIGHT_GRAY,
    borderColor: ORANGE,
    borderWidth: 1,
  });

  page.drawText('Match Score: ' + yacht.score + '/100', {
    x: 50,
    y: y - 20,
    size: 11,
    font: bodyFont,
    color: DARK_TEXT,
    bold: true,
  });

  const ratioLines = wrapText(yacht.rationale || 'Well-matched selection', 40);
  let ratY = y - 40;
  for (const line of ratioLines) {
    page.drawText(line, {
      x: 50,
      y: ratY,
      size: 9,
      font: bodyFont,
      color: DARK_TEXT,
    });
    ratY -= 13;
  }

  // Source URL
  page.drawText('Source: ' + (yacht.sourceUrl || yacht.charterWorldUrl || yacht.yachtCharterFleetUrl || 'Database'), {
    x: 40,
    y: 60,
    size: 8,
    font: bodyFont,
    color: DARK_TEXT,
  });
}

function addYachtDetailsColumn(page, font, x, y, yacht, side) {
  const items =
    side === 'left'
      ? [
          ['Type', yacht.type || 'Motor Yacht'],
          ['Builder', yacht.builder || 'Unknown'],
          ['Year', String(yacht.yearBuilt || yacht.year || 'N/A')],
          ['Length', (yacht.lengthM || yacht.length || 'N/A') + 'm'],
          ['Guests', String(yacht.guests || 'N/A')],
          ['Cabins', String(yacht.cabins || 'N/A')],
          ['Crew', String(yacht.crew || 'N/A')],
        ]
      : [
          ['Location', yacht.baseLocation || yacht.location || 'TBD'],
          ['Weekly Rate', '$' + ((yacht.weeklyRateUSD || yacht.rate || 'POA').toLocaleString ? (yacht.weeklyRateUSD || yacht.rate || 'POA').toLocaleString() : (yacht.weeklyRateUSD || yacht.rate || 'POA'))],
          ['Style', yacht.style || 'Modern'],
          ['Amenities', yacht.amenities || 'Standard'],
        ];

  for (const [label, value] of items) {
    page.drawText(label, {
      x,
      y,
      size: 9,
      font,
      color: DARK_TEXT,
      bold: true,
    });

    page.drawText(value, {
      x: x + 80,
      y,
      size: 9,
      font,
      color: DARK_TEXT,
    });

    y -= 18;
  }

  return y;
}

async function addDisclaimerPage(doc) {
  const page = doc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const headerFont = await doc.embedFont('TimesRoman');
  const bodyFont = await doc.embedFont('Helvetica');

  let y = height - 40;

  page.drawText('IMPORTANT INFORMATION', {
    x: 40,
    y,
    size: 16,
    font: headerFont,
    color: NAVY,
  });

  page.drawLine({
    start: { x: 40, y: y - 10 },
    end: { x: width - 40, y: y - 10 },
    color: ORANGE,
    thickness: 2,
  });

  y -= 40;

  const disclaimerText = [
    'This yacht selection has been prepared by Bloomfield Yachting based on your expressed charter preferences and requirements. The information provided herein is believed to be accurate at the time of preparation but is subject to change without notice.',
    '',
    'Availability: Yacht availability is subject to confirmation and may change at any time. All yachts listed are subject to owner approval and charter terms.',
    '',
    'Pricing: Weekly charter rates are estimates and may vary based on specific dates, seasonal demand, and additional services. Final pricing will be confirmed upon charter agreement execution.',
    '',
    'Specifications: All yacht specifications including size, cabin count, crew, and amenities are approximate and subject to verification. Please confirm all details during the charter negotiation process.',
    '',
    'Charter Terms: All charters are subject to standard charter party terms and conditions. Bloomfield Yachting acts as a broker and does not own or operate any of the yachts presented.',
    '',
    'Insurance & Safety: All yachts must maintain appropriate insurance and comply with maritime safety regulations. Charterers are responsible for obtaining comprehensive travel insurance.',
    '',
    'Next Steps: To proceed with any of these yachts, please contact your Bloomfield Yachting broker for detailed availability, pricing, and charter agreement preparation.',
    '',
    'Thank you for choosing Bloomfield Yachting. We look forward to creating an unforgettable charter experience.',
  ];

  for (const para of disclaimerText) {
    if (y < 100) break;

    if (para === '') {
      y -= 10;
    } else if (para.match(/^[A-Z][a-z]+:/)) {
      page.drawText(para, {
        x: 40,
        y,
        size: 10,
        font: bodyFont,
        color: DARK_TEXT,
        bold: true,
      });
      y -= 16;
    } else {
      const lines = wrapText(para, 80);
      for (const line of lines) {
        if (y < 100) break;
        page.drawText(line, {
          x: 40,
          y,
          size: 9,
          font: bodyFont,
          color: DARK_TEXT,
        });
        y -= 14;
      }
      y -= 4;
    }
  }
}

async function addPageNumbers(doc) {
  const pages = doc.getPages();
  const totalPages = pages.length;
  const font = await doc.embedFont('Helvetica');

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { height } = page.getSize();
    const pageNum = i + 1;

    page.drawText('Page ' + pageNum + ' of ' + totalPages, {
      x: 40,
      y: 20,
      size: 9,
      font,
      color: DARK_TEXT,
    });
  }
}

function wrapText(text, maxCharsPerLine) {
  if (!text) return [];
  const words = text.split(' ');
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }

  if (currentLine) lines.push(currentLine.trim());
  return lines;
}
