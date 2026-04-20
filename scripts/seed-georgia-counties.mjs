// scripts/seed-georgia-counties.mjs
// Usage: node scripts/seed-georgia-counties.mjs > /tmp/counties.sql
// Paste the output into 003_profile_tables.sql under the counties seed section.
// Revision iter-1: counties.id = FIPS (no separate fips column). The script MUST
// pass the JSON's `fips` value as the explicit PK so the DB PK space = JSON space.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rows = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../lib/data/georgia-counties.json'), 'utf8'))
const esc = (s) => s.replace(/'/g, "''")
console.log('INSERT INTO public.counties (id, name) VALUES')
console.log(rows.map((r) => `  (${r.fips}, '${esc(r.name)}')`).join(',\n') + '\nON CONFLICT (id) DO NOTHING;')
