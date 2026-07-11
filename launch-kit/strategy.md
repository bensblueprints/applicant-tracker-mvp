# Launch Strategy — Hirestack

## Target communities

- **r/smallbusiness** — angle: "how we stopped losing candidates in a shared inbox" story post; no direct link until asked (sub is strict on self-promo — lead with the operational pain, mention the tool in comments).
- **r/startups** — "tools that don't scale-price you before you scale" discussion; Hirestack as the example you built. Follow the 1-in-10 self-promo rule.
- **r/humanresources** — ask what people at <50-employee companies actually use; present as MIT open-source first, paid installer second.
- **r/selfhosted** — direct fit: "self-hosted ATS with public careers page, SQLite + plain-file resumes." This sub loves the `cp -r` backup story. Show the docker-compose.
- **Indie Hackers** — build-in-public post with the pricing math ($49 vs $6k/yr) and the "boring tech" stack.

## Hacker News — Show HN draft

**Title:** Show HN: Hirestack – self-hosted applicant tracking in one Node process

**Body:**
Small companies get squeezed by ATS pricing: the good tools start in the hundreds per month and are designed around workflows (approval chains, HRIS sync, compliance reporting) that a 10-person team doesn't have.

Hirestack is the subset I kept seeing teams actually use: job postings that auto-generate a public careers page with an application form and resume upload; a kanban pipeline (applied → screening → interview → offer → hired/rejected); notes and simple 1–5 interview scorecards; and cross-job candidate search.

Boring tech on purpose: one Express process, better-sqlite3, resumes as plain files on disk, React dashboard, server-rendered (and HTML-escaped) public pages. Runs as a desktop app via a thin Electron wrapper or on a $5 VPS with docker compose. MIT licensed; I sell a packaged Windows installer for $49.

Happy to discuss what I deliberately left out (email sending, compliance reports) and why.

## SEO keywords (10)

1. greenhouse alternative small business
2. free applicant tracking system
3. ats software one time purchase
4. hiring pipeline tool self hosted
5. self hosted ats open source
6. bamboohr ats alternative
7. applicant tracking system for startups
8. careers page generator self hosted
9. recruitment kanban board
10. ats without subscription

## AppSumo / PitchGround pitch

Hirestack is the applicant tracking system for the 99% of companies that will never need Greenhouse: post a job and your branded careers page with resume upload is live instantly; candidates flow into a drag-and-drop pipeline with notes, tags, ratings, and interview scorecards; and every resume lives on your own disk, not a vendor's cloud. It's one Node process with SQLite — your customers can run it on a $5 VPS or as a Windows desktop app — and it's a true lifetime deal because there's nothing to meter: no seats, no per-candidate pricing, no renewal. MIT-licensed source builds trust; the LTD is the packaged, supported installer.

## Pricing math

**$49 one-time.** Entry ATS tiers realistically run $100–$300/mo for small teams (Greenhouse and BambooHR don't publish SMB pricing; budget ATS tools like Workable start ~$149/mo). Against a conservative $149/mo, Hirestack **pays for itself in 10 days** — against a single month of any of them, it pays for itself 3× over in month one.
