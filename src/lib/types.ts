export type Profile = {
	id: string;
	name: string;
	avatar: string;
	/** Only an admin / host can add games to the catalog. */
	isAdmin?: boolean;
};

export type Rank = {
	id: string;
	name: string;
	friendlyname?: string;
	value: number | null;
};

export type Game = {
	id: number;
	name: string;
	yearPublished?: number;
	description?: string;
	image?: string;
	thumbnail?: string;
	minPlayers?: number;
	maxPlayers?: number;
	playingTime?: number;
	minPlayTime?: number;
	maxPlayTime?: number;
	minAge?: number;
	categories?: string[];
	mechanics?: string[];
	designers?: string[];
	usersRated?: number;
	averageRating?: number;
	bayesAverage?: number;
	/** BGG bug: API sometimes returns 0 even when site shows a value. We map 0 → null. */
	averageWeight?: number | null;
	ranks?: Rank[];
	/** Extra images for the game details modal. Mock-only for now; live BGG fetch is not wired. */
	photos?: string[];
};

export type BggSearchResult = {
	id: number;
	name: string;
	yearPublished?: number;
};

export type SwipeDirection = 'like' | 'pass';

export type SwipeRecord = {
	gameId: number;
	direction: SwipeDirection;
	at: number;
	profileId: string;
};

export type Match = {
	gameId: number;
	at: number;
	profileIds: string[];
};

/**
 * Discretised complexity bands used by the New Session filter UI. Map to
 * BGG `averageWeight` ranges via complexityBandToWeight() in $lib/filters.
 */
export type ComplexityBand = 'light' | 'medium-light' | 'medium' | 'medium-heavy' | 'heavy';

export type SessionFilters = {
	complexityMin?: ComplexityBand;
	complexityMax?: ComplexityBand;
	playTimeMin?: number;
	playTimeMax?: number;
	/** When set, only include games whose min/max player range covers this count. */
	fitPlayers?: number;
	excludedGameIds?: number[];
};

export type Group = {
	id: string;
	name: string;
	memberIds: string[];
	startedAt?: number;
	filters?: SessionFilters;
};

/**
 * Snapshot of all shared (server-side) state. The fields here exactly mirror
 * the shape of the per-slice client `$state` proxies.
 */
export type ServerState = {
	customProfiles: { items: SeedProfileLike[] };
	games: { catalog: Game[] };
	group: { current: Group | null; matches: Match[] };
	swipes: { byProfile: Record<string, { history: SwipeRecord[]; currentIndex: number }> };
	sessions: { closed: Session[] };
};

/** SeedProfile-shaped record for serialization. Mirrors $lib/profiles.SeedProfile. */
export type SeedProfileLike = {
	id: string;
	name: string;
	initial: string;
	bg: string;
	fg: string;
	isAdmin?: boolean;
};

/** Discriminated-union of every mutation the server accepts. */
export type Action =
	| { type: 'addGame'; game: Game }
	| { type: 'removeGame'; id: number }
	| { type: 'clearGames' }
	| { type: 'seedGames'; games: Game[] }
	| { type: 'joinGroup'; profileId: string; defaultName: string }
	| { type: 'removeMember'; profileId: string }
	| {
			type: 'createSession';
			name?: string;
			memberIds: string[];
			filters?: SessionFilters;
	  }
	| { type: 'clearGroup' }
	| { type: 'addMatch'; match: Match }
	| { type: 'like'; gameId: number; profileId: string }
	| { type: 'pass'; gameId: number; profileId: string }
	| { type: 'resetAllSwipes' }
	| { type: 'resetProfileSwipes'; profileId: string }
	| { type: 'closeSession' }
	| { type: 'clearAllSessions' }
	| { type: 'addCustomProfile'; profile: SeedProfileLike }
	| { type: 'removeCustomProfile'; id: string };

/**
 * An archived game-night session — snapshot of who played, what was in the
 * catalog, which games matched, and the winning pick.
 */
export type Session = {
	id: string;
	name: string;
	startedAt: number;
	endedAt: number;
	hostId?: string;
	memberIds: string[];
	gameIds: number[];
	matches: Match[];
	winnerGameId?: number;
};
