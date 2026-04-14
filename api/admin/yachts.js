import { sheetsAction } from '../lib/sheets.js';
import { validateAdmin } from '../lib/auth.js';

/**
 * Yacht database endpoint.
 *   GET    — list all yachts
 *   POST   — add a yacht         { yacht: { name, type, ... }, enquiryId? }
 *   PUT    — update a yacht       { yachtId, fields: { ... } }
 *   DELETE — delete a yacht       { yachtId }
 */
export default async function handler(req, res) {
  if (!validateAdmin(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    if (req.method === 'GET') {
      const data = await sheetsAction('getYachts');
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { yacht, enquiryId } = req.body || {};
      if (!yacht || !yacht.name) {
        return res.status(400).json({ error: 'Yacht name required' });
      }
      const data = await sheetsAction('addYacht', { yacht, enquiryId });
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const { yachtId, fields } = req.body || {};
      if (!yachtId || !fields) {
        return res.status(400).json({ error: 'Missing yachtId or fields' });
      }
      const data = await sheetsAction('updateYacht', { yachtId, fields });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { yachtId } = req.body || {};
      if (!yachtId) {
        return res.status(400).json({ error: 'Missing yachtId' });
      }
      const data = await sheetsAction('deleteYacht', { yachtId });
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Yacht API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
