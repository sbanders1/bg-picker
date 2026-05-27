import type { Group, Match } from '$lib/types';

const KEY = 'gm.group';

export const group = $state<{
	current: Group | null;
	matches: Match[];
}>({
	current: null,
	matches: []
});

export function setGroup(g: Group) {
	group.current = g;
	persist();
}

export function addMatch(m: Match) {
	group.matches.push(m);
	persist();
}

export function clearGroup() {
	group.current = null;
	group.matches = [];
	if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
}

function persist() {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(KEY, JSON.stringify({ current: group.current, matches: group.matches }));
}

export function init() {
	if (typeof localStorage === 'undefined') return;
	const raw = localStorage.getItem(KEY);
	if (!raw) return;
	try {
		const parsed = JSON.parse(raw);
		group.current = parsed.current ?? null;
		group.matches = parsed.matches ?? [];
	} catch {
		/* corrupt entry — ignore */
	}
}
