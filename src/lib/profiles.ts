/**
 * Canonical roster of seeded profiles, lifted from ProfilePicker so any
 * component (dashboard, swipe header, match celebration) can resolve a
 * profileId → display name + avatar styling.
 */

export type SeedProfile = {
	id: string;
	name: string;
	initial: string;
	/** CSS background value for the avatar circle. */
	bg: string;
	/** CSS color for the initial glyph (sibling shade of the bg pastel). */
	fg: string;
	/** Host privileges. Hosts can manage the catalog and see the group dashboard. */
	isAdmin?: boolean;
};

export const SEED_PROFILES: SeedProfile[] = [
	{
		id: 'alex',
		name: 'Alex Rivera',
		initial: 'AR',
		bg: 'var(--decor-peach)',
		fg: '#B85C4A',
		isAdmin: true
	},
	{ id: 'sam', name: 'Sam Brooks', initial: 'SB', bg: 'var(--decor-mint)', fg: '#3A8A5C' }
];

const byId: Record<string, SeedProfile> = Object.fromEntries(
	SEED_PROFILES.map((p) => [p.id, p])
);

/** Look up a profile by id. Returns undefined for unknown ids. */
export function profileById(id: string): SeedProfile | undefined {
	return byId[id];
}

/** Display name for a profileId, with a graceful fallback. */
export function nameOf(id: string, fallback = 'Player'): string {
	return byId[id]?.name ?? fallback;
}

/**
 * Compute 2-letter initials from a display name.
 * - Two+ words: first letter of first + first letter of last (e.g. "Alex Rivera" → "AR").
 * - Single word: first two letters (e.g. "Host" → "HO").
 * - Empty / falsy: "?"
 */
export function initialsOf(name: string): string {
	const parts = name.trim().split(/\s+/).filter(Boolean);
	if (parts.length >= 2) {
		return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
	}
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return '?';
}
