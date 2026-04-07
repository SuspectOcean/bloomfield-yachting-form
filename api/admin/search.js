import { askClaude } from '../lib/claude.js';

// Inline sheets helper (Edge Runtime can't resolve ../lib/sheets.js as shared module)
async function sheetsAction(action, data = {}) {
  const url = process.env.GOOGLE_SCRIPT_URL;
  if (!url) throw new Error('GOOGLE_SCRIPT_URL not configured');
  const body = JSON.stringify({ action, ...data });
  let resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    redirect: 'follow',
  });
  const text = await resp.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const enquiry = await req.json();

    console.log('Search: Processing enquiry:', enquiry.id || 'unknown');

    const criteriaText = `
Client Enquiry Details:
- Destination: ${enquiry.destination || 'Not specified'}
- Dates: ${enquiry.startDate || 'Flexible'} to ${enquiry.endDate || 'Flexible'}
- Party Size: ${enquiry.adults || 0} adults, ${enquiry.children || 0} children
- Budget: $${enquiry.budget || 'Flexible'}/week
- Yacht Type: ${enquiry.yachtType || 'Any type'}
- Size Preference: ${enquiry.yachtSize || 'Any size'}
- Style: ${enquiry.yachtStyle || 'Any style'}
- Amenities: ${enquiry.amenities || 'Standard'}
- Occasion: ${enquiry.occasion || 'General vacation'}
- Special Requirements: ${enquiry.specialRequirements || 'None'}
`;

    const systemPrompt = 'You are an expert yacht charter broker. Based on the following client enquiry, suggest 20 charter yachts that would be excellent matches. Return ONLY a JSON array (no markdown, no explanation). Each object must have these exact fields: name (string), type (string: Motor Yacht or Sailing Yacht), builder (string), yearBuilt (number), lengthM (number: length in meters), guests (number), cabins (number), crew (number), baseLocation (string), summerLocation (string), winterLocation (string), weeklyRateUSD (number), amenities (string: comma-separated), style (string: Classic/Modern/Sport/Explorer), description (string: 1-2 sentences), charterWorldUrl (string or null), yachtCharterFleetUrl (string or null). Focus on yachts KNOWN to be actively available for charter. Prioritize: 1) yacht type match, 2) location/availability, 3) size match, 4) budget match, 5) amenity/style match.';

    const yachtResponse = await askClaude(systemPrompt, criteriaText, {
      maxTokens: 4096,
    });

    let yachts = [];
    try {
      yachts = JSON.parse(yachtResponse);
      if (!Array.isArray(yachts)) yachts = [];
    } catch (e) {
      console.error('Failed to parse Claude response as JSON:', e);
      yachts = [];
    }

    console.log('Claude suggested ' + yachts.length + ' yachts');

    const allYachts = [...yachts];

    // Save yachts to Yacht Database sheet
    try {
      await sheetsAction('saveYachts', {
        enquiryId: enquiry.id,
        yachts: allYachts.slice(0, 30),
      });
      console.log('Yachts saved to sheet');
    } catch (err) {
      console.warn('Failed to save yachts to sheet:', err.message);
    }

    return new Response(JSON.stringify({ success: true, yachts: allYachts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Search error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
