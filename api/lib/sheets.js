export async function sheetsAction(action, data = {}) {
  const url = process.env.GOOGLE_SCRIPT_URL;
  if (!url) throw new Error('GOOGLE_SCRIPT_URL not configured');

  const body = JSON.stringify({ action, ...data });

  let resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    redirect: 'manual',
  });

  // Handle Google Apps Script redirect
  if (resp.status >= 300 && resp.status < 400) {
    const loc = resp.headers.get('location');
    if (loc) {
      resp = await fetch(loc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
      });
    }
  }

  // Apps Script returns ContentService text output
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}
