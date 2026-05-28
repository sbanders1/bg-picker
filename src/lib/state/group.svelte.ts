import type { Group, Match, SessionFilters } from '$lib/types';
import { fetchServerState, postAction } from '$lib/sync';

export const group = $state<{
	current: Group | null;
	matches: Match[];
}>({
	current: null,
	matches: []
});

function defaultSessionName(): string {
	const d = new Date();
	const day = d.toLocaleDateString(undefined, { weekday: 'long' });
	return `${day} Game Night`;
}

export function setGroup(g: Group) {
	group.current = g;
	// Bypass via a createSession action — setGroup isn't called from the app
	// flows anymore; kept as a public escape hatch but the server still hears.
	postAction({
		type: 'createSession',
		name: g.name,
		memberIds: g.memberIds,
		filters: g.filters
	});
}

export function joinGroup(profileId: string) {
	if (!profileId) return;
	// Optimistic local mirror of the server-side logic.
	if (!group.current) {
		group.current = {
			id: `g-${Date.now().toString(36)}`,
			name: defaultSessionName(),
			memberIds: [profileId],
			startedAt: Date.now()
		};
	} else if (!group.current.memberIds.includes(profileId)) {
		group.current.memberIds.push(profileId);
	}
	postAction({ type: 'joinGroup', profileId, defaultName: defaultSessionName() });
}

export function removeMember(profileId: string) {
	if (!group.current) return;
	group.current.memberIds = group.current.memberIds.filter((id) => id !== profileId);
	postAction({ type: 'removeMember', profileId });
}

export function createSession(opts: {
	name?: string;
	memberIds: string[];
	filters?: SessionFilters;
}) {
	const members = opts.memberIds.filter((id) => !!id);
	group.current = {
		id: `g-${Date.now().toString(36)}`,
		name: opts.name?.trim() || defaultSessionName(),
		memberIds: members,
		startedAt: Date.now(),
		filters: opts.filters
	};
	group.matches = [];
	postAction({
		type: 'createSession',
		name: opts.name,
		memberIds: members,
		filters: opts.filters
	});
}

export function updateFilters(filters: SessionFilters | undefined) {
	if (!group.current) return;
	group.current.filters = filters;
	// Express as a fresh createSession with the same name/members — keeps the
	// action surface small. Resets matches; OK since changing filters mid-session
	// invalidates them anyway.
	postAction({
		type: 'createSession',
		name: group.current.name,
		memberIds: group.current.memberIds,
		filters
	});
}

export function addMatch(m: Match) {
	if (!group.matches.some((existing) => existing.gameId === m.gameId)) {
		group.matches.push(m);
	}
	postAction({ type: 'addMatch', match: m });
}

export function clearGroup() {
	group.current = null;
	group.matches = [];
	postAction({ type: 'clearGroup' });
}

export function applyServerSnapshot(snap: { current: Group | null; matches: Match[] }) {
	group.current = snap.current;
	group.matches = [...snap.matches];
}

export async function init() {
	const snap = await fetchServerState();
	if (snap) applyServerSnapshot(snap.group);
}
