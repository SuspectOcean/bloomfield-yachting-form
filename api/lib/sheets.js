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

  // Google Apps Script returns a 302 redirect
  // Must follow with GET (not POST) per HTTP spec
  if (resp.status >= 300 && resp.status < 400) {
          const loc = resp.headers.get('location');
          if (loc) {
                    resp = await fetch(loc);
          }
  }

  const text = await resp.text();
      try {
              return JSON.parse(text);
      } catch {
              return { raw: text };
      }
}
