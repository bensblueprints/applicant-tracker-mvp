# Product Hunt Launch — Hirestack

## Name
Hirestack

## Tagline (60 chars)
Self-hosted applicant tracking. Pay $49 once, not $100s/mo.

## Description (260 chars)
Post jobs, get a public careers page + application form instantly, drag candidates through a kanban pipeline, store resumes on your own disk, keep notes & interview scorecards. Self-hosted Node+SQLite. $49 once vs Greenhouse-class pricing. MIT source.

## Full description

Full ATS suites are built for 200-person companies and priced like it. If you hire five people a year, you don't need approval chains and HRIS sync — you need a kanban board and a resume folder that the whole team can see.

- **Post a job → careers page is live** — server-rendered, brandable, with a real application form (resume upload included)
- **Kanban pipeline** — applied → screening → interview → offer → hired/rejected, drag and drop
- **Candidate profiles** — resume, star rating, tags, cover letter
- **Notes + email log** — keep the "did anyone reply to her?" thread in one place
- **Interview scorecards** — criteria rated 1–5 with comments, per interviewer
- **Search everything** — every candidate across every job, by text, stage, tag, rating
- One Node process + SQLite; resumes are plain files on your disk. Docker compose for a $5 VPS, or run it as a Windows desktop app.

MIT source. $49 gets the 1-click installer.

## Maker first comment

Hey PH 👋

I got tired of watching 10-person companies pay enterprise-ATS prices — or worse, run hiring out of a shared inbox and a spreadsheet because the real tools cost $6k/yr.

Honest notes:
- There's no email *sending* — it's an email **log** (paste the thread in). SMTP send is on the roadmap; I didn't want to ship a half-good email client.
- No EEOC/compliance reporting, no offer-letter e-sign, no HRIS. If you need those, Greenhouse is genuinely the right tool.
- Resumes live as plain files next to a SQLite db. Your backup strategy is `cp -r`. I consider this a feature.

Ask me about the XSS-escaped public careers page or why candidate data should never live in someone else's cloud.

## Gallery shots (5)

1. **Pipeline kanban** — six stage columns with candidate cards, ratings, tags. Caption: "Your whole hiring funnel on one screen."
2. **Public careers page** — dark, clean job list + application form. Caption: "Live the second you post a job."
3. **Candidate drawer** — resume link, scorecards, notes, email log. Caption: "Everything about a candidate in one panel."
4. **Cross-job search** — filters for stage/tag/rating. Caption: "That great candidate from last year? Found in 2 seconds."
5. **Pricing math card** — "$49 once vs $500/mo ATS." Caption: "Hiring tools shouldn't cost more than the hire's first week."
