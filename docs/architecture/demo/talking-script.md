# Talking Script — ABAP LLM Wiki Live Architecture Demo

A read-aloud script for presenting `docs/architecture/demo/index.html`. Written in
plain English so it lands with everyone in the room — business stakeholders,
managers, and developers alike.

**Total speaking time:** ~7–8 minutes at a relaxed pace.

---

## How to drive the demo while you talk

- Open the demo, click **⛶ Fullscreen**, and set **Speed to 0.4×–0.5×** so the
  animation matches your talking pace.
- The safest way to present: use the **⏭ Step** button instead of Play. Each
  press plays exactly one step and then freezes, so you can never fall behind
  the animation. The script below is numbered **Step 1–19** to match the
  step counter above the diagram.
- The **phase tag** (top right of the toolbar) always tells you which section
  of this script you're in.
- Step 11 triggers a long "committing files" animation (~30 seconds at 0.5×).
  That's your breathing room — the script gives you extra material there.
- If someone asks about a specific box, click it: a side panel opens with a
  plain-English description of that component.

---

## Opening — before you press anything (~45 seconds)

> What you're looking at is the entire architecture of our AI-maintained
> project wiki, drawn as a live map. Every box is a real system we use, and in
> a moment you'll watch one real document travel through all of them.
>
> First, the problem we're solving. On any project like ABAP, knowledge is
> scattered: meeting transcripts, PowerPoints, spec documents, email threads.
> Six weeks later, somebody asks "what did we decide about X?" — and the answer
> exists, but it's buried in a folder nobody wants to dig through.
>
> Our solution: a team member drops a document into a folder. That's it.
> That's their entire job. Everything else — reading the document, pulling out
> what matters, filing it onto the right wiki pages, keeping everything
> cross-linked — is done automatically by AI. And at the end, anyone can ask
> the wiki a question in plain English and get an answer with sources.
>
> Let me show you one document making that whole journey. Today's traveler is
> a meeting transcript from an Order-to-Cash workshop.

_Press **⏭ Step** (or Play)._

---

## Phase 1 of 6 — "Drop the document" (Step 1)

**Step 1 — Team member → OneDrive**

> Here's the only human step in the whole pipeline. A team member finishes a
> workshop and drops the transcript into a shared OneDrive folder — the same
> way they'd save any file. No special tools, no forms to fill in, no GitHub
> account needed. If you can drag a file into a folder, you can contribute to
> this wiki.

---

## Phase 2 of 6 — "Bridge to GitHub" (Steps 2–4)

**Step 2 — Power Automate ⇄ OneDrive**

> Within about a minute, a small Microsoft service called Power Automate
> notices the new file. Think of it as a courier who watches the mailbox:
> the moment something arrives, it picks the file up and reads its contents.

**Step 3 — Power Automate → GitHub**

> The courier now carries the file across to the other side of the house —
> from the Microsoft world into GitHub, which is where our wiki actually
> lives. GitHub is the system developers use to store code with a full change
> history; we're using it to store knowledge with a full change history.
>
> _(For the technical folks: this whole bridge is one authenticated HTTPS
> call — a single PUT to GitHub's Contents API. That's the only integration
> point between Microsoft 365 and GitHub in the entire system.)_

**Step 4 — Power Automate → OneDrive**

> Housekeeping: the courier moves the original file into a "sent" folder, so
> the inbox stays empty and the same document can never be delivered twice.

---

## Phase 3 of 6 — "The robot wakes up" (Steps 5–7)

**Step 5 — GitHub → GitHub Actions**

> Now something elegant happens. The act of the file landing in the
> repository _is_ the alarm bell. GitHub notices the change and automatically
> wakes up a worker — no scheduler polling every few minutes, no second
> integration to maintain. The delivery itself is the trigger.

**Step 6 — GitHub Actions → Ingest Script**

> GitHub spins up a fresh machine in the cloud, loads a copy of the wiki onto
> it, and starts our ingestion program. This machine exists for just a few
> minutes, does its job, and disappears — we don't run or maintain any
> servers for this.

**Step 7 — Ingest Script working**

> The program opens the PDF and extracts the text — fourteen pages in this
> case. It also checks its logbook: have we seen this exact file before? No —
> it's new, so we proceed. Duplicates get skipped automatically.

---

## Phase 4 of 6 — "Claude writes the wiki" (Steps 8–11)

**Step 8 — Ingest Script working**

> Before we hand the transcript to the AI, we give it a rulebook. There's a
> file in the wiki called the constitution — it tells the AI exactly how to
> behave: which sections of the wiki exist, how pages must be named, how to
> link them together, what counts as durable knowledge versus meeting chatter.
> The AI never freelances; it files things the way _we_ told it to.

**Step 9 — Ingest Script ⇄ Claude API**

> Now the actual intelligence. We send Claude — the AI model — three things:
> the rulebook, a map of what's already in the wiki, and the fourteen pages of
> transcript. Claude reads all of it the way a skilled librarian would, and
> sends back its filing decisions. In this run: update three existing pages,
> and create one brand-new page recording a decision the team made — the
> custom BAPI approach for Order-to-Cash.
>
> Notice what it did _not_ do: it didn't dump the transcript into the wiki.
> It extracted the knowledge that will still matter in six months and filed
> it where people will look for it.

