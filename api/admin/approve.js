import { sheetsAction } from '../lib/sheets.js';
import { generatePDF } from '../lib/pdf.js';

export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { enquiryId, rankedYachts } = await req.json();

    if (!enquiryId || !rankedYachts || !Array.isArray(rankedYachts)) {
      return new Response(
        JSON.stringify({ error: 'Missing enquiryId or rankedYachts' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Approve: Generating PDF and email for enquiry ${enquiryId}`);

    // Get full enquiry details from sheets
    let enquiry = {};
    try {
      const result = await sheetsAction('getEnquiry', { enquiryId });
      enquiry = result.enquiry || {};
    } catch (err) {
      console.warn('Could not retrieve full enquiry details:', err.message);
      // Continue with minimal enquiry data
    }

    // Generate PDF
    console.log('Generating PDF...');
    const pdfBytes = await generatePDF(enquiry, rankedYachts);
    // Convert to base64 (Edge Runtime compatible — chunked to avoid stack overflow)
    const bytes = new Uint8Array(pdfBytes);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
    }
    const pdfBase64 = btoa(binary);

    console.log(`PDF generated, size: ${pdfBytes.length} bytes`);

    // Prepare email
    const yachtNames = rankedYachts.slice(0, 10).map((y) => y.name).join(', ');
    const emailHtml = `
<div style="font-family: Georgia, serif; max-width: 700px; margin: 0 auto; color: #1a2a3a;">
  <div style="background: linear-gradient(135deg, #0c2340 0%, #1a3a5c 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: #c9a84c; margin: 0; font-size: 28px; letter-spacing: 2px;">BLOOMFIELD YACHTING</h1>
    <p style="color: #8fa8c8; margin: 8px 0 0; font-size: 14px; letter-spacing: 3px;">YACHT SELECTION</p>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e0e0e0;">
    <p>Dear ${enquiry.firstName || 'Valued Client'},</p>
    <p>Please find attached the curated yacht selection for your enquiry:</p>
    <table style="margin: 20px 0; border-collapse: collapse;">
      <tr><td style="padding: 8px; color: #666;"><strong>Destination:</strong></td><td style="padding: 8px;">${enquiry.destination || 'TBD'}</td></tr>
      <tr><td style="padding: 8px; color: #666;"><strong>Dates:</strong></td><td style="padding: 8px;">${enquiry.startDate || 'TBD'} to ${enquiry.endDate || 'TBD'}</td></tr>
    </table>
    <p><strong>Recommended Yachts:</strong></p>
    <ul>
      ${rankedYachts.slice(0, 10).map((y) => `<li>${y.name}</li>`).join('')}
    </ul>
    <p>These selections have been carefully matched to your specific requirements. Please review the full details in the attached PDF and contact us with any questions or to proceed with charter negotiations.</p>
    <p>Best regards,<br><strong>Bloomfield Yachting</strong></p>
    <p style="color: #999; font-size: 11px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
      This email and attached document contain confidential information for the intended recipient only.
    </p>
  </div>
</div>
    `;

    // Send email via Resend with PDF attachment
    console.log('Sending email via Resend...');
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Bloomfield Yachting <onboarding@resend.dev>',
        to: ['roscoebloomfield89@gmail.com'],
        subject: `Yacht Selection — ${enquiry.firstName || 'Client'} ${enquiry.lastName || ''} — ${enquiry.destination || 'Charter'}`,
        html: emailHtml,
        attachments: [
          {
            filename: `Bloomfield_Yachting_${enquiry.firstName || 'Client'}_${enquiry.lastName || ''}.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('Resend error:', errorData);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Email sent successfully');

    // Update enquiry status to "Approved" in sheets
    try {
      await sheetsAction('updateEnquiryStatus', {
        enquiryId,
        status: 'Approved',
        sentAt: new Date().toISOString(),
      });
      console.log('Enquiry status updated');
    } catch (err) {
      console.warn('Could not update enquiry status:', err.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        pdfBase64,
        emailSent: true,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('Approve error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
