#!/usr/bin/env node
// Delete the test-barterkin.com.barterkin.com TXT record from Cloudflare
//
// Required env vars:
//   CLOUDFLARE_API_TOKEN   Scoped token with Zone:DNS:Edit for barterkin.com
//   CLOUDFLARE_ZONE_ID     Zone ID (Cloudflare dashboard -> zone Overview, right sidebar)

const RECORD_NAME = "test-barterkin.com.barterkin.com";

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const CF_ZONE = process.env.CLOUDFLARE_ZONE_ID;

if (!CF_TOKEN || !CF_ZONE) {
  console.error("Missing required env vars: CLOUDFLARE_API_TOKEN and CLOUDFLARE_ZONE_ID");
  process.exit(1);
}

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

async function main() {
  // Find the TXT record
  console.log(`→ Searching for TXT record: ${RECORD_NAME}…`);
  const existing = await cf(`/zones/${CF_ZONE}/dns_records?type=TXT&name=${encodeURIComponent(RECORD_NAME)}`);
  
  if (existing.result.length === 0) {
    console.log(`  ✓ Record ${RECORD_NAME} does not exist (already cleaned up)`);
    process.exit(0);
  }

  // Delete all matching records
  for (const record of existing.result) {
    console.log(`  → Deleting record ${record.id} (content: ${record.content})…`);
    await cf(`/zones/${CF_ZONE}/dns_records/${record.id}`, "DELETE");
    console.log(`  ✓ Deleted`);
  }

  console.log(`\n✓ Cleanup complete. The test TXT record has been removed.`);
}

main().catch((err) => {
  console.error(`\n✗ Error: ${err.message}`);
  process.exit(1);
});
