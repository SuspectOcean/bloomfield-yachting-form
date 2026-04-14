import { sheetsAction } from '../lib/sheets.js';
import { validateAdmin } from '../lib/auth.js';

/**
 * Admin enquiries endpoint.
 *   GET  — list all enquiries
 *   PUT  — update an enquiry  { enquiryId, fields: { ... } }
 *   DELETE — delete an enquiry { enquiryId }
 */
export default async function handler(req, res) {
  // Auth check for all methods
  if (!validateAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const data = await sheetsAction('getEnquiries');
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const { enquiryId, fields } = req.body || {};
      if (!enquiryId || !fields) {
        return res.status(400).json({ error: 'Missing enquiryId or fields' });
      }
      const data = await sheetsAction('updateEnquiry', { enquiryId, fields });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { enquiryId } = req.body || {};
      if (!enquiryId) {
        return res.status(400).json({ error: 'Missing enquiryId' });
      }
      const data = await sheetsAction('deleteEnquiry', { enquiryId });
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Admin enquiries error:', err);
    return res.status(500).json({ error: err.message });
  }
}
