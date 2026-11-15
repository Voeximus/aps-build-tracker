# American Police Simulator Build Tracker

A one-page site with an information card for each game build (no downloads).
Each card shows: release date, days since release, bugs reported, crashes reported,
crash files, lab frame times, the frame rate players saw, community mood,
what was added, what was solved, and what is still broken.
The page also has a comparison table, charts, a "build unknown" list and Discord growth.

Everything is plain HTML, CSS and JavaScript. There is no build step.
The page reads all of its numbers from **`builds.json`**.

## Add a new build

1. Open `builds.json`.
2. Copy an existing entry inside `"builds": [ ... ]` and paste it at the end of the list (add a comma between entries).
3. Change the fields:

| Field | What to put |
|---|---|
| `id` | Version, for example `"0.1.60"` |
| `name` | Name shown on the card |
| `status` | `"public"` or `"internal"` |
| `statusLabel` | Short tag, for example `"Public (current)"` (the word "current" makes it green) |
| `releaseDate` | `"YYYY-MM-DD"` in Phoenix time, or `null` if not released |
| `startedDate` | For unreleased builds: when work started |
| `releaseNote`, `summary`, `notes` | Plain sentences |
| `metrics.bugs`, `metrics.crashes`, `metrics.crashFiles` | `value` (a number, or `null` if not measured), `display` (text on the card), `source` (which report and date) |
| `metrics.frameTimeMs` | `value` in milliseconds per frame from a lab test, or `null` |
| `metrics.worstFreezeMs` | Worst single frame or freeze in ms, or `null` |
| `metrics.playerFps` | `display` and `source` (what players said) |
| `metrics.sentiment` | `summary`, plus `positive`, `negative`, `neutral`, `questions` counts or `null` |
| `added`, `solved`, `stillOpen` | Lists of short sentences |
| `solvedNote` | Optional caveat under the solved list |

4. When the old "current" build is replaced, change its `statusLabel` to `"Public (replaced)"`.
5. Update `"dataUpdated"` at the top.
6. Commit and push. GitHub Pages updates the site in a minute or two.

Rules:
- Never guess a number. Use `null` and write `"not measured"` in `display`.
- Count a report toward the build that was public when it was posted, unless the player named a version.
- If you can't tell which build a report was about, add it to `"unattributed"` instead.
- Always fill in `source` so anyone can see where a number came from.
- This site is public: no usernames, ticket links, private repo links or tokens.

## Preview locally

```
python3 -m http.server 8000
```
Then open http://localhost:8000 (opening `index.html` directly won't load `builds.json`).
