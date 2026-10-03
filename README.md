# Job Apply Desk

**Automates the job search, never the application.**

A personal job desk that runs entirely on your own machine. It holds your master resume,
fetches public software jobs, scores each one against that resume, writes a tailored
version of the resume for the jobs worth chasing, and shows the employer's own posting URL
so that **you** apply.

> **Two rules this app will not break.** Job Apply Desk never submits an application on your
> behalf — the Apply button opens the employer's posting in a new tab and does nothing
> else. And it never adds experience you do not have: every line of a tailored resume is
> a line you typed into your profile. See [Boundaries this app
> keeps](#boundaries-this-app-keeps).

## Run it

```bash
npm install
npm run dev
```

Then open <http://localhost:43123>.

The dev server is pinned to port **43123** in `package.json`, so `npm run dev` always binds
there. `npm run build && npm start` serves a production build on the same port.

There is no sign-up, no login, no cloud service, and no paid API key. Nothing is fetched
until you press a button.

> **If pages start hanging**, stop the dev server and run `npm run dev` again. This
> project sits inside a OneDrive folder, and OneDrive syncing the `.next` build cache
> makes the long-running dev server recompile in a loop until it stops responding.
> Excluding `.next` and `node_modules` from OneDrive sync, or moving the project outside
> OneDrive, prevents it.

## The loop

Four pages, used in this order.

1. **Profile** (`/profile`) — your master resume. It arrives pre-filled with a seeded
   resume; edit any field and save. This is the only place facts enter the app.
2. **Jobs** (`/jobs`) — press **Refresh** to read the public feeds once. Each posting that
   survives the filters is scored 0–100 against your resume and listed highest first. Search
   by title or company, and narrow by role family, location, source, or minimum score.
3. **A posting** (`/jobs/<slug>`) — the score and why, the **gaps** (what the job wants
   that your resume does not have), a tailored resume shown beside your master so you can
   see exactly what moved, and the Apply link. Copy, download, or print the resume.
4. **Shortlist** (`/`) — three groups: the best roles you have not acted on, the roles that
   already have a tailored resume, and the roles you marked as applied.

### Marking what you did

Every posting carries one status. It starts at **New**.

| Status | Set by |
| ------ | ------ |
| **New** | The default for everything in the feed. |
| **Saved** | You press **Save for later**. |
| **Resume ready** | Automatic, the moment a tailored resume is built for that posting. |
| **Applied** | You press **I applied**. Nothing else sets it. |
| **Skipped** | You press **Skip this one**. |

Opening the Apply link does **not** mark a job as applied. Job Apply Desk cannot see the
employer's site, so it cannot know whether you actually finished the application — only
you can say so. The time you pressed **I applied** is stored with the status, and building
a resume for a job you already applied to or skipped will not walk that decision backwards.

## Where the data lives

Everything is stored in plain JSON files inside this project, under `data/`:

| File | Holds |
| ---- | ----- |
| `data/profile.json` | Your master resume |
| `data/jobs.json` | The last successful job fetch |
| `data/tailored.json` | Tailored resumes, keyed by job id |
| `data/job-status.json` | Each job's status and the time you marked it applied |

There is no database and nothing leaves your machine except `GET` requests to the public
job feeds listed below.

- `data/profile.json` is created automatically from the seeded master resume the first
  time the app reads it. `data/jobs.json` appears after your first **Refresh** on the jobs
  page, and the other two after you open a posting and mark it.
- Saving from the profile page rewrites the file, so an edit survives a page refresh and a
  server restart.
- Writes go to a temp file and are then renamed into place, so an interrupted save cannot
  leave a half-written profile behind.
- **Restore seeded resume** rewrites the file with the original seeded resume. The seed
  itself lives in `src/lib/seed-profile.ts` and is never modified at runtime, so it is
  always restorable.
- The seed ships with a placeholder phone number and email on purpose. That file is
  committed, so anything in it is public and reachable by address scrapers. Put your real
  contact details in on the profile page instead; they are saved to the git-ignored
  `data/profile.json` and never leave your machine.
- `data/` is git-ignored because it holds personal contact details. Delete the folder and
  reload to get the seeded resume back.

## What the profile page does

- Shows every resume section: contact and links, summary, skills, experience, projects,
  education, achievements, and job search preferences.
- Every field is editable. Lists (skills, bullets, coursework, preferences) support adding
  and removing entries.
- Tracks unsaved changes, warns before you navigate away with them, and offers **Discard
  edits** to go back to the last saved state.
- Covers the states you will actually hit: a skeleton while loading, a retryable error if
  the API cannot be reached, a visible banner plus toast if a save fails (with your edits
  left on screen), and per-section empty states when a list has no entries.
- Works on a phone and on a desktop: single column with a stacked action bar on small
  screens, two-column fields plus a sticky section nav from `lg` up.

## The jobs page

Nothing is fetched automatically. Pressing **Refresh** reads public JSON feeds once and
caches the result to `data/jobs.json`, so reopening the page is instant and offline.
A refresh takes roughly 20–35 seconds because every company board is its own request.

### Sources that are on

All five are enabled. Each is a public JSON feed read with a plain `GET`; none needs a key
or an account.

| Source     | Endpoint                                                      | Notes |
| ---------- | ------------------------------------------------------------- | ----- |
| Himalayas  | `himalayas.app/jobs/api/search`                                 | Two queries: India + Entry-level, and worldwide intern. See the caveat below. |
| Remotive   | `remotive.com/api/remote-jobs`                                  | **Delayed by 24 hours**, and every result links back to Remotive's own page and is labelled "Remotive", as their terms require. |
| Greenhouse | `boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true` | 19 verified company boards |
| Lever      | `api.lever.co/v0/postings/{token}?mode=json`                    | 3 verified company boards |
| Ashby      | `api.ashbyhq.com/posting-api/job-board/{token}`                 | 3 verified company boards |

Remotive's feed is published on a 24-hour delay, so a Remotive role may already be closed
and a brand-new one will not appear until tomorrow. The jobs page states this on the
Remotive row, and Remotive rows always point at `remotive.com`, never at a scraped
employer URL.

Every board token in `src/lib/jobs/boards.ts` was kept only after a real request returned
published jobs; tokens that 404'd were dropped. Re-check them any time:

```bash
npm run verify:boards
```

Each source is read independently. If one returns a non-200, times out, or changes shape,
that source is marked unavailable on the page and the others still render. Within
Greenhouse, Lever, and Ashby, a single failing company board is skipped and listed by name
rather than failing the whole provider.

### What gets kept

A posting survives only if both are true.

1. **Location.** It is in India, remote and open to India, or worldwide remote without a
   clause putting the candidate outside India. A remote role is only read as worldwide
   when it names no other place, so "Remote - Colombia" is rejected rather than treated as
   global. Himalayas' country list and timezone window (IST, UTC+5:30) are honoured when
   present.
2. **Seniority.** The title reads as intern, new-grad, graduate, associate, SDE-1, or
   junior software work, including full-stack, backend, frontend, and applied-AI roles.
   Senior, staff, principal, lead, architect, manager, director, and numeric levels above
   one ("Engineer 3", "L3", "Engineer II") are rejected, as is anything asking for more
   than about two years of experience. A posting must actively signal early career;
   silence is not enough, or every mid-level role would qualify.

Jobs are then deduplicated by apply URL, preferring the employer's own board over an
aggregator. The page shows how many postings were scanned against how many were kept, so a
short list is visibly a filter result rather than a failure.

Expect few results. In one run this scanned 6,673 postings and kept 4 — entry-level
openings on these particular boards are seasonal and genuinely scarce.

### Known source caveats

- **Himalayas** ignores `limit` and `offset`, and changing `query` returns the same page,
  so only `country` and `seniority` vary the result set. That caps its contribution at
  roughly 20 rows per combination, and its relevance is loose, so most rows are not
  software roles. Its posting pages also sit behind a Cloudflare check; the links are
  correct and open normally in a real browser, and this app never tries to get around that.
- **Remotive's** public feed currently returns only about 16 rows in total. Their API
  notice asks callers not to fetch more than a few times a day, so a cached Remotive
  result less than 6 hours old is reused instead of refetched, and the page labels it as
  reused. Their listings are delayed by 24 hours, which the jobs page states.
- **Lever** is slow on large boards and occasionally exceeds the 35-second timeout. That
  board is skipped for the run and named on the page.

## Scoring

Every kept posting is scored from 0 to 100 against the stored resume. Scoring runs when a
page is read, not when jobs are fetched, so editing the resume immediately re-ranks the
jobs already on disk without going back to the network.

Skills are read out of the resume itself, never out of the posting. That is the rule that
keeps the gap list honest: a gap is a technology the posting names that the resume does
not contain, and it can never be a skill you already have. `npm run check:scoring`
asserts exactly that on every run.

The score is three positives and two penalties:

| Component | Range | What moves it |
| --------- | ----- | ------------- |
| Stack overlap | 0 to 55 | How much of the posting's named technology is on the resume, and how many declared skills it reaches. A posting naming one technology is damped, so a thin description cannot earn a perfect ratio. |
| Early-career fit | 0 to 22 | Intern and new-grad titles score highest, then junior and SDE-1, then associate. A posting that never names a level scores low here. |
| Role family | 0 to 23 | Full-stack scores highest because both projects are full-stack, then backend, frontend, and AI-application work. The preferred families come from the profile's saved preferences. |
| Missing requirements | 0 to −25 | Requirements not on the resume. A technology the posting is *named after* costs more than one buried in the description. |
| Off-target role | 0 to −30 | Mobile-only, infrastructure-only, QA-only, data-engineering-only, embedded, or non-engineering titles. |

A poorly fitting posting is never deleted, only scored low, so you can still see what the
filters let through. The jobs page sorts by score by default and can be re-sorted by date.
The detail page at `/jobs/<slug>` shows the full description, every component with its
points and a sentence explaining it, the overlaps with where each one appears on the
resume, and the gaps in plain language.

The jobs page has a search box for title and company, plus filters for role family,
location text, source, and minimum score. They all narrow the same list, so they stack
rather than replace each other.

Two honest limits. Scoring only sees the description the source returned, capped at 4,000
characters, so a posting that spends its first 4,000 characters on company blurb scores
low on stack overlap because there is no stack text to read. And the skill vocabulary is a
hand-maintained list in `src/lib/scoring/skills.ts`; ambiguous surface forms are left out
on purpose, so bare "Go", bare "Spring", and bare "REST" are not matched because the
English words appear constantly in job copy.

## Tailored resumes

Each posting's detail page builds a resume aimed at that job and shows it beside the
master so you can see exactly what moved. You copy, download, or print it and apply
yourself. Nothing is ever submitted.

The detail page reads top to bottom as title and company, score, Apply, gaps, tailored
resume, original description. Building the resume is what flips that posting to **Resume
ready**, so it appears in the middle group on the shortlist.

### What tailoring is allowed to do

Only three operations, and never a fourth:

- **Reorder.** Skills the posting names move to the front of their group and the group
  with the most overlap moves first, but every other real skill stays listed behind them.
  Projects are reordered by relevance; experience entries stay chronological and only
  their bullets are reordered.
- **Drop.** A bullet that shares no words with the posting may be left out. This only
  happens when the posting actually named a technology you have — otherwise the only
  signal is incidental word overlap, which is too weak a reason to delete real work, so
  the entry is kept whole. Every dropped bullet is named in the "What changed" box.
- **Replace the summary sentence.** It names the role family and the overlapping
  technologies, and only ones already in your stored skill lists. The phrase "Final-year
  B.Tech student at IIIT Surat" is preserved.

Everything else is copied through byte for byte: contact details, employers, the
Mar 2026 – Jun 2026 dates, the 2023–2027 degree dates, the degree itself, and CGPA
6.73/10. Bullet text is never reworded into a new achievement, and anything in the Gaps
list is deliberately kept off the tailored resume.

`npm run check:tailoring` asserts all of this against both fixtures and every posting in
your real cache: contact and education deep-equal the master, the skill set is identical
and only reordered, every surviving bullet is an exact master bullet, and no gap
technology appears anywhere in the output.

### Using it

**Copy text** puts a plain-text version on the clipboard. **Download Markdown** saves a
`.md` file named after the company and role. **Print** opens the browser's print dialog
with a stylesheet that prints only the tailored resume at A4 with 12 mm margins, tuned to
land on one page; the screen-only green highlighting is dropped from the printed copy.

The result is saved under the job id in `data/tailored.json`, so it is still there after a
refresh. If you edit your master resume afterwards, the page says so and offers
**Rebuild** rather than quietly serving a resume built from older facts.

## API

The pages talk to these local route handlers. They are only meant for this app.

| Method | Route                   | Purpose                                                  |
| ------ | ----------------------- | -------------------------------------------------------- |
| `GET`  | `/api/profile`          | Read the stored profile, seeding the file if it is absent |
| `PUT`  | `/api/profile`          | Validate with Zod and save; returns `422` on bad input    |
| `POST` | `/api/profile/restore`  | Rewrite the file with the seeded master resume            |
| `GET`  | `/api/jobs`             | Read the cached snapshot without touching the network     |
| `POST` | `/api/jobs`             | Refresh from the live feeds and replace the cache         |
| `GET`  | `/api/tailored?slug=`   | Read the saved tailored resume, building it the first time |
| `POST` | `/api/tailored`         | Rebuild from the current master resume and replace it     |
| `GET`  | `/api/job-status`       | Read every job's status and applied timestamp             |
| `POST` | `/api/job-status`       | Set one job's status from an explicit button press        |

## Boundaries this app keeps

These are product rules, not TODOs.

- It never submits an application for you. The Apply control opens the stored posting URL
  in a new tab and does nothing else: no form is filled in, nothing is sent. Every
  outbound request it makes is a `GET` against a public JSON feed. Because of that, it
  also refuses to guess that you applied — **Applied** is only ever set by your own click.
- It never logs into LinkedIn, Naukri, Indeed, Instahyre, Workday, or any other job site,
  and it never posts to an applicant tracking system's apply endpoint (including
  Greenhouse's).
- Apply links point at the **posting page**, never the submission form. For Lever that is
  `hostedUrl` rather than `applyUrl`, and for Ashby `jobUrl` rather than `applyUrl`.
- It never scrapes HTML pages, and it never works around a CAPTCHA or an anti-bot check.
  Where a source puts its posting pages behind one, the app stops at the link.
- It never invents an employer, date, skill, degree, CGPA, metric, or project. Scoring
  reads the resume and never writes to it, a missing requirement is always reported as
  missing, and tailoring only reorders, drops, or re-summarises facts you entered
  yourself. A bullet is never rewritten into a new achievement.

## Project layout

```
src/
  app/
    api/profile/route.ts          GET + PUT the profile
    api/profile/restore/route.ts  POST to restore the seed
    api/jobs/route.ts             GET cached jobs, POST to refresh
    api/tailored/route.ts         GET or rebuild a tailored resume
    api/job-status/route.ts       GET all statuses, POST one change
    profile/page.tsx              The profile page shell
    jobs/page.tsx                 The jobs page shell
    jobs/[slug]/page.tsx          One posting: score, gaps, tailored resume
    page.tsx                      The shortlist, grouped by status
    globals.css                   Theme plus the A4 print stylesheet
  components/
    profile/                      Profile editor, skeleton, list editor
    jobs/                         Board, card, filters, score, resume panel
    ui/                           shadcn/ui primitives
  lib/
    atomic-json.ts                Shared crash-safe JSON read/write
    profile-schema.ts             Zod schema and inferred types
    profile-store.ts              Profile persistence
    seed-profile.ts               The seeded master resume
    activity/
      store.ts, types.ts          Per-job status and applied timestamp
    jobs/
      boards.ts                   Verified board tokens and queries
      filters.ts                  Location and seniority rules
      sources.ts                  One adapter per feed
      fetch-jobs.ts               Orchestration, dedupe, per-source results
      store.ts                    Snapshot cache
      lookup.ts, search.ts        Slug resolution, title/company search
      http.ts, text.ts, types.ts  GET helper, HTML to text, schemas
    scoring/
      skills.ts                   Skill vocabulary and the text matcher
      resume-skills.ts            What the resume actually claims
      score.ts                    The 0-100 engine and its explanations
      scored-jobs.ts              Scores a snapshot and ranks it
      slug.ts, types.ts           Detail-page slugs, schemas
    tailor/
      tailor.ts                   Reorder, drop, re-summarise. Nothing else
      render.ts                   Markdown and plain-text output
      store.ts, types.ts          Per-job persistence, schemas
scripts/verify-boards.mjs         Re-checks every board token
scripts/check-scoring.ts          Ranking and gap-honesty assertions
scripts/check-tailoring.ts        Every tailored claim traced to the master
data/profile.json                 Your live resume (git-ignored)
data/jobs.json                    Last successful fetch (git-ignored)
data/tailored.json                Tailored resumes by job id (git-ignored)
data/job-status.json              Status and applied time by job id (git-ignored)
```

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS v4 · shadcn/ui · Zod · JSON file storage

## Checks

```bash
npm run lint
npx tsc --noEmit
npm run check:scoring    # ranking and gap-honesty assertions, offline
npm run check:tailoring  # every tailored claim traced back to the master resume
npm run verify:boards    # re-checks every job board token against its live API
```

`check:scoring` prints the score every fixture and every cached posting receives, so a
change to the engine shows up as a diff in the table rather than as a silent re-ranking.
`check:tailoring` prints each generated summary and what it promoted or dropped, and
fails if anything in a tailored resume cannot be traced back to the master.
