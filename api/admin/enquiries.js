import { sheetsAction } from '../lib/sheets.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Fetching enquiries from Google Sheets...');
    const data = await sheetsAction('getEnquiries');
    const enquiries = Array.isArray(data) ? data : (data.enquiries || []);
    return res.status(200).json(enquiries);
  } catch (err) {
    console.error('Error fetching enquiries:', err);
    return res.status(500).json({ error: err.message });
  }
}
