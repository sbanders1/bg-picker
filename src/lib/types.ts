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

export type Group = {
	id: string;
	name: string;
	memberIds: string[];
};
