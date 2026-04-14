import { sheetsAction } from '../lib/sheets.js';
import { validateAdmin } from '../lib/auth.js';

/**
 * Link/unlink yachts to enquiries.
 *   GET    — get yachts linked to an enquiry  ?enquiryId=X
 *   POST   — link a yacht     { enquiryId, yachtId }
 *   DELETE — unlink a yacht   { enquiryId, yachtId }
 */
export default async function handler(req, res) {
  if (!validateAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const enquiryId = req.query.enquiryId;
      if (!enquiryId) return res.status(400).json({ error: 'Missing enquiryId' });
      const data = await sheetsAction('getEnquiryYachts', { enquiryId });
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { enquiryId, yachtId } = req.body || {};
      if (!enquiryId || !yachtId) {
        return res.status(400).json({ error: 'Missing enquiryId or yachtId' });
      }
      const data = await sheetsAction('linkYachtToEnquiry', { enquiryId, yachtId });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { enquiryId, yachtId } = req.body || {};
      if (!enquiryId || !yachtId) {
        return res.status(400).json({ error: 'Missing enquiryId or yachtId' });
      }
      const data = await sheetsAction('unlinkYachtFromEnquiry', { enquiryId, yachtId });
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Enquiry-yachts API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
