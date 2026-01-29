import 'dotenv/config';

async function check(url: string) {
  const res = await fetch(url);
  const txt = await res.text();
  return { status: res.status, body: txt };
}

async function main() {
  const base = process.env.SMOKE_BASE_URL || 'http://localhost:3001';
  const health = await check(`${base}/api/healthz`);
  if (health.status !== 200) {
    console.error('healthz failed', health);
    process.exit(1);
  }
  const metrics = await check(`${base}/api/metrics`);
  if (metrics.status !== 200 || !metrics.body.includes('http_requests_total')) {
    console.error('metrics failed', metrics.status);
    process.exit(1);
  }
  console.log('smoke ok');
}

main().catch(err => { console.error(err); process.exit(1); });

