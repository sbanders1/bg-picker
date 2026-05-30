/**
 * Disk-backed cache for BoardGameGeek responses. Lives in a JSON file next to
 * the app state (.bgg-cache.json) so it survives Vite restarts.
 *
 * The goal is to retain as much BGG data as we can: once fetched, an entry is
 * reused — served fresh within a TTL, and served STALE as a fallback whenever a
 * live BGG call fails. BGG is flaky for us (401 IP-block, 202 queueing, 503
 * throttling — see docs/bgg-api.md), so this both cuts request volume and keeps
 * the catalog searchable when BGG is unreachable.
 *
 * Server-only: the "server" path segment keeps it out of the client bundle.
 * Not concurrency-safe at the file level — fine for a small LAN game night.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BggSearchResult, Game } from '$lib/types';

const CACHE_FILE = resolve(process.cwd(), '.bgg-cache.json');

// Freshness windows. BGG data changes slowly, so these are generous. Past the
// window we KEEP the entry and fall back to it if a live refetch fails.
export const SEARCH_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
export const THING_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type Entry<T> = { at: number; data: T };

type CacheShape = {
	search: Record<string, Entry<BggSearchResult[]>>;
	things: Record<string, Entry<Game>>;
};

function emptyCache(): CacheShape {
	return { search: {}, things: {} };
}

function load(): CacheShape {
	if (!existsSync(CACHE_FILE)) return emptyCache();
	try {
		const parsed = JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as Partial<CacheShape>;
		return { search: parsed.search ?? {}, things: parsed.things ?? {} };
	} catch {
		// Corrupt cache is non-fatal — start fresh; live calls will refill it.
		return emptyCache();
	}
}

const cache: CacheShape = load();

// Persist is debounced so a burst of writes (e.g. a batch import) collapses into
// a single disk write. Synchronous writeFileSync matches the app-state module.
let persistTimer: ReturnType<typeof setTimeout> | undefined;
function schedulePersist() {
	if (persistTimer) return;
	persistTimer = setTimeout(() => {
		persistTimer = undefined;
		try {
			writeFileSync(CACHE_FILE, JSON.stringify(cache), 'utf8');
		} catch {
			/* best-effort cache; ignore disk errors */
		}
	}, 250);
}

/** Cache key for a search. Normalizes query case/whitespace; folds in type + exact. */
export function searchKey(query: string, type: string, exact: boolean): string {
	return `${exact ? 'x:' : ''}${type}:${query.trim().toLowerCase()}`;
}

export function readSearch(
	key: string
): { results: BggSearchResult[]; fresh: boolean } | undefined {
	const e = cache.search[key];
	if (!e) return undefined;
	return { results: e.data, fresh: Date.now() - e.at < SEARCH_TTL_MS };
}

export function writeSearch(key: string, results: BggSearchResult[]) {
	cache.search[key] = { at: Date.now(), data: results };
	schedulePersist();
}

export function readThing(id: number | string): { game: Game; fresh: boolean } | undefined {
	const e = cache.things[String(id)];
	if (!e) return undefined;
	return { game: e.data, fresh: Date.now() - e.at < THING_TTL_MS };
}

export function writeThing(game: Game) {
	cache.things[String(game.id)] = { at: Date.now(), data: game };
	schedulePersist();
}
