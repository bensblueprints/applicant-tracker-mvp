// Hirestack smoke test — boots the real server and exercises the whole hiring
// flow over HTTP: post a job, verify the public careers page (including XSS
// escaping), submit a real multipart application with a resume file, verify
// upload rules, move the candidate through pipeline stages, add notes and a
// scorecard, search/filter across jobs, close the job. Kills ONLY the child.
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert');

const ROOT = path.join(__dirname, '..');
const TEST_PORT = 5654;
const ADMIN_PASSWORD = 'smoke-test-password';
const DB_PATH = path.join(__dirname, 'smoke.db');
const UPLOADS = path.join(__dirname, 'smoke-uploads');
const BASE = `http://127.0.0.1:${TEST_PORT}`;

function rmrf(p) { try { fs.rmSync(p, { recursive: true, force: true }); } catch {} }
for (const f of [DB_PATH, DB_PATH + '-wal', DB_PATH + '-shm']) { try { fs.unlinkSync(f); } catch {} }
rmrf(UPLOADS);

let serverProc = null;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, label, tries = 40, delay = 250) {
  for (let i = 0; i < tries; i++) {
    try { const v = await fn(); if (v) return v; } catch { /* retry */ }
    await sleep(delay);
  }
  throw new Error(`Timed out waiting for: ${label}`);
}

let cookie = '';
async function api(pathname, options = {}) {
  const res = await fetch(BASE + pathname, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...options.headers },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) cookie = setCookie.split(';')[0];
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function multipartApply(slug, fields, file) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  if (file) fd.append('resume', new Blob([file.content]), file.name);
  return fetch(`${BASE}/apply/${slug}`, { method: 'POST', body: fd, headers: { Accept: 'application/json' } });
}

