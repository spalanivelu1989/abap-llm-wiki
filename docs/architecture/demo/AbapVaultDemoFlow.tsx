import React, { useState, useEffect, useRef } from "react";
import "./AbapVaultDemoFlow.css";

// ============================================================================
// ArchFlow DATA — regenerate this whole section per architecture.
// Everything below the "ArchFlow ENGINE" marker is proven, working code.
// Do not modify the engine; only touch it if a genuinely new interaction
// pattern is needed (and then port the fix back into the skill template).
// ============================================================================

// Canvas dimensions for the SVG stage. Compute from your node grid: take the
// bounding box of all NODES (max x + NW + margin, max y + NH + margin).
const STAGE_W = 1350;
const STAGE_H = 740;

// Node card size — keep these unless you have a strong reason to change them;
// the layout math below (bubble placement, arrow clipping) assumes this size.
const NW = 180;
const NH = 76;

// One entry per component in the architecture. `external: true` marks systems
// this application depends on but doesn't own (third-party APIs, legacy
// systems, SaaS) — they render as dashed cards, matching the "dark cloud"
// convention from the Mermaid/PlantUML diagrams.
//
// Optional `desc`: 1-2 sentences shown in the node inspector (the side panel
// that opens when a node card is clicked). Write it for every node — it's the
// "what is this component and why does it exist" line. The inspector also
// derives the node's connections and step appearances automatically from
// STEPS, so desc is the only extra authoring this feature needs.
//
// LAYOUT RULES (avoid overlap, leave room for chat bubbles):
//  - Arrange nodes in columns (pipeline stages) and rows (siblings at that
//    stage). Column gap >= 100px between card edges. Row gap >= 140px
//    between card edges — bubbles need ~95-100px of clearance above/below
//    a node and must not collide with the next row.
//  - Leave >= 100px of margin above the topmost row (bubbles above a
//    top-row node render at `node.y - 101`, which goes negative / off-canvas
//    if the node is any higher than y=110).
//  - STAGE_W / STAGE_H = bounding box of (x + NW) / (y + NH) across all
//    nodes, plus ~20-40px margin.
const NODES = {
  USER: { x: 20, y: 350, icon: "👩‍💻", title: "Team member", sub: "drops docs · asks questions", color: "#6366f1", desc: "A member of the ABAP team. The same person can contribute documents and, later, ask the wiki questions — no GitHub knowledge needed." },
  OD: { x: 300, y: 110, icon: "📥", title: "OneDrive Inbox", sub: "abap_wiki/inbox", color: "#0ea5e9", desc: "The drop folder in the flow owner's personal OneDrive for Business (abap_wiki/inbox). Dropping any document here (PDF, PPTX, DOCX, XLSX, TXT, VTT) is the only step contributors ever perform; picked-up files are archived to inbox/sent." },
  PA: { x: 580, y: 110, icon: "🔁", title: "Power Automate", sub: "bridge flow", color: "#0284c7", desc: "The 'ABAP Wiki Inbox to GitHub' cloud flow. It watches the inbox, ferries each new file into the GitHub repository via one authenticated Contents-API PUT — the single link between Microsoft 365 and GitHub — then moves the source file to inbox/sent as a picked-up marker." },
  REPO: { x: 860, y: 110, icon: "📚", title: "abap-wiki repo", sub: "GitHub · source of truth", color: "#f59e0b", desc: "The private GitHub repository (t-labs-buy/abap-wiki): wiki pages in zone folders, the CLAUDE.md rulebook, meta/ system files and the raw/ pipeline folders. Every change is version-controlled." },
  GHA: { x: 1140, y: 110, icon: "🤖", title: "GitHub Actions", sub: "ingest workflow", color: "#8b5cf6", desc: "The ingest workflow (abap-wiki-ingest.yml). A push into raw/inbox/ wakes it; it checks out the vault, runs the ingest script on a cloud runner and commits the results. A weekly cron acts as a safety net." },
  PY: { x: 1140, y: 330, icon: "🐍", title: "Ingest Script", sub: "abap-ingest.py", color: "#22c55e", desc: "Python 3.11 script. Extracts text from each document, dedups against meta/inbox.md, sends the content to Claude with the CLAUDE.md rules, writes the returned pages, logs the run and archives the source." },
  CLAUDE: { x: 1140, y: 550, icon: "✨", title: "Claude API", sub: "claude-opus-4-8", color: "#d97706", external: true, desc: "Anthropic's Claude API — the librarian. An external dependency, paid per use, authenticated with the ANTHROPIC_API_KEY repository secret. It is used only by the ingest script; questions never go through it, because Claude Code answers them itself." },
  CC: { x: 580, y: 550, icon: "💬", title: "Claude Code", sub: "/abap-wiki skill", color: "#ec4899", desc: "Claude Code running the /abap-wiki skill. The skill pulls the latest vault straight from GitHub, reads the CLAUDE.md rulebook and answers plain-English questions with citations to the exact wiki pages — nothing for the team to install or keep in sync." },
};

const center = (n) => ({ x: NODES[n].x + NW / 2, y: NODES[n].y + NH / 2 });

// One entry per interaction in the demo scenario. Design ONE realistic,
// concrete end-to-end flow through the architecture (e.g. "a user submits
// a request and it propagates through every layer") rather than an abstract
// tour of every possible edge. Group steps into phases (ph: 0, 1, 2, ...)
// that match PHASES below.
//
// Fields:
//   f, t     — node IDs (from NODES). f === t means a "self-working" step
//              (the node pulses in place, no traveling dot) — use for
//              internal processing with no network hop.
//   ph       — phase index (see PHASES)
//   k        — 'call' (control/hand-off, indigo), 'data' (response, teal),
//              or 'work' (self-working, amber) — purely cosmetic, drives
//              log-item and pulse color.
//   route    — short label shown in the activity log, e.g. "Frontend → API"
//   m        — one-sentence description of what this step represents
//   roundTrip — set true when this is a request/response pair traveling the
//              SAME edge in one step (asker asks, responder answers, ball
//              travels both ways). When true: set f = the RESPONDER (who
//              has the data), t = the ASKER (who initiates) — this reads
//              backwards but matches the engine's `asker = t; responder = f`
//              convention. chat[0] should still be the asker speaking first.
//   chat     — array of [nodeId, "line of dialogue"] tuples, revealed in
//              order as the step plays out. Keep lines short (< ~70 chars).
//
// IMPORTANT: every pair used with roundTrip: true MUST also be added to the
// BIDIRECTIONAL set below (pairKey-sorted, e.g. ['A','B'].sort().join('|')),
// or the return-arrow won't render.
const STEPS = [{ f: "USER", t: "OD", ph: 0, k: "call", route: "Team member → OneDrive", m: "A meeting transcript is dropped into the shared Inbox folder — the only step the contributor performs.", chat: [["USER", "Dropping today's OTC workshop transcript here."], ["OD", "File received in abap_wiki/inbox."]] },
  { f: "OD", t: "PA", ph: 1, k: "call", roundTrip: true, route: "Power Automate ⇄ OneDrive", m: "The bridge flow detects the new file and fetches its content.", chat: [["PA", "New file detected — give me its content."], ["OD", "Here you go: transcript.pdf, 2.4 MB."]] },
  { f: "PA", t: "REPO", ph: 1, k: "call", route: "Power Automate → GitHub", m: "One HTTPS PUT to the Contents API commits the file into raw/inbox/ (base64 body, URL-encoded filename, fine-grained PAT).", chat: [["PA", "PUT /contents/raw/inbox/transcript.pdf"], ["REPO", "Committed to raw/inbox/ — that is a push event."]] },
  { f: "PA", t: "OD", ph: 1, k: "call", route: "Power Automate → OneDrive", m: "The flow moves the source file to inbox/sent — a picked-up marker that can never re-trigger the flow, because the trigger watches only the inbox folder itself, not subfolders.", chat: [["PA", "Upload confirmed — moving transcript.pdf to inbox/sent."], ["OD", "Archived in inbox/sent. The inbox stays empty."]] },
  { f: "REPO", t: "GHA", ph: 2, k: "call", route: "GitHub → Actions", m: "The push touching raw/inbox/** triggers the ingest workflow — no polling, no second integration.", chat: [["REPO", "Push touched raw/inbox/** — wake the ingest workflow."], ["GHA", "Spinning up an ubuntu runner…"]] },
  { f: "GHA", t: "PY", ph: 2, k: "call", route: "Actions → Ingest Script", m: "The runner checks out the vault and runs abap-ingest.py with the ANTHROPIC_API_KEY secret in its environment.", chat: [["GHA", "Vault checked out. Run abap-ingest.py."], ["PY", "Scanning raw/inbox/ for unprocessed files…"]] },
  { f: "PY", t: "PY", ph: 2, k: "work", route: "Ingest Script", m: "Text is extracted with pdfplumber; the dedup table in meta/inbox.md confirms this file has never been processed.", chat: [["PY", "14 pages extracted. Not in the dedup table — this is new."]] },
  { f: "PY", t: "PY", ph: 3, k: "work", route: "Ingest Script", m: "The script loads the CLAUDE.md rulebook plus the vault index and entity registry as context for Claude.", chat: [["PY", "Loading CLAUDE.md rules + meta/index + entity registry…"]] },
  { f: "CLAUDE", t: "PY", ph: 3, k: "call", roundTrip: true, route: "Ingest Script ⇄ Claude API", m: "One HTTPS call: rules + vault context + document text go in; page create/update instructions come back.", chat: [["PY", "Here are the rules, the index and the transcript. File it."], ["CLAUDE", "3 page updates + 1 new decision page, per the constitution."]] },
  { f: "PY", t: "PY", ph: 3, k: "work", route: "Ingest Script", m: "Pages are written into the zones, meta/log.md gets an entry, and the source file moves to raw/processed/.", chat: [["PY", "Pages written. Log appended. Source archived."]] },
  { f: "PY", t: "REPO", ph: 3, k: "call", route: "Ingest Script → GitHub", m: "The workflow commits and pushes every change back to the vault — full history preserved.", chat: [["PY", "git add -A · commit · pull --rebase · push"], ["REPO", "Vault updated. Every change is in the history."]] },
  { f: "USER", t: "CC", ph: 4, k: "call", route: "Team member → Claude Code", m: "Weeks later, a teammate types /abap-wiki and asks the question in plain English instead of hunting through folders.", chat: [["USER", "/abap-wiki What did we decide about the custom BAPI approach?"], ["CC", "Syncing the vault, then I'll answer…"]] },
  { f: "REPO", t: "CC", ph: 4, k: "data", roundTrip: true, route: "Claude Code ⇄ GitHub", m: "The skill's first move is to pull the latest vault from GitHub — no local clone to keep in sync, so every answer is written against the current pages.", chat: [["CC", "Fetching the latest t-labs-buy/abap-wiki…"], ["REPO", "Up to date — including this morning's decision page."]] },
  { f: "CC", t: "CC", ph: 4, k: "work", route: "Claude Code", m: "It loads the CLAUDE.md rulebook and follows the [[wikilinks]] to the pages that matter — synthesized pages only, never raw files.", chat: [["CC", "CLAUDE.md loaded. Three pages match, joined by [[wikilinks]]."]] },
  { f: "CC", t: "CC", ph: 4, k: "work", route: "Claude Code", m: "Claude Code summarizes those pages itself — no extra service in the loop — and cites every claim.", chat: [["CC", "Answer drafted from the three pages, each claim cited."]] },
  { f: "CC", t: "USER", ph: 4, k: "data", route: "Claude Code → Team member", m: "The answer arrives with citations to the exact wiki pages it came from. The loop is closed.", chat: [["CC", "Approved 2026-07-15: custom BAPI wrapper — see the Decision page."], ["USER", "From a dropped file to a cited answer. No manual filing."]] }];

