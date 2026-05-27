import type { Session } from '$lib/types';
import { group, clearGroup } from './group.svelte';
import { games } from './games.svelte';
import { resetAll as resetSwipes } from './swipes.svelte';

const KEY = 'gm.sessions';

export const sessions = $state<{
	closed: Session[];
}>({
	closed: []
});

/**
 * Snapshot the current group + catalog + matches into a closed session, then
 * reset the live swipe + group state so a new session can begin.
 *
 * Returns the archived session id, or null if there's no active group to close.
 *
 * Catalog (games) is intentionally NOT cleared — hosts usually keep their library
 * across nights; a separate clearGames() exists for that.
 */
export function closeSession(): string | null {
	const g = group.current;
	if (!g) return null;
	const matches = [...group.matches];
	const winnerGameId = matches[0]?.gameId;
	const archived: Session = {
		id: `s-${Date.now().toString(36)}`,
		name: g.name,
		startedAt: g.startedAt ?? Date.now(),
		endedAt: Date.now(),
		memberIds: [...g.memberIds],
		gameIds: games.catalog.map((x) => x.id),
		matches,
		winnerGameId
	};
	sessions.closed.unshift(archived);
	persist();

	// Reset live state for the next session. We keep games.catalog by design.
	clearGroup();
	resetSwipes();
	return archived.id;
}

export function clearAllSessions() {
	sessions.closed = [];
	if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
}

function persist() {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(KEY, JSON.stringify({ closed: sessions.closed }));
}

export function init() {
	if (typeof localStorage === 'undefined') return;
	const raw = localStorage.getItem(KEY);
	if (!raw) return;
	try {
		const parsed = JSON.parse(raw);
		if (Array.isArray(parsed?.closed)) sessions.closed = parsed.closed;
	} catch {
		/* corrupt entry — ignore */
	}
}
