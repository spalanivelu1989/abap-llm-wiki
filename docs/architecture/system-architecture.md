# ABAP LLM Wiki — System Architecture

Factual component-and-connection inventory of the ABAP knowledge vault ("LLM wiki"). One system, three planes: ingestion (documents in), storage (the vault), consumption (humans reading/querying).

## Components

| ID  | Component             | Type                            | Technology                                                                                                      | Responsibility                                                                                                                                                                                     |
| --- | --------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | OneDrive Inbox        | Cloud file folder               | SharePoint/OneDrive (`ABAP_Vault/Inbox`)                                                                        | Entry point where contributors drop raw documents (PDF, PPTX, DOCX, XLSX, TXT, VTT)                                                                                                                |
| C2  | Bridge Flow           | Automation flow                 | Power Automate (automated cloud flow)                                                                           | Watches C1; on new file, uploads it to C3's `raw/inbox/` via GitHub Contents API                                                                                                                   |
| C3  | abap-vault repository | Git repository (private)        | GitHub                                                                                                          | Single source of truth: wiki pages (Markdown), `CLAUDE.md` rulebook, `meta/` system files, `raw/` pipeline folders, workflow + script code                                                         |
| C4  | Ingest Workflow       | CI/CD workflow                  | GitHub Actions (`.github/workflows/abap-vault-ingest.yml`)                                                      | Orchestrates ingestion: checkout, run C5, commit and push results. Triggers: push to `raw/inbox/**`, weekly cron (Mon 07:00 UTC), manual dispatch                                                  |
| C5  | Ingest Script         | Python script                   | Python 3.11 (`.github/scripts/abap-ingest.py`; libs: anthropic, pdfplumber, python-pptx, python-docx, openpyxl) | Extracts text from each unprocessed inbox file, dedups against `meta/inbox.md`, calls C6 with `CLAUDE.md` rules, writes/updates vault pages, appends `meta/log.md`, moves file to `raw/processed/` |
| C6  | Claude API            | External AI service             | Anthropic API, model `claude-opus-4-8`                                                                          | Reads document text + vault context; returns page create/update instructions per the constitution                                                                                                  |
| C7  | Obsidian clients      | Desktop application (per user)  | Obsidian + Obsidian Git plugin                                                                                  | Read/edit local clone of C3; auto commit-pull-push every 5 minutes                                                                                                                                 |
| C8  | Claude Code           | Terminal application (per user) | Claude Code CLI (Node.js ≥ 18)                                                                                  | Natural-language Q&A over the local clone; reads `CLAUDE.md` for answer rules                                                                                                                      |
| C9  | Local clones          | Git working copies (per user)   | Git                                                                                                             | On-disk copy of C3 used by C7 and C8                                                                                                                                                               |

## Data stores (inside C3)

| ID  | Store                                                                               | Contents                                                                                                              |
| --- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| D1  | Zone folders `01-standards/`, `02-workstreams/`, `03-intelligence/`, `04-internal/` | Synthesized wiki pages (Markdown with YAML frontmatter, `[[wikilinks]]`)                                              |
| D2  | `raw/inbox/`                                                                        | Unprocessed source documents (transient)                                                                              |
| D3  | `raw/processed/`                                                                    | Archive of ingested source documents                                                                                  |
| D4  | `meta/`                                                                             | `index.md` (navigation), `log.md` (ingest history), `inbox.md` (dedup table), `entities.md` (canonical-name registry) |
| D5  | `CLAUDE.md`                                                                         | AI operating rules read by C5/C6 prompts and by C8                                                                    |

## Connections

| #   | From        | To         | Protocol / mechanism                                                                      | Trigger                                             | Payload                                                                                              | Auth                                         |
| --- | ----------- | ---------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| 1   | Contributor | C1         | OneDrive upload (browser/desktop sync)                                                    | Manual                                              | Raw document                                                                                         | M365 account                                 |
| 2   | C1          | C2         | SharePoint trigger "When a file is created (properties only)"                             | New file in C1                                      | File metadata, then content via "Get file content"                                                   | M365 connection                              |
| 3   | C2          | C3 (D2)    | HTTPS PUT `api.github.com/repos/<org>/abap-vault/contents/raw/inbox/<name>` (base64 body) | Flow run                                            | Document as base64 commit                                                                            | Fine-grained PAT (Contents: RW, repo-scoped) |
| 4   | C3          | C4         | GitHub Actions trigger                                                                    | Push touching `raw/inbox/**`; cron; manual dispatch | Repo checkout                                                                                        | `GITHUB_TOKEN` (contents: write)             |
| 5   | C4          | C5         | Process invocation on ubuntu-latest runner                                                | Workflow step                                       | Env: `ANTHROPIC_API_KEY`                                                                             | Repo secret `ANTHROPIC_API_KEY`              |
| 6   | C5          | C6         | HTTPS POST `api.anthropic.com/v1/messages`                                                | Per document (chunked for large files)              | Prompt = rules (D5) + vault index/context (D4) + extracted document text; response = page operations | API key                                      |
| 7   | C5          | C3 (D1–D4) | Local file writes; C4 commits and pushes (`git add/commit/pull --rebase/push`)            | End of run                                          | New/updated pages, log entry, dedup entry, file move D2→D3                                           | `GITHUB_TOKEN`                               |
| 8   | C9          | C3         | Git over HTTPS (pull/push), driven by C7's Obsidian Git plugin                            | Every 5 min + on startup                            | Commits both directions                                                                              | User PAT / GitHub login                      |
| 9   | C7          | C9         | Local filesystem read/write                                                               | User activity                                       | Markdown pages                                                                                       | —                                            |
| 10  | C8          | C9         | Local filesystem read (and optional writes following D5 rules)                            | User query                                          | Pages + `CLAUDE.md`                                                                                  | —                                            |
| 11  | C8          | C6         | HTTPS (Claude Code's own model access)                                                    | User query                                          | Question + retrieved page content; answer with page citations                                        | User's Claude Code auth                      |

## End-to-end flows

1. **Ingestion**: Contributor → C1 → (2) C2 → (3) D2 in C3 → (4) C4 → (5) C5 → (6) C6 → (7) pages in D1/D4, source archived D2→D3.
2. **Human sync**: C3 ⇄ (8) C9 ⇄ (9) C7 — edits made in Obsidian reach GitHub within 5 minutes; ingested pages reach every clone the same way.
3. **Query**: User → C8 → (10) C9 → (11) C6 → answer with citations to D1 pages.

## Trust boundaries & credentials

- **Microsoft 365 tenant** (C1, C2) ↔ **GitHub cloud** (C3, C4, C5): crossed only by connection 3, authenticated by a repo-scoped fine-grained PAT stored in the Power Automate flow.
- **GitHub cloud** ↔ **Anthropic** (C6): crossed only by connection 6, authenticated by the `ANTHROPIC_API_KEY` repository secret (never present in code or vault content).
- **User laptops** (C7, C8, C9) ↔ **GitHub cloud**: connection 8, per-user GitHub credentials.
- Concurrency: C4 uses a `vault-ingest` concurrency group (runs queue, never overlap); C7 conflict policy is merge with "ours" strategy.

## Constraints

- Only C5 (via C4) and human editors write to D1; contributors never write pages directly — all raw material enters through C1.
- C2's Contents API upload fails on duplicate filename in D2 and on files > ~40 MB.
- C6 costs ≈ $0.15–$0.60 per document (Opus 4.8: $5/M input, $25/M output tokens); capped by an Anthropic console spend limit.
- Pages are never deleted; lifecycle is managed via frontmatter `status` (active → archived).