// One label per phase index used in STEPS. Shown in the toolbar's phase tag.
const PHASES = ["Drop the document", "Bridge to GitHub", "The robot wakes up", "Claude writes the wiki", "Ask the wiki"];

function buildPath(f, t) {
  const a = center(f);
  const b = center(t);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return `M ${a.x} ${a.y} C ${a.x + dx * 0.5} ${a.y}, ${b.x - dx * 0.5} ${
      b.y
    }, ${b.x} ${b.y}`;
  }
  return `M ${a.x} ${a.y} C ${a.x} ${a.y + dy * 0.5}, ${b.x} ${
    b.y - dy * 0.5
  }, ${b.x} ${b.y}`;
}
// NOTE: if two nodes are far apart with unrelated nodes sitting between them
// on the direct path, this S-curve will visually cross those nodes. Either
// reposition nodes so no edge needs to cross unrelated cards, or special-case
// that one pair with a manual arc (see the git history of docs/architecture
// examples for the "top arc" pattern used when a straight S-curve would
// cut through the middle of the diagram).

const pairKey = (a, b) => [a, b].sort().join("|");

// Derived per-node info for the click-to-open node inspector: every unique
// route label the node participates in, and every step index it appears at
// (rendered as clickable chips that jump the demo to that step).
function nodeInfo(id) {
  const routes = [];
  const stepIdxs = [];
  STEPS.forEach((s, i) => {
    if (s.f === id || s.t === id) {
      stepIdxs.push(i);
      if (routes.indexOf(s.route) === -1) routes.push(s.route);
    }
  });
  return { routes, stepIdxs };
}

// Same idea for the connection inspector (click a link on the stage): every
// route label and step index that travels this one edge. Drives the "what
// would break" list shown before a connection is removed.
function linkInfo(key) {
  const routes = [];
  const stepIdxs = [];
  STEPS.forEach((s, i) => {
    if (s.f !== s.t && pairKey(s.f, s.t) === key) {
      stepIdxs.push(i);
      if (routes.indexOf(s.route) === -1) routes.push(s.route);
    }
  });
  return { routes, stepIdxs };
}

// Pairs that need arrowheads on BOTH ends because the flow is a
// request/response round-trip along one edge, not two distinct steps.
// Must exactly match every pairKey(f, t) used with roundTrip: true above.
const BIDIRECTIONAL = new Set(["OD|PA", "CLAUDE|PY", "CC|REPO"]);

// OPTIONAL: dramatize one "persistence save" step (file-transfer console +
// flying particles) — nice for a moment like "the run is written to the
// database." Set DB_INGEST_TO to null to disable this entirely; that's the
// right default unless your scenario has one obvious "everything lands
// here" step. When enabled, DB_INGEST_FROM/TO must match the f/t of exactly
// one non-roundTrip STEPS entry.
const DB_INGEST_FROM = "PY"; // node id, e.g. 'API', or null
const DB_INGEST_TO = "REPO"; // node id, e.g. 'DB', or null
const DB_INGEST_ICON = "🐍 ➔ 📚"; // e.g. '🖥️ ➔ 🗄️'
const DB_INGEST_TITLE = "Committing vault updates to GitHub…"; // e.g. 'Saving run to PostgreSQL...'
const DB_INGEST_FILES = [{ name: "Decision - OTC Custom BAPI.md", size: "4 KB" }, { name: "Meeting - OTC Workshop.md", size: "6 KB" }, { name: "Pattern - IDoc error handling.md", size: "3 KB" }, { name: "meta/log.md", size: "1 KB" }, { name: "meta/inbox.md", size: "1 KB" }, { name: "transcript.pdf → processed/", size: "2.4 MB" }]; // [{name,size}, ...] cosmetic file list
// Place the console in genuinely empty canvas space near DB_INGEST_TO — check
// your NODES layout for a gap, don't just guess.
const DB_INGEST_CONSOLE_X = 640;
const DB_INGEST_CONSOLE_Y = 190;
// Particle path: start near the bottom/edge of DB_INGEST_FROM's card, end
// near the top/edge of DB_INGEST_TO's card.
const DB_INGEST_PARTICLE_PATH = {
  startX: 1120,
  startY: 360,
  endX: 1000,
  endY: 195,
};

const TITLE = "ABAP LLM Wiki — Live Architecture Demo";
const SUBTITLE = "One meeting transcript travels from a OneDrive drop to a cited answer in Claude Code.";

// ============================================================================
// ArchFlow ENGINE — do not modify below this line.
// ============================================================================

// Dragged node positions persist per demo (keyed by TITLE) so a decluttered
// layout survives reloads — but only once the viewer commits them with the
// 💾 Save layout button, so a reload always returns to the last saved (or
// authored) arrangement. Storage can be unavailable or stale (private mode,
// cleared NODES entries), so everything is best-effort: failures fall back to
// the authored layout.
const LAYOUT_KEY = "archflow-layout:" + TITLE;
(function loadLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY)) || {};
    Object.keys(saved).forEach((id) => {
      if (
        NODES[id] &&
        typeof saved[id].x === "number" &&
        typeof saved[id].y === "number"
      ) {
        NODES[id].x = Math.max(4, Math.min(STAGE_W - NW - 4, saved[id].x));
        NODES[id].y = Math.max(4, Math.min(STAGE_H - NH - 4, saved[id].y));
      }
    });
  } catch (e) {
    /* keep authored layout */
  }
})();
function saveLayout() {
  try {
    const pos = {};
    Object.keys(NODES).forEach((id) => {
      pos[id] = { x: NODES[id].x, y: NODES[id].y };
    });
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(pos));
  } catch (e) {
    /* storage unavailable — layout just won't persist */
  }
}

