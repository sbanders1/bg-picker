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
		Object.assign(profile, JSON.parse(raw));
	} catch {
		/* corrupt entry — ignore */
	}
}
