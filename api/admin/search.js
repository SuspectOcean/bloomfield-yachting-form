import { askClaude } from '../lib/claude.js';
import { sheetsAction } from '../lib/sheets.js';

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

    // Build criteria summary for Claude
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

    const systemPrompt = `You are an expert yacht charter broker. Based on the following client enquiry, suggest 20 charter yachts that would be excellent matches. Return ONLY a JSON array (no markdown, no explanation). Each object must have these exact fields:
- name (string): yacht name
- type (string): Motor Yacht or Sailing Yacht
- builder (string): yacht builder/manufacturer
- yearBuilt (number): year the yacht was built
- lengthM (number): length in meters
- guests (number): max guests
- cabins (number): number of cabins
- crew (number): number of crew members
- baseLocation (string): primary base location
- summerLocation (string): summer cruising location
- winterLocation (string): winter cruising location
- weeklyRateUSD (number): weekly charter rate in USD
- amenities (string): comma-separated list of amenities
- style (string): Classic, Modern, Sport, or Explorer
- description (string): 1-2 sentence description
- charterWorldUrl (string or null): URL if known, else null
- yachtCharterFleetUrl (string or null): URL if known, else null

Focus on yachts KNOWN to be actively available for charter. Prioritize: 1) yacht type match, 2) location/availability for requested dates, 3) size match, 4) budget match, 5) amenity/style match.`;

    const yachtResponse = await askClaude(systemPrompt, criteriaText, {
      maxTokens: 4096,
    });

    // Parse Claude's JSON response
    let yachts = [];
    try {
      yachts = JSON.parse(yachtResponse);
      if (!Array.isArray(yachts)) {
        yachts = [];
      }
    } catch (e) {
      console.error('Failed to parse Claude response as JSON:', e);
      yachts = [];
    }

    console.log(`Claude suggested ${yachts.length} yachts`);

    const allYachts = [...yachts];

    // Save yachts to Yacht Database sheet
    try {
      await sheetsAction('saveYachts', {
        enquiryId: enquiry.id,
        yachts: allYachts.slice(0, 30), // Save top 30
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