// Removed connections ("what breaks if this link goes away?"). The set holds
// pairKeys; it is the single source of truth for both the severed styling on
// the stage and the blocked-step behaviour during a run. Persisted per demo
// like the layout, and best-effort for the same reasons.
const LINKS_KEY = "archflow-removed-links:" + TITLE;
const REMOVED_LINKS = new Set();
(function loadRemovedLinks() {
  try {
    const saved = JSON.parse(localStorage.getItem(LINKS_KEY)) || [];
    saved.forEach((k) => {
      const ends = String(k).split("|");
      if (NODES[ends[0]] && NODES[ends[1]]) REMOVED_LINKS.add(k);
    });
  } catch (e) {
    /* every link stays connected */
  }
})();
function saveRemovedLinks() {
  try {
    localStorage.setItem(LINKS_KEY, JSON.stringify(Array.from(REMOVED_LINKS)));
  } catch (e) {
    /* storage unavailable — removals just won't persist */
  }
}
// Self-working steps (f === t) never travel a link, so they can't be blocked.
const isLinkRemoved = (f, t) => f !== t && REMOVED_LINKS.has(pairKey(f, t));

// Who *starts* a step. For roundTrip steps the engine's convention is
// f = responder, t = asker, so the initiator is t — get this wrong and every
// round-trip looks unreachable the moment anything upstream is cut.
const stepInitiator = (s) => (s.roundTrip ? s.t : s.f);

// Nodes that can start a flow on their own: the first time they appear in
// STEPS, they appear as an initiator, so nothing upstream ever handed to
// them. Usually just the entry point, but a demo may legitimately have a
// later cold start (a scheduler firing in phase 4) — seeding those keeps
// them running when an unrelated link is cut.
const ORIGINS = new Set();
(function computeOrigins() {
  const seen = new Set();
  STEPS.forEach((s) => {
    if (!seen.has(stepInitiator(s))) ORIGINS.add(stepInitiator(s));
    seen.add(s.f);
    seen.add(s.t);
  });
})();

// Every step's status for the CURRENT set of removed links:
//   'ok'          — runs normally
//   'blocked'     — its own link was cut
//   'unreachable' — nothing ever reached its initiator, because an upstream
//                   step was blocked (or itself unreachable)
// Pure and order-independent, so an animated run and a scrubber jump always
// agree. addKey / dropKey answer the hypothetical "what if this one link
// were also cut / put back?" for the connection inspector's impact line.
function computeStatuses(addKey, dropKey) {
  const reached = new Set(ORIGINS);
  // Nodes an earlier step failed to deliver to. A poller reading from a
  // starved node gets nothing, so it can't restart the flow — without this,
  // cutting "user uploads to OneDrive" left the scheduled Power Automate
  // poll (an ORIGIN, since it first appears as a round-trip asker) happily
  // picking up a file that never arrived, and the whole pipeline ran on.
  const starved = new Set();
  return STEPS.map((s) => {
    const key = s.f !== s.t ? pairKey(s.f, s.t) : null;
    const removed =
      !!key && key !== dropKey && (REMOVED_LINKS.has(key) || key === addKey);
    const initiator = stepInitiator(s);
    // For a round-trip, f is the responder being read from. A node that has
    // simply never been touched yet is fine (the first query to a database);
    // only one that was *supposed* to have been fed counts as starved.
    const readsStarved = s.roundTrip && starved.has(s.f);
    if (removed || readsStarved || !reached.has(initiator)) {
      // The request dies here. The initiator is no longer carrying a live
      // flow, so every later step it would have started is stranded too, and
      // whatever this step was meant to deliver never arrives.
      reached.delete(initiator);
      starved.add(s.t);
      return removed ? "blocked" : "unreachable";
    }
    reached.add(s.f);
    reached.add(s.t);
    starved.delete(s.t);
    return "ok";
  });
}

// Cached because it is read once per log entry; invalidated on every
// remove/restore.
let STATUS_CACHE = null;
function stepStatuses() {
  if (!STATUS_CACHE) STATUS_CACHE = computeStatuses();
  return STATUS_CACHE;
}
function invalidateStatuses() {
  STATUS_CACHE = null;
}

