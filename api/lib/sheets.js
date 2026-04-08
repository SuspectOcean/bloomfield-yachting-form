export async function sheetsAction(action, data = {}) {
    const url = process.env.GOOGLE_SCRIPT_URL;
    if (!url) throw new Error('GOOGLE_SCRIPT_URL not configured');

  const body = JSON.stringify({ action, ...data });

  // Let fetch handle redirects automatically (POST -> GET on 302)
  const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
  });

  // Apps Script returns ContentService text output
  const text = await resp.text();
    try {
          return JSON.parse(text);
    } catch {
          return { raw: text };
    }
}
