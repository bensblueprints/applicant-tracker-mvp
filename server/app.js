const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const { openDb, genToken, STAGES } = require('./db');
const { careersListPage, careersJobPage, appliedPage, esc } = require('./pages');

const ADMIN_COOKIE = 'hs_admin';
const RESUME_EXTS = new Set(['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt']);
const MAX_RESUME_BYTES = 10 * 1024 * 1024;

function slugify(title) {
  return String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'job';
}

function createApp({ dbPath, uploadsDir, adminPassword, companyName = 'Our company', autologinToken = null } = {}) {
  const db = openDb(dbPath);
  const uploads = uploadsDir || path.join(path.dirname(path.resolve(dbPath)), 'uploads');
  fs.mkdirSync(uploads, { recursive: true });

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', true);
  app.use(cookieParser());
  app.locals.db = db;

  const adminSessions = new Set();
  function requireAdmin(req, res, next) {
    if (req.cookies[ADMIN_COOKIE] && adminSessions.has(req.cookies[ADMIN_COOKIE])) return next();
    res.status(401).json({ error: 'unauthorized' });
  }

  const rateMap = new Map();
  function rateLimited(key, max = 30, windowMs = 60_000) {
    const now = Date.now();
    const arr = (rateMap.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) return true;
    arr.push(now);
    rateMap.set(key, arr);
    if (rateMap.size > 10000) rateMap.clear();
    return false;
  }

  // ================= PUBLIC: careers pages + application form =================

  app.get('/careers', (req, res) => {
    const jobs = db.prepare("SELECT * FROM jobs WHERE status = 'open' ORDER BY created_at DESC").all();
    res.type('html').send(careersListPage(companyName, jobs));
  });

  app.get('/careers/:slug', (req, res) => {
    const job = db.prepare("SELECT * FROM jobs WHERE public_slug = ? AND status = 'open'").get(req.params.slug);
    if (!job) return res.status(404).type('html').send(careersListPage(companyName, [], 'That role is no longer open.'));
    res.type('html').send(careersJobPage(companyName, job));
  });

  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, uploads),
      filename: (req, file, cb) => {
        // Never trust the client's filename for the stored path.
        const ext = path.extname(file.originalname || '').toLowerCase();
        cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${RESUME_EXTS.has(ext) ? ext : '.bin'}`);
      }
    }),
    limits: { fileSize: MAX_RESUME_BYTES, files: 1, fields: 10 },
    fileFilter: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase();
      if (!RESUME_EXTS.has(ext)) return cb(new Error('resume must be pdf, doc, docx, txt, rtf or odt'));
      cb(null, true);
    }
  });

  app.post('/apply/:slug', (req, res) => {
    if (rateLimited('apply:' + (req.ip || ''))) return res.status(429).json({ error: 'rate limited' });
    const job = db.prepare("SELECT * FROM jobs WHERE public_slug = ? AND status = 'open'").get(req.params.slug);
    if (!job) return res.status(404).json({ error: 'job not open' });

    upload.single('resume')(req, res, (err) => {
      if (err) return res.status(400).json({ error: err.message });
      const b = req.body || {};
      const name = String(b.name || '').trim().slice(0, 120);
      const email = String(b.email || '').trim().slice(0, 200);
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: 'name and a valid email are required' });
      }
      const info = db.prepare(`
        INSERT INTO candidates (job_id, name, email, phone, cover_letter, resume_path, resume_name, stage, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'applied', ?)
      `).run(
        job.id, name, email,
        String(b.phone || '').trim().slice(0, 60),
        String(b.cover_letter || '').trim().slice(0, 20000),
        req.file ? path.basename(req.file.path) : null,
        req.file ? String(req.file.originalname || 'resume').replace(/[^\w. ()-]/g, '_').slice(0, 150) : null,
        Date.now()
      );
      const wantsJson = (req.get('accept') || '').includes('application/json');
      if (wantsJson) return res.status(201).json({ ok: true, id: info.lastInsertRowid });
      res.status(201).type('html').send(appliedPage(companyName, job));
    });
  });

  // ================= AUTH =================

  app.use(express.json({ limit: '512kb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true, app: 'hirestack' }));

  app.post('/api/login', (req, res) => {
    if (String((req.body || {}).password || '') !== adminPassword) {
      return res.status(401).json({ error: 'wrong password' });
    }
    const t = genToken();
    adminSessions.add(t);
    res.cookie(ADMIN_COOKIE, t, { httpOnly: true, sameSite: 'lax' });
    res.json({ ok: true });
  });

  app.post('/api/logout', (req, res) => {
    adminSessions.delete(req.cookies[ADMIN_COOKIE]);
    res.clearCookie(ADMIN_COOKIE);
    res.json({ ok: true });
  });

  app.get('/api/me', (req, res) =>
    res.json({ authed: Boolean(req.cookies[ADMIN_COOKIE] && adminSessions.has(req.cookies[ADMIN_COOKIE])) }));

  app.get('/auth/auto', (req, res) => {
    if (autologinToken && req.query.token === autologinToken) {
      const t = genToken();
      adminSessions.add(t);
      res.cookie(ADMIN_COOKIE, t, { httpOnly: true, sameSite: 'lax' });
    }
    res.redirect('/');
  });

  // ================= JOBS =================

  const candidateCounts = (jobId) => {
    const out = {};
    for (const s of STAGES) out[s] = 0;
    for (const r of db.prepare('SELECT stage, COUNT(*) n FROM candidates WHERE job_id = ? GROUP BY stage').all(jobId)) {
      out[r.stage] = r.n;
    }
    return out;
  };

  app.get('/api/jobs', requireAdmin, (req, res) => {
    const rows = db.prepare('SELECT * FROM jobs ORDER BY created_at DESC').all();
    res.json(rows.map((j) => ({
      ...j,
      candidates: db.prepare('SELECT COUNT(*) n FROM candidates WHERE job_id = ?').get(j.id).n,
      by_stage: candidateCounts(j.id)
    })));
  });

  app.post('/api/jobs', requireAdmin, (req, res) => {
    const b = req.body || {};
    const title = String(b.title || '').trim().slice(0, 160);
    if (!title) return res.status(400).json({ error: 'title required' });
    let slug = slugify(title);
    if (db.prepare('SELECT 1 FROM jobs WHERE public_slug = ?').get(slug)) {
      slug = `${slug}-${crypto.randomBytes(3).toString('hex')}`;
    }
    const info = db.prepare(`
      INSERT INTO jobs (title, description, location, employment_type, status, public_slug, created_at)
      VALUES (?, ?, ?, ?, 'open', ?, ?)
    `).run(title, String(b.description || '').slice(0, 50000), String(b.location || '').slice(0, 120),
      String(b.employment_type || 'full-time').slice(0, 40), slug, Date.now());
    res.status(201).json(db.prepare('SELECT * FROM jobs WHERE id = ?').get(info.lastInsertRowid));
  });

  app.put('/api/jobs/:id', requireAdmin, (req, res) => {
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(req.params.id);
    if (!job) return res.status(404).json({ error: 'not found' });
    const b = req.body || {};
    const status = ['open', 'closed'].includes(b.status) ? b.status : job.status;
    db.prepare('UPDATE jobs SET title = ?, description = ?, location = ?, employment_type = ?, status = ? WHERE id = ?')
      .run(String(b.title ?? job.title).trim().slice(0, 160) || job.title,
        String(b.description ?? job.description).slice(0, 50000),
        String(b.location ?? job.location).slice(0, 120),
        String(b.employment_type ?? job.employment_type).slice(0, 40),
        status, job.id);
    res.json(db.prepare('SELECT * FROM jobs WHERE id = ?').get(job.id));
  });

  app.delete('/api/jobs/:id', requireAdmin, (req, res) => {
    const candidates = db.prepare('SELECT resume_path FROM candidates WHERE job_id = ?').all(req.params.id);
    db.transaction(() => {
      const ids = db.prepare('SELECT id FROM candidates WHERE job_id = ?').all(req.params.id).map((r) => r.id);
      for (const cid of ids) {
        db.prepare('DELETE FROM notes WHERE candidate_id = ?').run(cid);
        db.prepare('DELETE FROM scorecards WHERE candidate_id = ?').run(cid);
      }
      db.prepare('DELETE FROM candidates WHERE job_id = ?').run(req.params.id);
      db.prepare('DELETE FROM jobs WHERE id = ?').run(req.params.id);
    })();
    for (const c of candidates) {
      if (c.resume_path) fs.unlink(path.join(uploads, path.basename(c.resume_path)), () => {});
    }
    res.json({ ok: true });
  });

  // ================= CANDIDATES =================

  function serializeCandidate(c) {
    return { ...c, tags: c.tags ? c.tags.split(',').filter(Boolean) : [] };
  }

  // Cross-job search: ?q= &stage= &tag= &min_rating= &job_id=
  app.get('/api/candidates', requireAdmin, (req, res) => {
    const clauses = [];
    const params = [];
    if (req.query.job_id) { clauses.push('c.job_id = ?'); params.push(Number(req.query.job_id)); }
    if (req.query.stage && STAGES.includes(req.query.stage)) { clauses.push('c.stage = ?'); params.push(req.query.stage); }
    if (req.query.min_rating) { clauses.push('c.rating >= ?'); params.push(Number(req.query.min_rating) || 0); }
    if (req.query.tag) { clauses.push("(',' || c.tags || ',') LIKE ?"); params.push(`%,${String(req.query.tag).replace(/[%_]/g, '')},%`); }
    if (req.query.q) {
      const q = `%${String(req.query.q).replace(/[%_]/g, '')}%`;
      clauses.push('(c.name LIKE ? OR c.email LIKE ? OR c.cover_letter LIKE ?)');
      params.push(q, q, q);
    }
    const where = clauses.length ? 'WHERE ' + clauses.join(' AND ') : '';
    const rows = db.prepare(`
      SELECT c.*, j.title AS job_title FROM candidates c JOIN jobs j ON j.id = c.job_id
      ${where} ORDER BY c.created_at DESC LIMIT 500
    `).all(...params);
    res.json(rows.map(serializeCandidate));
  });

  app.post('/api/candidates', requireAdmin, (req, res) => {
    const b = req.body || {};
    const job = db.prepare('SELECT * FROM jobs WHERE id = ?').get(b.job_id);
    if (!job) return res.status(400).json({ error: 'valid job_id required' });
    const name = String(b.name || '').trim().slice(0, 120);
    if (!name) return res.status(400).json({ error: 'name required' });
    const info = db.prepare(`
      INSERT INTO candidates (job_id, name, email, phone, cover_letter, stage, source, created_at)
      VALUES (?, ?, ?, ?, ?, 'applied', 'manual', ?)
    `).run(job.id, name, String(b.email || '').trim().slice(0, 200),
      String(b.phone || '').trim().slice(0, 60), String(b.cover_letter || '').slice(0, 20000), Date.now());
    res.status(201).json(serializeCandidate(db.prepare('SELECT * FROM candidates WHERE id = ?').get(info.lastInsertRowid)));
  });

  app.get('/api/candidates/:id', requireAdmin, (req, res) => {
    const c = db.prepare('SELECT c.*, j.title AS job_title, j.public_slug FROM candidates c JOIN jobs j ON j.id = c.job_id WHERE c.id = ?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'not found' });
    const notes = db.prepare('SELECT * FROM notes WHERE candidate_id = ? ORDER BY at DESC').all(c.id);
    const scorecards = db.prepare('SELECT * FROM scorecards WHERE candidate_id = ? ORDER BY at DESC').all(c.id)
      .map((s) => { let criteria = []; try { criteria = JSON.parse(s.criteria_json); } catch {} return { ...s, criteria }; });
    res.json({ ...serializeCandidate(c), notes, scorecards });
  });

  app.patch('/api/candidates/:id', requireAdmin, (req, res) => {
    const c = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'not found' });
    const b = req.body || {};
    let stage = c.stage;
    if (b.stage !== undefined) {
      if (!STAGES.includes(b.stage)) return res.status(400).json({ error: `stage must be one of ${STAGES.join(', ')}` });
      stage = b.stage;
    }
    let rating = c.rating;
    if (b.rating !== undefined) {
      rating = Math.round(Number(b.rating));
      if (!Number.isInteger(rating) || rating < 0 || rating > 5) return res.status(400).json({ error: 'rating 0-5' });
    }
    const tags = b.tags !== undefined
      ? (Array.isArray(b.tags) ? b.tags : String(b.tags).split(','))
          .map((t) => String(t).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')).filter(Boolean).slice(0, 20).join(',')
      : c.tags;
    db.prepare('UPDATE candidates SET stage = ?, rating = ?, tags = ?, name = ?, email = ?, phone = ? WHERE id = ?')
      .run(stage, rating, tags,
        String(b.name ?? c.name).trim().slice(0, 120) || c.name,
        String(b.email ?? c.email).trim().slice(0, 200),
        String(b.phone ?? c.phone).trim().slice(0, 60), c.id);
    res.json(serializeCandidate(db.prepare('SELECT * FROM candidates WHERE id = ?').get(c.id)));
  });

  app.delete('/api/candidates/:id', requireAdmin, (req, res) => {
    const c = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'not found' });
    db.transaction(() => {
      db.prepare('DELETE FROM notes WHERE candidate_id = ?').run(c.id);
      db.prepare('DELETE FROM scorecards WHERE candidate_id = ?').run(c.id);
      db.prepare('DELETE FROM candidates WHERE id = ?').run(c.id);
    })();
    if (c.resume_path) fs.unlink(path.join(uploads, path.basename(c.resume_path)), () => {});
    res.json({ ok: true });
  });

  // Resume download — admin only, path traversal impossible (basename + stored name only).
  app.get('/api/candidates/:id/resume', requireAdmin, (req, res) => {
    const c = db.prepare('SELECT * FROM candidates WHERE id = ?').get(req.params.id);
    if (!c || !c.resume_path) return res.status(404).json({ error: 'no resume' });
    const file = path.join(uploads, path.basename(c.resume_path));
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'file missing' });
    res.download(file, c.resume_name || 'resume');
  });

  // ================= NOTES & SCORECARDS =================

  app.post('/api/candidates/:id/notes', requireAdmin, (req, res) => {
    const c = db.prepare('SELECT id FROM candidates WHERE id = ?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'not found' });
    const b = req.body || {};
    const body = String(b.body || '').trim().slice(0, 50000);
    if (!body) return res.status(400).json({ error: 'body required' });
    const kind = b.kind === 'email' ? 'email' : 'note';
    const info = db.prepare('INSERT INTO notes (candidate_id, author, kind, body, at) VALUES (?, ?, ?, ?, ?)')
      .run(c.id, String(b.author || '').trim().slice(0, 120), kind, body, Date.now());
    res.status(201).json(db.prepare('SELECT * FROM notes WHERE id = ?').get(info.lastInsertRowid));
  });

  app.delete('/api/notes/:id', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  app.post('/api/candidates/:id/scorecards', requireAdmin, (req, res) => {
    const c = db.prepare('SELECT id FROM candidates WHERE id = ?').get(req.params.id);
    if (!c) return res.status(404).json({ error: 'not found' });
    const b = req.body || {};
    const raw = Array.isArray(b.criteria) ? b.criteria.slice(0, 20) : [];
    const criteria = raw.map((cr) => ({
      criterion: String(cr.criterion || '').trim().slice(0, 120),
      rating: Math.min(5, Math.max(1, Math.round(Number(cr.rating) || 0))),
      comment: String(cr.comment || '').trim().slice(0, 2000)
    })).filter((cr) => cr.criterion);
    if (!criteria.length) return res.status(400).json({ error: 'at least one criterion with a rating (1-5) required' });
    const info = db.prepare('INSERT INTO scorecards (candidate_id, interviewer, criteria_json, at) VALUES (?, ?, ?, ?)')
      .run(c.id, String(b.interviewer || '').trim().slice(0, 120), JSON.stringify(criteria), Date.now());
    const row = db.prepare('SELECT * FROM scorecards WHERE id = ?').get(info.lastInsertRowid);
    res.status(201).json({ ...row, criteria });
  });

  app.delete('/api/scorecards/:id', requireAdmin, (req, res) => {
    db.prepare('DELETE FROM scorecards WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  });

  // ================= SPA =================

  const dist = path.join(__dirname, '..', 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist, { index: false }));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/careers') || req.path.startsWith('/apply')) return next();
      res.set('Cache-Control', 'no-store');
      res.sendFile(path.join(dist, 'index.html'));
    });
  }

  return app;
}

module.exports = { createApp };
