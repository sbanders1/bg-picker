import type { SwipeRecord } from '$lib/types';
import { fetchServerState, postAction } from '$lib/sync';

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
	postAction({ type: 'like', gameId, profileId });
}

export function pass(gameId: number, profileId: string) {
	const b = ensure(profileId);
	b.history.push({ gameId, direction: 'pass', at: Date.now(), profileId });
	b.currentIndex++;
	postAction({ type: 'pass', gameId, profileId });
}

export function getHistory(profileId: string): SwipeRecord[] {
	return swipes.byProfile[profileId]?.history ?? [];
}

export function getCurrentIndex(profileId: string): number {
	return swipes.byProfile[profileId]?.currentIndex ?? 0;
}

export function getAllHistory(): SwipeRecord[] {
	return Object.values(swipes.byProfile).flatMap((b) => b.history);
}

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

export function resetProfile(profileId: string) {
	delete swipes.byProfile[profileId];
	postAction({ type: 'resetProfileSwipes', profileId });
}

export function resetAll() {
	swipes.byProfile = {};
	postAction({ type: 'resetAllSwipes' });
}

export function applyServerSnapshot(snap: { byProfile: Record<string, ProfileBucket> }) {
	swipes.byProfile = { ...snap.byProfile };
}

export async function init() {
	const snap = await fetchServerState();
	if (snap) applyServerSnapshot(snap.swipes);
}
