import type { SeedProfile } from '$lib/profiles';
import { initialsOf } from '$lib/profiles';
import { fetchServerState, postAction } from '$lib/sync';

/** Decor palette cycle for auto-assigning colors to new players. */
const PALETTE: Array<{ bg: string; fg: string }> = [
	{ bg: 'var(--decor-sky)', fg: '#3F6FA8' },
	{ bg: 'var(--decor-cream)', fg: '#A67E2F' },
	{ bg: 'var(--decor-lavender)', fg: '#7B4FA8' },
	{ bg: 'var(--decor-cyan)', fg: '#3F8BA0' },
	{ bg: 'var(--decor-pink)', fg: '#A8508F' },
	{ bg: 'var(--decor-purple)', fg: '#6B388F' }
];

export const customProfiles = $state<{ items: SeedProfile[] }>({ items: [] });

// Expose the proxy to $lib/profiles.ts via globalThis so profileById() can fall
// back to customs without a circular import.
(globalThis as unknown as { __gmCustomProfiles?: { items: SeedProfile[] } }).__gmCustomProfiles =
	customProfiles;

export function addCustomProfile(name: string): SeedProfile | null {
	const trimmed = name.trim();
	if (!trimmed) return null;
	const id = `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
	const palette = PALETTE[customProfiles.items.length % PALETTE.length];
	const profile: SeedProfile = {
		id,
		name: trimmed,
		initial: initialsOf(trimmed),
		bg: palette.bg,
		fg: palette.fg
	};
	customProfiles.items.push(profile);
	postAction({ type: 'addCustomProfile', profile });
	return profile;
}

export function removeCustomProfile(id: string) {
	customProfiles.items = customProfiles.items.filter((p) => p.id !== id);
	postAction({ type: 'removeCustomProfile', id });
}

export function applyServerSnapshot(snap: { items: SeedProfile[] }) {
	customProfiles.items = [...snap.items];
}

export async function init() {
	const snap = await fetchServerState();
	if (snap) applyServerSnapshot(snap.customProfiles);
}
