# GameMatch 🎲

A **Tinder-style board game picker** for game night. Everyone in the room swipes
through a shared catalog of games — swipe right to vote yes, left for no. When the
whole group lands on the same game, it's a **match**. No more arguing about what to play.

It's a local-multiplayer web app: one person runs it on their laptop, everyone else
joins from their phones on the same Wi-Fi.

## How it works

1. **Pick a profile** — each player chooses who they are.
2. **Admin builds the catalog** — the host searches [BoardGameGeek](https://boardgamegeek.com)
   and adds the games on the table tonight (or uses the built-in mock catalog).
3. **Everyone swipes** — players independently swipe through the games.
4. **Matches surface** — games the group agrees on pop up as matches; pick a winner.
5. **Dashboard & history** — see the group's votes, matches, and past game nights.

## Quick start

Requirements: **Node 23+** and npm.

```sh
git clone git@github.com:sbanders1/bg-picker.git
cd bg-picker
npm install
npm run dev:lan
```

Then open the **Network** URL it prints (e.g. `http://192.168.1.79:5180/`) — that's the
one your friends type into their phones. `localhost:5180` works for just you.

> **Why `dev:lan`?** It binds to your whole network (`--host`) on a fixed port so other
> devices can reach it. Plain `npm run dev` is localhost-only — fine for solo work, useless
> for multiplayer. Everyone must be on the **same Wi-Fi**.

That's it — the app ships with a built-in **mock** game catalog, so it works out of the
box with zero configuration. To pull in real games from BoardGameGeek, see below.

## Using real BoardGameGeek data (optional)

The Admin screen has a **Mock / Live** toggle. Mock uses canned data (no setup). Live
searches the real BoardGameGeek catalog and imports full game details (players, play
time, complexity, artwork, etc.).

Live mode needs an API token:

```sh
cp .env.example .env
# then edit .env and set BGG_API_TOKEN=<your-token>
```

Restart the dev server after creating `.env`. The token is read **server-side only** and
never reaches the browser. `.env` is gitignored — keep your token there, never inline it.

Once Live works, results are cached to disk (`.bgg-cache.json`) and accumulate over time,
so repeat searches are instant and the catalog stays browsable even if BGG is unreachable.

## Commands

| Command | What it does |
|---|---|
| `npm run dev:lan` | **Start the app for game night** — LAN-accessible on port 5180. |
| `npm run dev` | Localhost-only dev server (solo work). |
| `npm run build` | Production build. |
| `npm run preview` | Preview the production build locally. |
| `npm run check` | TypeScript / Svelte type check. |

## Tech stack

- **[SvelteKit](https://svelte.dev/docs/kit) + [Svelte 5](https://svelte.dev/docs/svelte/what-are-runes)** (runes mode) + **TypeScript** + **Vite**
- **Shared state** lives server-side in `.gamematch-state.json` so every device in the room
  sees the same catalog, votes, and matches in real time (via server-sent events).
- **BoardGameGeek XML API2** for the game catalog — proxied server-side (the browser can't
  call BGG directly). Integration notes live in [`docs/bgg-api.md`](docs/bgg-api.md).

## Project layout

```
src/
  routes/              # SvelteKit pages (one per screen) + /api endpoints
    api/bgg/           # server-side BoardGameGeek proxy + cache
    api/{state,action,sync}/  # shared multiplayer state
  lib/
    components/        # the 7 screens + shared UI
    state/             # client-side state (Svelte runes-in-modules)
    server/            # server-only code (shared state, BGG cache)
docs/bgg-api.md        # how the BGG integration works
bg-picker.pen          # the design source-of-truth (opened via the Pencil tool)
```

> Heads up for contributors: this repo auto-commits and pushes the working tree on a timer.
> Keep secrets in `.env` (gitignored) — anything in a tracked file gets pushed automatically.
