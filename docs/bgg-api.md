# BoardGameGeek XML API2 — integration notes

How GameMatch will pull board game data from BoardGameGeek (BGG). Source of truth for any code that talks to `boardgamegeek.com`.

## Base

- Base URL: `https://boardgamegeek.com/xmlapi2`
- Format: **XML only** (no JSON). Parse with a real XML parser, not regex.
- Auth: **none** required for read endpoints. User auth is only needed for write actions like editing a user's collection — we don't do that.
- User-Agent: must look browser-ish. Generic `curl`/empty UAs are being rejected with 401. In production, set a clear UA with a contact email.
- CORS: BGG does **not** send CORS headers. A browser-side `fetch` from GameMatch will fail. **All BGG calls must go through our own backend / serverless proxy.**

## Endpoints we use

### `/search` — find games by name
| Param | Notes |
|---|---|
| `query` | Required. The text to search. |
| `type`  | Comma-separated. For us: `boardgame` (occasionally `boardgameexpansion`, `boardgameaccessory`). |
| `exact` | `1` for exact-name matches only. Otherwise BGG returns fuzzy/prefix matches. |

Response is lightweight — `id`, primary name, year published. **No stats, no images, no complexity.** Treat `/search` purely as a name-to-id lookup; follow up with `/thing` for anything real.

```xml
<items>
  <item type="boardgame" id="13">
    <name type="primary" value="CATAN"/>
    <yearpublished value="1995"/>
  </item>
</items>
```

Example: `…/xmlapi2/search?query=catan&type=boardgame`

### `/thing` — full game details
| Param | Notes |
|---|---|
| `id`      | Comma-separated, **batchable** (e.g. `id=13,9209,167791`). Use this aggressively for catalog imports. |
| `stats=1` | **Required for the ratings block** (and therefore `averageweight`). Without it you get descriptive data only. |
| `versions=1`, `videos=1`, `marketplace=1`, `comments=1`, `ratingcomments=1` | Optional extras. We likely don't need any of these for GameMatch. |

Example: `…/xmlapi2/thing?id=13&stats=1`

#### Fields we care about

Paths are relative to each `<item>` in the response.

| Our field | XML path |
|---|---|
| Title | `name[@type='primary']/@value` |
| Year published | `yearpublished/@value` |
| Min / max players | `minplayers/@value`, `maxplayers/@value` |
| Play time | `playingtime/@value`, `minplaytime/@value`, `maxplaytime/@value` |
| Min age | `minage/@value` |
| Description | `description` (text content, HTML-entity-encoded) |
| Image / thumbnail | `image`, `thumbnail` (text URLs) |
| Categories | `link[@type='boardgamecategory']` |
| Mechanics | `link[@type='boardgamemechanic']` |
| Designers | `link[@type='boardgamedesigner']` |
| # raters | `statistics/ratings/usersrated/@value` |
| Avg user rating | `statistics/ratings/average/@value` |
| Geek (Bayesian) rating | `statistics/ratings/bayesaverage/@value` |
| **Complexity** | **`statistics/ratings/averageweight/@value`** (float, 1.0 light → 5.0 heaviest) |
| Ranks | `statistics/ratings/ranks/rank` (overall + per-subcategory) |

## Gotchas (the parts that bite)

1. **HTTP 202 = "queued, come back."** Heavy queries return 202 with no body on the first hit. Retry ~3× with ~5 s delay. The canonical Python client (`lcosmin/boardgamegeek`) defaults exactly to that.
2. **HTTP 503 = throttled.** No documented rate limit; community guidance is ~≤ 2 req/s sustained. Use a token-bucket limiter and exponential backoff.
3. **`averageweight` can be `0`** — known BGG bug where the API returns 0 even when the website shows a real value. **Treat `0` as "unknown."** Don't render it as "0.0 / 5 complexity" — hide the badge or show "—".
4. **Bot fingerprinting.** Default `curl`/generic UAs get 401. Send a real-ish User-Agent (and a contact email in production).
5. **Search vs. thing split.** Every "user types name → user picks game" flow is exactly two requests: one `/search`, then one `/thing?stats=1`. You cannot get complexity from `/search`.
6. **Batching `/thing`.** Community lore: up to ~20 IDs per request is safe. Larger batches occasionally truncate. Huge win for initial catalog imports.
7. **Fuzzy search.** Without `exact=1`, BGG returns prefix/substring matches. That's fine for "admin types a game name" UX, but expect to disambiguate by year or rank.

## How this maps to GameMatch screens

- **02 Admin Upload** — debounced query → `/search?query=…&type=boardgame` → list of `{id, name, year}`. Admin confirms one → server fetches `/thing?id=<id>&stats=1` and persists a normalized row in our own catalog.
- **03 Swiping** and **06 Game Profile** — read entirely from our own DB. Never call BGG at swipe time; the rate limit and 202 latency would tank the experience.
- **Refresh strategy** — BGG data changes slowly. A nightly batch re-fetch of the catalog (in chunks of ~20 IDs) is plenty.

## Reference clients worth reading

- [`lcosmin/boardgamegeek`](https://github.com/lcosmin/boardgamegeek) — mature Python client; canonical 202/503 retry + RPM limiter pattern. See `boardgamegeek/api.py` and `boardgamegeek/loaders/game.py`.
- [`monteslu/bgg`](https://github.com/monteslu/bgg) — minimal Node.js client; same call shape, useful if we go JS on the backend.

## Sources

- [BGG XML API2 wiki](https://boardgamegeek.com/wiki/page/BGG_XML_API2)
- [Using the XML API](https://boardgamegeek.com/using_the_xml_api)
- [Max Retry & Rate Limits thread](https://boardgamegeek.com/thread/3253874/max-retry-and-rate-limits-for-bgg-xml-api2)
- [Updated API Rate Limit Recommendation thread](https://boardgamegeek.com/thread/2388502/updated-api-rate-limit-recommendation)
- [`averageweight` returns 0 bug thread](https://boardgamegeek.com/thread/3051645/resolved-bgg-xml-api2-averageweight-is-0-for-some)
- [Tutorial for BGG_XML_API2](https://boardgamegeek.com/thread/2564656/tutorial-for-bgg-xml-api2)