export function AbapVaultDemoFlow() {
  const [theme, setTheme] = useState("light");
  const [speed, setSpeed] = useState(0.5);
  const [isPlaying, setIsPlaying] = useState(false);
  const [phaseText, setPhaseText] = useState("Ready");
  const [isDoneDisabled, setIsDoneDisabled] = useState(false);
  // progress mirrors idxRef into React state so the scrubber / step counter /
  // button labels re-render as the run advances.
  const [progress, setProgress] = useState(-1);
  // Node inspector: id of the clicked node, or null when closed.
  const [inspected, setInspected] = useState(null);
  // Connection inspector: pairKey of the clicked link, or null when closed.
  const [selectedLink, setSelectedLink] = useState(null);
  // Bumped on every remove/restore so the JSX (which reads REMOVED_LINKS
  // directly) re-renders and the link-visual effect re-runs.
  const [linkVersion, setLinkVersion] = useState(0);

  const stageRef = useRef(null);
  const logRef = useRef(null);
  const scrubTrackRef = useRef(null);

  const playingRef = useRef(false);
  const idxRef = useRef(-1);
  const speedRef = useRef(0.5);
  const animRef = useRef(null);
  // True while a ⏭ Step single-step animation runs — jumpTo must not fire
  // then (DOM log-item listeners bypass the disabled-button guards).
  const ffRef = useRef(false);
  // Node cards have been dragged since the last save (enables 💾 Save
  // layout); flips to a "Saved" confirmation for a moment after saving.
  const [layoutDirty, setLayoutDirty] = useState(false);
  const [layoutSaved, setLayoutSaved] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch((err) => console.error(err));
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () =>
      setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    Object.keys(nodeElsRef.current).forEach((id) =>
      nodeElsRef.current[id].classList.toggle("inspected", id === inspected),
    );
  }, [inspected]);

  const edgesRef = useRef({});
  const nodeElsRef = useRef({});
  const pulseRef = useRef(null);
  const allArrowsRef = useRef([]);
  const bubbleLayerRef = useRef(null);
  const bubbleElsRef = useRef([]);
  const dbParticlesGroupRef = useRef(null);
  const pgConsoleFORef = useRef(null);

  const BASE = 2400; // base step duration in ms

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);
  useEffect(
    () => () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    },
    [],
  );

  useEffect(() => {
    if (!stageRef.current) return;
    stageRef.current.innerHTML = "";

    const SVGNS = "http://www.w3.org/2000/svg";
    const el = (tag, attrs, text) => {
      const e = document.createElementNS(SVGNS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      if (text !== undefined && text !== null) e.textContent = text;
      return e;
    };

    const edges = {};
    const directed = new Set();

    STEPS.forEach((s) => {
      if (s.f !== s.t) {
        directed.add(s.f + ">" + s.t);
        const key = pairKey(s.f, s.t);
        if (!edges[key])
          edges[key] = { from: s.f, to: s.t, d: buildPath(s.f, s.t) };
      }
    });

    const edgeLayer = el("g", {});
    stageRef.current.appendChild(edgeLayer);
    // Transparent wide twins of every edge, so a link can actually be
    // clicked; and the ✕ markers drawn over removed links. Both layers sit
    // BELOW the node groups (appended later), so a node card always wins a
    // click where the two overlap.
    const hitLayer = el("g", {});
    stageRef.current.appendChild(hitLayer);
    const cutLayer = el("g", {});
    stageRef.current.appendChild(cutLayer);

    const edgesCached = {};
    Object.keys(edges).forEach((key) => {
      const e = edges[key];
      const p = el("path", { d: e.d, class: "edge dashed" });
      edgeLayer.appendChild(p);

      const hit = el("path", { d: e.d, class: "edge-hit" });
      hit.appendChild(
        el(
          "title",
          {},
          NODES[e.from].title +
            " ⇄ " +
            NODES[e.to].title +
            " — click to inspect or remove this connection",
        ),
      );
      hit.addEventListener("click", (ev) => {
        ev.stopPropagation();
        setInspected(null);
        setSelectedLink((prev) => (prev === key ? null : key));
      });
      hitLayer.appendChild(hit);

      const cut = el("text", { class: "edge-cut", x: 0, y: 0 }, "✕");
      cut.style.display = "none";
      cutLayer.appendChild(cut);

      edgesCached[key] = {
        el: p,
        hit,
        cut,
        from: e.from,
        to: e.to,
        len: p.getTotalLength(),
        arrows: {},
      };
    });
    edgesRef.current = edgesCached;

    const arrowLayer = el("g", {});
    stageRef.current.appendChild(arrowLayer);
    const allArrows = [];

    const norm = (x, y) => {
      const d = Math.hypot(x, y) || 1;
      return { x: x / d, y: y / d };
    };
    const insideCard = (p, n, pad) =>
      p.x >= n.x - pad &&
      p.x <= n.x + NW + pad &&
      p.y >= n.y - pad &&
      p.y <= n.y + NH + pad;

    const arrowPoints = (path, len, n, side) => {
      const STEP = 1;
      const OVERLAP = 2.5;
      let edgeL = 0;
      let tip = { x: 0, y: 0 };
      let dir = { x: 0, y: 0 };

      if (side === "to") {
        edgeL = 0;
        for (let q = len; q >= 0; q -= STEP) {
          if (!insideCard(path.getPointAtLength(q), n, 0)) {
            edgeL = q;
            break;
          }
        }
        const onEdge = path.getPointAtLength(edgeL);
        const ahead = path.getPointAtLength(Math.min(len, edgeL + 8));
        dir = norm(ahead.x - onEdge.x, ahead.y - onEdge.y);
        tip = { x: onEdge.x + dir.x * OVERLAP, y: onEdge.y + dir.y * OVERLAP };
      } else {
        edgeL = len;
        for (let q = 0; q <= len; q += STEP) {
          if (!insideCard(path.getPointAtLength(q), n, 0)) {
            edgeL = q;
            break;
          }
        }
        const onEdge = path.getPointAtLength(edgeL);
        const back = path.getPointAtLength(Math.max(0, edgeL - 8));
        dir = norm(back.x - onEdge.x, back.y - onEdge.y);
        tip = { x: onEdge.x + dir.x * OVERLAP, y: onEdge.y + dir.y * OVERLAP };
      }

      const size = 7;
      const half = 4;
      const nx = -dir.y;
      const ny = dir.x;
      const bx = tip.x - dir.x * size;
      const by = tip.y - dir.y * size;
      return `${tip.x.toFixed(1)},${tip.y.toFixed(1)} ${(
        bx +
        nx * half
      ).toFixed(1)},${(by + ny * half).toFixed(1)} ${(bx - nx * half).toFixed(
        1,
      )},${(by - ny * half).toFixed(1)}`;
    };

    const makeArrow = (path, len, n, side) => {
      const poly = el("polygon", {
        points: arrowPoints(path, len, n, side),
        class: "arrow",
      });
      arrowLayer.appendChild(poly);
      allArrows.push(poly);
      return poly;
    };

    Object.keys(edgesRef.current).forEach((key) => {
      const e = edgesRef.current[key];
      const nodesTo = NODES[e.to];
      const nodesFrom = NODES[e.from];
      e.arrows[e.to] = makeArrow(e.el, e.len, nodesTo, "to");
      if (
        directed.has(e.to + ">" + e.from) ||
        BIDIRECTIONAL.has(pairKey(e.from, e.to))
      ) {
        e.arrows[e.from] = makeArrow(e.el, e.len, nodesFrom, "from");
      }
    });
    allArrowsRef.current = allArrows;

    const pulse = el("circle", {
      r: 5.5,
      class: "pulse",
      cx: -100,
      cy: -100,
      opacity: 0,
    });
    pulseRef.current = pulse;

    // Node dragging: NODES coords update live and every edge touching the
    // node (path + both arrowheads) is rebuilt each move, so links stay
    // attached while the user pulls cards apart to declutter overlapping
    // edges. A small movement threshold keeps a plain click still opening
    // the inspector.
    const svg = stageRef.current;
    const toSvgPoint = (evt) => {
      const pt = svg.createSVGPoint();
      pt.x = evt.clientX;
      pt.y = evt.clientY;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    };
    const refreshEdgesFor = (nodeId) => {
      Object.values(edgesRef.current).forEach((e) => {
        if (e.from !== nodeId && e.to !== nodeId) return;
        e.el.setAttribute("d", buildPath(e.from, e.to));
        e.len = e.el.getTotalLength();
        if (e.hit) e.hit.setAttribute("d", e.el.getAttribute("d"));
        if (e.cut) {
          const mid = e.el.getPointAtLength(e.len / 2);
          e.cut.setAttribute("x", String(mid.x));
          e.cut.setAttribute("y", String(mid.y));
        }
        Object.keys(e.arrows).forEach((endId) => {
          e.arrows[endId].setAttribute(
            "points",
            arrowPoints(
              e.el,
              e.len,
              NODES[endId],
              endId === e.to ? "to" : "from",
            ),
          );
        });
      });
    };
    const basePos = {};
    const dragState = { id: null, suppressClick: false };

    const nodeEls = {};
    Object.keys(NODES).forEach((id) => {
      const n = NODES[id];
      const g = el("g", {
        class: "node" + (n.external ? " external" : ""),
        "data-id": id,
      });
      g.appendChild(
        el("rect", {
          class: "node-card",
          x: n.x,
          y: n.y,
          width: NW,
          height: NH,
          rx: 12,
        }),
      );
      g.appendChild(
        el("circle", { cx: n.x + 30, cy: n.y + NH / 2, r: 19, fill: n.color }),
      );
      g.appendChild(
        el(
          "text",
          { class: "node-icon", x: n.x + 30, y: n.y + NH / 2 + 1 },
          n.icon,
        ),
      );
      g.appendChild(
        el("text", { class: "node-title", x: n.x + 58, y: n.y + 31 }, n.title),
      );
      g.appendChild(
        el("text", { class: "node-sub", x: n.x + 58, y: n.y + 50 }, n.sub),
      );
      g.addEventListener("click", () => {
        if (dragState.suppressClick) return;
        setSelectedLink(null);
        setInspected((prev) => (prev === id ? null : id));
      });
      basePos[id] = { x: n.x, y: n.y };
      g.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        const p = toSvgPoint(e);
        dragState.id = id;
        dragState.suppressClick = false;
        dragState.px = p.x;
        dragState.py = p.y;
        dragState.nx = n.x;
        dragState.ny = n.y;
        g.setPointerCapture(e.pointerId);
      });
      g.addEventListener("pointermove", (e) => {
        if (dragState.id !== id) return;
        const p = toSvgPoint(e);
        const dx = p.x - dragState.px;
        const dy = p.y - dragState.py;
        if (!dragState.suppressClick && Math.hypot(dx, dy) < 3) return;
        dragState.suppressClick = true;
        g.classList.add("dragging");
        n.x = Math.max(4, Math.min(STAGE_W - NW - 4, dragState.nx + dx));
        n.y = Math.max(4, Math.min(STAGE_H - NH - 4, dragState.ny + dy));
        g.style.setProperty("--drag-x", n.x - basePos[id].x + "px");
        g.style.setProperty("--drag-y", n.y - basePos[id].y + "px");
        refreshEdgesFor(id);
      });
      const endDrag = () => {
        if (dragState.id !== id) return;
        dragState.id = null;
        g.classList.remove("dragging");
        // Dragging is deliberately NOT persisted here — the 💾 Save layout
        // button is what commits it, so a viewer can shove cards around to
        // read a busy diagram and reload to get the saved layout back.
        if (dragState.suppressClick) setLayoutDirty(true);
      };
      g.addEventListener("pointerup", endDrag);
      g.addEventListener("pointercancel", endDrag);
      stageRef.current.appendChild(g);
      nodeEls[id] = g;
    });
    nodeElsRef.current = nodeEls;

    stageRef.current.appendChild(pulse);

    const bubbleLayer = el("g", {});
    stageRef.current.appendChild(bubbleLayer);
    bubbleLayerRef.current = bubbleLayer;

    const dbParticlesGroup = el("g", { id: "dbParticlesGroup" });
    stageRef.current.appendChild(dbParticlesGroup);
    dbParticlesGroupRef.current = dbParticlesGroup;

    // OPTIONAL persistence-save flourish (file-transfer console + flying
    // particles). Wire DB_INGEST_FROM/DB_INGEST_TO/DB_INGEST_FILES below to
    // enable it for a "save to storage" step, or leave DB_INGEST_TO empty
    // (see DATA section note) to skip this block entirely — the generic
    // step animation still works fine without it.
    if (DB_INGEST_TO) {
      const pgConsoleFO = el("foreignObject", {
        id: "pgConsoleFO",
        x: DB_INGEST_CONSOLE_X,
        y: DB_INGEST_CONSOLE_Y,
        width: 255,
        height: 155,
        style: "display: none;",
      });
      const consoleDiv = document.createElement("div");
      consoleDiv.className = "transfer-modal";
      consoleDiv.innerHTML = `
        <div class="transfer-header">
          <span class="transfer-icon">${DB_INGEST_ICON}</span>
          <span class="transfer-title">${DB_INGEST_TITLE}</span>
          <span class="transfer-pct" id="transferPct">0%</span>
        </div>
        <div class="transfer-progress-container">
          <div class="transfer-progress-bar" id="transferProgressBar"></div>
        </div>
        <div class="transfer-stats">
          <div class="transfer-stat">Records: <span id="transferFiles">0 / ${DB_INGEST_FILES.length}</span></div>
          <div class="transfer-stat">Rate: <span id="transferRate">45.8 KB/s</span></div>
          <div class="transfer-stat">Time Left: <span id="transferTimeLeft">15s</span></div>
        </div>
        <div class="transfer-log" id="transferLog"></div>
      `;
      pgConsoleFO.appendChild(consoleDiv);
      stageRef.current.appendChild(pgConsoleFO);
      pgConsoleFORef.current = pgConsoleFO;
    }

    resetAnimation(false);
  }, []);

  // Paint selection + severed styling from the current REMOVED_LINKS set.
  // Declared AFTER the build effect on purpose: effects run in declaration
  // order, and this one needs the edges to exist (a demo reloaded with
  // removals already in storage must show them severed on first paint).
  useEffect(() => {
    Object.keys(edgesRef.current).forEach((key) => {
      const e = edgesRef.current[key];
      const off = REMOVED_LINKS.has(key);
      e.el.classList.toggle("removed", off);
      e.el.classList.toggle("selected", key === selectedLink);
      Object.values(e.arrows).forEach((a) =>
        a.classList.toggle("removed", off),
      );
      if (e.cut) {
        const mid = e.el.getPointAtLength(e.len / 2);
        e.cut.setAttribute("x", String(mid.x));
        e.cut.setAttribute("y", String(mid.y));
        e.cut.style.display = off ? "" : "none";
      }
    });
  }, [selectedLink, linkVersion]);

  // Remove / restore one connection. The demo is re-rendered at the current
  // step so the consequence is immediately visible: steps that need the link
  // turn into blocked entries in the activity log (and vice versa).
  function toggleLink(key) {
    if (!key) return;
    if (REMOVED_LINKS.has(key)) REMOVED_LINKS.delete(key);
    else REMOVED_LINKS.add(key);
    saveRemovedLinks();
    invalidateStatuses();
    setLinkVersion((v) => v + 1);
    jumpTo(idxRef.current);
  }

  function restoreAllLinks() {
    if (REMOVED_LINKS.size === 0) return;
    REMOVED_LINKS.clear();
    saveRemovedLinks();
    invalidateStatuses();
    setLinkVersion((v) => v + 1);
    jumpTo(idxRef.current);
  }

  function clearActive() {
    Object.values(edgesRef.current).forEach((e) =>
      e.el.classList.remove(
        "active",
        "flow",
        "call",
        "data",
        "flow-reverse",
        "blocked-flash",
      ),
    );
    Object.values(nodeElsRef.current).forEach((g) =>
      g.classList.remove("active", "working", "db-ingesting", "blocked"),
    );
    if (pulseRef.current) pulseRef.current.setAttribute("opacity", "0");
    allArrowsRef.current.forEach((a) => a.classList.remove("blink"));
    clearBubbles();
    if (pgConsoleFORef.current) {
      pgConsoleFORef.current.style.display = "none";
      const innerConsole =
        pgConsoleFORef.current.querySelector(".transfer-modal");
      if (innerConsole) innerConsole.classList.remove("show");
    }
    if (dbParticlesGroupRef.current) dbParticlesGroupRef.current.innerHTML = "";
  }

  function clearBubbles() {
    while (bubbleElsRef.current.length > 0) {
      const fo = bubbleElsRef.current.pop();
      if (fo && bubbleLayerRef.current) bubbleLayerRef.current.removeChild(fo);
    }
  }

  function addBubble(nodeId, text) {
    const n = NODES[nodeId];
    if (!n || !bubbleLayerRef.current) return;

    const top = n.y < STAGE_H / 2;
    const W = 200;
    const foH = top ? 95 : 85;
    let bx = n.x + NW / 2 - W / 2;
    bx = Math.max(8, Math.min(bx, STAGE_W - W - 8));
    const by = top ? n.y - 101 : n.y + NH + 4;

    const fo = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "foreignObject",
    );
    fo.setAttribute("x", String(bx));
    fo.setAttribute("y", String(by));
    fo.setAttribute("width", String(W));
    fo.setAttribute("height", String(foH));

    const wrap = document.createElement("div");
    wrap.className = "bubble-wrap " + (top ? "above" : "below");
    const b = document.createElement("div");
    b.className = "bubble " + (top ? "tail-down" : "tail-up");
    const who = document.createElement("span");
    who.className = "bubble-who";
    who.textContent = NODES[nodeId].title;
    b.appendChild(who);
    b.appendChild(document.createTextNode(text));
    wrap.appendChild(b);
    fo.appendChild(wrap);

    bubbleLayerRef.current.appendChild(fo);
    bubbleElsRef.current.push(fo);
  }

  function blinkArrow(edge, destId) {
    const a = edge.arrows[destId];
    if (!a) return;
    a.classList.remove("blink");
    void a.getBBox();
    a.classList.add("blink");
  }

  function travelBall(edge, srcId, dstId, kind, travelMs) {
    return new Promise((res) => {
      const forward = edge.from === srcId;
      edge.el.classList.remove("call", "data", "flow-reverse");
      edge.el.classList.add(kind);
      if (!forward) edge.el.classList.add("flow-reverse");
      if (pulseRef.current) {
        pulseRef.current.setAttribute(
          "class",
          "pulse " + (kind === "data" ? "data" : "call"),
        );
        pulseRef.current.setAttribute("opacity", "1");
      }
      const t0 = performance.now();
      const tick = (now) => {
        let p = (now - t0) / travelMs;
        if (p > 1) p = 1;
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const t = forward ? eased : 1 - eased;
        const pt = edge.el.getPointAtLength(edge.len * t);
        if (pulseRef.current) {
          pulseRef.current.setAttribute("cx", String(pt.x));
          pulseRef.current.setAttribute("cy", String(pt.y));
        }
        if (p >= 1) res();
        else animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
    });
  }

  function waitMs(ms) {
    return new Promise((res) => {
      const t0 = performance.now();
      const tick = (now) => {
        if (now - t0 >= ms) res();
        else animRef.current = requestAnimationFrame(tick);
      };
      animRef.current = requestAnimationFrame(tick);
    });
  }

  function addLog(i) {
    if (!logRef.current) return;
    const s = STEPS[i];
    logRef.current
      .querySelectorAll(".log-item.cur")
      .forEach((n) => n.classList.remove("cur"));
    const item = document.createElement("div");
    const st = stepStatuses()[i];
    const note =
      st === "blocked"
        ? '<span class="log-blocked">blocked — connection removed</span>'
        : st === "unreachable"
          ? '<span class="log-skipped">skipped — never reached</span>'
          : "";
    const num = st === "blocked" ? "✕" : st === "unreachable" ? "–" : i + 1;
    item.className = "log-item cur " + s.k + (st === "ok" ? "" : " " + st);
    item.innerHTML = `
      <div class="log-num">${num}</div>
      <div class="log-body">
        <span class="log-route">${s.route}</span>
        ${note}
        ${s.m}
      </div>
    `;
    item.title = "Jump to this step";
    item.addEventListener("click", () => jumpTo(i));
    logRef.current.appendChild(item);
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }

  function markDone(id) {
    const node = nodeElsRef.current[id];
    if (node) node.classList.add("done");
  }

  function triggerDbIngestAnimation(currentSpeed) {
    return new Promise((resolveAnimation) => {
      const dbNode = nodeElsRef.current[DB_INGEST_TO];
      if (dbNode) dbNode.classList.add("db-ingesting");

      if (pgConsoleFORef.current) {
        pgConsoleFORef.current.style.display = "block";
        pgConsoleFORef.current.getBoundingClientRect();
        const innerConsole =
          pgConsoleFORef.current.querySelector(".transfer-modal");
        if (innerConsole) innerConsole.classList.add("show");
      }

      const pctEl = document.getElementById("transferPct");
      const barEl = document.getElementById("transferProgressBar");
      const filesEl = document.getElementById("transferFiles");
      const rateEl = document.getElementById("transferRate");
      const timeLeftEl = document.getElementById("transferTimeLeft");
      const localLogEl = document.getElementById("transferLog");
      if (localLogEl) localLogEl.innerHTML = "";

      const files = DB_INGEST_FILES;
      const totalDuration = 15000 / currentSpeed;
      const startTime = performance.now();
      let lastFileIdx = -1;
      let lastRateUpdate = 0;
      const transferActive = true;

      function addConsoleLog(text, type = "normal") {
        if (!localLogEl) return;
        const line = document.createElement("div");
        line.className = "log-line " + type;
        line.textContent = text;
        localLogEl.appendChild(line);
        localLogEl.scrollTop = localLogEl.scrollHeight;
      }

      addConsoleLog("Opening transaction...", "active");

      const progressTick = (now) => {
        if (!transferActive) return;
        const elapsed = now - startTime;
        const pct = Math.min(100, (elapsed / totalDuration) * 100);

        if (pctEl) pctEl.textContent = Math.round(pct) + "%";
        if (barEl) barEl.style.width = pct + "%";

        const secondsLeft = Math.max(
          0,
          Math.ceil((totalDuration - elapsed) / 1000),
        );
        if (timeLeftEl) timeLeftEl.textContent = secondsLeft + "s";

        if (now - lastRateUpdate > 1200) {
          lastRateUpdate = now;
          const rate = (30 + Math.random() * 25).toFixed(1);
          if (rateEl) rateEl.textContent = rate + " KB/s";
        }

        const step = 100 / files.length;
        const fileIdx = Math.floor(pct / step);
        if (fileIdx > lastFileIdx && fileIdx < files.length) {
          lastFileIdx = fileIdx;
          const f = files[fileIdx];
          if (filesEl) filesEl.textContent = `${fileIdx + 1} / ${files.length}`;
          addConsoleLog(
            `[${Math.round(pct)}%] Writing ${f.name} (${f.size})...`,
            "active",
          );
          if (localLogEl) {
            const lines = localLogEl.querySelectorAll(".log-line");
            if (lines.length > 1) {
              const prevLine = lines[lines.length - 2];
              prevLine.className = "log-line success";
              prevLine.textContent = "✓ " + prevLine.textContent.substring(4);
            }
          }
        }

        if (pct < 100) {
          animRef.current = requestAnimationFrame(progressTick);
        } else {
          if (filesEl)
            filesEl.textContent = `${files.length} / ${files.length}`;
          if (timeLeftEl) timeLeftEl.textContent = "0s";
          if (localLogEl) {
            const lines = localLogEl.querySelectorAll(".log-line");
            if (lines.length > 0) {
              const last = lines[lines.length - 1];
              last.className = "log-line success";
              if (last.textContent.startsWith("["))
                last.textContent = "✓ " + last.textContent.substring(6);
            }
          }
          addConsoleLog("✓ COMMIT — transaction closed.", "success");
          addConsoleLog("Saved. Next run will be smarter.", "finish");
          setTimeout(() => {
            if (dbNode) dbNode.classList.remove("db-ingesting");
            resolveAnimation();
          }, 1000);
        }
      };
      animRef.current = requestAnimationFrame(progressTick);

      if (dbParticlesGroupRef.current) {
        dbParticlesGroupRef.current.innerHTML = "";
        const { startX, startY, endX, endY } = DB_INGEST_PARTICLE_PATH;
        const spawnInterval = 500 / currentSpeed;
        let spawnedCount = 0;
        const maxSpawns = Math.floor(totalDuration / spawnInterval) - 2;
        const fileEmojis = ["📄", "📝", "📊", "📁", "⚡", "🗃️"];

        const spawnFileIcon = () => {
          if (
            spawnedCount >= maxSpawns ||
            !transferActive ||
            !dbParticlesGroupRef.current
          )
            return;
          spawnedCount++;
          const emoji =
            fileEmojis[Math.floor(Math.random() * fileEmojis.length)];
          const p = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text",
          );
          p.setAttribute("x", String(startX));
          p.setAttribute("y", String(startY));
          p.setAttribute("font-size", "13px");
          p.setAttribute("text-anchor", "middle");
          p.setAttribute("dominant-baseline", "middle");
          p.setAttribute("opacity", "0.9");
          p.setAttribute(
            "style",
            `cursor: default; user-select: none; font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji';`,
          );
          p.textContent = emoji;
          dbParticlesGroupRef.current.appendChild(p);

          const iconStartTime = performance.now();
          const duration = (900 + Math.random() * 400) / currentSpeed;
          const offsetX = (Math.random() - 0.5) * 30;
          const offsetY = -25 - Math.random() * 45;

          const animateIcon = (now) => {
            const elapsed = now - iconStartTime;
            const pct = Math.min(1, elapsed / duration);
            const eased =
              pct < 0.5
                ? 4 * pct * pct * pct
                : 1 - Math.pow(-2 * pct + 2, 3) / 2;
            const cx =
              startX +
              (endX - startX) * eased +
              offsetX * Math.sin(pct * Math.PI);
            const cy =
              startY +
              (endY - startY) * eased +
              offsetY * Math.sin(pct * Math.PI);
            const rotation = eased * 360;
            p.setAttribute("x", String(cx));
            p.setAttribute("y", String(cy));
            p.setAttribute("transform", `rotate(${rotation}, ${cx}, ${cy})`);
            p.setAttribute("opacity", String(1 - eased));
            if (pct < 1) requestAnimationFrame(animateIcon);
            else p.remove();
          };
          requestAnimationFrame(animateIcon);
          setTimeout(spawnFileIcon, spawnInterval);
        };
        spawnFileIcon();
      }
    });
  }

  function runStep(i) {
    return new Promise((resolve) => {
      const s = STEPS[i];
      clearActive();
      setPhaseText(PHASES[s.ph]);
      setProgress(i);
      addLog(i);

      const currentSpeed = speedRef.current;
      let dur = BASE / currentSpeed;
      const V = 0.125 * currentSpeed;

      const status = stepStatuses()[i];

      // The link this step needs was removed by the user: nothing travels.
      // The source flashes red, says why, and the run carries on to the next
      // step — that "what still works without this link?" read is the whole
      // point of being able to cut a connection.
      if (status === "blocked") {
        const srcNode = nodeElsRef.current[stepInitiator(s)];
        if (srcNode) srcNode.classList.add("active", "blocked");
        const deadEdge = edgesRef.current[pairKey(s.f, s.t)];
        if (deadEdge) deadEdge.el.classList.add("blocked-flash");
        const other = stepInitiator(s) === s.f ? s.t : s.f;
        addBubble(stepInitiator(s), "✕ No connection to " + NODES[other].title);
        const tBlocked = performance.now();
        const blockedTick = (now) => {
          if (now - tBlocked >= 1300 / currentSpeed) resolve();
          else animRef.current = requestAnimationFrame(blockedTick);
        };
        animRef.current = requestAnimationFrame(blockedTick);
        return;
      }

      // Nothing ever reached this step's initiator, because an upstream step
      // was blocked. It can't happen, so nothing is drawn — the log entry
      // (already added above) carries the "skipped — never reached" note and
      // the run moves on after a short beat.
      if (status === "unreachable") {
        const tSkipped = performance.now();
        const skipTick = (now) => {
          if (now - tSkipped >= 450 / currentSpeed) resolve();
          else animRef.current = requestAnimationFrame(skipTick);
        };
        animRef.current = requestAnimationFrame(skipTick);
        return;
      }

      const chat = s.chat || [];
      const shownChat = new Array(chat.length).fill(false);
      const revealChat = (elapsed) => {
        for (let c = 0; c < chat.length; c++) {
          if (shownChat[c]) continue;
          const at = dur * Math.min(0.5, c * 0.42);
          if (elapsed >= at) {
            shownChat[c] = true;
            addBubble(chat[c][0], chat[c][1]);
          }
        }
      };

      if (s.f === s.t) {
        dur = 1600 / currentSpeed;
        const activeNode = nodeElsRef.current[s.f];
        if (activeNode) activeNode.classList.add("active", "working");
        const t0 = performance.now();
        const tick = (now) => {
          revealChat(now - t0);
          if (now - t0 >= dur) {
            if (activeNode) activeNode.classList.remove("working");
            markDone(s.f);
            resolve();
          } else {
            animRef.current = requestAnimationFrame(tick);
          }
        };
        animRef.current = requestAnimationFrame(tick);
        return;
      }

      if (s.roundTrip) {
        const rtEdge = edgesRef.current[pairKey(s.f, s.t)];
        const asker = s.t;
        const responder = s.f;
        rtEdge.el.classList.remove("call", "data");
        rtEdge.el.classList.add("active", "flow", "call");
        const askerNode = nodeElsRef.current[asker];
        const responderNode = nodeElsRef.current[responder];
        if (askerNode) askerNode.classList.add("active");
        if (responderNode) responderNode.classList.add("active");

        const leg = rtEdge.len / V;
        (async () => {
          if (chat[0]) addBubble(chat[0][0], chat[0][1]);
          await travelBall(rtEdge, asker, responder, "call", leg);
          blinkArrow(rtEdge, responder);
          await waitMs(200 / currentSpeed);
          if (chat[1]) addBubble(chat[1][0], chat[1][1]);
          await travelBall(rtEdge, responder, asker, "data", leg);
          blinkArrow(rtEdge, asker);
          await waitMs(300 / currentSpeed);
          markDone(asker);
          markDone(responder);
          resolve();
        })();
        return;
      }

      const edge = edgesRef.current[pairKey(s.f, s.t)];
      const forward = edge.from === s.f;
      edge.el.classList.remove("call", "data", "flow-reverse");
      edge.el.classList.add("active", "flow", s.k);
      if (!forward) edge.el.classList.add("flow-reverse");
      const fromNode = nodeElsRef.current[s.f];
      const toNode = nodeElsRef.current[s.t];
      if (fromNode) fromNode.classList.add("active");
      if (toNode) toNode.classList.add("active");

      if (pulseRef.current) {
        pulseRef.current.setAttribute(
          "class",
          "pulse " + (s.k === "data" ? "data" : "call"),
        );
        pulseRef.current.setAttribute("opacity", "1");
      }

      const travel = edge.len / V;
      dur = travel + 600 / currentSpeed;
      const t0 = performance.now();
      let arrived = false;

      const tick = async (now) => {
        revealChat(now - t0);
        let p = (now - t0) / travel;
        if (p > 1) p = 1;
        const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        const t = forward ? eased : 1 - eased;
        const pt = edge.el.getPointAtLength(edge.len * t);
        if (pulseRef.current) {
          pulseRef.current.setAttribute("cx", String(pt.x));
          pulseRef.current.setAttribute("cy", String(pt.y));
        }

        if (p >= 1 && !arrived) {
          arrived = true;
          blinkArrow(edge, s.t);
          if (DB_INGEST_TO && s.f === DB_INGEST_FROM && s.t === DB_INGEST_TO)
            triggerDbIngestAnimation(currentSpeed);
        }

        const extraWait =
          DB_INGEST_TO && s.f === DB_INGEST_FROM && s.t === DB_INGEST_TO
            ? 15000 / currentSpeed
            : 0;
        if (p >= 1 && now - t0 >= dur + extraWait) {
          markDone(s.f);
          markDone(s.t);
          resolve();
        } else {
          animRef.current = requestAnimationFrame(tick);
        }
      };
      animRef.current = requestAnimationFrame(tick);
    });
  }

  async function advance() {
    if (idxRef.current >= STEPS.length - 1) {
      stopPlay();
      return false;
    }
    idxRef.current++;
    await runStep(idxRef.current);
    if (idxRef.current >= STEPS.length - 1) {
      stopPlay();
      resetAnimation(true, true);
      setPhaseText("Run completed");
      markRunCompleteInLog();
    }
    return true;
  }

  function markRunCompleteInLog() {
    if (!logRef.current) return;
    logRef.current
      .querySelectorAll(".log-item.cur")
      .forEach((n) => n.classList.remove("cur"));
    const statuses = stepStatuses();
    const blocked = statuses.filter((s) => s === "blocked").length;
    const skipped = statuses.filter((s) => s === "unreachable").length;
    const parts = [];
    if (blocked) parts.push(blocked + " blocked");
    if (skipped) parts.push(skipped + " never reached");
    const item = document.createElement("div");
    item.className = "log-item cur";
    item.innerHTML = `
      <div class="log-num" style="background: ${parts.length ? "#ef4444" : "#22c55e"};">${parts.length ? "!" : "✓"}</div>
      <div class="log-body">
        <span class="log-route">System</span>
        Run completed${parts.length ? " — " + parts.join(", ") : ""}
      </div>
    `;
    logRef.current.appendChild(item);
    logRef.current.scrollTop = logRef.current.scrollHeight;
  }

  async function loop() {
    while (playingRef.current) {
      const more = await advance();
      if (!more) break;
    }
  }

  function startPlay() {
    if (idxRef.current >= STEPS.length - 1) resetAnimation(false);
    else if (idxRef.current === -1 && logRef.current)
      logRef.current.innerHTML = "";
    setIsPlaying(true);
    playingRef.current = true;
    loop();
  }

  function stopPlay() {
    setIsPlaying(false);
    playingRef.current = false;
    if (animRef.current) cancelAnimationFrame(animRef.current);
  }

  function resetAnimation(repaint = true, keepLogs = false) {
    stopPlay();
    idxRef.current = -1;
    setProgress(-1);
    clearActive();
    Object.values(nodeElsRef.current).forEach((g) =>
      g.classList.remove("done"),
    );
    if (!keepLogs && logRef.current) logRef.current.innerHTML = "";
    if (repaint) setPhaseText("Ready");
  }

  // Jump the demo to the state where step `target` has just completed:
  // done-marks and the activity log are rebuilt for steps 0..target, and the
  // target step's nodes, edge and chat are shown statically so the jumped-to
  // moment reads at a glance. target = -1 lands on the pristine "Ready" state.
  // This backs the scrubber, the ⏮ Back button, the clickable activity log,
  // and the inspector's step chips.
  function jumpTo(target) {
    if (ffRef.current) return;
    stopPlay();
    target = Math.max(-1, Math.min(STEPS.length - 1, target));
    idxRef.current = target;
    setProgress(target);
    clearActive();
    Object.values(nodeElsRef.current).forEach((g) =>
      g.classList.remove("done"),
    );
    if (logRef.current) logRef.current.innerHTML = "";
    const statuses = stepStatuses();
    for (let i = 0; i <= target; i++) {
      // A blocked or unreachable step never ran, so neither end gets a
      // done-mark.
      if (statuses[i] === "ok") {
        markDone(STEPS[i].f);
        markDone(STEPS[i].t);
      }
      addLog(i);
    }
    if (target < 0) {
      setPhaseText("Ready");
      return;
    }
    const s = STEPS[target];
    setPhaseText(PHASES[s.ph]);
    if (statuses[target] === "blocked") {
      const srcNode = nodeElsRef.current[stepInitiator(s)];
      if (srcNode) srcNode.classList.add("active", "blocked");
      const other = stepInitiator(s) === s.f ? s.t : s.f;
      addBubble(stepInitiator(s), "✕ No connection to " + NODES[other].title);
      return;
    }
    // An unreachable step has nothing to show on the stage.
    if (statuses[target] === "unreachable") return;
    const fromNode = nodeElsRef.current[s.f];
    const toNode = nodeElsRef.current[s.t];
    if (fromNode) fromNode.classList.add("active");
    if (toNode) toNode.classList.add("active");
    if (s.f !== s.t) {
      const edge = edgesRef.current[pairKey(s.f, s.t)];
      if (edge)
        edge.el.classList.add("active", s.k === "data" ? "data" : "call");
    }
    (s.chat || []).forEach((c) => addBubble(c[0], c[1]));
  }

  function scrubToEvent(e) {
    const track = scrubTrackRef.current;
    if (!track) return;
    const r = track.getBoundingClientRect();
    let frac = (e.clientX - r.left) / r.width;
    frac = Math.max(0, Math.min(0.999, frac));
    const i = Math.floor(frac * STEPS.length);
    if (i !== idxRef.current) jumpTo(i);
  }

  // Advance exactly ONE step, animated at the current speed. The step's final
  // state (active edge, chat bubbles) stays on screen afterwards so the user
  // can read what just happened before stepping again.
  async function handleStep() {
    if (playingRef.current || ffRef.current) return;
    if (idxRef.current >= STEPS.length - 1) return;
    setIsDoneDisabled(true);
    ffRef.current = true;
    await advance();
    ffRef.current = false;
    setIsDoneDisabled(false);
  }

  function adjustSpeed(amount) {
    let nextSpeed = speed + amount;
    nextSpeed = parseFloat(nextSpeed.toFixed(1));
    if (nextSpeed >= 0.1 && nextSpeed <= 3.0) setSpeed(nextSpeed);
  }

  // How many LATER steps this link strands (or, once cut, would get back) —
  // the answer to "is this connection load-bearing?", shown in the inspector
  // before the user commits to cutting it. linkVersion keeps it fresh.
  function strandedBy(key) {
    if (!key) return 0;
    const now = stepStatuses();
    if (REMOVED_LINKS.has(key)) {
      const restored = computeStatuses(null, key);
      return now.filter(
        (s, i) => s === "unreachable" && restored[i] !== "unreachable",
      ).length;
    }
    const cut = computeStatuses(key, null);
    return cut.filter((s, i) => s === "unreachable" && now[i] !== "unreachable")
      .length;
  }

  return (
    <div
      ref={containerRef}
      className={`archflow-container ${theme === "light" ? "light" : ""}`}
    >
      <header>
        <div>
          <h1>{TITLE}</h1>
          <p>{SUBTITLE}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
          >
            {theme === "dark" ? "☀ Light" : "🌙 Dark"}
          </button>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? "🗗 Exit" : "⛶ Fullscreen"}
          </button>
        </div>
      </header>

      <div className="toolbar">
        <button
          onClick={() => (isPlaying ? stopPlay() : startPlay())}
          className={!isPlaying ? "primary" : ""}
          disabled={isDoneDisabled}
        >
          {isPlaying
            ? "⏸ Pause"
            : progress >= STEPS.length - 1
              ? "▶ Replay"
              : "▶ Play"}
        </button>
        <button
          onClick={() => jumpTo(idxRef.current - 1)}
          disabled={isPlaying || isDoneDisabled || progress < 0}
          title="Back one step"
        >
          ⏮ Back
        </button>
        <button onClick={handleStep} disabled={isPlaying || isDoneDisabled}>
          ⏭ Step
        </button>
        <button onClick={() => resetAnimation(true)} disabled={isDoneDisabled}>
          ↻ Restart
        </button>
        <button
          onClick={() => {
            saveLayout();
            setLayoutDirty(false);
            setLayoutSaved(true);
            setTimeout(() => setLayoutSaved(false), 1600);
          }}
          disabled={!layoutDirty}
          title="Remember where you dragged the cards, so this layout comes back on reload"
        >
          {layoutSaved ? "✓ Saved" : "💾 Save layout"}
        </button>
        <button
          onClick={restoreAllLinks}
          disabled={REMOVED_LINKS.size === 0}
          title="Reconnect every link you removed (click a link on the diagram to remove one)"
        >
          ⛓ Links
          {REMOVED_LINKS.size > 0 ? ` (${REMOVED_LINKS.size})` : ""}
        </button>
        <span className="speed">
          Speed
          <button
            onClick={() => adjustSpeed(-0.1)}
            className="speed-btn"
            disabled={isDoneDisabled}
          >
            −
          </button>
          <span id="speedVal">{speed.toFixed(1)}×</span>
          <button
            onClick={() => adjustSpeed(0.1)}
            className="speed-btn"
            disabled={isDoneDisabled}
          >
            +
          </button>
        </span>
        <span className="spacer"></span>
        <span className="phase-tag">{phaseText}</span>
      </div>

      <div className="scrubber">
        <span className="scrub-count">
          {progress + 1} / {STEPS.length}
        </span>
        <div
          ref={scrubTrackRef}
          className="scrub-track"
          title="Drag or click to jump to any step"
          onPointerDown={(e) => {
            if (isDoneDisabled) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            scrubToEvent(e);
          }}
          onPointerMove={(e) => {
            if (isDoneDisabled || e.buttons !== 1) return;
            scrubToEvent(e);
          }}
        >
          {STEPS.map((s, i) => (
            <div
              key={i}
              className={
                "scrub-seg" +
                (i <= progress ? " filled" : "") +
                (i > 0 && STEPS[i - 1].ph !== s.ph ? " phase-start" : "")
              }
            />
          ))}
        </div>
      </div>

      <div className="wrap">
        <div className="stage-area">
          <svg
            ref={stageRef}
            className="stage"
            viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
            preserveAspectRatio="xMidYMid meet"
            aria-label={TITLE}
          ></svg>
        </div>
        <aside className="side">
          {selectedLink &&
            NODES[selectedLink.split("|")[0]] &&
            NODES[selectedLink.split("|")[1]] && (
              <div className="inspector">
                <div className="inspector-head">
                  <span className="inspector-icon link-icon">⇄</span>
                  <div className="inspector-name">
                    <div className="inspector-title">
                      {NODES[selectedLink.split("|")[0]].title} ⇄{" "}
                      {NODES[selectedLink.split("|")[1]].title}
                    </div>
                    <div className="inspector-sub">Connection</div>
                  </div>
                  <button
                    className="inspector-close"
                    onClick={() => setSelectedLink(null)}
                    title="Close inspector"
                  >
                    ✕
                  </button>
                </div>
                {REMOVED_LINKS.has(selectedLink) && (
                  <span className="inspector-badge danger">
                    Removed — every step over this link is blocked
                  </span>
                )}
                {strandedBy(selectedLink) > 0 && (
                  <p className="inspector-impact">
                    {REMOVED_LINKS.has(selectedLink)
                      ? `Restoring it also brings back ${strandedBy(selectedLink)} later step${strandedBy(selectedLink) === 1 ? "" : "s"} that nothing currently reaches.`
                      : `Cutting it also strands ${strandedBy(selectedLink)} later step${strandedBy(selectedLink) === 1 ? "" : "s"} — nothing downstream would reach them.`}
                  </p>
                )}
                <div className="inspector-section">Carries</div>
                <ul className="inspector-routes">
                  {linkInfo(selectedLink).routes.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <div className="inspector-section">
                  Used in steps
                  {REMOVED_LINKS.has(selectedLink) ? " (blocked)" : ""}
                </div>
                <div className="inspector-steps">
                  {linkInfo(selectedLink).stepIdxs.map((i) => (
                    <button
                      key={i}
                      className="inspector-step-chip"
                      onClick={() => jumpTo(i)}
                      title={STEPS[i].m}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <button
                  className={
                    "inspector-action" +
                    (REMOVED_LINKS.has(selectedLink) ? "" : " danger")
                  }
                  onClick={() => toggleLink(selectedLink)}
                  title={
                    REMOVED_LINKS.has(selectedLink)
                      ? "Put this connection back"
                      : "Cut this connection and see which steps stop working"
                  }
                >
                  {REMOVED_LINKS.has(selectedLink)
                    ? "↺ Restore connection"
                    : "✂ Remove connection"}
                </button>
              </div>
            )}
          {inspected && NODES[inspected] && (
            <div className="inspector">
              <div className="inspector-head">
                <span
                  className="inspector-icon"
                  style={{ background: NODES[inspected].color }}
                >
                  {NODES[inspected].icon}
                </span>
                <div className="inspector-name">
                  <div className="inspector-title">
                    {NODES[inspected].title}
                  </div>
                  <div className="inspector-sub">{NODES[inspected].sub}</div>
                </div>
                <button
                  className="inspector-close"
                  onClick={() => setInspected(null)}
                  title="Close inspector"
                >
                  ✕
                </button>
              </div>
              {NODES[inspected].external && (
                <span className="inspector-badge">
                  External system — depended on, not owned
                </span>
              )}
              {NODES[inspected].desc && (
                <p className="inspector-desc">{NODES[inspected].desc}</p>
              )}
              <div className="inspector-section">Connections</div>
              <ul className="inspector-routes">
                {nodeInfo(inspected).routes.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <div className="inspector-section">Appears in steps</div>
              <div className="inspector-steps">
                {nodeInfo(inspected).stepIdxs.map((i) => (
                  <button
                    key={i}
                    className="inspector-step-chip"
                    onClick={() => jumpTo(i)}
                    title={STEPS[i].m}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
          <h2>Activity log</h2>
          <div ref={logRef} className="log"></div>
        </aside>
      </div>

      <footer>
        <div className="legend">
          <span>
            <i className="dot" style={{ background: "var(--accent)" }}></i>{" "}
            control / hand-off
          </span>
          <span>
            <i className="dot" style={{ background: "#0ea5a4" }}></i> data
            returned
          </span>
          <span>
            <i className="dot" style={{ background: "#f59e0b" }}></i> working
          </span>
          <span>
            <i
              className="dot"
              style={{ background: "#374151", border: "1px dashed #94a3b8" }}
            ></i>{" "}
            external system
          </span>
          <span>
            <i className="dot" style={{ background: "#ef4444" }}></i> click a
            link to remove it
          </span>
        </div>
        <p>
                One small bridge holds the whole system together: <b>Power Automate makes a single authenticated HTTPS PUT</b> into the repo's raw/inbox/ folder — the only link between the Microsoft 365 world and GitHub. The commit itself is the trigger: GitHub's own <b>push event</b> starts the ingest workflow, and one <b>API-key-secured call to Claude</b> does the librarian work. Humans never touch the pipeline — they meet the wiki by asking Claude Code plain-English questions with the <b>/abap-wiki skill</b>, which pulls the current vault from GitHub before every answer.
              </p>
      </footer>
    </div>
  );
}

export default AbapVaultDemoFlow;
