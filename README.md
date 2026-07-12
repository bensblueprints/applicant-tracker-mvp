# 🗂️ Hirestack — the hiring pipeline a small company actually needs

![MIT License](https://img.shields.io/badge/license-MIT-green.svg)

Self-hosted applicant tracking: post jobs, get a public careers page with application forms instantly, drag candidates through a kanban pipeline, store resumes on your own disk, and keep notes + interview scorecards where the whole team can see them.

**Pay once. Own it forever. No subscription.** Greenhouse and BambooHR ATS add-ons run hundreds per month, priced for 200-person companies. Hirestack is **$49 once** — the kanban board and resume folder a 5–20 person company actually needs.

![Screenshot](docs/screenshot.png)

## Features

- **Job postings** — title, description, location, type; each gets a clean public URL the moment you publish
- **Public careers page** — auto-generated at `/careers`, brandable company name, server-rendered (fast, no JS required), fully HTML-escaped
- **Application form** — name, email, phone, resume upload (PDF/DOC/DOCX, 10 MB cap, extension-validated), cover letter
- **Pipeline kanban** — applied → screening → interview → offer → hired / rejected, drag cards between stages
- **Candidate profiles** — resume download, star rating, tags, cover letter, full history
- **Notes & email log** — multi-user notes plus a paste-in email thread log per candidate
- **Interview scorecards** — simple rubric: criteria rated 1–5 with comments, per interviewer
- **Cross-job search** — filter every candidate you've ever had by text, stage, tag, or minimum rating
- **Your data, your disk** — SQLite + a plain uploads folder; back it up with `cp`

## Quick start

```bash
npm i
npm run build
npm start       # http://localhost:5354  (admin password: "admin" until you set one)
```

Your careers page is live at `http://localhost:5354/careers` immediately.

Copy `.env.example` to `.env` to set `PORT`, `ADMIN_PASSWORD`, and `COMPANY_NAME`.

## Two ways to run it

**Desktop app** — `npm run desktop` boots the same server locally and opens a window auto-logged-in as admin. Data lives in your OS user-data dir.

**VPS / Docker** — deploy to a $5 VPS when you need the careers page public:

```bash
docker compose up -d      # persists SQLite + resumes in a named volume
```

## Tech stack

Node 20 + Express + better-sqlite3 · React 18 + Vite + Tailwind 4 + Framer Motion + Lucide · Electron desktop wrapper · resumes stored on local disk (never in the DB)

## Hirestack vs Greenhouse / BambooHR

| | Hirestack | Greenhouse / BambooHR ATS |
|---|---|---|
| Price | **$49 once** | $100s/mo, annual contracts |
| Careers page + application form | ✅ built-in | ✅ |
| Kanban pipeline | ✅ | ✅ |
| Resume storage | ✅ your disk | their cloud |
| Interview scorecards | ✅ simple rubric | ✅ (more complex) |
| Approval chains, HRIS, payroll | ❌ (you don't need them yet) | ✅ |
| Candidate data ownership | ✅ SQLite file you can `cp` | vendor export |
| Self-hosted / offline | ✅ | ❌ |

## ☕ Skip the setup — get the 1-click installer

Want the packaged Windows installer with everything pre-wired? Grab it here: **[https://whop.com/benjisaiempire/hirestack-app](https://whop.com/benjisaiempire/hirestack-app)**

## Verification

`npm test` boots the real server and exercises the full flow over HTTP: job posting → public careers page (including XSS-escaping assertions) → multipart resume upload (with file-type rejection) → admin-only resume download byte-for-byte → stage moves → notes/scorecards → cross-job search → job close.

## License

MIT © 2026 Ben (bensblueprints)
