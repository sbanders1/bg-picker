import type { Profile } from '$lib/types';
import { group, joinGroup } from './group.svelte';

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
	if (raw) {
		try {
			const parsed = JSON.parse(raw);
			// Migration: drop legacy seed ids no longer in the roster ('host' was the
			// old admin entity; 'alex' and 'sam' were earlier seed defaults).
			if (parsed?.id === 'host' || parsed?.id === 'alex' || parsed?.id === 'sam') {
				localStorage.removeItem(KEY);
				return;
			}
			Object.assign(profile, parsed);
		} catch {
			/* corrupt entry — ignore */
		}
	}
	// Heal stale state: a profile may have been written before joinGroup was wired
	// into the pick flow. Make sure the active player is always a group member.
	// This is intentionally imperative — avoids needing a reactive `$effect` to sync
	// `$state` with `$state` (see CLAUDE.md "$effect is a last resort").
	if (profile.id && !group.current) {
		joinGroup(profile.id);
	}
}