**Step 10 — Ingest Script working**

> The program writes those pages into the wiki, adds a line to the run log
> so we can always see what happened and when, and archives the original
> transcript.

**Step 11 — Ingest Script → GitHub** _(the long file-transfer animation —
you have ~30 seconds here)_

> And now everything gets saved back to GitHub. You can see the individual
> files landing: the new decision page, the meeting summary, a pattern page
> about error handling, and the logbook entries.
>
> Here's why saving into GitHub matters, and this is the part I'd underline
> for anyone thinking about governance: every single change the AI makes is
> recorded, line by line, with a timestamp. Nothing is ever silently
> overwritten. If the AI ever gets something wrong, we can see exactly what
> changed and roll it back with one click. It's a full audit trail — the same
> discipline software teams use for code, applied to project knowledge.

---

## Phase 5 of 6 — "Sync to the team" (Steps 12–15)

**Step 12 — Local clone ⇄ GitHub**

> So the knowledge is filed. How does the team see it? Every team member has
> a copy of the wiki on their own laptop, and it quietly checks for updates
> every five minutes. Right now it's pulling down the new pages.

**Step 13 — Local clone → Obsidian**

> The team reads the wiki in a free app called Obsidian — think of it as a
> beautiful reading room for the knowledge base. Pages link to each other
> like Wikipedia, there's instant search, and there's even a visual graph
> showing how all the knowledge connects. The new decision page just
> appeared for everyone.

**Step 14 — Obsidian (curator check)**

> One honest and important point: we keep a human in the loop. A curator
> spends a couple of minutes skimming what the AI wrote. In this run, the AI
> got the facts right but misspelled one stakeholder's name — the curator
> fixes it. Two minutes of human review, not two hours of manual filing.
> That's the trade we're making.

**Step 15 — Local clone ⇄ GitHub**

> And the curator's fix flows back up automatically, so within five minutes
> everyone has the corrected version. Human corrections and AI updates travel
> through the exact same pipeline.

---

## Phase 6 of 6 — "Ask the wiki" (Steps 16–19)

**Step 16 — Team member → Claude Code**

> Fast-forward a few weeks. Someone — maybe someone who never attended that
> workshop — needs to know: "What did we decide about the custom BAPI
> approach?" Instead of hunting through folders or interrupting a colleague,
> they just ask the wiki that question, in plain English, using a tool called
> Claude Code.

**Step 17 — Claude Code ⇄ Local clone**

> The assistant doesn't guess and it doesn't search the internet. It reads
> the actual wiki pages on that person's machine — the decision page and the
> meeting notes linked to it.

**Step 18 — Claude Code ⇄ Claude API**

> Then it composes an answer from those pages — and it's required to cite
> its sources. Every claim in the answer points to the exact wiki page it
> came from.

**Step 19 — Claude Code → Team member**

> And there's the answer: "Approved on July 15th: the custom BAPI wrapper
> approach — see the Decision page." With a link to the page, which links to
> the meeting it came from.
>
> Look at the full loop we just watched: a file dropped in a folder became
> organized, cross-linked knowledge, and weeks later became a sourced answer
> to a question — with exactly two moments of human effort: dropping the file,
> and two minutes of review.

---

## Closing — after "Run completed" (~60 seconds)

> Three things I'd like you to take away.
>
> **First — the effort equation.** Contributing knowledge now costs the same
> as saving a file. All the expensive work — reading, summarizing, filing,
> linking — is automated. That's what makes this sustainable; wikis usually
> die because filing is a chore.
>
> **Second — trust.** Every AI change is version-controlled and auditable, a
> human curator reviews the output, and answers always come with citations
> you can check. This is AI with a paper trail, not a black box.
>
> **Third — the plumbing is thin.** For the technical audience: there's one
> integration point between Microsoft 365 and GitHub, one AI call per
> document, no servers to run, and every component here is standard —
> OneDrive, Power Automate, GitHub, Obsidian. If any piece needs replacing,
> it's a small swap, not a rebuild.
>
> Questions? I can click on any box in the diagram and show you what it does,
> or replay any step.

---

## Q&A cheat sheet

Likely questions and one-breath answers:

- **"What does it cost?"** — Claude is paid per document processed — for a
  transcript, a matter of cents. GitHub Actions minutes are free at our
  volume. No servers, no licenses beyond what we already have (M365).
- **"What if the AI writes something wrong?"** — Curator review catches it,
  Git history shows exactly what changed, and any page can be rolled back in
  one click. Corrections sync to everyone in five minutes.
- **"Is our data safe?"** — The repository is private, the AI call is
  authenticated with a secret key, and the query tool reads only the local
  copy of the wiki. Nothing is publicly exposed.
- **"What file types can we drop?"** — PDF, PowerPoint, Word, Excel, plain
  text, and meeting-transcript files (VTT). Anything readable as text.
- **"What if two people drop files at once?"** — Each file is processed
  independently; the pipeline dedups by file and rebases before pushing, so
  runs don't collide.
- **"Why GitHub and not SharePoint?"** — Version history on every line,
  a built-in trigger system (push events start the AI), and it's the format
  AI tools work with natively. SharePoint stays where it's good: the drop
  folder is OneDrive.
