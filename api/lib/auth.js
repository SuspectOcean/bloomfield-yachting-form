/**
 * Validate admin token from Authorization header.
 * Token format: base64(ADMIN_PASSWORD + "|" + timestamp)
 */
export function validateAdmin(req) {
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) return false;

  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return false;

  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [password] = decoded.split('|');
    return password === ADMIN_PASSWORD;
  } catch {
    return false;
  }
}
