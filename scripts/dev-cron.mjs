/**
 * Local development cron: hits the reminder endpoint every minute so you can
 * exercise reminders without deploying. In production, Vercel Cron (see
 * vercel.json) calls the same endpoint on a schedule.
 *
 * Usage: node scripts/dev-cron.mjs
 */
const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SECRET = process.env.CRON_SECRET || "replace-me";
const INTERVAL_MS = Number(process.env.CRON_INTERVAL_MS || 60_000);

async function tick() {
  try {
    const res = await fetch(`${BASE}/api/cron/check-reminders`, {
      headers: { Authorization: `Bearer ${SECRET}` },
    });
    const body = await res.json().catch(() => ({}));
    console.log(new Date().toISOString(), res.status, JSON.stringify(body));
  } catch (err) {
    console.error(new Date().toISOString(), "cron error:", err.message);
  }
}

console.log(`[dev-cron] polling ${BASE}/api/cron/check-reminders every ${INTERVAL_MS}ms`);
tick();
setInterval(tick, INTERVAL_MS);
