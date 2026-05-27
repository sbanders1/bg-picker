import type { SwipeRecord } from '$lib/types';

const KEY = 'gm.swipes';

type ProfileBucket = {
	history: SwipeRecord[];
	currentIndex: number;
};

export const swipes = $state<{
	byProfile: Record<string, ProfileBucket>;
}>({
	byProfile: {}
});

function ensure(profileId: string): ProfileBucket {
	if (!swipes.byProfile[profileId]) {
		swipes.byProfile[profileId] = { history: [], currentIndex: 0 };
	}
	return swipes.byProfile[profileId];
}

export function like(gameId: number, profileId: string) {
	const b = ensure(profileId);
	b.history.push({ gameId, direction: 'like', at: Date.now(), profileId });
	b.currentIndex++;
	persist();
}

export function pass(gameId: number, profileId: string) {
	const b = ensure(profileId);
	b.history.push({ gameId, direction: 'pass', at: Date.now(), profileId });
	b.currentIndex++;
	persist();
}

/** History for a single profile (empty array if they haven't swiped yet). */
export function getHistory(profileId: string): SwipeRecord[] {
	return swipes.byProfile[profileId]?.history ?? [];
}

/** Where this profile is in the swipe stack (0 if they haven't started). */
export function getCurrentIndex(profileId: string): number {
	return swipes.byProfile[profileId]?.currentIndex ?? 0;
}

/** Flat history across every profile — for the group-level dashboard. */
export function getAllHistory(): SwipeRecord[] {
	return Object.values(swipes.byProfile).flatMap((b) => b.history);
}

/**
 * Returns the list of profileIds who have liked a game IF every member has liked it,
 * else null. Used to detect unanimous matches.
 */
export function gameMatchedBy(gameId: number, memberIds: string[]): string[] | null {
	if (memberIds.length === 0) return null;
	const likers = new Set<string>();
	for (const bucket of Object.values(swipes.byProfile)) {
		for (const r of bucket.history) {
			if (r.gameId === gameId && r.direction === 'like') likers.add(r.profileId);
		}
	}
	for (const id of memberIds) {
		if (!likers.has(id)) return null;
	}
	return [...memberIds];
}

/** Reset one profile's swipes (e.g., "start over"). */
export function resetProfile(profileId: string) {
	delete swipes.byProfile[profileId];
	persist();
}

/** Reset every profile's swipes. */
export function resetAll() {
	swipes.byProfile = {};
	if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
}

function persist() {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(KEY, JSON.stringify({ byProfile: swipes.byProfile }));
}

export function init() {
	if (typeof localStorage === 'undefined') return;
	const raw = localStorage.getItem(KEY);
	if (!raw) return;
	try {
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === 'object' && parsed.byProfile) {
			swipes.byProfile = parsed.byProfile;
		}
		// Old (pre-multi-profile) entries are silently dropped — no migration path.
	} catch {
		/* corrupt entry — ignore */
	}
}
