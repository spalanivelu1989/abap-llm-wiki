# System Architecture Diagram

This diagram shows the ABAP LLM Wiki's internal components across its three planes — ingestion (Microsoft 365), storage/automation (GitHub cloud), and consumption (team laptops) — and how it reaches its two external boundaries: **GitHub-hosted automation** and the **Claude API**.

## How the Microsoft world reaches GitHub — and how GitHub reaches Claude

The entire system hangs on one deliberately small bridge: a Power Automate flow performs a single authenticated **HTTPS PUT to GitHub's Contents API**, committing each dropped OneDrive file into the repo's `raw/inbox/` folder. That commit _is_ the trigger — GitHub's own push event starts the ingest workflow; there is no polling and no second integration. The only other outbound dependency is one HTTPS call from the ingest script to the **Claude API** (authenticated by a repository secret). Humans never touch this pipeline: they meet the wiki through ordinary Git sync (Obsidian) and local reads (Claude Code).

## Diagram

```mermaid
flowchart TD
    User(["Team member"])

    subgraph M365 ["Microsoft 365 tenant"]
        OD["OneDrive Inbox<br/>ABAP_Vault/Inbox"]
        PA["Power Automate<br/>bridge flow"]
    end

    subgraph GH ["GitHub cloud"]
        REPO[("abap-vault repository<br/>pages · CLAUDE.md · meta/ · raw/")]
        GHA["GitHub Actions<br/>ingest workflow"]
        PY["Ingest Script<br/>abap-ingest.py (Python 3.11)"]
    end

    subgraph LAPTOP ["Team laptop (per user)"]
        CLONE["Local clone<br/>Git working copy"]
        OBS["Obsidian<br/>+ Git plugin"]
        CC["Claude Code<br/>CLI"]
    end

    CLAUDE[["Claude API<br/>claude-opus-4-8"]]

    User -->|"file upload, M365 account"| OD
    OD -->|"'file created' trigger"| PA
    PA -->|"HTTPS PUT Contents API,<br/>fine-grained PAT"| REPO
    REPO -->|"push to raw/inbox/**<br/>triggers workflow"| GHA
    GHA -->|"checkout + run,<br/>GITHUB_TOKEN"| PY
    PY -->|"HTTPS POST /v1/messages,<br/>ANTHROPIC_API_KEY"| CLAUDE
    CLAUDE -.->|"page create/update<br/>instructions"| PY
    PY -->|"commit & push pages,<br/>log, archive"| REPO
    CLONE -->|"git push, every 5 min"| REPO
    REPO -.->|"git pull, every 5 min"| CLONE
    OBS -->|"read/edit pages"| CLONE
    CC -->|"read pages + CLAUDE.md"| CLONE
    CC -->|"HTTPS, user's Claude auth"| CLAUDE
    User -->|"plain-English question"| CC
    CC -.->|"answer with page citations"| User

    classDef external fill:#333,stroke:#999,color:#fff;
    class CLAUDE external;
```

**Reading the diagram:**

- Solid arrows = request/command direction; dashed = responses and pulled data.
- Dark boxes = external systems this app depends on but doesn't control (the Claude API).
- The cylinder is the Git repository — the single source of truth every other component reads from or writes to.
