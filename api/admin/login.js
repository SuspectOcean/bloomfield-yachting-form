/**
 * Admin login endpoint.
 * Validates password against ADMIN_PASSWORD env var.
 * Returns a token (base64 of password + timestamp) stored in memory by the client.
 *
 * ENV REQUIRED: ADMIN_PASSWORD (set in Vercel dashboard)
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'Admin auth not configured' });
  }

  const { password } = req.body || {};
  if (!password || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  // Generate a simple token: base64(password + "|" + timestamp)
  // This token is validated on each request by decoding and checking the password portion
  const token = Buffer.from(ADMIN_PASSWORD + '|' + Date.now()).toString('base64');

  return res.status(200).json({ success: true, token });
}
