import type { SwipeRecord } from '$lib/types';

const KEY = 'gm.swipes';

export const swipes = $state<{
	history: SwipeRecord[];
	currentIndex: number;
}>({
	history: [],
	currentIndex: 0
});

export function like(gameId: number, profileId: string) {
	swipes.history.push({ gameId, direction: 'like', at: Date.now(), profileId });
	swipes.currentIndex++;
	persist();
}

export function pass(gameId: number, profileId: string) {
	swipes.history.push({ gameId, direction: 'pass', at: Date.now(), profileId });
	swipes.currentIndex++;
	persist();
}

export function reset() {
	swipes.history = [];
	swipes.currentIndex = 0;
	if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
}

function persist() {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(
		KEY,
		JSON.stringify({ history: swipes.history, currentIndex: swipes.currentIndex })
	);
}

export function init() {
	if (typeof localStorage === 'undefined') return;
	const raw = localStorage.getItem(KEY);
	if (!raw) return;
	try {
		const parsed = JSON.parse(raw);
		swipes.history = parsed.history ?? [];
		swipes.currentIndex = parsed.currentIndex ?? 0;
	} catch {
		/* corrupt entry — ignore */
	}
}
