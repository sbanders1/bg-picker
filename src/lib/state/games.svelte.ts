import type { Game } from '$lib/types';
import { fetchServerState, postAction } from '$lib/sync';

export const games = $state<{
	catalog: Game[];
	byId: Record<number, Game>;
}>({
	catalog: [],
	byId: {}
});

function indexByCatalog() {
	games.byId = Object.fromEntries(games.catalog.map((g) => [g.id, g]));
}

export function addGame(g: Game) {
	// Optimistic local write — keeps the UI snappy. Server broadcast will
	// trigger a full-state refetch which reconciles.
	if (games.byId[g.id]) {
		Object.assign(games.byId[g.id], g);
	} else {
		games.byId[g.id] = g;
		games.catalog.push(g);
	}
	postAction({ type: 'addGame', game: g });
}

export function getGame(id: number): Game | undefined {
	return games.byId[id];
}

export function removeGame(id: number) {
	if (!games.byId[id]) return;
	delete games.byId[id];
	const idx = games.catalog.findIndex((g) => g.id === id);
	if (idx >= 0) games.catalog.splice(idx, 1);
	postAction({ type: 'removeGame', id });
}

export function clearGames() {
	games.catalog = [];
	games.byId = {};
	postAction({ type: 'clearGames' });
}

/** Replace state from a server snapshot (used by init + SSE refetch). */
export function applyServerSnapshot(catalog: Game[]) {
	games.catalog = [...catalog];
	indexByCatalog();
}

export async function init() {
	const snap = await fetchServerState();
	if (snap) applyServerSnapshot(snap.games.catalog);
}
