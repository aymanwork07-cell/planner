// Fetches KCL ISOC prayer start times and campus jamā'ah times into isoc.json.
// Run by .github/workflows/update-isoc.yml every day.
import { writeFileSync, readFileSync, existsSync } from 'node:fs';

const BASE = 'https://kclisoc.co.uk/api';
const get = async (path) => {
  const r = await fetch(BASE + path, { headers: { 'User-Agent': 'aymanwork07-cell/planner (personal planner)' } });
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  return r.json();
};

const old = existsSync('isoc.json') ? JSON.parse(readFileSync('isoc.json', 'utf8')) : {};
const jam = await get('/jamaah');
const year = new Date().getUTCFullYear();
const times = { ...(old.times || {}) };
for (const y of [year, year + 1]) {
  try {
    const { data } = await get(`/prayer-times?year=${y}`);
    for (const r of data || []) times[r.date] = [r.fajr, r.sunrise, r.dhuhr, r.asr, r.asrHanafi, r.maghrib, r.isha];
  } catch (e) { console.warn(`prayer-times ${y}: ${e.message}`); }
}
// keep only last 7 days onwards so the file stays small
const cutoff = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
for (const d of Object.keys(times)) if (d < cutoff) delete times[d];

const jamaah = (jam.data || []).map(({ campus, prayer, time, startDate, session }) => ({ campus, prayer, time, startDate, session }));
if (!jamaah.length) throw new Error('No jamaah data returned — keeping old file');
writeFileSync('isoc.json', JSON.stringify({ updatedAt: jam.updatedAt || new Date().toISOString(), jamaah, times }));
console.log(`Saved ${jamaah.length} jamaah rows, ${Object.keys(times).length} days of times`);
