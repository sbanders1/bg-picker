import type { ComplexityBand, Game, SessionFilters } from '$lib/types';

export const COMPLEXITY_BANDS: ComplexityBand[] = [
	'light',
	'medium-light',
	'medium',
	'medium-heavy',
	'heavy'
];

const BAND_LABEL: Record<ComplexityBand, string> = {
	light: 'Light',
	'medium-light': 'Medium-Light',
	medium: 'Medium',
	'medium-heavy': 'Medium-Heavy',
	heavy: 'Heavy'
};

/** Boundary weights so a band's min/max can be checked against `averageWeight`. */
const BAND_RANGE: Record<ComplexityBand, [number, number]> = {
	light: [1.0, 2.0],
	'medium-light': [2.0, 2.5],
	medium: [2.5, 3.5],
	'medium-heavy': [3.5, 4.5],
	heavy: [4.5, 5.0]
};

export function complexityLabel(b: ComplexityBand): string {
	return BAND_LABEL[b];
}

export function complexityBandToWeight(b: ComplexityBand, end: 'min' | 'max'): number {
	return BAND_RANGE[b][end === 'min' ? 0 : 1];
}

export function complexityBandIndex(b: ComplexityBand): number {
	return COMPLEXITY_BANDS.indexOf(b);
}

/** Does this game pass every active filter? Filters with no value are skipped. */
export function passesSessionFilters(g: Game, f?: SessionFilters): boolean {
	if (!f) return true;

	if (f.excludedGameIds?.includes(g.id)) return false;

	if (f.fitPlayers != null) {
		const min = g.minPlayers ?? 0;
		const max = g.maxPlayers ?? Infinity;
		if (f.fitPlayers < min || f.fitPlayers > max) return false;
	}

	if (f.complexityMin || f.complexityMax) {
		const w = g.averageWeight;
		// `null` / `undefined` weight means unknown — leave the game in so we don't
		// silently nuke whole catalogs. Treat 0 as missing too (BGG bug).
		if (w != null && w !== 0) {
			const minW = f.complexityMin ? complexityBandToWeight(f.complexityMin, 'min') : 0;
			const maxW = f.complexityMax ? complexityBandToWeight(f.complexityMax, 'max') : 5;
			if (w < minW || w > maxW) return false;
		}
	}

	if (f.playTimeMin != null || f.playTimeMax != null) {
		// Prefer playingTime; fall back to maxPlayTime then minPlayTime.
		const t = g.playingTime ?? g.maxPlayTime ?? g.minPlayTime ?? null;
		if (t != null) {
			if (f.playTimeMin != null && t < f.playTimeMin) return false;
			if (f.playTimeMax != null && t > f.playTimeMax) return false;
		}
	}

	return true;
}

export function applySessionFilters(games: Game[], f?: SessionFilters): Game[] {
	if (!f) return games;
	return games.filter((g) => passesSessionFilters(g, f));
}
