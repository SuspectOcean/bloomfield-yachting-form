# Bloomfield Yachting — Automated Yacht Search System Setup

## Quick Overview

This system adds automated yacht searching to your existing enquiry form. When a client submits an enquiry, you can search for matching yachts, review the results, and send a branded PDF — all from an admin dashboard.

---

## Step 1: Update Google Apps Script

Your existing Apps Script handles form submissions. We need to extend it to also handle the yacht search system's data operations.

1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1YTf2mxlP_ztrqEJQrrlrdNrPKNiouM1w2CXAn0u-S-s
2. Go to **Extensions > Apps Script**
3. **Replace ALL** the existing code with the contents of `google-apps-script.js` from this repo
4. Click **Save** (Ctrl+S)
5. Click **Deploy > New deployment**
6. Type: **Web app**
7. Execute as: **Me**
8. Who has access: **Anyone**
9. Click **Deploy**
10. **Copy the new Web app URL** — you'll need this in Step 3

> **Important:** The new deployment creates a new URL. You must update GOOGLE_SCRIPT_URL in Vercel (Step 3) with this new URL.

The script will automatically create two new tabs in your spreadsheet:
- **Yacht Database** — stores all yachts found across all searches
- **Search Results** — tracks search status for each enquiry

---

## Step 2: Get an Anthropic API Key

The system uses Claude AI to find and rank charter yachts.

1. Go to https://console.anthropic.com
2. Sign up or log in
3. Go to **API Keys** in the left sidebar
4. Click **Create Key**
5. Name it "Bloomfield Yachting"
6. **Copy the key** — you'll need this in Step 3

> **Cost:** Roughly $0.20–0.50 per enquiry search (2 Claude API calls per search). At 10 enquiries/month, expect ~$2–5/month.

---

## Step 3: Set Vercel Environment Variables

1. Go to https://vercel.com/suspectoceans-projects/bloomfield-yachting-form/settings/environment-variables
2. Add these new variables:

| Variable | Value |
|----------|-------|
| `ANTHROPIC_API_KEY` | Your key from Step 2 |
| `GOOGLE_SCRIPT_URL` | Your **new** Apps Script URL from Step 1 |

> **Note:** If GOOGLE_SCRIPT_URL already exists, **update it** with the new URL from Step 1.

3. Click **Save** for each variable

---

## Step 4: Deploy to Vercel

Push the updated code to GitHub. Vercel will auto-deploy.

```bash
git add .
git commit -m "Add automated yacht search system"
git push origin main
```

Or if you're deploying manually via the Vercel dashboard, trigger a new deployment.

---

## Step 5: Verify

1. **Admin Dashboard:** Go to https://bloomfield-yachting-form.vercel.app/admin
2. Enter password: `Bloomfield`
3. You should see your existing enquiries listed
4. Click on any enquiry and click "Find Yachts" to test the search

---

## How It Works

### For each new enquiry:

1. Client fills out the form → enquiry goes to your inbox + Google Sheets (as before)
2. Open the admin dashboard at `/admin`
3. Click on the enquiry → click **"Find Yachts"**
4. The system:
   - Asks Claude AI to suggest ~20 matching yachts based on the criteria
   - Attempts to verify listings on CharterWorld and YachtCharterFleet (best effort)
   - Ranks the top 10 using your priority hierarchy (type > location > size > budget > extras)
   - Saves all discovered yachts to your Yacht Database (grows over time)
5. Review the ranked results in the dashboard
6. Remove any yachts you don't want to include
7. Click **"Approve & Send PDF"**
8. A branded PDF is generated and emailed to your inbox
9. Forward to the client when ready

### Priority Hierarchy (built into the AI ranking):

| Priority | Weight | Criteria |
|----------|--------|----------|
| 1 | 30% | Yacht Type (motor, sail, no preference) |
| 2 | 25% | Location & availability for requested dates |
| 3 | 20% | Size match |
| 4 | 15% | Budget match |
| 5 | 10% | Amenities, style, occasion suitability |

---

## File Structure

```
├── index.html              — Enquiry form (unchanged)
├── admin.html              — Admin dashboard (new)
├── vercel.json             — Updated routing
├── package.json            — Dependencies (new)
├── google-apps-script.js   — Apps Script code (paste into Google)
├── api/
│   ├── submit.js           — Form handler (updated)
│   ├── admin/
│   │   ├── enquiries.js    — List enquiries
│   │   ├── search.js       — Find matching yachts
│   │   ├── rank.js         — AI-powered ranking
│   │   └── approve.js      — Generate PDF + email
│   └── lib/
│       ├── sheets.js       — Google Sheets helper
│       ├── claude.js       — Anthropic API helper
│       ├── scraper.js      — Web scraping (best effort)
│       └── pdf.js          — Branded PDF generation
```

---

## Troubleshooting

**"Enquiries not loading"**
- Check that GOOGLE_SCRIPT_URL is set correctly in Vercel
- Check that the Apps Script is deployed as a web app with "Anyone" access
- Check the Vercel function logs for errors

**"Search returns no yachts"**
- Check that ANTHROPIC_API_KEY is set correctly in Vercel
- Check the Vercel function logs — the Claude API call may have failed
- Ensure your Anthropic account has credits

**"PDF email not received"**
- Check that RESEND_API_KEY is still valid
- Check the Vercel function logs for Resend errors
- Check your spam folder

**"Admin dashboard shows blank"**
- Clear browser cache and reload
- Check browser console for JavaScript errors
- Ensure vercel.json has the /admin route configured
