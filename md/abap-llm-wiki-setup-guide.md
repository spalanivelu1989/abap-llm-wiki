# Setting up an LLM Wiki for the ABAP project

> **Internal playbook · Knowledge engineering**
>
> A start-to-finish walkthrough for building an AI-maintained knowledge vault — written so that anyone in the organization can follow it for ABAP or any future project.

|              |                                                                            |
| ------------ | -------------------------------------------------------------------------- |
| **Audience** | technical & non-technical                                                  |
| **Time**     | ~1 working day for one person, spread over a week                          |
| **Stack**    | GitHub · OneDrive · Power Automate · Claude API · Obsidian                 |
| **Repo**     | [github.com/t-labs-buy/abap-wiki](https://github.com/t-labs-buy/abap-wiki) |

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
10. [Resources · Useful ABAP repositories](#resources--useful-abap-repositories)

---

## Part 0 · What an "LLM Wiki" actually is

Despite the fancy name, an LLM wiki is four ordinary things working together:

1. **A folder of Markdown text files** — the wiki itself. Plain text pages about your project (standards, decisions, meeting outcomes, lessons learned), organized into a strict folder structure and linked to each other.
2. **A rulebook for an AI** — a single file called `CLAUDE.md` that tells Claude (the AI) exactly how to file, name, link, and de-duplicate knowledge. This is the secret sauce: the AI does the librarian work so humans don't have to.
3. **An automated pipeline** — anyone drops a raw document (a transcript, a deck, a spec) into a OneDrive folder. Within minutes, an automated job sends it to Claude, which extracts the durable knowledge and updates the right wiki pages.
4. **Two ways for humans to use it** — Obsidian (a free app that displays the wiki beautifully and shows links between pages) for reading and light editing, and Claude Code (a terminal tool) for asking the wiki questions in plain English.

> 💡 **See also — the non-technical version.** Prefer to start with no technology at all? Read [A plain-language tour of the whole system](#misc--a-plain-language-tour-of-the-whole-system) — it explains this exact machinery as a company library with a robot librarian, and it's the right link to share with stakeholders and non-technical teammates.

> 📖 **Background — where this pattern comes from.** Andrej Karpathy's ["LLM Wiki" gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) describes the general pattern this guide implements: instead of RAG-style retrieval that re-derives answers from raw documents on every question, the LLM incrementally builds and maintains a persistent, interlinked markdown wiki — with a schema file (our `CLAUDE.md`), an `index.md` catalog, an append-only `log.md`, and Obsidian as the reading UI. It's a 10-minute read and the best conceptual grounding for everything that follows.

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
- **One named owner** for the pipeline — the person who holds the API key, watches for failed runs, and curates quality.

> **Tip — you have a working reference.**
> Our [`abap-wiki`](https://github.com/t-labs-buy/abap-wiki) repository is the live, working implementation of everything in this guide. When a step feels abstract, open the corresponding file there (its `CLAUDE.md`, its `.github/workflows/abap-wiki-ingest.yml`, its `.github/scripts/abap-ingest.py`) and see the real thing.

---

## Phase 1 · Create the GitHub repository

The repository is the single home for everything: wiki pages, the AI rulebook, and the automation code.

1. Sign in to GitHub and click **New repository** (github.com/new).
2. Owner: your organization (not a personal account, if you can avoid it). Name: `abap-wiki` — ours lives at [github.com/t-labs-buy/abap-wiki](https://github.com/t-labs-buy/abap-wiki).
3. Visibility: **Private**. This wiki will contain internal project knowledge.
4. Tick **Add a README file** so the repo isn't empty, then click **Create repository**.
5. Invite your teammates: repo → **Settings → Collaborators → Add people**. Everyone who will read or edit through Obsidian needs _Write_ access.
6. Confirm Actions are allowed: **Settings → Actions → General → Allow all actions**, and under _Workflow permissions_ select **Read and write permissions** (the pipeline must be able to commit the pages it writes).

> ✅ **Win #1** — You have a private repository named `abap-wiki`, your team is invited, and Actions can write to it. The wiki has a home.

---

## Phase 2 · Design the knowledge structure & write the constitution

This is the most important phase, and the only one that is genuinely _design_ work rather than setup work. The `CLAUDE.md` file at the root of the repo is the AI's operating manual — every time the pipeline runs, Claude reads it and follows it literally. Get this right and the wiki stays clean for years; get it wrong and you get a junk drawer. (In the [plain-language tour](#misc--a-plain-language-tour-of-the-whole-system), this file is "the constitution" — the rulebook the robot librarian must follow.)

### 2a — Decide your zones (do this as a 1-hour team workshop)

A "zone" is a top-level folder with a clear purpose. A sales project's zones might be sales-shaped (offerings, pursuits, customers); ABAP is a technical delivery project, so the zones should be shaped around _what the team will want to retrieve_. A sensible starting point:

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

Our constitution lives at the root of [`abap-wiki`](https://github.com/t-labs-buy/abap-wiki) as `CLAUDE.md`. Treat it as two layers. The **engine** — sections the pipeline depends on — must survive in some form. The **content** — the project-specific folders, modules and workstreams — is what gets replaced when you reuse this setup for a future project.

| Keep (engine)                                                                                                                                                                                             | Replace (content)                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Frontmatter schema · naming rules · linking rules ("never create floating pages") · ingestion workflow & update order · deduplication logic · the pre-create entity normalization check · the quality bar | Zone names and folder trees · page types · templates · examples · team roles and names |

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
> Without written rules, every ingestion run makes its own filing decisions — and 100 runs later you have five spellings of the same module name and duplicate pages everywhere. The constitution turns the AI from a clever intern into a disciplined librarian. Its core rules — _update existing pages instead of creating duplicates, every page links upward to a parent, meetings are source material not final artifacts_ — earned their place through real use. Keep them.

> ✅ **Win #2** — Your team agrees on the zones, and a first-draft `CLAUDE.md` for ABAP exists. The wiki now has a brain.

---

## Phase 3 · Build the vault skeleton

Now put the structure into the repo. If you're comfortable with Git, clone the repo and create folders locally; otherwise you can create files directly on github.com (**Add file → Create new file** — typing `folder/filename.md` creates the folder too). If you want the plain-English purpose of every folder you're about to create — the shelves, the mailroom, the librarian's desk — see [A plain-language tour of the whole system](#misc--a-plain-language-tour-of-the-whole-system).

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

Each team member does this once on their own laptop. (Steps for the person setting up; share this section with every teammate later.)

1. **Install Git** — check with `git --version` in Terminal/Command Prompt; if missing, install from [git-scm.com](https://git-scm.com) (Windows: all default settings; Mac: `xcode-select --install`).
2. **Tell Git who you are** (one time):

   ```
   git config --global user.name "Your Name"
   git config --global user.email "you@yourcompany.com"
   ```

3. **Clone the vault**: `git clone https://github.com/t-labs-buy/abap-wiki.git`. GitHub will ask you to sign in via the browser; Mac users may need a Personal Access Token (github.com → Settings → Developer settings → Personal access tokens).
4. **Install Obsidian** from [obsidian.md](https://obsidian.md) (free), choose **Open folder as vault**, and select the `abap-wiki` folder you just cloned — the folder itself, not its parent.
5. **Install the Obsidian Git plugin**: Settings → Community plugins → Browse → search "Git" and you will find this repo [https://github.com/vinzent03/obsidian-git](https://github.com/vinzent03/obsidian-git) → Install → Enable.
6. **Configure auto-sync** in the plugin's settings:

   | Setting                       | Value       |
   | ----------------------------- | ----------- |
   | Auto commit-and-sync interval | 5 (minutes) |
   | Pull on startup               | Enabled     |
   | Merge strategy on conflicts   | Ours        |
   | Push on commit-and-sync       | Enabled     |
   | Pull on commit-and-sync       | Enabled     |

7. **Verify**: edit any page (add and remove a space), wait five minutes, then check github.com/t-labs-buy/abap-wiki/commits — a commit with your name should appear.

### What is the purpose of using Obsidian in this project? What problem does it solve? Why do we need it in the first place?

Obsidian is the reading room of this system — it solves the "humans need a pleasant way to consume and correct the knowledge" problem. Strictly speaking, the pipeline works without it; nothing in the automation depends on Obsidian. But without it, the wiki's only interface for your team would be GitHub's file browser, and that fails the humans in three specific ways:

1. **It turns files into a navigable knowledge web.** The whole constitution is built on `[[wikilinks]]` — every decision links to its workstream, every pattern links to where it was observed, every issue links to the gotcha it produced. On github.com, `[[Decision - OTC - Custom BAPI approach - 2026-07-15]]` is just dead text. In Obsidian it's a clickable connection, with backlinks ("what links here?") and a graph view showing how topics cluster. The link discipline the AI is instructed to maintain only pays off in a tool that renders links as navigation. That's the core reason: GitHub shows files; Obsidian shows _knowledge_.

2. **It gives non-technical teammates read/write access without learning Git.** Your contributors are ABAP consultants and functional experts, not necessarily Git users. The constitution requires humans to review what the AI wrote and fix mistakes ("two minutes of review keeps the whole system trustworthy"). With the Obsidian Git plugin configured for auto-sync, a teammate opens what feels like a private Wikipedia, edits a page like a normal document, and the change is committed and pushed automatically — pull, commit, merge, push all invisible. Without that, every correction would require Git knowledge or a clunky web edit, and in practice the reviews just wouldn't happen. That's how vaults rot.

3. **It makes the vault fast to consult, which is what makes it get used.** Instant full-text search, offline access on every laptop, and folder navigation that mirrors the zones. The wiki only compounds if people's default move is "check the vault before asking a colleague" — and that habit only forms if lookup takes seconds.

Worth being clear about the division of labor — each tool has exactly one job:

| Concern                                              | Handled by                   |
| ---------------------------------------------------- | ---------------------------- |
| Storage, history, multi-user conflict safety         | Git/GitHub                   |
| Writing and filing knowledge automatically           | Claude + the ingest pipeline |
| Humans reading, browsing links, and correcting pages | Obsidian                     |
| Asking questions in plain English                    | Claude Code                  |

So could you skip it? Technically yes — the pipeline would still capture and file the knowledge. But you'd have a wiki that's written by a machine and read by almost no one, with mistakes nobody corrects. Obsidian is what closes the human half of the loop: it's the difference between a wiki your team _has_ and one your team _actually uses_.

> ✅ **Win #4** — Your vault opens in Obsidian, and a test edit shows up on GitHub within five minutes. Humans are connected.

---

## Phase 5 · Build the AI ingestion pipeline

This is the automation heart: a GitHub Actions workflow that runs a Python script, which sends new documents to Claude and commits the resulting wiki updates. The working code lives in the [`abap-wiki`](https://github.com/t-labs-buy/abap-wiki) repo — copy and adapt it; do not write this from scratch.

> 💡 **See also — what these two files mean.** The two files you build in this phase are "the alarm bell" (the workflow) and "the librarian" (the script) in [A plain-language tour of the whole system](#misc--a-plain-language-tour-of-the-whole-system) — read it first if you want the intuition before the mechanics.

### 5a — Get an Anthropic API key

1. Create an account at [console.anthropic.com](https://console.anthropic.com) (use a team/shared org, not a personal account) and add a payment method under **Billing**.
2. Go to **API Keys → Create Key**. Name it `abap-wiki-ingest`. Copy the key immediately — it is shown only once.
3. Set a monthly spend limit in the console (e.g. $50) so a runaway job can never surprise you.

### 5b — Store the key as a GitHub secret

In the repo: **Settings → Secrets and variables → Actions → New repository secret**. Name: `ANTHROPIC_API_KEY`. Value: the key you copied. Secrets are encrypted; nobody (including collaborators) can read them back.

> ⚠️ **Never paste the key anywhere else.**
> Not in the code, not in a wiki page, not in chat. The GitHub secret is its only home. If a key ever leaks, delete it in the Anthropic console and create a new one.

### 5c — Add the workflow file

Create `.github/workflows/abap-wiki-ingest.yml` in the repo with this content (it triggers automatically whenever a file is pushed into `raw/inbox/`, so no separate "dispatch" step is needed):

```yaml
name: ABAP Wiki Ingest

on:
  push:
    paths:
      - "raw/inbox/**" # runs whenever a new file lands in the inbox
  schedule:
    - cron: "0 7 * * 1" # weekly safety-net sweep, Mondays 07:00 UTC
  workflow_dispatch: # manual "Run workflow" button

concurrency:
  group: wiki-ingest
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

      - name: Commit and push wiki updates
        run: |
          git config user.name "ABAP Wiki"
          git config user.email "abap-wiki@yourcompany.com"
          git add -A
          git diff --staged --quiet || git commit -m "ABAP Wiki: auto-ingest $(date +%Y-%m-%d)"
          git pull --rebase origin main
          git push
```

### 5d — Adapt the ingestion script

The ingestion script lives at `.github/scripts/abap-ingest.py` in the `abap-wiki` repo. When reusing this setup for a new project, copy it and update three things (pair with whoever set up the previous wiki for 30 minutes here — it's the highest-leverage half hour of the whole setup):

- **Model** — set the model to `claude-opus-4-8` (the current Opus model). One line in the `call_claude` function.
- **Prompt text** — the script's prompt names the project and its zones ("You are the ABAP Wiki AI…"). Rewrite those sentences for the new project and its Phase 2 zones.
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

1. In SharePoint or OneDrive, create a shared folder — ours is `abap_wiki/inbox` — and share it with the team ("anyone drops project documents here").
2. On GitHub, create a **fine-grained Personal Access Token** for the flow: github.com → Settings → Developer settings → Fine-grained tokens → Generate. Scope it to _only_ the `abap-wiki` repository with **Contents: Read and write** permission. Set a 1-year expiry and put a reminder in your calendar to rotate it.

### 6b — Build the flow (about 20 minutes)

**Before anything else, work out where your `Inbox` folder from 6a actually lives** — this decides which connector you use, and it's the #1 place people get stuck (a folder in OneDrive is invisible to the SharePoint connector, and vice versa):

- You created it in **OneDrive** — you see it under **My files** at [onedrive.com](https://onedrive.com) or in the OneDrive desktop app → use the **OneDrive for Business** connector.
- You created it in a **SharePoint site or a Teams channel** — you reach it through a site's **Documents** library or a channel's **Files** tab → use the **SharePoint** connector. (A Teams channel folder lives in SharePoint: the site is named after the team, the library is `Documents`, and the top-level folder is named after the channel.)

> **Not sure which you have? Check the URL.** Open the folder in your browser and look at the address bar: `https://<yourcompany>-my.sharepoint.com/...` (note the `-my`) is your personal OneDrive → use the **OneDrive for Business** connector. `https://<yourcompany>.sharepoint.com/sites/<SiteName>/...` is a SharePoint site → use the **SharePoint** connector. Don't be fooled by `sharepoint.com` appearing in both — OneDrive for Business is hosted on SharePoint infrastructure, but Power Automate's connectors treat them as two separate worlds.

**Step 1 — Create the flow**

1. Go to [make.powerautomate.com](https://make.powerautomate.com) and sign in with your **work** Microsoft 365 account (the same one that owns the OneDrive/SharePoint folder).
2. In the left sidebar, click **+ Create**.
3. Choose **Automated cloud flow**.
4. Name it `ABAP Wiki Inbox to GitHub`, then click **Skip** (bottom of the dialog) — you'll pick the trigger in the designer where it's easier to search.

**Step 2 — Add the trigger and point it at your folder**

_If your folder is in OneDrive (My files):_

1. In the designer's search box, type `when a file is created`, filter by the **OneDrive for Business** connector, and select **When a file is created**.
2. Click the trigger card to open its settings. In the **Folder** field, click the **folder icon at the right end of the box** — don't try to type the path by hand.
3. A mini file-browser opens showing your OneDrive root. Click the **`>` arrow** next to `abap_wiki` to drill into it, then click **`inbox`** itself. The field should now show `/abap_wiki/inbox`.
4. **If `abap_wiki` doesn't appear in the picker**: the picker only shows folders in _your own_ My files. A folder someone else shared with you won't show up — either the folder's owner builds the flow, or recreate the drop-zone in your own OneDrive or on a SharePoint site everyone can use.

_If your folder is in SharePoint / Teams:_

1. Search for **When a file is created (properties only)** and select it under the **SharePoint** connector.
2. **Site Address**: open the dropdown and pick your site (sites you've visited are listed). If it's missing, choose **Enter custom value** and paste the site URL, e.g. `https://<yourcompany>.sharepoint.com/sites/<YourSite>`.
3. **Library Name**: pick `Documents` unless you created a dedicated library.
4. **Folder**: click the folder icon at the right end of the field and drill down to `abap_wiki/inbox` with the `>` arrows. Note: the trigger only watches that exact folder, not subfolders.

**Step 3 — Add the "Get file content" action**

> ⚠️ **This is the easiest place to pick the wrong connector.** SharePoint and OneDrive for Business _both_ have an action named "Get file content", and the search results are dominated by SharePoint's. You can tell them apart at a glance: SharePoint's version asks for **Site Address** and **File Identifier**; OneDrive's version has a single required field called **File** and carries the blue cloud icon (same as the OneDrive trigger). If your folder is in OneDrive and the action is asking you for a Site Address, you have the wrong one — no Site Address value will ever make it work.

_If your folder is in OneDrive (My files):_

1. Click **+** below the trigger → **Add an action**.
2. In the search box, type the **connector name** — `OneDrive` — rather than the action name.
3. In the results, find the **OneDrive for Business** group (blue cloud icon). Careful: there is also a plain **OneDrive** connector — that's the consumer/personal one; skip it.
4. Click **See more** on the OneDrive for Business group (or click the connector name) so you're looking only at its actions, then select **Get file content**.
5. Verify you got the right one: the panel header shows the blue cloud icon, and the only required field is **File** — no Site Address anywhere. If **Site Address** appears, it's the SharePoint one again — delete the card (click it → **⋮** menu at the top of the panel → **Delete**) and repeat from step 1.
6. In the **File** field, click the **⚡ lightning-bolt icon** (or type `/`) to open the dynamic content panel, and under "When a file is created" insert the **File identifier** token.

_If your folder is in SharePoint / Teams:_ use SharePoint's **Get file content**, set **Site Address** to the same site as your trigger, and insert the trigger's **Identifier** token into **File Identifier**.

**Step 4 — Add the HTTP action**

This is the step that actually uploads the file to GitHub. It uses the generic **HTTP** action, which is a **premium** connector — your account needs a Power Automate Premium license (Power Automate offers a free 90-day trial the first time you use one).

1. Click **+** below **Get file content** → **Add an action**.
2. Search `HTTP` and select the plain **HTTP** action (globe icon, labelled just "HTTP", marked _Premium_). Not "HTTP with Microsoft Entra ID", not "HTTP Webhook", not "When an HTTP request is received" — just **HTTP**.
3. **URI** — type this exactly (this is our repo, `t-labs-buy/abap-wiki`), **including the trailing `/`**:

   ```
   https://api.github.com/repos/t-labs-buy/abap-wiki/contents/raw/inbox/
   ```

   Then, with the cursor still at the very end (right after the last `/`), click the **⚡ icon** → **fx (Expression)** tab → paste this exactly → **Add**:

   ```
   encodeUriComponent(decodeBase64(triggerOutputs()?['headers']?['x-ms-file-name-encoded']))
   ```

   This appends the file's name, URL-encoded so names with spaces work. Use this expression — **don't** insert a token from the Dynamic content tab: the OneDrive trigger lists **File content** more prominently than the name tokens, and picking it by mistake stuffs the whole file into the URL. The field should end with one purple `fx` pill right after `inbox/`.

4. **Method** — pick `PUT` from the dropdown.
5. **Headers** — add three rows (left box = key, right box = value):

   | Key             | Value                                                                                     |
   | --------------- | ----------------------------------------------------------------------------------------- |
   | `Authorization` | `Bearer github_pat_…` — the word `Bearer`, one space, then the fine-grained token from 6a |
   | `Accept`        | `application/vnd.github+json`                                                             |
   | `User-Agent`    | `abap-wiki-flow`                                                                          |

6. **Body** — paste this skeleton first:

   ```json
   {
     "message": "inbox: ",
     "content": ""
   }
   ```

   Then fill in the two dynamic parts, both via the **fx (Expression)** tab (not the Dynamic content tab):
   - Cursor right after `inbox: ` (still inside the quotes) → **⚡** → **fx** → paste → **Add**:

     ```
     decodeBase64(triggerOutputs()?['headers']?['x-ms-file-name-encoded'])
     ```

     (Same file name as the URI, but without URL-encoding — a commit message is plain text.)

   - Cursor between the quotes of `"content"` → **⚡** → **fx** → paste → **Add**:

     ```
     base64(body('Get_file_content'))
     ```

     GitHub's Contents API requires the file to be base64-encoded — this expression does that.

7. **Verify in Code view** before saving — click the **Code view** tab on the HTTP card. It must contain exactly these lines (this is the configuration that is confirmed working):

   ```json
   "uri": "https://api.github.com/repos/t-labs-buy/abap-wiki/contents/raw/inbox/@{encodeUriComponent(decodeBase64(triggerOutputs()?['headers']?['x-ms-file-name-encoded']))}",
   "body": {
     "message": "inbox: @{decodeBase64(triggerOutputs()?['headers']?['x-ms-file-name-encoded'])}",
     "content": "@{base64(body('Get_file_content'))}"
   }
   ```

   Checks: the URI has `inbox/@{` (slash before the expression!), and `body('Get_file_content')` appears **only** in `"content"` — nowhere else.

> ⚠️ **Troubleshooting the HTTP action** — every one of these happened while setting this flow up; check them in order:
>
> | Error / symptom                                                                               | Cause                                                                                                                                                                                                                     | Fix                                                                                                                                                                                       |
> | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
> | `Invalid request. "sha" wasn't supplied.`                                                     | The URI has no file name at the end, so GitHub thinks you're overwriting the existing path `raw/inbox` itself. **Or** a file with the same name already exists in `raw/inbox/` on GitHub (leftover from an earlier test). | Add the file-name expression to the URI (sub-step 3). When re-testing, always use a **freshly named file**, or delete the leftover from the repo first.                                   |
> | `The provided 'Http' action URI ... is not valid. The URI must be a well formed absolute URI` | The file name was inserted raw and contains spaces (e.g. `Meeting Notes.docx`), or the **File content** token was inserted instead of the name.                                                                           | Use the `encodeUriComponent(decodeBase64(...))` expression from sub-step 3 — it handles both.                                                                                             |
> | URI or commit message contains the whole document text                                        | The **File content** token was picked from the Dynamic content tab — it sits right next to the name tokens.                                                                                                               | Remove the pill and use the `fx` expressions above instead of Dynamic content tokens.                                                                                                     |
> | File lands in the repo as `raw/inboxMyFile.txt` (glued name, wrong folder)                    | Missing `/` between `inbox` and the expression in the URI.                                                                                                                                                                | In Code view the URI must read `inbox/@{encodeUriComponent(...` — with the slash.                                                                                                         |
> | Anything else                                                                                 | —                                                                                                                                                                                                                         | Open **My flows → run history → the failed run → click the red HTTP card** and read **Inputs → URI** and **Outputs → Body**: it shows exactly what was sent and GitHub's exact complaint. |
>
> Also: the expression's `Get_file_content` must match your Step 3 card's name (spaces → underscores), and the 6a token needs **Contents: Read and write** on `abap-wiki` — GitHub confusingly answers `404` (not 403) when the token can't write.

**Step 5 — Optional: mark files as picked up**

This moves each file into a `sent` subfolder after it has been uploaded, so contributors can see at a glance which files the pipeline has already picked up. Optional, but recommended.

1. **Create the destination folder first**: in OneDrive, create a subfolder named `sent` inside your `abap_wiki/inbox` folder. The flow can't move a file into a folder that doesn't exist. (This is safe: the trigger watches only the exact `inbox` folder, not its subfolders, so files landing in `inbox/sent` won't re-trigger the flow.)
2. Back in the designer, click **+** below the **HTTP** action → **Add an action**. The position matters: actions run in order, so the move only happens after the upload succeeds — if the HTTP step fails, the file stays in the inbox as a visible "not processed yet" signal.
3. Search `OneDrive`, open the **OneDrive for Business** group, and select **Move or rename a file** (that's OneDrive's name for this action). Same icon check as before: blue cloud, and no Site Address field anywhere.
4. **File** — click **⚡** and insert the trigger's **File identifier** token.
5. **Destination file path** — this must include the file name, not just the folder. Type this exactly, **including the trailing `/`**:

   ```
   /abap_wiki/inbox/sent/
   ```

   Then, cursor at the very end → **⚡** → **fx (Expression)** tab → paste this exactly → **Add**:

   ```
   decodeBase64(triggerOutputs()?['headers']?['x-ms-file-name-encoded'])
   ```

   Same rule as the HTTP action: use the `fx` expression, **not** a Dynamic content token (the File content token sits right next to the name tokens). And note: plain `decodeBase64` here — **no** `encodeUriComponent`. This is a file path, not a URL; encoding it would put a literal `%20` into the moved file's name.

6. Open **Advanced parameters** and set **Overwrite** to **Yes**, so a duplicate filename doesn't make the whole flow fail.
7. **Verify in Code view** — the parameters must read exactly (this is the configuration that is confirmed working):

   ```json
   "id": "@triggerOutputs()?['headers/x-ms-file-id']",
   "destination": "/abap_wiki/inbox/sent/@{decodeBase64(triggerOutputs()?['headers']?['x-ms-file-name-encoded'])}",
   "overwrite": true
   ```

   Checks: `sent/@{` has the slash, and the destination expression is `decodeBase64(triggerOutputs()...` — **not** `body('Get_file_content')`.

> ⚠️ **Troubleshooting: `Action 'Move_or_rename_a_file' failed: BadGateway`.** OneDrive returns this unhelpful error when the destination path is malformed. Both causes seen in practice: the **File content** token in the destination instead of the file name, and/or a missing `/` after `sent`. Fix with sub-steps 5 and 7 above. Also confirm the `sent` subfolder actually exists in OneDrive — the action won't create it (sub-step 1).

_If your folder is in SharePoint / Teams:_ use SharePoint's **Move file** action instead — **Current Site Address** and **Destination Site Address** = your site, **File to Move** = the trigger's **Identifier** token, **Destination Folder** = browse to `…/Inbox/sent`, and **If another file is already there** = **Replace**.

**Step 6 — Save and test end-to-end**

Click **Save**, then drop a document **with a brand-new filename** (one never uploaded before — a reused name triggers the "sha wasn't supplied" error) into the folder → within a minute the flow runs (check **My flows → 28-day run history**) → the file appears in `raw/inbox/` on GitHub with a commit message like `inbox: <filename>` → the Actions workflow starts → a few minutes later, wiki pages update.

> ⚠️ **Two gotchas worth knowing.**
> ① The Contents API rejects a PUT if a file with the same name already exists in `raw/inbox/` (it would need the existing file's SHA). In practice the pipeline moves files out of the inbox after processing, so collisions are rare — but tell contributors to use descriptive, dated filenames. ② Files over ~40 MB won't fit through this API; for big recordings, transcribe first and drop the transcript.

> **Why not sync OneDrive to GitHub directly?**
> There's no native connection between the two — this small flow _is_ the industry-standard bridge (a file trigger → GitHub REST API). An alternative wiring is to have the flow fire a GitHub "repository dispatch" event instead of/alongside the upload; the `push`-trigger approach above achieves the same with one moving part fewer.

> ✅ **Win #6** — Anyone in the team can drop a document into a OneDrive folder and, minutes later, see the knowledge appear in the wiki — no GitHub account required. The full loop is closed.

---

## Phase 7 · Query the wiki with Claude Code

For team members with Claude Code access, the vault becomes something you can talk to.

1. Check Node.js: `node --version`. If missing or below v18, install the LTS from [nodejs.org](https://nodejs.org).
2. Install Claude Code: `npm install -g @anthropic-ai/claude-code`.
3. Always launch it _inside_ the vault folder — it only reads the folder it starts in:

   ```
   cd ~/abap-wiki
   claude
   ```

4. Try: _"What zones exist in this vault?"_, then something real: _"Summarize every open decision in the OTC workstream."_

Because `CLAUDE.md` sits at the vault root, Claude Code automatically reads your constitution on launch — so it answers from synthesized wiki pages (citing them), refuses to treat raw inbox files as truth, and can even write new knowledge back into the vault following your own rules.

### How to query the ABAP wiki knowledge base? Do I query in the Claude Code terminal or in the Obsidian UI?

You query in the **Claude Code terminal** — that's where Query Mode (defined in your `CLAUDE.md`) runs. Obsidian doesn't have an AI answering questions; it's the reading and browsing layer. The two complement each other.

**Claude Code terminal — for questions**

Just ask in plain language, like "ABAP naming conventions". Per the vault's Query Mode rules, Claude will:

1. Read `meta/index.md` to orient
2. Read the relevant pages from the right zone
3. Answer only from synthesized vault pages (never from `raw/`)
4. Cite the source page, e.g. "From `[[Decision - OTC - Custom BAPI approach - 2026-07-15]]`…"
5. Say explicitly when the vault doesn't have the answer yet

This is the right place for synthesis-style questions: _"What did we decide about credit-block release and why?"_, _"What's the status of ZSD_CREDIT_AUTORELEASE?"_, _"Have we seen this IDoc error before?"_, _"Is OTC handover-ready?"_ — anything where the answer is spread across several pages.

> ✅ **Win #7** — You asked the wiki a question in plain English and got an answer citing its own pages. This is the payoff moment — demo it to the team.

---

## Phase 8 · Onboard the team & keep it alive

Technology is now done. What makes the wiki compound instead of rot is a small amount of human rhythm — this is the lesson the constitution encodes hardest.

> 💡 **See also — the onboarding explainer.** When introducing the wiki to non-technical teammates, start them on [A plain-language tour of the whole system](#misc--a-plain-language-tour-of-the-whole-system) — it explains the whole vault as a library with a robot librarian, with no code or GitHub knowledge required.

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

## Resources · Useful ABAP repositories

Open-source projects worth knowing about — for the wiki itself, and for the broader ABAP development toolchain.

| Repository                                                                                      | What it is                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Gixsy95/abap_wiki](https://github.com/Gixsy95/abap_wiki)                                       | A community ABAP knowledge wiki on GitHub — useful as inspiration for structuring and growing our own vault.                                                |
| [abapGit/abapGit](https://github.com/abapGit/abapGit)                                           | The open-source Git client for ABAP — the standard way to version-control ABAP development objects and share code between systems.                          |
| [abaplint/abaplint](https://github.com/abaplint/abaplint)                                       | A static-analysis linter for ABAP: enforces naming conventions, syntax rules, and clean-code checks, and runs in CI (e.g. GitHub Actions) on abapGit repos. |
| [sap/abap-cleaner](https://github.com/sap/abap-cleaner)                                         | SAP's automated code cleanup tool: applies dozens of clean-ABAP style rules to existing code, available as an Eclipse/ADT plugin and standalone app.        |
| [marcellourbani/vscode_abap_remote_fs](https://github.com/marcellourbani/vscode_abap_remote_fs) | A VS Code extension that mounts an ABAP system as a remote filesystem — edit, activate, and run ABAP source directly from VS Code via ADT services.         |
| [marianfoo/abap-mcp-server](https://github.com/marianfoo/abap-mcp-server)                       | A Model Context Protocol (MCP) server for ABAP systems — lets AI assistants like Claude connect to an SAP system to read and work with ABAP objects.        |

---

## Misc · How Claude derives the wikilinks

### How does Claude know which document connects to which document, and which content is related to which content? How does it derive the wikilinks — what actually happens under the hood?

The short answer: there is **no graph algorithm, embedding search, or similarity index** involved. The links come from Claude reading the new document side-by-side with a snapshot of the entire existing vault in one prompt, plus a set of hard rules that force a minimum link structure. The mechanism lives in the pipeline script (`.github/scripts/abap-ingest.py`) and works in four steps.

#### 1 — The pipeline builds a "vault snapshot" as context

Before Claude ever sees your document, `build_prompt_context()` (line 300) assembles four things into the prompt:

- **The constitution** — the first 6,000 characters of `CLAUDE.md`, which contains the linking rules (upward/sideways/forward links, mandatory patterns like "every decision links to the developments it affects").
- **`meta/index.md`** — the master catalog of what pages exist.
- **`meta/entities.md`** — the canonical name registry with aliases (OTC = O2C = Order-to-Cash).
- **Every existing vault page** — the script walks all four zone folders and inlines the first 1,000 characters of each `.md` file (frontmatter + opening content) under an "Existing Pages (do not duplicate these)" heading.

So when your new document arrives, Claude isn't guessing what it might relate to — it's literally reading the beginnings of every page in the vault in the same context window.

#### 2 — Relatedness is derived semantically, not mechanically

This is the "under the hood" part people usually expect to be an algorithm, but it's language understanding. When Claude reads your meeting transcript and sees "the credit auto-release job Anna mentioned," and the Existing Pages section contains `OTC - E-001 - Credit Auto-Release Job.md` with its frontmatter and summary, it recognizes these describe the same thing — the same way a human librarian would. The entity registry sharpens this: "O2C review with Anna" gets normalized to the canonical slugs `OTC` and `Anna Larsen`, so links always land on one canonical page name instead of a second spelling.

#### 3 — Hard rules force a minimum link topology

On top of semantic matching, the prompt (rules 4, 11, 12 in the script) makes certain links non-negotiable, so even a lazy extraction produces a connected graph:

- **Every page must contain at least one wikilink** — floating pages are forbidden; if Claude can't link a new page upward to a parent, it must append to an existing page instead of creating one.
- **Every Zone 02 page must link to its workstream page `[[OTC]]`** — this is why the workstream page acts as the hub node.
- **Type-specific mandatory links** — decisions link to the specs/developments they affect, issues to affected developments, patterns to every place they were observed, developments to the standards they follow.
- **For ABAP code, every referenced object** (tables, function modules, CDS views) becomes a `[[wikilink]]` in the Dependencies section — even if that page doesn't exist yet. These are intentional "forward links": Obsidian shows them as unresolved, and they auto-connect the moment someone ingests that object later.

#### 4 — The links are just text; resolution happens in Obsidian

Claude returns a JSON object of creates and updates with full markdown content; the script writes the files verbatim. A `[[wikilink]]` is only a filename reference. Nothing in the pipeline validates that the target exists — Obsidian (or any wiki renderer) resolves `[[OTC - E-001 - Credit Auto-Release Job]]` to the file with that name at view time. This is also why the strict naming rules matter so much: the link only works if the filename was generated deterministically from the same conventions.

> ⚠️ **One honest caveat worth knowing.**
> The context snapshot is truncated: 1,000 characters per existing page and 5,000 characters for the whole Existing Pages block (line 365), plus 2,000 for the index. Today with ~15 pages that's fine, but as the vault grows, Claude will see progressively less of each page — and eventually not all pages — which is when it might miss a sideways link or create a near-duplicate. At that point the design leans on `meta/index.md` and `meta/entities.md` staying tight (they're the compressed map), and on the monthly curation rhythm to merge anything that slips through. If link quality degrades later, raising that 5,000-character cap or switching to an index-first, read-pages-on-demand approach would be the fix.

---

## Misc · A plain-language tour of the whole system

### Can you explain the whole system in plain language, for someone who doesn't read code?

The easiest way to picture the vault is as a **company library with a robot librarian**: people drop documents into a mail slot, the librarian reads them, files the knowledge in the right shelves, and keeps a catalog of everything. (This is the same system described technically in [Part 0](#part-0--what-an-llm-wiki-actually-is) and built step by step in Phases 1–6; the two robot files below are what [Phase 5](#phase-5--build-the-ai-ingestion-pipeline) builds.)

> 💡 **Prefer a visual version?** This same story also exists as a standalone illustrated page — [The ABAP Knowledge Vault — How It Works](abap-vault-explainer.html) — which walks through the mail slot, the librarian, the four shelves, and the constitution one scene at a time. It's self-contained, so you can send the file directly to anyone.

#### The two "robot" files

- **`.github/workflows/abap-vault-ingest.yml` — the alarm bell.** This file doesn't do any thinking itself. It's a small set of instructions that tells GitHub: "whenever a new document lands in the inbox, wake up the librarian." It also rings the bell once a week (Monday mornings) as a safety net, in case something was missed, and it has a manual button you can press to trigger a run yourself. Once the librarian finishes, this file also handles saving all the changes back to the shared vault.
- **`.github/scripts/abap-ingest.py` — the librarian.** This is the worker that does the actual job when the bell rings. Step by step, it:
  1. Picks up each new document from the inbox
  2. Checks "have I already read this exact document?" (so nothing gets processed twice)
  3. Converts it to readable text — whether it's a Word doc, Excel sheet, meeting transcript, or even a photo of a whiteboard
  4. Reads the rulebook and the catalog so it knows what already exists in the vault
  5. Asks Claude to extract the durable knowledge and decide which pages to create or update
  6. Writes those pages to the right shelves, updates its admin records, and files the original away in the archive

#### The `meta/` folder — the librarian's desk

These five files are the librarian's admin records — not knowledge itself, but the bookkeeping that keeps the library orderly:

- **`index.md` — the catalog.** A table of contents for the whole vault: every page, organized by section, with a one-line description. If you want to find something, you start here.
- **`log.md` — the diary.** A running history of everything that was ever ingested: "On this date, I read this document and updated these pages." Nothing is ever erased from it. If you wonder when or why a page changed, the diary tells you.
- **`inbox.md` — the "already read" list.** A checklist of every document ever processed, with a fingerprint of its contents. This is how the librarian knows to skip a document someone accidentally drops twice — and to re-read one that was dropped again with changes.
- **`entities.md` — the name dictionary.** Teams call the same systems and workstreams by different names ("Order-to-Cash", "O2C", "OTC"). This file says which name is the official one, so the librarian never creates two folders for the same thing.
- **`conventions.md` — the house style guide.** A human-readable summary of the naming and formatting rules, for team members who want to understand how pages are named and organized.

#### The `raw/` folder — the mailroom

- **`raw/inbox/` — the mail slot.** This is the only door into the vault. Anyone on the team drops raw material here — meeting notes, specs, transcripts, code exports. Dropping a file here is what rings the alarm bell.
- **`raw/processed/` — the archive drawer.** After the librarian has read a document and extracted its knowledge, the original is moved here and kept forever. Nothing is thrown away, so you can always go back and check the original source. (If a document can't be read — say a corrupted file — it stays in the inbox with a note in the diary, so a human can deal with it.)

#### The knowledge itself — the four shelves

- **`01-standards/` — the rulebooks:** coding standards, architecture principles, system landscape. Rarely changes.
- **`02-workstreams/` — the active project work:** who's involved, what was decided, what's being built, open questions. Changes constantly.
- **`03-intelligence/` — the lessons:** things the team learned the hard way, written down so nobody pays for the same mistake twice.
- **`04-internal/` — team operations:** contacts, onboarding guides, step-by-step procedures.

#### And the constitution

**`CLAUDE.md`** — the rulebook the librarian must follow. It defines what counts as durable knowledge, how pages must be named, where each type of page lives, and how everything must link together. When the librarian reads a new document, this rulebook is what keeps the output consistent no matter who dropped the file or what it looked like.

> ✅ **The one-sentence summary for your audience.**
> Team members drop anything into a shared inbox; an AI librarian automatically reads it, extracts the decisions and knowledge worth keeping into a well-organized wiki, and keeps a full paper trail — so the team's knowledge survives even when people move on.

---

**Reusing this guide for future projects:** only Phase 2 (structure design) is real work the second time — everything else is copy, rename, and re-key. Consider keeping a `vault-template` repository with the skeleton, workflow, and script ready to fork.

Live implementation: [github.com/t-labs-buy/abap-wiki](https://github.com/t-labs-buy/abap-wiki). External references: [GitHub Contents API](https://docs.github.com/en/rest/repos/contents) · [Power Automate + SharePoint](https://learn.microsoft.com/en-us/power-automate/sharepoint-overview) · [Anthropic Console](https://console.anthropic.com) · [Obsidian](https://obsidian.md) · [Git](https://git-scm.com).