async function main() {
  console.log('1. Booting Hirestack on port', TEST_PORT, 'with temp DB + uploads dir');
  serverProc = spawn(process.execPath, ['server/index.js'], {
    cwd: ROOT,
    env: {
      ...process.env, PORT: String(TEST_PORT), ADMIN_PASSWORD, DB_PATH,
      COMPANY_NAME: 'Smoke & Co'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  serverProc.stdout.on('data', (d) => process.stdout.write(`   [server] ${d}`));
  serverProc.stderr.on('data', (d) => process.stderr.write(`   [server] ${d}`));
  await waitFor(async () => (await api('/api/health')).data.ok, 'server health');

  console.log('   Auth: unauthenticated admin API 401, login 200');
  cookie = '';
  assert.strictEqual((await api('/api/jobs')).status, 401, 'admin API must require auth');
  assert.strictEqual((await api('/api/login', { method: 'POST', body: { password: 'wrong' } })).status, 401);
  cookie = '';
  assert.strictEqual((await api('/api/login', { method: 'POST', body: { password: ADMIN_PASSWORD } })).status, 200);

  console.log('2. Create job → open on the public careers page');
  const created = await api('/api/jobs', {
    method: 'POST',
    body: { title: 'Senior Frontend Engineer', location: 'Remote', description: 'Build things.\nShip things.' }
  });
  assert.strictEqual(created.status, 201);
  const job = created.data;
  assert.strictEqual(job.public_slug, 'senior-frontend-engineer', 'slug derived from title');

  let html = await (await fetch(`${BASE}/careers`)).text();
  assert.ok(html.includes('Senior Frontend Engineer'), 'careers page lists the open job');
  assert.ok(html.includes('Smoke &amp; Co'), 'company name is rendered escaped');

  console.log('   XSS: hostile job title/description is escaped on public pages');
  const evil = await api('/api/jobs', {
    method: 'POST',
    body: { title: 'QA <script>alert(1)</script>', description: '<img src=x onerror=alert(2)>' }
  });
  assert.strictEqual(evil.status, 201);
  html = await (await fetch(`${BASE}/careers`)).text();
  assert.ok(!html.includes('<script>alert(1)'), 'raw script tag never reaches the page');
  assert.ok(html.includes('&lt;script&gt;alert(1)'), 'title is HTML-escaped');
  const jobHtml = await (await fetch(`${BASE}/careers/${evil.data.public_slug}`)).text();
  assert.ok(!jobHtml.includes('<img src=x'), 'description escaped on job page');
  assert.ok(jobHtml.includes('&lt;img src=x'), 'escaped entity present');
  await api(`/api/jobs/${evil.data.id}`, { method: 'DELETE' });

  console.log('3. Public application: multipart with resume upload');
  const resumeBytes = '%PDF-1.4 fake resume for smoke test ' + 'x'.repeat(2048);
  let res = await multipartApply(job.public_slug, {
    name: 'Ada Lovelace', email: 'ada@example.com', phone: '+1 555 0100',
    cover_letter: 'I write engines, analytical ones.'
  }, { name: 'Ada Lovelace Résumé.pdf', content: resumeBytes });
  assert.strictEqual(res.status, 201, 'application accepted');
  const adaId = (await res.json()).id;

  console.log('   Upload rules: .exe rejected, missing email rejected');
  res = await multipartApply(job.public_slug, { name: 'Mal', email: 'mal@example.com' },
    { name: 'virus.exe', content: 'MZ' });
  assert.strictEqual(res.status, 400, 'executable resume rejected');
  res = await multipartApply(job.public_slug, { name: 'No Email', email: 'not-an-email' }, null);
  assert.strictEqual(res.status, 400, 'invalid email rejected');

  // second, resume-less applicant for search tests
  res = await multipartApply(job.public_slug, { name: 'Grace Hopper', email: 'grace@example.com', cover_letter: 'COBOL and compilers.' }, null);
  assert.strictEqual(res.status, 201);
  const graceId = (await res.json()).id;

  console.log('4. Resume storage: admin-only download, exact bytes back');
  const noAuth = await fetch(`${BASE}/api/candidates/${adaId}/resume`);
  assert.strictEqual(noAuth.status, 401, 'resume download requires admin');
  const dl = await fetch(`${BASE}/api/candidates/${adaId}/resume`, { headers: { Cookie: cookie } });
  assert.strictEqual(dl.status, 200);
  assert.strictEqual(await dl.text(), resumeBytes, 'stored resume bytes round-trip exactly');
  const cd = dl.headers.get('content-disposition') || '';
  assert.ok(/R.*sum/.test(cd), 'original filename preserved in download');

  const Database = require('better-sqlite3');
  const db = new Database(DB_PATH, { readonly: true });
  const adaRow = db.prepare('SELECT * FROM candidates WHERE id = ?').get(adaId);
  assert.ok(!/[/\\]/.test(adaRow.resume_path), 'stored path is a bare generated filename (no traversal)');
  assert.ok(adaRow.resume_path.endsWith('.pdf'));
  const uploadsDir = path.join(path.dirname(DB_PATH), 'uploads');
  assert.ok(fs.existsSync(path.join(uploadsDir, adaRow.resume_path)), 'file exists on disk in uploads dir');

  console.log('5. Pipeline: stage moves validated, rating, tags');
  assert.strictEqual((await api(`/api/candidates/${adaId}`, { method: 'PATCH', body: { stage: 'nonsense' } })).status, 400);
  let upd = await api(`/api/candidates/${adaId}`, { method: 'PATCH', body: { stage: 'interview', rating: 5, tags: ['senior', 'Referral!!'] } });
  assert.strictEqual(upd.status, 200);
  assert.strictEqual(upd.data.stage, 'interview');
  assert.strictEqual(upd.data.rating, 5);
  assert.deepStrictEqual(upd.data.tags, ['senior', 'referral'], 'tags normalized');
  await api(`/api/candidates/${graceId}`, { method: 'PATCH', body: { stage: 'screening', rating: 4 } });

  console.log('6. Notes + email log + scorecard');
  const note = await api(`/api/candidates/${adaId}/notes`, { method: 'POST', body: { author: 'Ben', body: 'Strong systems thinker.' } });
  assert.strictEqual(note.status, 201);
  const email = await api(`/api/candidates/${adaId}/notes`, { method: 'POST', body: { author: 'Ben', kind: 'email', body: 'Re: interview\n> see you Tuesday' } });
  assert.strictEqual(email.data.kind, 'email');
  const sc = await api(`/api/candidates/${adaId}/scorecards`, {
    method: 'POST',
    body: { interviewer: 'Ben', criteria: [
      { criterion: 'Technical skills', rating: 5, comment: 'exceptional' },
      { criterion: 'Communication', rating: 9 } // out of range → clamped to 5
    ] }
  });
  assert.strictEqual(sc.status, 201);
  assert.strictEqual(sc.data.criteria[1].rating, 5, 'ratings clamped to 1-5');
  assert.strictEqual((await api(`/api/candidates/${adaId}/scorecards`, { method: 'POST', body: { criteria: [] } })).status, 400);

  const full = await api(`/api/candidates/${adaId}`);
  assert.strictEqual(full.data.notes.length, 2);
  assert.strictEqual(full.data.scorecards.length, 1);
  assert.strictEqual(full.data.job_title, 'Senior Frontend Engineer');

  console.log('7. Cross-job search & filters');
  let found = (await api('/api/candidates?q=COBOL')).data;
  assert.strictEqual(found.length, 1);
  assert.strictEqual(found[0].name, 'Grace Hopper', 'cover-letter text search');
  found = (await api('/api/candidates?stage=interview')).data;
  assert.deepStrictEqual(found.map((c) => c.name), ['Ada Lovelace'], 'stage filter');
  found = (await api('/api/candidates?tag=senior')).data;
  assert.deepStrictEqual(found.map((c) => c.name), ['Ada Lovelace'], 'tag filter');
  found = (await api('/api/candidates?min_rating=5')).data;
  assert.deepStrictEqual(found.map((c) => c.name), ['Ada Lovelace'], 'min rating filter');
  found = (await api('/api/candidates?min_rating=4')).data;
  assert.strictEqual(found.length, 2, 'rating >= 4 matches both');

  console.log('8. Close job → gone from careers page, applications rejected');
  await api(`/api/jobs/${job.id}`, { method: 'PUT', body: { status: 'closed' } });
  html = await (await fetch(`${BASE}/careers`)).text();
  assert.ok(!html.includes('Senior Frontend Engineer'), 'closed job hidden from careers page');
  assert.strictEqual((await fetch(`${BASE}/careers/${job.public_slug}`)).status, 404);
  res = await multipartApply(job.public_slug, { name: 'Late', email: 'late@example.com' }, null);
  assert.strictEqual(res.status, 404, 'cannot apply to a closed job');

  db.close();
  console.log('\n✅ All Hirestack smoke tests passed');
}

async function cleanup(code) {
  if (serverProc && !serverProc.killed) serverProc.kill();
  await sleep(300);
  for (const f of [DB_PATH, DB_PATH + '-wal', DB_PATH + '-shm']) { try { fs.unlinkSync(f); } catch {} }
  rmrf(path.join(path.dirname(DB_PATH), 'uploads'));
  process.exit(code);
}

main()
  .then(() => cleanup(0))
  .catch(async (err) => {
    console.error('\n❌ Smoke test failed:', err.message);
    await cleanup(1);
  });
