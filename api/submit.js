export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL;
  const TO_EMAIL = 'enquiries@bloomfield-yachting.com';

  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: 'Email service not configured' });
  }

  try {
    const data = req.body;

    const amenities = [];
    if (data.jacuzzi) amenities.push('Jacuzzi');
    if (data.spa) amenities.push('Spa');
    if (data.gym) amenities.push('Gym');
    if (data.helipad) amenities.push('Helipad');
    if (data.diveGear) amenities.push('Dive Gear');
    if (data.cinema) amenities.push('Cinema');
    if (data.beachClub) amenities.push('Beach Club');
    if (data.waterToys) amenities.push('Water Toys');
    if (data.fishing) amenities.push('Fishing');
    if (data.jetSkis) amenities.push('Jet Skis');

    const htmlBody = `
      <div style="font-family: Georgia, serif; max-width: 700px; margin: 0 auto; color: #1a2a3a;">
        <div style="background: linear-gradient(135deg, #0c2340 0%, #1a3a5c 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: #c9a84c; margin: 0; font-size: 28px; letter-spacing: 2px;">BLOOMFIELD YACHTING</h1>
          <p style="color: #8fa8c8; margin: 8px 0 0; font-size: 14px; letter-spacing: 3px;">CHARTER ENQUIRY FORM</p>
        </div>
        <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0;">
          <h2 style="color: #0c2340; border-bottom: 2px solid #c9a84c; padding-bottom: 8px; font-size: 16px; letter-spacing: 1px;">CLIENT DETAILS</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="padding: 8px 0; color: #666; width: 40%;">Full Name</td><td style="padding: 8px 0; font-weight: bold;">${data.fullName || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Email Address</td><td style="padding: 8px 0;">${data.email || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Phone Number</td><td style="padding: 8px 0;">${data.phone || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Nationality / Country</td><td style="padding: 8px 0;">${data.nationality || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Member ID</td><td style="padding: 8px 0;">${data.memberId || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Referred By</td><td style="padding: 8px 0;">${data.referredBy || '-'}</td></tr>
          </table>
          <h2 style="color: #0c2340; border-bottom: 2px solid #c9a84c; padding-bottom: 8px; font-size: 16px; letter-spacing: 1px;">CHARTER PREFERENCES</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="padding: 8px 0; color: #666; width: 40%;">Preferred Start Date</td><td style="padding: 8px 0; font-weight: bold;">${data.startDate || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Preferred End Date</td><td style="padding: 8px 0; font-weight: bold;">${data.endDate || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Dates Flexible?</td><td style="padding: 8px 0;">${data.datesFlexible || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Destination</td><td style="padding: 8px 0; font-weight: bold;">${data.destination || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Destination Flexible?</td><td style="padding: 8px 0;">${data.destinationFlexible || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Adults</td><td style="padding: 8px 0;">${data.adults || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Children</td><td style="padding: 8px 0;">${data.children || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Weekly Budget (USD)</td><td style="padding: 8px 0; font-weight: bold;">${data.budget || '-'}</td></tr>
          </table>
          <h2 style="color: #0c2340; border-bottom: 2px solid #c9a84c; padding-bottom: 8px; font-size: 16px; letter-spacing: 1px;">YACHT PREFERENCES</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="padding: 8px 0; color: #666; width: 40%;">Yacht Type</td><td style="padding: 8px 0;">${data.yachtType || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Preferred Size</td><td style="padding: 8px 0;">${data.yachtSize || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Style</td><td style="padding: 8px 0;">${data.yachtStyle || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Desired Amenities</td><td style="padding: 8px 0;">${amenities.length > 0 ? amenities.join(', ') : '-'}</td></tr>
          </table>
          <h2 style="color: #0c2340; border-bottom: 2px solid #c9a84c; padding-bottom: 8px; font-size: 16px; letter-spacing: 1px;">OCCASION & SPECIAL REQUIREMENTS</h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr><td style="padding: 8px 0; color: #666; width: 40%;">Occasion</td><td style="padding: 8px 0;">${data.occasion || '-'}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Special Requirements</td><td style="padding: 8px 0;">${data.specialRequirements || '-'}</td></tr>
          </table>
          <p style="color: #666; font-size: 11px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
            This enquiry was submitted via the Bloomfield Yachting online charter enquiry form on ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}.
          </p>
        </div>
      </div>
    `;

    // Send email and Google Sheets webhook in parallel
    const promises = [];

    // 1. Email notification via Resend
    promises.push(
      fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Bloomfield Yachting <onboarding@resend.dev>',
          to: [TO_EMAIL],
          subject: `New Charter Enquiry from ${data.fullName || 'Unknown'}`,
          html: htmlBody,
        }),
      })
    );

    // 2. Google Apps Script webhook (writes to Charter Tracker + generates PDF)
    if (GOOGLE_SCRIPT_URL) {
      promises.push(
        (async () => {
          try {
            const scriptBody = JSON.stringify(data);
            let resp = await fetch(GOOGLE_SCRIPT_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: scriptBody,
              redirect: 'manual',
            });
            if (resp.status >= 300 && resp.status < 400) {
              const loc = resp.headers.get('location');
              if (loc) {
                resp = await fetch(loc, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: scriptBody,
                });
              }
            }
            return resp;
          } catch (err) {
            console.error('Google Script error:', err.message);
          }
        })()
      );
    }

    const results = await Promise.all(promises);

    // Check Resend response
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
