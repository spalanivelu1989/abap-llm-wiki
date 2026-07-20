# ABAP LLM Wiki — Setup Guide & Companion Docs

Documentation site for building an **AI-maintained knowledge vault** ("LLM wiki") for the ABAP project — a persistent, interlinked Markdown wiki that Claude keeps up to date automatically as teammates drop raw documents (transcripts, decks, specs) into a OneDrive folder.

The wiki itself lives at [github.com/t-labs-buy/abap-wiki](https://github.com/t-labs-buy/abap-wiki). This repository holds the guide that explains how to build and run it.

## What's inside

| Path                                       | Contents                                                                                                                                                                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`                               | The main setup guide — an eight-phase, start-to-finish walkthrough (GitHub repo → constitution → vault skeleton → Obsidian → AI ingestion pipeline → Power Automate bridge → Claude Code querying → team onboarding). |
| `pages/abap-vault-explainer.html`          | Plain-language explainer of how the knowledge vault works — the right link for stakeholders and non-technical teammates.                                                                                              |
| `pages/constitution.html`                  | Companion page on writing the `CLAUDE.md` constitution, with the entity reference and email template.                                                                                                                 |
| `pages/llm-wiki-implementation-plan.html`  | Implementation plan for building an LLM wiki from scratch.                                                                                                                                                            |
| `pages/abap-wiki-discovery-questions.html` | Discovery questions for the team before setup begins.                                                                                                                                                                 |
| `pages/sample-questions.html`              | Sample plain-English questions to ask the finished vault — doubles as a smoke test after each ingest.                                                                                                                 |
| `md/abap-llm-wiki-setup-guide.md`          | Markdown source of the main guide.                                                                                                                                                                                    |
| `docs/architecture/`                       | System architecture notes, PlantUML sources and rendered diagrams, plus an interactive React demo of the vault flow (`demo/`).                                                                                        |
| `images/power-automate/`                   | Screenshots used in Phase 6 (OneDrive → GitHub bridge via Power Automate).                                                                                                                                            |

## Viewing the guide

The pages are self-contained static HTML — open `index.html` directly in a browser, or serve the folder locally:

```sh
python3 -m http.server 8000
# then visit http://localhost:8000
```

## The system in one paragraph

A contributor drops a document into a shared OneDrive folder. Power Automate carries it into the wiki repo's `raw/inbox/` folder on GitHub, where a GitHub Actions job sends it to the Claude API. Claude — following the rulebook in `CLAUDE.md` — extracts the durable knowledge and files it onto the right wiki pages, with every change tracked in Git. The team reads the wiki in Obsidian (synced every few minutes) and queries it in plain English with Claude Code.

**Stack:** GitHub · GitHub Actions · Claude API · OneDrive · Power Automate · Obsidian · Claude Code

> 📖 The pattern comes from Andrej Karpathy's ["LLM Wiki" gist](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — worth reading for conceptual grounding.
