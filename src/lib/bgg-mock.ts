import type { BggSearchResult, Game } from '$lib/types';

// Stable, image-rich mock dataset of well-known board games.
// Image URLs use picsum.photos with a per-id seed — random-looking but stable.
function img(seed: number, w = 600, h = 400) {
	return `https://picsum.photos/seed/bg${seed}/${w}/${h}`;
}

function photos(seed: number, count = 4): string[] {
	return Array.from({ length: count }, (_, i) => `https://picsum.photos/seed/bg${seed}-${i + 1}/900/600`);
}

export const mockGames: Game[] = [
	{
		id: 13,
		name: 'CATAN',
		yearPublished: 1995,
		minPlayers: 3,
		maxPlayers: 4,
		minPlayTime: 60,
		maxPlayTime: 120,
		playingTime: 120,
		minAge: 10,
		description:
			"Pick up cards, trade resources, build settlements — the original gateway to modern board gaming. Each turn the dice decide which players' lands produce wheat, sheep, ore, brick, or wood.",
		image: img(13),
		thumbnail: img(13, 200, 200),
		categories: ['Economic', 'Negotiation'],
		mechanics: ['Dice Rolling', 'Route Building', 'Trading'],
		designers: ['Klaus Teuber'],
		usersRated: 124000,
		averageRating: 7.1,
		bayesAverage: 7.05,
		averageWeight: 2.32
	},
	{
		id: 266192,
		name: 'Wingspan',
		yearPublished: 2019,
		minPlayers: 1,
		maxPlayers: 5,
		minPlayTime: 40,
		maxPlayTime: 70,
		playingTime: 70,
		minAge: 10,
		description:
			'A medium-weight, card-driven engine builder where players are bird enthusiasts seeking to discover and attract the best birds to their wildlife preserves.',
		image: img(266192),
		thumbnail: img(266192, 200, 200),
		categories: ['Animals', 'Card Game'],
		mechanics: ['End Game Bonuses', 'Open Drafting', 'Set Collection'],
		designers: ['Elizabeth Hargrave'],
		usersRated: 95000,
		averageRating: 8.1,
		bayesAverage: 7.84,
		averageWeight: 2.45
	},
	{
		id: 9209,
		name: 'Ticket to Ride',
		yearPublished: 2004,
		minPlayers: 2,
		maxPlayers: 5,
		minPlayTime: 30,
		maxPlayTime: 60,
		playingTime: 60,
		minAge: 8,
		description:
			"A cross-country train adventure where players collect colored train cards to claim railway routes, building the longest continuous track to score the most points.",
		image: img(9209),
		thumbnail: img(9209, 200, 200),
		categories: ['Trains', 'Travel'],
		mechanics: ['Set Collection', 'Route Building'],
		designers: ['Alan R. Moon'],
		usersRated: 87000,
		averageRating: 7.4,
		bayesAverage: 7.2,
		averageWeight: 1.85
	},
	{
		id: 230802,
		name: 'Azul',
		yearPublished: 2017,
		minPlayers: 2,
		maxPlayers: 4,
		minPlayTime: 30,
		maxPlayTime: 45,
		playingTime: 45,
		minAge: 8,
		description:
			"Tile-drafting and pattern-building in 15th-century Portugal. Players take turns drafting colored tiles from suppliers to their player board, scoring on completed rows and columns.",
		image: img(230802),
		thumbnail: img(230802, 200, 200),
		categories: ['Abstract Strategy', 'Puzzle'],
		mechanics: ['Drafting', 'Pattern Building', 'Set Collection'],
		designers: ['Michael Kiesling'],
		usersRated: 91000,
		averageRating: 7.8,
		bayesAverage: 7.62,
		averageWeight: 1.78
	},
	{
		id: 178900,
		name: 'Codenames',
		yearPublished: 2015,
		minPlayers: 2,
		maxPlayers: 8,
		minPlayTime: 15,
		maxPlayTime: 20,
		playingTime: 15,
		minAge: 10,
		description:
			"Two teams race to identify their secret agents from a 25-word grid using one-word clues from their spymaster. Communicate cleverly without tipping off the other team.",
		image: img(178900),
		thumbnail: img(178900, 200, 200),
		categories: ['Party Game', 'Word Game'],
		mechanics: ['Communication Limits', 'Team-Based Game'],
		designers: ['Vlaada Chvátil'],
		usersRated: 88000,
		averageRating: 7.6,
		bayesAverage: 7.45,
		averageWeight: 1.27
	},
	{
		id: 30549,
		name: 'Pandemic',
		yearPublished: 2008,
		minPlayers: 2,
		maxPlayers: 4,
		minPlayTime: 45,
		maxPlayTime: 60,
		playingTime: 45,
		minAge: 8,
		description:
			"A cooperative race against the clock to discover cures for four diseases threatening humanity. Each player takes a specialized role with unique abilities.",
		image: img(30549),
		thumbnail: img(30549, 200, 200),
		categories: ['Medical', 'Cooperative'],
		mechanics: ['Action Points', 'Cooperative', 'Variable Player Powers'],
		designers: ['Matt Leacock'],
		usersRated: 115000,
		averageRating: 7.6,
		bayesAverage: 7.43,
		averageWeight: 2.41
	},
	{
		id: 68448,
		name: '7 Wonders',
		yearPublished: 2010,
		minPlayers: 2,
		maxPlayers: 7,
		minPlayTime: 30,
		maxPlayTime: 30,
		playingTime: 30,
		minAge: 10,
		description:
			"Lead one of the ancient cities of the world. Draft cards over three ages to develop your civilization through commerce, science, military, and grand wonders.",
		image: img(68448),
		thumbnail: img(68448, 200, 200),
		categories: ['Ancient', 'Card Game', 'Civilization'],
		mechanics: ['Card Drafting', 'Set Collection'],
		designers: ['Antoine Bauza'],
		usersRated: 99000,
		averageRating: 7.7,
		bayesAverage: 7.54,
		averageWeight: 2.32
	},
	{
		id: 822,
		name: 'Carcassonne',
		yearPublished: 2000,
		minPlayers: 2,
		maxPlayers: 5,
		minPlayTime: 30,
		maxPlayTime: 45,
		playingTime: 45,
		minAge: 7,
		description:
			"Build a medieval landscape one tile at a time — roads, cities, monasteries, and fields — claiming features with meeples to score across the unfolding map.",
		image: img(822),
		thumbnail: img(822, 200, 200),
		categories: ['Medieval', 'Territory Building'],
		mechanics: ['Area Majority', 'Tile Placement'],
		designers: ['Klaus-Jürgen Wrede'],
		usersRated: 119000,
		averageRating: 7.4,
		bayesAverage: 7.28,
		averageWeight: 1.91
	},
	{
		id: 148228,
		name: 'Splendor',
		yearPublished: 2014,
		minPlayers: 2,
		maxPlayers: 4,
		minPlayTime: 30,
		maxPlayTime: 30,
		playingTime: 30,
		minAge: 10,
		description:
			"Gem merchants of the Renaissance. Collect raw gems, buy cards that produce permanent gem discounts, and attract the attention of visiting nobles to win.",
		image: img(148228),
		thumbnail: img(148228, 200, 200),
		categories: ['Card Game', 'Renaissance'],
		mechanics: ['Engine Building', 'Set Collection'],
		designers: ['Marc André'],
		usersRated: 84000,
		averageRating: 7.4,
		bayesAverage: 7.23,
		averageWeight: 1.79
	},
	{
		id: 174430,
		name: 'Gloomhaven',
		yearPublished: 2017,
		minPlayers: 1,
		maxPlayers: 4,
		minPlayTime: 60,
		maxPlayTime: 120,
		playingTime: 120,
		minAge: 14,
		description:
			"A persistent, cooperative campaign of tactical combat in a unique fantasy world. Hours upon hours of branching scenarios as your party of mercenaries grows.",
		image: img(174430),
		thumbnail: img(174430, 200, 200),
		categories: ['Adventure', 'Cooperative', 'Fantasy'],
		mechanics: ['Campaign', 'Hand Management', 'Variable Player Powers'],
		designers: ['Isaac Childres'],
		usersRated: 64000,
		averageRating: 8.7,
		bayesAverage: 8.35,
		averageWeight: 3.91
	},
	{
		id: 162886,
		name: 'Spirit Island',
		yearPublished: 2017,
		minPlayers: 1,
		maxPlayers: 4,
		minPlayTime: 90,
		maxPlayTime: 120,
		playingTime: 120,
		minAge: 14,
		description:
			"A cooperative, settler-destruction strategy game. Players are powerful spirits defending their island from colonizing invaders, channeling fear and elemental might.",
		image: img(162886),
		thumbnail: img(162886, 200, 200),
		categories: ['Cooperative', 'Fantasy', 'Strategy'],
		mechanics: ['Asymmetric', 'Hand Management', 'Variable Player Powers'],
		designers: ['R. Eric Reuss'],
		usersRated: 58000,
		averageRating: 8.4,
		bayesAverage: 8.1,
		averageWeight: 4.01
	},
	{
		id: 167791,
		name: 'Terraforming Mars',
		yearPublished: 2016,
		minPlayers: 1,
		maxPlayers: 5,
		minPlayTime: 120,
		maxPlayTime: 120,
		playingTime: 120,
		minAge: 12,
		description:
			"Rival corporations work to make Mars habitable — raising temperature, oxygen, and water levels — while competing for milestones and awards on the red planet.",
		image: img(167791),
		thumbnail: img(167791, 200, 200),
		categories: ['Economic', 'Science Fiction', 'Space Exploration'],
		mechanics: ['Card Drafting', 'Engine Building', 'Tile Placement'],
		designers: ['Jacob Fryxelius'],
		usersRated: 102000,
		averageRating: 8.4,
		bayesAverage: 8.16,
		averageWeight: 3.27
	},
	{
		id: 224517,
		name: 'Brass: Birmingham',
		yearPublished: 2018,
		minPlayers: 2,
		maxPlayers: 4,
		minPlayTime: 60,
		maxPlayTime: 120,
		playingTime: 120,
		minAge: 14,
		description:
			"An economic strategy game set in the industrial revolution. Build networks, develop industries, and bring iron, coal, beer, cotton, and pottery to market.",
		image: img(224517),
		thumbnail: img(224517, 200, 200),
		categories: ['Economic', 'Industry / Manufacturing'],
		mechanics: ['Hand Management', 'Network Building', 'Loans'],
		designers: ['Martin Wallace'],
		usersRated: 49000,
		averageRating: 8.6,
		bayesAverage: 8.42,
		averageWeight: 3.92
	},
	{
		id: 199792,
		name: 'Everdell',
		yearPublished: 2018,
		minPlayers: 1,
		maxPlayers: 4,
		minPlayTime: 40,
		maxPlayTime: 80,
		playingTime: 80,
		minAge: 10,
		description:
			"Within the charming woodland of Everdell, build a city of critters and constructions through worker placement and tableau building over four seasons.",
		image: img(199792),
		thumbnail: img(199792, 200, 200),
		categories: ['Animals', 'City Building'],
		mechanics: ['Tableau Building', 'Worker Placement'],
		designers: ['James A. Wilson'],
		usersRated: 56000,
		averageRating: 8.0,
		bayesAverage: 7.78,
		averageWeight: 2.81
	},
	{
		id: 36218,
		name: 'Dominion',
		yearPublished: 2008,
		minPlayers: 2,
		maxPlayers: 4,
		minPlayTime: 30,
		maxPlayTime: 30,
		playingTime: 30,
		minAge: 13,
		description:
			"The deckbuilder that started it all. Build your kingdom by acquiring a deck of cards from a shared market, each game's market shaped by which expansions you mix in.",
		image: img(36218),
		thumbnail: img(36218, 200, 200),
		categories: ['Card Game', 'Medieval'],
		mechanics: ['Deck Building', 'Hand Management'],
		designers: ['Donald X. Vaccarino'],
		usersRated: 88000,
		averageRating: 7.6,
		bayesAverage: 7.42,
		averageWeight: 2.36
	}
].map((g) => ({ ...g, photos: photos(g.id) }));

const byId: Record<number, Game> = Object.fromEntries(mockGames.map((g) => [g.id, g]));

/** Tiny async delay so mock calls feel like real network. */
function nap(ms = 180) {
	return new Promise<void>((r) => setTimeout(r, ms));
}

export async function mockSearch(query: string): Promise<BggSearchResult[]> {
	await nap();
	const q = query.toLowerCase().trim();
	if (!q) return [];
	return mockGames
		.filter((g) => g.name.toLowerCase().includes(q))
		.map((g) => ({ id: g.id, name: g.name, yearPublished: g.yearPublished }));
}

export async function mockThing(id: number): Promise<Game | undefined> {
	await nap();
	return byId[id];
}
