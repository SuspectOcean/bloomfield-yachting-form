export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_API_KEY    = process.env.RESEND_API_KEY;
  const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
  const TO_EMAIL          = 'enquiries@bloomfield-yachting.com';
  const FROM              = 'Bloomfield Yachting <noreply@bloomfield-yachting.com>';

  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const data = req.body;

    const amenities = [];
    if (data.jacuzzi)   amenities.push('Jacuzzi');
    if (data.spa)       amenities.push('Spa');
    if (data.gym)       amenities.push('Gym');
    if (data.helipad)   amenities.push('Helipad');
    if (data.diveGear)  amenities.push('Dive Gear');
    if (data.cinema)    amenities.push('Cinema');
    if (data.beachClub) amenities.push('Beach Club');
    if (data.waterToys) amenities.push('Water Toys');
    if (data.fishing)   amenities.push('Fishing');
    if (data.jetSkis)   amenities.push('Jet Skis');

    const row = (label, value) => (!value || value === '-') ? '' :
      `<tr>
        <td style="padding:9px 24px 9px 0;color:#64748b;font-size:13px;width:40%;vertical-align:top">${label}</td>
        <td style="padding:9px 0;color:#0f172a;font-size:13px;font-weight:500">${value}</td>
      </tr>`;

    const section = (title) =>
      `<tr><td colspan="2" style="padding:24px 0 6px 0">
        <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#FF6321">${title}</p>
        <div style="height:1px;background:#f1f5f9;margin-top:6px"></div>
       </td></tr>`;

    const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>New Charter Enquiry</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px">

  <!-- Top bar -->
  <tr><td style="background:#0a0f1e;padding:0;border-radius:12px 12px 0 0;overflow:hidden">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:24px 32px">
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.22em;text-transform:uppercase;color:#FF6321">Bloomfield Yachting</p>
          <p style="margin:4px 0 0;font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:rgba(255,255,255,0.4)">Charter Enquiry</p>
        </td>
        <td style="padding:24px 32px;text-align:right">
          <p style="margin:0;font-size:11px;color:rgba(255,255,255,0.3)">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Orange highlight bar -->
  <tr><td style="background:#FF6321;padding:14px 32px">
    <p style="margin:0;font-size:14px;color:#fff;font-weight:600">
      New enquiry from <strong>${data.fullName || 'Unknown'}</strong>${data.destination ? ' &mdash; ' + data.destination : ''}
    </p>
  </td></tr>

  <!-- White content card -->
  <tr><td style="background:#ffffff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none">

    <table width="100%" cellpadding="0" cellspacing="0">

      ${section('Client Details')}
      ${row('Full Name',    data.fullName)}
      ${row('Email',        data.email ? `<a href="mailto:${data.email}" style="color:#FF6321;text-decoration:none">${data.email}</a>` : null)}
      ${row('Phone',        data.phone)}
      ${row('Nationality',  data.nationality)}
      ${row('Member ID',    data.memberId)}
      ${row('Referred By',  data.referredBy)}

      ${section('Charter Preferences')}
      ${row('Start Date',           data.startDate)}
      ${row('End Date',             data.endDate)}
      ${row('Dates Flexible',       data.datesFlexible)}
      ${row('Destination',          data.destination)}
      ${row('Dest. Flexible',       data.destinationFlexible)}
      ${row('Adults',               data.adults)}
      ${row('Children',             data.children)}
      ${row('Weekly Budget',        data.budget)}

      ${section('Yacht Preferences')}
      ${row('Yacht Type',    data.yachtType)}
      ${row('Size',          data.yachtSize)}
      ${row('Style',         data.yachtStyle)}
      ${row('Amenities',     amenities.length ? amenities.join(', ') : null)}

      ${section('Occasion & Requirements')}
      ${row('Occasion',             data.occasion)}
      ${row('Special Requirements', data.specialRequirements)}

    </table>

    <!-- Reply button -->
    ${data.email ? `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px">
      <tr><td style="padding-top:24px;border-top:1px solid #f1f5f9">
        <a href="mailto:${data.email}?subject=Re: Your Bloomfield Yachting Charter Enquiry"
           style="display:inline-block;background:#FF6321;color:#ffffff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;letter-spacing:0.02em">
          Reply to ${data.fullName || 'Enquirer'} &rarr;
        </a>
      </td></tr>
    </table>` : ''}

  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 0;text-align:center">
    <p style="margin:0;font-size:11px;color:#94a3b8">
      Bloomfield Yachting &middot; Antigua &amp; Barbuda &middot;
      <a href="mailto:enquiries@bloomfield-yachting.com" style="color:#FF6321;text-decoration:none">enquiries@bloomfield-yachting.com</a>
    </p>
  </td></tr>

</table>
</td></tr>
</table>

</body></html>`;

    const promises = [];

    promises.push(
      fetch('https://api.resend.com/emails', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API_KEY}` },
        body: JSON.stringify({
          from:     FROM,
          to:       [TO_EMAIL],
          reply_to: data.email || undefined,
          subject:  `New Charter Enquiry — ${data.fullName || 'Unknown'} · ${data.destination || 'Destination TBC'}`,
          html:     htmlBody,
        }),
      })
    );

    if (GOOGLE_SCRIPT_URL) {
      promises.push(
        (async () => {
          try {
            const scriptBody = JSON.stringify(data);
            let resp = await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: scriptBody, redirect: 'manual',
            });
            if (resp.status >= 300 && resp.status < 400) {
              const loc = resp.headers.get('location');
              if (loc) resp = await fetch(loc, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: scriptBody });
            }
            return resp;
          } catch (err) { console.error('Google Script error:', err.message); }
        })()
      );
    }

    const results  = await Promise.all(promises);
    const resendRes = results[0];

    if (!resendRes.ok) {
      const errorData = await resendRes.json();
      console.error('Resend error:', errorData);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
