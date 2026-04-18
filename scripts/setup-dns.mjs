#!/usr/bin/env node
// Automate: add barterkin.com to Resend -> push DNS records to Cloudflare -> verify.
//
// Required env vars:
//   CLOUDFLARE_API_TOKEN   Scoped token with Zone:DNS:Edit for barterkin.com
//   CLOUDFLARE_ZONE_ID     Zone ID (Cloudflare dashboard -> zone Overview, right sidebar)
//   RESEND_API_KEY         re_... (create in Resend dashboard, full-access)
//   DMARC_REPORT_EMAIL     Optional; defaults to barterkin101@gmail.com
//
// Safe to re-run: checks for existing records before creating.

const DOMAIN = "barterkin.com";
const REGION = "us-east-1";
const REPORT_EMAIL = process.env.DMARC_REPORT_EMAIL || "barterkin101@gmail.com";

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ZONE = process.env.CLOUDFLARE_ZONE_ID;
const RESEND_KEY = process.env.RESEND_API_KEY;

for (const [k, v] of Object.entries({ CLOUDFLARE_API_TOKEN: CF_TOKEN, CLOUDFLARE_ZONE_ID: CF_ZONE, RESEND_API_KEY: RESEND_KEY })) {
  if (!v) { console.error(`Missing ${k}`); process.exit(1); }
}

const resend = async (path, method = "GET", body) => {
  const res = await fetch(`https://api.resend.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`Resend ${method} ${path} ${res.status}: ${JSON.stringify(json)}`);
  return json;
};

const cf = async (path, method = "GET", body) => {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: { Authorization: `Bearer ${CF_TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) throw new Error(`CF ${method} ${path}: ${JSON.stringify(json.errors)}`);
  return json;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 1. Ensure the domain exists in Resend and grab the records it wants
console.log(`→ Ensuring ${DOMAIN} exists in Resend…`);
const listed = await resend("/domains");
let summary = listed.data.find((d) => d.name === DOMAIN);
if (!summary) {
  const created = await resend("/domains", "POST", { name: DOMAIN, region: REGION });
  summary = created;
  console.log(`  ✓ Created in Resend (id=${summary.id})`);
} else {
  console.log(`  ✓ Already exists in Resend (id=${summary.id}, status=${summary.status})`);
}
const domain = await resend(`/domains/${summary.id}`);
const records = domain.records || [];
console.log(`  ${records.length} DNS record(s) required by Resend.`);

// 2. Push each record to Cloudflare (skip if already there)
for (const r of records) {
  const type = r.type;
  const name = r.name; // Resend returns fully-qualified name
  const value = r.value;
  const existing = await cf(`/zones/${CF_ZONE}/dns_records?type=${type}&name=${encodeURIComponent(name)}`);
  const match = existing.result.find((e) => e.content.replace(/^"|"$/g, "") === value);
  if (match) {
    console.log(`  ✓ ${type} ${name} already in Cloudflare`);
    continue;
  }
  if (existing.result.length > 0) {
    console.log(`  ! ${type} ${name} exists in CF but content differs — skipping (review manually)`);
    continue;
  }
  const body = { type, name, content: value, ttl: 1, proxied: false };
  if (type === "MX") body.priority = r.priority ?? 10;
  await cf(`/zones/${CF_ZONE}/dns_records`, "POST", body);
  console.log(`  ✓ Created ${type} ${name} in Cloudflare`);
}

// 3. Add DMARC (Resend doesn't generate this)
const dmarcName = `_dmarc.${DOMAIN}`;
const dmarcValue = `v=DMARC1; p=none; rua=mailto:${REPORT_EMAIL}; pct=100; adkim=s; aspf=s`;
const dmarcExisting = await cf(`/zones/${CF_ZONE}/dns_records?type=TXT&name=${encodeURIComponent(dmarcName)}`);
if (dmarcExisting.result.length === 0) {
  await cf(`/zones/${CF_ZONE}/dns_records`, "POST", {
    type: "TXT", name: dmarcName, content: dmarcValue, ttl: 1, proxied: false,
  });
  console.log(`  ✓ Created DMARC at ${dmarcName}`);
} else {
  console.log(`  ✓ DMARC already at ${dmarcName}`);
}

// 4. Trigger verification in Resend
console.log(`\n→ Asking Resend to verify (this re-checks DNS)…`);
await resend(`/domains/${summary.id}/verify`, "POST").catch((e) => console.log(`  verify call: ${e.message}`));

// 5. Poll until verified or 5 min elapses
const deadline = Date.now() + 5 * 60_000;
while (Date.now() < deadline) {
  const d = await resend(`/domains/${summary.id}`);
  console.log(`  status=${d.status}`);
  if (d.status === "verified") {
    console.log(`\n✓ Domain verified in Resend. SPF + DKIM + DMARC are live.`);
    console.log(`\nNext: run  node scripts/send-mailtest.mjs <test-XXXX@mail-tester.com>  to get a deliverability score.`);
    process.exit(0);
  }
  await sleep(30_000);
}
console.log(`\n⚠ Not verified after 5 min. Cloudflare propagation is usually <2 min — rerun this script, or check DNS manually:`);
console.log(`   dig TXT send.${DOMAIN}`);
console.log(`   dig TXT resend._domainkey.${DOMAIN}`);
console.log(`   dig TXT _dmarc.${DOMAIN}`);
