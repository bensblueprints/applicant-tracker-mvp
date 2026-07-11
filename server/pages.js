// Server-rendered public careers pages. Every piece of user/job data goes
// through esc() — nothing user-controlled is ever emitted as raw HTML.

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const CSS = `
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #09090b; color: #e4e4e7; font-family: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; }
  .wrap { max-width: 760px; margin: 0 auto; padding: 48px 24px; }
  a { color: #38bdf8; text-decoration: none; }
  a:hover { text-decoration: underline; }
  h1 { font-size: 28px; margin: 0 0 6px; }
  .muted { color: #71717a; font-size: 14px; }
  .job { display: block; background: #18181bcc; border: 1px solid #27272a; border-radius: 14px; padding: 18px 20px; margin-top: 14px; color: inherit; }
  .job:hover { border-color: #38bdf8; text-decoration: none; }
  .job h2 { margin: 0 0 4px; font-size: 17px; }
  .badge { display: inline-block; font-size: 11px; color: #a1a1aa; background: #27272a; border-radius: 6px; padding: 2px 8px; margin-right: 6px; }
  .desc { white-space: pre-wrap; line-height: 1.6; margin: 20px 0 28px; color: #d4d4d8; }
  form { background: #18181bcc; border: 1px solid #27272a; border-radius: 14px; padding: 22px; }
  label { display: block; font-size: 13px; color: #a1a1aa; margin: 14px 0 4px; }
  input, textarea { width: 100%; background: #09090b; border: 1px solid #3f3f46; border-radius: 8px; color: #e4e4e7; padding: 9px 11px; font: inherit; }
  input:focus, textarea:focus { outline: none; border-color: #38bdf8; }
  button { margin-top: 18px; background: #0284c7; color: #fff; border: 0; border-radius: 8px; padding: 11px 22px; font-weight: 700; font-size: 15px; cursor: pointer; }
  button:hover { background: #0ea5e9; }
  .ok { background: #18181bcc; border: 1px solid #14532d; border-radius: 14px; padding: 26px; margin-top: 22px; }
`;

function layout(title, body) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title><style>${CSS}</style>
</head><body><div class="wrap">${body}</div></body></html>`;
}

function careersListPage(companyName, jobs, notice = '') {
  const items = jobs.map((j) => `
    <a class="job" href="/careers/${esc(j.public_slug)}">
      <h2>${esc(j.title)}</h2>
      <span class="badge">${esc(j.employment_type)}</span>
      ${j.location ? `<span class="badge">${esc(j.location)}</span>` : ''}
    </a>`).join('');
  return layout(`Careers — ${companyName}`, `
    <h1>Careers at ${esc(companyName)}</h1>
    <p class="muted">${jobs.length ? `${jobs.length} open role${jobs.length === 1 ? '' : 's'}` : 'No open roles right now — check back soon.'}</p>
    ${notice ? `<p class="muted">${esc(notice)}</p>` : ''}
    ${items}`);
}

function careersJobPage(companyName, job) {
  return layout(`${job.title} — ${companyName}`, `
    <p><a href="/careers">&larr; All roles</a></p>
    <h1>${esc(job.title)}</h1>
    <p class="muted">
      <span class="badge">${esc(job.employment_type)}</span>
      ${job.location ? `<span class="badge">${esc(job.location)}</span>` : ''}
    </p>
    <div class="desc">${esc(job.description)}</div>
    <form method="post" action="/apply/${esc(job.public_slug)}" enctype="multipart/form-data">
      <strong>Apply for this role</strong>
      <label>Full name *</label><input name="name" required maxlength="120">
      <label>Email *</label><input name="email" type="email" required maxlength="200">
      <label>Phone</label><input name="phone" maxlength="60">
      <label>Resume (PDF, DOC, DOCX — max 10&nbsp;MB)</label><input name="resume" type="file" accept=".pdf,.doc,.docx,.txt,.rtf,.odt">
      <label>Cover letter</label><textarea name="cover_letter" rows="6" maxlength="20000"></textarea>
      <button type="submit">Submit application</button>
    </form>`);
}

function appliedPage(companyName, job) {
  return layout(`Application received — ${companyName}`, `
    <h1>Application received ✓</h1>
    <div class="ok">
      Thanks for applying to <strong>${esc(job.title)}</strong> at ${esc(companyName)}.
      We review every application and will be in touch by email.
    </div>
    <p style="margin-top:18px"><a href="/careers">&larr; Back to all roles</a></p>`);
}

module.exports = { careersListPage, careersJobPage, appliedPage, esc };
