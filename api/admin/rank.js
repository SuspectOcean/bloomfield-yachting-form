import { askClaude } from '../lib/claude.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { enquiry, yachts } = await req.json();

    if (!yachts || !Array.isArray(yachts) || yachts.length === 0) {
      return new Response(JSON.stringify({ error: 'No yachts provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`Rank: Ranking ${yachts.length} yachts for enquiry`);

    // Build criteria summary
    const criteriaText = `
Client Enquiry:
- Destination: ${enquiry.destination || 'Not specified'}
- Dates: ${enquiry.startDate || 'Flexible'} to ${enquiry.endDate || 'Flexible'}
- Party: ${enquiry.adults || 0} adults, ${enquiry.children || 0} children
- Budget: $${enquiry.budget || 'Flexible'}/week
- Type: ${enquiry.yachtType || 'Any'}
- Size: ${enquiry.yachtSize || 'Any'}
- Style: ${enquiry.yachtStyle || 'Any'}
- Amenities: ${enquiry.amenities || 'Standard'}
- Occasion: ${enquiry.occasion || 'General'}
- Special Requirements: ${enquiry.specialRequirements || 'None'}

Yachts to Rank:
${JSON.stringify(yachts.slice(0, 25), null, 2)}
`;

    const systemPrompt = `You are an expert yacht charter broker ranking yachts for a specific client. Score each yacht 0-100 based on how well it matches the criteria. Scoring weights: Yacht Type Match (30%), Location & Availability (25%), Size Match (20%), Budget Match (15%), Extras & Amenities (10%).

Return ONLY a JSON array (no markdown, no explanation). Include ONLY the top 10 ranked yachts. Each object must have all original yacht fields plus:
- score (number): 0-100 ranking score
- rationale (string): 1-2 sentence explanation of why this yacht suits this client
- rank (number): 1-10 (position in ranking)

Sort by score descending (highest first).`;

    const rankResponse = await askClaude(systemPrompt, criteriaText, {
      maxTokens: 4096,
    });

    // Parse Claude's response
    let rankedYachts = [];
    try {
      rankedYachts = JSON.parse(rankResponse);
      if (!Array.isArray(rankedYachts)) {
        rankedYachts = [];
      }
      // Ensure we have at most 10
      rankedYachts = rankedYachts.slice(0, 10);
    } catch (e) {
      console.error('Failed to parse ranking response:', e);
      // Fallback: return original yachts with default scores
      rankedYachts = yachts.slice(0, 10).map((y, idx) => ({
        ...y,
        score: 100 - idx * 5,
        rationale: 'Matches client criteria',
        rank: idx + 1,
      }));
    }

    console.log(`Ranked ${rankedYachts.length} yachts`);

    return new Response(JSON.stringify({ success: true, yachts: rankedYachts }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Rank error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
