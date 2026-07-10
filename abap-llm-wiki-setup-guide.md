# Setting up an LLM Wiki for the ABAP project

> **Internal playbook · Knowledge engineering**
>
> A start-to-finish walkthrough for building an AI-maintained knowledge vault — modelled on the iVolve vault, written so that anyone in the organization can follow it for ABAP or any future project.

|              |                                                            |
| ------------ | ---------------------------------------------------------- |
| **Audience** | technical & non-technical                                  |
| **Time**     | ~1 working day for one person, spread over a week          |
| **Stack**    | GitHub · OneDrive · Power Automate · Claude API · Obsidian |

## The journey — eight phases, eight wins

1. [Understand what you're building (read first)](#part-0--what-an-llm-wiki-actually-is)
2. [Create the GitHub repository](#phase-1--create-the-github-repository)
3. [Design the knowledge structure & write the constitution](#phase-2--design-the-knowledge-structure--write-the-constitution)
4. [Build the vault skeleton](#phase-3--build-the-vault-skeleton)
5. [Set up Obsidian for reading and editing](#phase-4--set-up-obsidian-for-reading-and-editing)
6. [Build the AI ingestion pipeline](#phase-5--build-the-ai-ingestion-pipeline)
7. [Connect OneDrive with Power Automate](#phase-6--connect-onedrive-with-power-automate)
8. [Query the wiki with Claude Code](#phase-7--query-the-wiki-with-claude-code)
9. [Onboard the team & keep it alive](#phase-8--onboard-the-team--keep-it-alive)

---

## Part 0 · What an "LLM Wiki" actually is

Despite the fancy name, an LLM wiki is four ordinary things working together:

1. **A folder of Markdown text files** — the wiki itself. Plain text pages about your project (standards, decisions, meeting outcomes, lessons learned), organized into a strict folder structure and linked to each other.
2. **A rulebook for an AI** — a single file called `CLAUDE.md` that tells Claude (the AI) exactly how to file, name, link, and de-duplicate knowledge. This is the secret sauce: the AI does the librarian work so humans don't have to.
3. **An automated pipeline** — anyone drops a raw document (a transcript, a deck, a spec) into a OneDrive folder. Within minutes, an automated job sends it to Claude, which extracts the durable knowledge and updates the right wiki pages.
4. **Two ways for humans to use it** — Obsidian (a free app that displays the wiki beautifully and shows links between pages) for reading and light editing, and Claude Code (a terminal tool) for asking the wiki questions in plain English.

### How the pieces connect

**Contributor** → **Automation** → **Team**

- **OneDrive Inbox** _(Contributor)_ — a teammate drops in any document: a transcript, a deck, a spec.
- ⬇ _Power Automate carries the file over_
- **GitHub repository** _(Automation)_:
  1. The file lands in the wiki's `raw/inbox/` folder
  2. The GitHub Actions robot wakes up
  3. The script sends the document to Claude
  4. Claude updates the right wiki pages
  5. Every change is saved, with full history
- ⇅ _Syncs both ways every 5 minutes_
- **Obsidian** _(Team)_ — read pages, follow links, fix any mistakes.
- **Claude Code** _(Team)_ — ask in plain English: "What did we decide about X last month?"

### Every technology, and why it's there

You'll touch seven tools. None is optional, but each does exactly one job:

| Technology                    | What it is, in plain terms                                                                                                                                                                                                          | Why the wiki needs it                                                                                                                                                                                                                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Markdown**                  | The format the wiki pages are written in: simple text files, like a Word document stripped down to its bare essentials — a few symbols mark the headings and bold text.                                                             | Because it's just text, every tool in this setup — and every human — can open and read it. No special software, no licenses, nothing that breaks when the company changes tools. A page written today will still open in twenty years.                                                              |
| **Git & GitHub**              | Git is "Track Changes" for an entire folder: it remembers every version of every file, who changed it, and when. GitHub is the shared home on the internet where that folder lives — a shared drive with a perfect memory.          | Many people _and_ an AI all edit the same wiki. With Git, nothing is ever lost or overwritten: any mistake — human or AI — can be undone in one step. GitHub is also where our automation robot lives (next row).                                                                                   |
| **GitHub Actions**            | A robot assistant built into GitHub. You leave it a written instruction — "whenever a new file appears in the inbox folder, run this processing job" — and it carries it out on a borrowed cloud computer, then goes back to sleep. | This is what makes the wiki _self-maintaining_. Nobody has to notice a new document, read it, and file its contents by hand — the robot does it within minutes, around the clock, and there is no server for us to buy or maintain.                                                                 |
| **Claude API**                | The same Claude AI many people use as a chat website — but here our robot's script talks to it instead of a person, and we pay only for what we use, like a metered utility.                                                        | Claude is the librarian. For every dropped document it reads the whole thing, pulls out the decisions, facts, and open questions, and writes them onto the right wiki pages following our rulebook. Done by hand, that's an hour of tedious work per document; Claude does it in minutes for cents. |
| **OneDrive + Power Automate** | OneDrive/SharePoint is the file sharing your organization already uses every day. Power Automate is Microsoft's "when this happens, do that" service — here it acts as a courier watching one folder.                               | Contributors shouldn't have to learn GitHub — and with this bridge they never see it. They drop a file into a familiar OneDrive folder exactly as they always do; the courier picks it up and delivers it into the wiki's inbox automatically.                                                      |
| **Obsidian**                  | A free app that opens the wiki on your own computer like a private Wikipedia: pages link to each other, search is instant, and you can even see a visual map of how topics connect.                                                 | This is the team's reading room. It makes the wiki pleasant to browse and easy to correct, and its sync add-on quietly keeps everyone's copy up to date every five minutes — no technical steps after the one-time setup.                                                                           |
| **Claude Code**               | Claude running on your own computer with permission to read the wiki folder — like a librarian who has read every single page and always cites their sources.                                                                       | Instead of hunting through pages, anyone can simply ask — "What did we decide about the custom BAPI approach?" — and get a direct answer pointing to the exact wiki pages it came from.                                                                                                             |

### What you need before you start

- **A GitHub account** (free) — and ideally an organization account so the repo isn't owned by one person.
- **An Anthropic API account** with billing enabled — [console.anthropic.com](https://console.anthropic.com). This is separate from a Claude.ai subscription.
- **Access to Power Automate** in your Microsoft 365 tenant, with the ability to use the HTTP action (a "premium" connector — most enterprise M365 plans include it; check with your IT admin).
- **A OneDrive/SharePoint folder** you can share with the team.
- **One named owner** for the pipeline — the person who holds the API key, watches for failed runs, and curates quality. For iVolve this role exists explicitly; give ABAP one too.

> **Tip — you have a working reference.**
> The `ivolve-vault` repository is a live, working example of everything in this guide. When a step feels abstract, open the corresponding file there (its `CLAUDE.md`, its `.github/workflows/ivolve-vault-ingest.yml`, its `.github/scripts/ivolve-ingest.py`) and see the real thing.

---

## Phase 1 · Create the GitHub repository

The repository is the single home for everything: wiki pages, the AI rulebook, and the automation code.

1. Sign in to GitHub and click **New repository** (github.com/new).
2. Owner: your organization (not a personal account, if you can avoid it). Name: `abap-vault`.
3. Visibility: **Private**. This wiki will contain internal project knowledge.
4. Tick **Add a README file** so the repo isn't empty, then click **Create repository**.
5. Invite your teammates: repo → **Settings → Collaborators → Add people**. Everyone who will read or edit through Obsidian needs _Write_ access.
6. Confirm Actions are allowed: **Settings → Actions → General → Allow all actions**, and under _Workflow permissions_ select **Read and write permissions** (the pipeline must be able to commit the pages it writes).

> ✅ **Win #1** — You have a private repository named `abap-vault`, your team is invited, and Actions can write to it. The wiki has a home.

---

## Phase 2 · Design the knowledge structure & write the constitution

This is the most important phase, and the only one that is genuinely _design_ work rather than setup work. The `CLAUDE.md` file at the root of the repo is the AI's operating manual — every time the pipeline runs, Claude reads it and follows it literally. Get this right and the wiki stays clean for years; get it wrong and you get a junk drawer.

### 2a — Decide your zones (do this as a 1-hour team workshop)

A "zone" is a top-level folder with a clear purpose. iVolve's zones are sales-shaped (offerings, pursuits, customers). ABAP is a technical delivery project, so the zones should be shaped around _what the team will want to retrieve_. A sensible starting point:

| Zone               | Holds                                                                                                                         | Example pages                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `01-standards/`    | Stable reference — coding standards, naming conventions, architecture principles, environment/landscape docs. Changes rarely. | `Standard - ABAP Naming Conventions.md`                               |
| `02-workstreams/`  | Active work — one subfolder per workstream or module, containing meetings, decisions, open questions, stakeholder notes.      | `Decisions/OTC/Decision - OTC - Custom BAPI approach - 2026-07-15.md` |
| `03-intelligence/` | Reusable learnings — patterns seen twice or more, lessons learned, FAQs, gotchas.                                             | `Pattern - IDoc error handling.md`                                    |
| `04-internal/`     | Team operations — contacts, onboarding, processes, runbooks.                                                                  | `Runbook - Transport release.md`                                      |
| `meta/`            | System files — index, log, entity registry, dedup table.                                                                      | `meta/log.md`                                                         |
| `raw/`             | The processing pipeline — `inbox/` for unprocessed files, `processed/` for the archive.                                       | —                                                                     |

Adjust the middle two zones to your project's reality; keep `meta/` and `raw/` exactly as-is (the pipeline code depends on them).

### 2b — Write CLAUDE.md: keep the engine, replace the content

Start from iVolve's `CLAUDE.md` and treat it as two layers. The **engine** — sections the pipeline depends on — must survive in some form. The **content** — iVolve's specific folders, customers and offerings — gets replaced with your ABAP equivalents.

| Keep (engine)                                                                                                                                                                                             | Replace (content)                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Frontmatter schema · naming rules · linking rules ("never create floating pages") · ingestion workflow & update order · deduplication logic · the pre-create entity normalization check · the quality bar | Zone names and folder trees · page types (pursuit → workstream, customer → module, etc.) · templates · examples · team roles and names |

A minimal starter frontmatter block every page must carry (copy verbatim into your constitution):

```yaml
---
title: ""
type: "" # standard, decision, meeting, pattern, faq, runbook ...
zone: "" # 01-standards, 02-workstreams, 03-intelligence, 04-internal
status: active # active | draft | archived | evergreen
owner: ""
created: YYYY-MM-DD
updated: YYYY-MM-DD
workstream: "" # if applicable
tags: []
source_files: [] # raw files ingested into this page
---
```

> **Why a "constitution" at all?**
> Without written rules, every ingestion run makes its own filing decisions — and 100 runs later you have five spellings of the same module name and duplicate pages everywhere. The constitution turns the AI from a clever intern into a disciplined librarian. iVolve's core rules — _update existing pages instead of creating duplicates, every page links upward to a parent, meetings are source material not final artifacts_ — earned their place through real use. Keep them.

> ✅ **Win #2** — Your team agrees on the zones, and a first-draft `CLAUDE.md` for ABAP exists. The wiki now has a brain.

---

## Phase 3 · Build the vault skeleton

Now put the structure into the repo. If you're comfortable with Git, clone the repo and create folders locally; otherwise you can create files directly on github.com (**Add file → Create new file** — typing `folder/filename.md` creates the folder too).

1. Create every zone folder from your Phase 2 design, plus `raw/inbox/`, `raw/processed/`, and `meta/`. Git doesn't store empty folders, so put a short `README.md` in each explaining what belongs there.
2. Add `CLAUDE.md` at the repo root.
3. Create the meta files the pipeline reads and writes:
   - `meta/index.md` — the master navigation page, updated on every ingest.
   - `meta/log.md` — append-only history of what was ingested when.
   - `meta/inbox.md` — the dedup table of already-processed files.
   - `meta/entities.md` — the registry of canonical names (module names, system names, vendor names) and their aliases. Seed it with the ABAP project's known modules and systems so the AI never invents a second spelling.
4. Add a `_Template-*.md` file inside each folder where pages will be created (a template for decisions, one for meetings, one for patterns…). Templates live _next to_ the pages they shape, so both humans and the AI see them at the point of use.

> ✅ **Win #3** — Browsing the repo on github.com shows your full folder structure with templates in place. It already looks like a wiki — it just doesn't write itself yet.

---

## Phase 4 · Set up Obsidian for reading and editing

Each team member does this once on their own laptop. It mirrors the iVolve onboarding guide, pointed at the new repo. (Steps for the person setting up; share this section with every teammate later.)

1. **Install Git** — check with `git --version` in Terminal/Command Prompt; if missing, install from [git-scm.com](https://git-scm.com) (Windows: all default settings; Mac: `xcode-select --install`).
2. **Tell Git who you are** (one time):

   ```
   git config --global user.name "Your Name"
   git config --global user.email "you@yourcompany.com"
   ```

3. **Clone the vault**: `git clone https://github.com/<your-org>/abap-vault.git`. GitHub will ask you to sign in via the browser; Mac users may need a Personal Access Token (github.com → Settings → Developer settings → Personal access tokens).
4. **Install Obsidian** from [obsidian.md](https://obsidian.md) (free), choose **Open folder as vault**, and select the `abap-vault` folder you just cloned — the folder itself, not its parent.
5. **Install the Obsidian Git plugin**: Settings → Community plugins → Browse → search "Obsidian Git" → Install → Enable.
6. **Configure auto-sync** in the plugin's settings:

   | Setting                       | Value       |
   | ----------------------------- | ----------- |
   | Auto commit-and-sync interval | 5 (minutes) |
   | Pull on startup               | Enabled     |
   | Merge strategy on conflicts   | Ours        |
   | Push on commit-and-sync       | Enabled     |
   | Pull on commit-and-sync       | Enabled     |

7. **Verify**: edit any page (add and remove a space), wait five minutes, then check github.com/&lt;your-org&gt;/abap-vault/commits — a commit with your name should appear.

> **Why Obsidian and not just GitHub's website?**
> GitHub shows files; Obsidian shows _knowledge_. It renders `[[wikilinks]]` as clickable connections, offers a graph view of how pages relate, full-text search, and a pleasant editor. The Git plugin makes the whole thing feel like a shared live notebook — everyone's copy syncs itself every five minutes with zero Git knowledge required.

> ✅ **Win #4** — Your vault opens in Obsidian, and a test edit shows up on GitHub within five minutes. Humans are connected.

---

## Phase 5 · Build the AI ingestion pipeline

This is the automation heart: a GitHub Actions workflow that runs a Python script, which sends new documents to Claude and commits the resulting wiki updates. You will copy iVolve's working code and adapt it — do not write this from scratch.

### 5a — Get an Anthropic API key

1. Create an account at [console.anthropic.com](https://console.anthropic.com) (use a team/shared org, not a personal account) and add a payment method under **Billing**.
2. Go to **API Keys → Create Key**. Name it `abap-vault-ingest`. Copy the key immediately — it is shown only once.
3. Set a monthly spend limit in the console (e.g. $50) so a runaway job can never surprise you.

### 5b — Store the key as a GitHub secret

In the repo: **Settings → Secrets and variables → Actions → New repository secret**. Name: `ANTHROPIC_API_KEY`. Value: the key you copied. Secrets are encrypted; nobody (including collaborators) can read them back.

> ⚠️ **Never paste the key anywhere else.**
> Not in the code, not in a wiki page, not in chat. The GitHub secret is its only home. If a key ever leaks, delete it in the Anthropic console and create a new one.

### 5c — Add the workflow file

Create `.github/workflows/abap-vault-ingest.yml` in the repo with this content (adapted from iVolve's, with one improvement: it also triggers automatically whenever a file is pushed into `raw/inbox/`, so no separate "dispatch" step is needed):

```yaml
name: ABAP Vault Ingest

on:
  push:
    paths:
      - "raw/inbox/**" # runs whenever a new file lands in the inbox
  schedule:
    - cron: "0 7 * * 1" # weekly safety-net sweep, Mondays 07:00 UTC
  workflow_dispatch: # manual "Run workflow" button

concurrency:
  group: vault-ingest
  cancel-in-progress: false # runs queue up instead of colliding

permissions:
  contents: write

jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout vault
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: pip install anthropic pdfplumber python-pptx python-docx openpyxl

      - name: Run ingest agent
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
        run: python .github/scripts/abap-ingest.py

      - name: Commit and push vault updates
        run: |
          git config user.name "ABAP Vault"
          git config user.email "abap-vault@yourcompany.com"
          git add -A
          git diff --staged --quiet || git commit -m "ABAP Vault: auto-ingest $(date +%Y-%m-%d)"
          git pull --rebase origin main
          git push
```

### 5d — Adapt the ingestion script

Copy `.github/scripts/ivolve-ingest.py` from the iVolve repo into your repo as `.github/scripts/abap-ingest.py`, then make these changes (ask the iVolve developer to pair with you for 30 minutes here — it's the highest-leverage half hour of the whole setup):

- **Model** — set the model to `claude-opus-4-8` (the current Opus model; iVolve's script pins an older Sonnet). One line in the `call_claude` function.
- **Prompt text** — the script's prompt says "You are the iVolve Vault AI…" and names iVolve's zones. Rewrite those sentences for ABAP and your Phase 2 zones.
- **Path validation** — the script has a list of folders it's allowed to write into (`is_valid_vault_path`). Update it to your zone names.
- Everything else — file readers for PDF/PPTX/DOCX/XLSX, dedup against `meta/inbox.md`, chunking, the move-to-processed step — works unchanged.

### 5e — Test it

1. Put a small test document (a one-page meeting note, as PDF or .txt) into `raw/inbox/` — commit it via Obsidian or upload it on github.com into that folder.
2. Watch the run under the repo's **Actions** tab. Green check = success.
3. Check the results: new/updated pages in the right zone, an entry in `meta/log.md`, the test file moved to `raw/processed/`.
4. If the run fails, open it in the Actions tab — the log shows the exact Python error. The three usual suspects: a typo in the secret name, the model string, or a folder the script expected that doesn't exist.

> **What does this cost?**
> With Claude Opus 4.8 ($5 per million input tokens, $25 per million output tokens), a typical document — a 10-page transcript or a 30-slide deck — costs roughly **$0.15–$0.60** to ingest. A team feeding the wiki 30–50 documents a month lands somewhere around **$10–$30/month**. The spend limit you set in 5a is your hard ceiling. GitHub Actions itself is free at this scale for private repos (2,000 minutes/month included).

> ✅ **Win #5** — A document placed in `raw/inbox/` is automatically read by Claude and turned into linked wiki pages, with a log entry to prove it. The wiki now writes itself.

---

## Phase 6 · Connect OneDrive with Power Automate

Right now, feeding the wiki requires putting files into a GitHub folder. This phase gives contributors what they actually want: _drop a file into OneDrive, walk away_. Power Automate watches the folder and pushes each new file into the repo's `raw/inbox/` — which (thanks to Phase 5's `push` trigger) automatically starts the ingestion.

### 6a — Create the drop-zone and a GitHub token

1. In SharePoint or OneDrive, create a shared folder, e.g. `ABAP_Vault/Inbox`, and share it with the team ("anyone drops project documents here").
2. On GitHub, create a **fine-grained Personal Access Token** for the flow: github.com → Settings → Developer settings → Fine-grained tokens → Generate. Scope it to _only_ the `abap-vault` repository with **Contents: Read and write** permission. Set a 1-year expiry and put a reminder in your calendar to rotate it.

### 6b — Build the flow (about 20 minutes)

In [make.powerautomate.com](https://make.powerautomate.com), create an **Automated cloud flow**:

1. **Trigger**: _"When a file is created (properties only)"_ (SharePoint connector), pointed at your `ABAP_Vault/Inbox` folder. Note: it only watches that exact folder, not subfolders.
2. **Action — Get file content** (SharePoint), using the identifier from the trigger.
3. **Action — HTTP** (this is the premium connector):
   - Method: `PUT`
   - URI: `https://api.github.com/repos/<your-org>/abap-vault/contents/raw/inbox/<File name with extension>` (insert the trigger's file-name token where shown)
   - Headers: `Authorization: Bearer <your fine-grained token>`, `Accept: application/vnd.github+json`, `User-Agent: abap-vault-flow`
   - Body:

     ```json
     {
       "message": "inbox: @{triggerOutputs()?['body/{FilenameWithExtension}']}",
       "content": "@{base64(body('Get_file_content'))}"
     }
     ```

     GitHub's Contents API requires the file to be base64-encoded — the `base64()` expression does that.
4. **Optional action — Move file** (SharePoint) into an `Inbox/sent` subfolder, so contributors can see which files have been picked up.
5. Save, then **test end-to-end**: drop a document into the OneDrive folder → within a minute the flow runs → the file appears in `raw/inbox/` on GitHub → the Actions workflow starts → a few minutes later, wiki pages update.

> ⚠️ **Two gotchas worth knowing.**
> ① The Contents API rejects a PUT if a file with the same name already exists in `raw/inbox/` (it would need the existing file's SHA). In practice the pipeline moves files out of the inbox after processing, so collisions are rare — but tell contributors to use descriptive, dated filenames. ② Files over ~40 MB won't fit through this API; for big recordings, transcribe first and drop the transcript.

> **Why not sync OneDrive to GitHub directly?**
> There's no native connection between the two — this small flow _is_ the industry-standard bridge (SharePoint trigger → GitHub REST API). An alternative wiring, which iVolve uses, is to have the flow fire a GitHub "repository dispatch" event instead of/alongside the upload; the `push`-trigger approach above achieves the same with one moving part fewer.

> ✅ **Win #6** — Anyone in the team can drop a document into a OneDrive folder and, minutes later, see the knowledge appear in the wiki — no GitHub account required. The full loop is closed.

---

## Phase 7 · Query the wiki with Claude Code

For team members with Claude Code access, the vault becomes something you can talk to.

1. Check Node.js: `node --version`. If missing or below v18, install the LTS from [nodejs.org](https://nodejs.org).
2. Install Claude Code: `npm install -g @anthropic-ai/claude-code`.
3. Always launch it _inside_ the vault folder — it only reads the folder it starts in:

   ```
   cd ~/abap-vault
   claude
   ```

4. Try: _"What zones exist in this vault?"_, then something real: _"Summarize every open decision in the OTC workstream."_

Because `CLAUDE.md` sits at the vault root, Claude Code automatically reads your constitution on launch — so it answers from synthesized wiki pages (citing them), refuses to treat raw inbox files as truth, and can even write new knowledge back into the vault following your own rules.

> ✅ **Win #7** — You asked the wiki a question in plain English and got an answer citing its own pages. This is the payoff moment — demo it to the team.

---

## Phase 8 · Onboard the team & keep it alive

Technology is now done. What makes the wiki compound instead of rot is a small amount of human rhythm — this is the lesson the iVolve constitution encodes hardest.

### The contributor workflow (teach everyone these three things)

1. **Upload documents to OneDrive.** Any deck, transcript, spec, or email thread worth remembering goes into the Inbox folder.
2. **Open Obsidian to read.** Look things up before asking colleagues; the answer is often already there.
3. **Review what the AI wrote.** After your document is ingested (a few minutes), skim the pages it touched and fix anything wrong. Two minutes of review keeps the whole system trustworthy.

### The rules that prevent rot

- One named **curator** owns quality: merges duplicates, archives dead pages, promotes repeated learnings into `03-intelligence/`.
- **Never delete pages** — set `status: archived` in the frontmatter instead.
- **Don't edit `CLAUDE.md` casually** — changes affect every future ingestion; they go through the curator.
- **Files enter only through the drop-zone** — no pasting raw material straight into wiki folders.
- A 20-minute **weekly sweep**: check the Actions tab for failed runs, tighten stale pages, ask "what repeated this week that should become a pattern page?"

### Quick troubleshooting

| Symptom                                    | Fix                                                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| File dropped in OneDrive, nothing happened | Check the flow's run history in Power Automate first, then the repo's Actions tab. One of the two will show a red failure with the reason. |
| Actions run failed                         | Open the run log. Expired GitHub token, misnamed secret, or an Anthropic billing issue cover 90% of cases.                                 |
| AI filed something in the wrong place      | Move the page in Obsidian, then sharpen the relevant rule or example in `CLAUDE.md` so it doesn't recur.                                   |
| Duplicate pages for the same thing         | Merge them, then add the name variants to `meta/entities.md` — that registry is exactly what prevents this.                                |
| Merge conflict in Obsidian                 | Message the curator rather than resolving it yourself the first time.                                                                      |

> ✅ **Win #8 — you're done.** The team is onboarded, the rhythm is agreed, and the ABAP wiki is compounding knowledge on its own. Bookmark this guide — Phases 1–8 are exactly the recipe for the _next_ project's wiki too, and a second setup typically takes half a day.

---

**Reusing this guide for future projects:** only Phase 2 (structure design) is real work the second time — everything else is copy, rename, and re-key. Consider keeping a `vault-template` repository with the skeleton, workflow, and script ready to fork.

Modelled on the iVolve vault (its `CLAUDE.md` constitution, ingest workflow, and onboarding guide). External references: [GitHub Contents API](https://docs.github.com/en/rest/repos/contents) · [Power Automate + SharePoint](https://learn.microsoft.com/en-us/power-automate/sharepoint-overview) · [Anthropic Console](https://console.anthropic.com) · [Obsidian](https://obsidian.md) · [Git](https://git-scm.com).
