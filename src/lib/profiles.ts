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
		id: 'blake',
		name: 'Blake Anderson',
		initial: 'BA',
		bg: 'var(--decor-peach)',
		fg: '#B85C4A',
		isAdmin: true
	}
];

const byId: Record<string, SeedProfile> = Object.fromEntries(
	SEED_PROFILES.map((p) => [p.id, p])
);

// Custom profiles live in their own runes module; importing here would create a
// circular dep if a customProfile imports profileById. Resolve by lazy-importing
// inside profileById/nameOf via globalThis (cheap; runs on every call).
type CustomStore = { items: SeedProfile[] };
function customStore(): CustomStore | undefined {
	const w = globalThis as unknown as { __gmCustomProfiles?: CustomStore };
	return w.__gmCustomProfiles;
}

/** Look up a profile by id (seed roster or custom-added). Undefined for unknown ids. */
export function profileById(id: string): SeedProfile | undefined {
	if (byId[id]) return byId[id];
	return customStore()?.items.find((p) => p.id === id);
}

/** Display name for a profileId, with a graceful fallback. */
export function nameOf(id: string, fallback = 'Player'): string {
	return profileById(id)?.name ?? fallback;
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
