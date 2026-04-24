export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_API_KEY  = process.env.RESEND_API_KEY;
  const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
  const TO_EMAIL        = 'enquiries@bloomfield-yachting.com';
  const FROM            = 'Bloomfield Yachting <noreply@bloomfield-yachting.com>';

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

    const row = (label, value) => value && value !== '-'
      ? `<tr>
           <td style="padding:7px 20px 7px 0;color:#94a3b8;white-space:nowrap;font-size:13px">${label}</td>
           <td style="padding:7px 0;color:#f1f5f9;font-size:13px;font-weight:500">${value}</td>
         </tr>`
      : '';

    const section = (title) =>
      `<tr><td colspan="2" style="padding:20px 0 8px">
         <p style="margin:0;font-size:10px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;color:#FF6321;border-bottom:1px solid rgba(255,99,33,0.3);padding-bottom:6px">${title}</p>
       </td></tr>`;

    const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0f1e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0f1e;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px">

        <!-- Header -->
        <tr><td style="background:#303B1B;padding:28px 32px;border-radius:12px 12px 0 0;text-align:center">
          <p style="margin:0;font-size:11px;letter-spacing:0.25em;color:#FF6321;font-weight:700;text-transform:uppercase">Bloomfield Yachting</p>
          <p style="margin:6px 0 0;font-size:10px;letter-spacing:0.2em;color:rgba(255,255,255,0.5);text-transform:uppercase">Charter Enquiry</p>
        </td></tr>

        <!-- Alert bar -->
        <tr><td style="background:#FF6321;padding:10px 32px">
          <p style="margin:0;font-size:13px;color:#fff;font-weight:600">
            New enquiry from <strong>${data.fullName || 'Unknown'}</strong>
            ${data.destination ? ' &mdash; ' + data.destination : ''}
          </p>
        </td></tr>

        <!-- Body -->
        <tr><td style="background:#0d1526;padding:32px;border-radius:0 0 12px 12px">
          <table width="100%" cellpadding="0" cellspacing="0">

            ${section('Client Details')}
            ${row('Full Name',    data.fullName)}
            ${row('Email',        data.email ? `<a href="mailto:${data.email}" style="color:#FF6321">${data.email}</a>` : '-')}
            ${row('Phone',        data.phone)}
            ${row('Nationality',  data.nationality)}
            ${row('Member ID',    data.memberId)}
            ${row('Referred By',  data.referredBy)}

            ${section('Charter Preferences')}
            ${row('Start Date',          data.startDate)}
            ${row('End Date',            data.endDate)}
            ${row('Dates Flexible',      data.datesFlexible)}
            ${row('Destination',         data.destination)}
            ${row('Destination Flexible', data.destinationFlexible)}
            ${row('Adults',              data.adults)}
            ${row('Children',            data.children)}
            ${row('Weekly Budget',       data.budget)}

            ${section('Yacht Preferences')}
            ${row('Yacht Type',    data.yachtType)}
            ${row('Size',          data.yachtSize)}
            ${row('Style',         data.yachtStyle)}
            ${row('Amenities',     amenities.length ? amenities.join(', ') : null)}

            ${section('Occasion & Requirements')}
            ${row('Occasion',             data.occasion)}
            ${row('Special Requirements', data.specialRequirements)}

          </table>

          <!-- Reply CTA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px">
            <tr><td style="text-align:center;padding-top:20px;border-top:1px solid rgba(255,255,255,0.08)">
              ${data.email
                ? `<a href="mailto:${data.email}?subject=Re: Your Bloomfield Yachting Charter Enquiry"
                      style="display:inline-block;background:#FF6321;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600">
                     Reply to ${data.fullName || 'Enquirer'}
                   </a>`
                : ''}
              <p style="margin:16px 0 0;font-size:11px;color:rgba(255,255,255,0.3)">
                Submitted ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </td></tr>
          </table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const promises = [];

    // 1. Email via Resend
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

    // 2. Google Apps Script webhook
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

    const results = await Promise.all(promises);
    const resendResponse = results[0];

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('Resend error:', errorData);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
