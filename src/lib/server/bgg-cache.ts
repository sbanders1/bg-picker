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
import { readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
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
		// This file is meant to accumulate for the long haul — never silently throw
		// it away. Preserve the unreadable copy for recovery, then start fresh.
		// (Atomic writes below make reaching this path very unlikely.)
		try {
			renameSync(CACHE_FILE, `${CACHE_FILE}.corrupt-${Date.now()}`);
		} catch {
			/* couldn't set aside; next persist will overwrite */
		}
		return emptyCache();
	}
}

const cache: CacheShape = load();

// Persist is debounced so a burst of writes (e.g. a batch import) collapses into
// a single disk write.
let persistTimer: ReturnType<typeof setTimeout> | undefined;

// Atomic write: serialize to a temp file, then rename over the real one. rename()
// is atomic on the same filesystem, so a crash mid-write can never leave a
// truncated/corrupt cache — readers see either the old file or the complete new
// one. This is what makes indefinite, never-lose-it accumulation safe.
function flush() {
	persistTimer = undefined;
	try {
		const tmp = `${CACHE_FILE}.tmp`;
		writeFileSync(tmp, JSON.stringify(cache), 'utf8');
		renameSync(tmp, CACHE_FILE);
	} catch {
		/* best-effort; data stays in memory and retries on the next write */
	}
}

function schedulePersist() {
	if (persistTimer) return;
	persistTimer = setTimeout(flush, 250);
}

// Land the last debounced batch on a graceful shutdown. (Doesn't fire on an
// abrupt SIGKILL, but atomic writes mean the worst case there is losing only the
// most recent ~250ms of entries, which simply re-cache on next search.)
process.once('beforeExit', () => {
	if (persistTimer) {
		clearTimeout(persistTimer);
		flush();
	}
});

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
