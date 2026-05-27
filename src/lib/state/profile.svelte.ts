import type { Profile } from '$lib/types';

const KEY = 'gm.profile';

export const profile = $state<Profile>({
	id: '',
	name: '',
	avatar: ''
});

export function setProfile(next: Partial<Profile>) {
	Object.assign(profile, next);
	persist();
}

export function clearProfile() {
	profile.id = '';
	profile.name = '';
	profile.avatar = '';
	if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY);
}

function persist() {
	if (typeof localStorage === 'undefined') return;
	localStorage.setItem(KEY, JSON.stringify(profile));
}

export function init() {
	if (typeof localStorage === 'undefined') return;
	const raw = localStorage.getItem(KEY);
	if (!raw) return;
	try {
		const parsed = JSON.parse(raw);
		// Migration: 'host' is no longer a distinct profile — it's a role on a seed profile.
		// Drop a stale 'host' entry so the user re-picks a real seed (Alex/Sam) cleanly.
		if (parsed?.id === 'host') {
			localStorage.removeItem(KEY);
			return;
		}
		Object.assign(profile, parsed);
	} catch {
		/* corrupt entry — ignore */
	}
}
