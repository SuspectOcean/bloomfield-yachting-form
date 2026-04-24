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
        <td style="padding:8px 24px 8px 0;color:#6b7280;font-size:13px;width:38%;vertical-align:top;font-family:Arial,sans-serif">${label}</td>
        <td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600;font-family:Arial,sans-serif">${value}</td>
      </tr>
      <tr><td colspan="2" style="padding:0"><div style="height:1px;background:#f3f4f6"></div></td></tr>`;

    const section = (title) =>
      `<tr><td colspan="2" style="padding:20px 0 4px 0">
        <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:#F97316;font-family:Arial,sans-serif">${title}</p>
       </td></tr>`;

    const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,Helvetica,sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f9fafb" style="padding:32px 16px">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px">

  <!-- Header -->
  <tr><td bgcolor="#111827" style="padding:24px 32px;border-radius:8px 8px 0 0">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td>
          <p style="margin:0;font-size:11px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#F97316;font-family:Arial,sans-serif">Bloomfield Yachting</p>
          <p style="margin:3px 0 0;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#6b7280;font-family:Arial,sans-serif">Charter Enquiry</p>
        </td>
        <td align="right">
          <p style="margin:0;font-size:11px;color:#4b5563;font-family:Arial,sans-serif">${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Orange border accent line -->
  <tr><td height="3" bgcolor="#F97316" style="font-size:0;line-height:0">&nbsp;</td></tr>

  <!-- White content -->
  <tr><td bgcolor="#ffffff" style="padding:32px;border-radius:0 0 8px 8px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb">

    <!-- Enquiry summary -->
    <p style="margin:0 0 24px;font-size:15px;color:#111827;font-weight:700;font-family:Arial,sans-serif">
      New enquiry from ${data.fullName || 'Unknown'}${data.destination ? ' &mdash; ' + data.destination : ''}
    </p>

    <table width="100%" cellpadding="0" cellspacing="0">

      ${section('Client Details')}
      ${row('Full Name',   data.fullName)}
      ${row('Email',       data.email ? `<a href="mailto:${data.email}" style="color:#F97316;text-decoration:none">${data.email}</a>` : null)}
      ${row('Phone',       data.phone)}
      ${row('Nationality', data.nationality)}
      ${row('Member ID',   data.memberId)}
      ${row('Referred By', data.referredBy)}

      ${section('Charter Preferences')}
      ${row('Start Date',        data.startDate)}
      ${row('End Date',          data.endDate)}
      ${row('Dates Flexible',    data.datesFlexible)}
      ${row('Destination',       data.destination)}
      ${row('Dest. Flexible',    data.destinationFlexible)}
      ${row('Adults',            data.adults)}
      ${row('Children',          data.children)}
      ${row('Weekly Budget',     data.budget)}

      ${section('Yacht Preferences')}
      ${row('Yacht Type', data.yachtType)}
      ${row('Size',       data.yachtSize)}
      ${row('Style',      data.yachtStyle)}
      ${row('Amenities',  amenities.length ? amenities.join(', ') : null)}

      ${section('Occasion & Requirements')}
      ${row('Occasion',             data.occasion)}
      ${row('Special Requirements', data.specialRequirements)}

    </table>

    <!-- Reply button -->
    ${data.email ? `
    <table cellpadding="0" cellspacing="0" style="margin-top:28px">
      <tr><td bgcolor="#111827" style="border-radius:6px;padding:12px 24px">
        <a href="mailto:${data.email}?subject=Re: Your Bloomfield Yachting Charter Enquiry"
           style="color:#F97316;font-size:13px;font-weight:700;text-decoration:none;font-family:Arial,sans-serif;letter-spacing:0.05em">
          REPLY TO ${(data.fullName || 'ENQUIRER').toUpperCase()} &rarr;
        </a>
      </td></tr>
    </table>` : ''}

  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 0;text-align:center">
    <p style="margin:0;font-size:11px;color:#9ca3af;font-family:Arial,sans-serif">
      Bloomfield Yachting &middot; Antigua &amp; Barbuda &middot;
      <a href="mailto:enquiries@bloomfield-yachting.com" style="color:#9ca3af">enquiries@bloomfield-yachting.com</a>
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

    const results   = await Promise.all(promises);
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
