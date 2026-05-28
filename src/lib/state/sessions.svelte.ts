import type { Session } from '$lib/types';
import { fetchServerState, postAction } from '$lib/sync';
import { group } from './group.svelte';
import { games } from './games.svelte';
import { swipes } from './swipes.svelte';

export const sessions = $state<{
	closed: Session[];
}>({
	closed: []
});

/**
 * Snapshot the current group + matches + catalog into a closed Session, then
 * reset the live group + swipes. The server is the source of truth so this
 * just mirrors the equivalent server action locally for optimistic UI.
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
	group.current = null;
	group.matches = [];
	swipes.byProfile = {};
	postAction({ type: 'closeSession' });
	return archived.id;
}

export function clearAllSessions() {
	sessions.closed = [];
	postAction({ type: 'clearAllSessions' });
}

export function applyServerSnapshot(snap: { closed: Session[] }) {
	sessions.closed = [...snap.closed];
}

export async function init() {
	const snap = await fetchServerState();
	if (snap) applyServerSnapshot(snap.sessions);
}
