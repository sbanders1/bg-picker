## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: none

---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

Working SvelteKit app under active development. **GameMatch** — Tinder-style board game picker.

- **Stack**: SvelteKit + Svelte 5 (runes-only — `svelte.config.js` forces runes mode) + TypeScript + Vite. Engine-strict is off in `.npmrc` (Node 23 sits between `vite-plugin-svelte`'s supported ranges; harmless warning).
- **7 screens** implemented as components in `src/lib/components/`, routed via `src/routes/{,profile,admin,swipe,match,group,game/[id]}/+page.svelte`.
- **Global state**: runes-in-modules pattern in `src/lib/state/{profile,games,group,swipes}.svelte.ts`. Reads via property access, writes via exported functions. Hydrated from localStorage in `+layout.svelte`'s `$effect`.
- **BGG proxy** at `src/routes/api/bgg/[endpoint]/+server.ts` — server-side XML parsing via `fast-xml-parser`, 202 retry, 503 backoff, token-bucket rate limiter. See `docs/bgg-api.md` for gotchas.
- **Design source-of-truth**: `bg-picker.pen` at the repo root. Keep using the Pencil MCP for any updates.

Run `npm run dev:lan` (binds to 0.0.0.0 on port 5180 for LAN multiplayer — the default for this repo), `npm run check` (type check — must pass cleanly), `npm run build` (production build). Plain `npm run dev` is localhost-only and only useful for solo single-device work; assume `dev:lan` unless told otherwise.

**Known issue**: BGG XML API is currently returning HTTP 401 to this machine's IP — likely an upstream rate-limit/IP-block. The proxy code is correct and surfaces failures as `{ error: "BGG 401: ..." }`. Test from a different network when needed.

## Working with the design file

`bg-picker.pen` is encrypted. Access it **only** through the `pencil` MCP server — `Read`, `Grep`, and other text tools will not work and may corrupt assumptions about file contents.

Typical entry points:
- `mcp__pencil__open_document` — open the file (only needed if no editor is active)
- `mcp__pencil__get_editor_state` — list top-level frames and current selection; pass `include_schema: true` on the first call of a session
- `mcp__pencil__batch_get` — read specific nodes / search by pattern (batch multiple lookups into one call)
- `mcp__pencil__get_screenshot` — visual check of a single frame; expensive, use sparingly and prefer the smallest meaningful node
- `mcp__pencil__snapshot_layout` — structural/sizing checks without the screenshot cost

## App structure (top-level frames)

The document is organized as one frame per screen / flow step:

1. **Title Banner** — cover/intro
2. **01 Profile Picker** — user picks their profile
3. **02 Admin Upload** — admin adds games to the catalog
4. **03 Swiping** — Tinder-style swipe over games
5. **04 Match Celebration** — group match found
6. **05 Group Dashboard** — group's shared state
7. **06 Game Profile** — detail view for a single game

Frames are numbered to convey flow order; treat that numbering as the source of truth when reasoning about navigation.

## External integrations

- **BoardGameGeek XML API2** — source of the game catalog (search + stats incl. complexity). Integration notes, endpoints, XML paths, and gotchas live in `docs/bgg-api.md`. Read that before writing any code that talks to `boardgamegeek.com`.

## Building components from designs

The `.pen` file is a structured design artifact living **in this repo** — not a mockup thrown over a wall. The `pencil` MCP is how you read it; you (Claude Code) write the resulting component code into the same repo, matching its conventions. That round-trip is the whole "design as code" loop.

### Stack rules

- **Svelte 5 with runes** (`$state`, `$derived`, `$props`). **Never** use Svelte stores, **never** use Svelte 4 `$:` reactive declarations, **never** use `export let`. Most Pencil examples target React + Tailwind — explicitly ignore that bias for this project.
- **`$effect` is a last resort**, not a default tool. Use it only for genuine side effects to the outside world (DOM bindings Svelte can't express, third-party JS, network, focus management). For computed values, use `$derived` / `$derived.by`. For one-shot client setup, prefer `onMount` or inline `<script>` calls. Do NOT use `$effect` to sync `$state` with other `$state` — that creates re-render loops (we hit `effect_update_depth_exceeded` once already; root cause was init writes triggering reads in the same effect).
- **Component path**: `src/lib/components/<Name>.svelte`.
- **UI only.** Backend logic, persistence, auth, and BoardGameGeek integration (see `docs/bgg-api.md`) are normal coding tasks — out of scope for the "implement this frame" workflow.

### Tokens first, components second

Before generating any components, sync design tokens **once**:

> Read variables from the design and write them as CSS custom properties in `src/app.css`.

Use `mcp__pencil__get_variables` to pull the tokens. After this, every generated component must reference those CSS custom properties — no hard-coded colors, spacing, radii, or typography that has a token. This is the only way to keep design and code from drifting.

### Implementing a screen

Canonical instruction shape:

> Read `designs/<screen>.pen` (or the relevant frame in `bg-picker.pen`) and implement it as a Svelte 5 component at `src/lib/components/<Name>.svelte`. Use runes syntax. Match the design tokens in `src/app.css`.

Workflow:

1. Open the design via `pencil` MCP. `get_screenshot` on the target frame for a visual reference, `batch_get` for structural / measurement data.
2. For **complex screens, generate piece by piece** — header, then sidebar, then main content — not the whole page in one shot. Quality drops noticeably on large single-shot generations.
3. Write the component(s) into `src/lib/components/`.

### Anti-patterns

- **Don't** use Pencil's built-in "export to React/HTML" button as project output. It produces self-contained snippets that ignore this repo's structure, components, and conventions. Always go through the MCP + write-into-repo flow.
- **Don't** `Read` or `Grep` `.pen` files directly — they're encrypted; use the `pencil` MCP only.

### Keeping design and code in sync

The MCP works in both directions:

- **Design changed** → re-run the implementation prompt scoped to the diff.
- **Code changed in a way the design should reflect** → ask to update the `.pen` file to match (via `batch_design`, `set_variables`, etc.).
