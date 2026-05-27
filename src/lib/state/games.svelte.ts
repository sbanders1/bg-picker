import type { Game } from '$lib/types';

const KEY = 'gm.games';

export const games = $state<{
	catalog: Game[];
	byId: Record<number, Game>;
}>({
	catalog: [],
	byId: {}
});

export function addGame(g: Game) {
	if (games.byId[g.id]) {
		Object.assign(games.byId[g.id], g);
	} else {
		games.byId[g.id] = g;
		games.catalog.push(g);
	}
	persist();
}

export function getGame(id: number): Game | undefined {
	return games.byId[id];
}

export function clearGames() {
	games.catalog = [];
	games.byId = {};
	if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
}

function persist() {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(KEY, JSON.stringify(games.catalog));
}

export function init() {
	if (typeof localStorage === 'undefined') return;
	const raw = localStorage.getItem(KEY);
	if (!raw) return;
	try {
		const parsed: Game[] = JSON.parse(raw);
		games.catalog = parsed;
		games.byId = Object.fromEntries(parsed.map((g) => [g.id, g]));
	} catch {
		/* corrupt entry — ignore */
	}
}
