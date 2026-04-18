#!/usr/bin/env node
// Send a deliverability-check email via Resend to a mail-tester.com address.
//
// Usage:
//   1) Open https://www.mail-tester.com in a browser
//   2) Copy the "test-XXXXXXXX@srv1.mail-tester.com" address
//   3) node scripts/send-mailtest.mjs test-XXXXXXXX@srv1.mail-tester.com
//   4) Refresh mail-tester.com — target ≥9/10
//
// Required env vars:
//   RESEND_API_KEY   re_... full-access key

const to = process.argv[2];
if (!to) { console.error("Usage: node scripts/send-mailtest.mjs <test-XXXX@srv1.mail-tester.com>"); process.exit(1); }
const key = process.env.RESEND_API_KEY;
if (!key) { console.error("Missing RESEND_API_KEY"); process.exit(1); }

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    from: "Barterkin <noreply@barterkin.com>",
    to: [to],
    subject: "Barterkin deliverability test",
    text: "This is a deliverability test for barterkin.com. If you can read this, SPF + DKIM + DMARC are working. Go back to mail-tester.com to see the score.",
    html: "<p>This is a deliverability test for <strong>barterkin.com</strong>.</p><p>If you can read this, SPF + DKIM + DMARC are working. Go back to <a href=\"https://www.mail-tester.com\">mail-tester.com</a> to see the score.</p>",
  }),
});
const json = await res.json();
if (!res.ok) { console.error(`Resend error ${res.status}:`, json); process.exit(1); }
console.log(`✓ Sent. Resend email id: ${json.id}`);
console.log(`→ Refresh https://www.mail-tester.com (your test page) for the score. Target ≥9/10.`);
