import { settings } from '$lib/state/settings.svelte';
import { mockSearch, mockThing } from '$lib/bgg-mock';
import type { BggSearchResult, Game } from '$lib/types';

/** Search BGG (or the mock catalog) by name. Returns up to ~50 lightweight results. */
export async function searchGames(query: string): Promise<BggSearchResult[]> {
	if (settings.useMockBgg) return mockSearch(query);

	const res = await fetch(`/api/bgg/search?query=${encodeURIComponent(query)}&type=boardgame`);
	if (!res.ok) {
		const data = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(data.error ?? `Search failed: HTTP ${res.status}`);
	}
	const data = (await res.json()) as { results?: BggSearchResult[] };
	return data.results ?? [];
}

/** Fetch full details for one game by BGG id, including stats (complexity, rating, etc.). */
export async function fetchGame(id: number): Promise<Game> {
	if (settings.useMockBgg) {
		const g = await mockThing(id);
		if (!g) throw new Error(`Mock game ${id} not found`);
		return g;
	}

	const res = await fetch(`/api/bgg/thing?id=${id}&stats=1`);
	if (!res.ok) {
		const data = (await res.json().catch(() => ({}))) as { error?: string };
		throw new Error(data.error ?? `Fetch failed: HTTP ${res.status}`);
	}
	const data = (await res.json()) as { games?: Game[] };
	const g = data.games?.[0];
	if (!g) throw new Error(`Game ${id} not found in BGG response`);
	return g;
}
