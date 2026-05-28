/**
 * Server-side state for cross-device multiplayer. Lives in a single JSON file
 * on disk so it survives Vite restarts. Not concurrency-safe at the file level
 * — fine for a small LAN game night (last-writer-wins, sub-second writes).
 *
 * NOT to be imported from client code. The "server" segment of the path is a
 * SvelteKit convention that keeps it out of the client bundle.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Action, ServerState, Game, SessionFilters } from '$lib/types';
import { mockGames } from '$lib/bgg-mock';

const STATE_FILE = resolve(process.cwd(), '.gamematch-state.json');

function defaultName(): string {
	const d = new Date();
	const day = d.toLocaleDateString(undefined, { weekday: 'long' });
	return `${day} Game Night`;
}

function emptyState(): ServerState {
	// Seed catalog from the mock library so a fresh server has games to swipe on
	// — same behavior as the per-device localStorage seeding had previously.
	return {
		customProfiles: { items: [] },
		games: { catalog: [...mockGames] },
		group: { current: null, matches: [] },
		swipes: { byProfile: {} },
		sessions: { closed: [] }
	};
}

function load(): ServerState {
	if (!existsSync(STATE_FILE)) {
		const s = emptyState();
		writeFileSync(STATE_FILE, JSON.stringify(s, null, 2), 'utf8');
		return s;
	}
	try {
		const raw = readFileSync(STATE_FILE, 'utf8');
		const parsed = JSON.parse(raw) as Partial<ServerState>;
		// Defensive merge — old files without newer slices still work.
		const base = emptyState();
		return {
			customProfiles: parsed.customProfiles ?? base.customProfiles,
			games: parsed.games ?? base.games,
			group: parsed.group ?? base.group,
			swipes: parsed.swipes ?? base.swipes,
			sessions: parsed.sessions ?? base.sessions
		};
	} catch {
		const s = emptyState();
		writeFileSync(STATE_FILE, JSON.stringify(s, null, 2), 'utf8');
		return s;
	}
}

let state: ServerState = load();

// SSE subscriber list. Each subscriber is a function we call with the latest
// state snapshot whenever ANY action runs.
type Subscriber = () => void;
const subscribers = new Set<Subscriber>();

export function subscribe(fn: Subscriber): () => void {
	subscribers.add(fn);
	return () => subscribers.delete(fn);
}

function broadcast() {
	for (const fn of subscribers) {
		try {
			fn();
		} catch {
			/* sub threw — ignore, keep going */
		}
	}
}

function persist() {
	writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

export function getState(): ServerState {
	return state;
}

// --- Action dispatcher ---

function ensureBucket(profileId: string) {
	if (!state.swipes.byProfile[profileId]) {
		state.swipes.byProfile[profileId] = { history: [], currentIndex: 0 };
	}
	return state.swipes.byProfile[profileId];
}

export function applyAction(action: Action): ServerState {
	switch (action.type) {
		case 'addGame': {
			const g = action.game;
			const idx = state.games.catalog.findIndex((x) => x.id === g.id);
			if (idx >= 0) state.games.catalog[idx] = g;
			else state.games.catalog.push(g);
			break;
		}
		case 'removeGame': {
			state.games.catalog = state.games.catalog.filter((g) => g.id !== action.id);
			break;
		}
		case 'clearGames': {
			state.games.catalog = [];
			break;
		}
		case 'seedGames': {
			state.games.catalog = [...action.games];
			break;
		}
		case 'joinGroup': {
			if (!action.profileId) break;
			if (!state.group.current) {
				state.group.current = {
					id: `g-${Date.now().toString(36)}`,
					name: action.defaultName || defaultName(),
					memberIds: [action.profileId],
					startedAt: Date.now()
				};
			} else if (!state.group.current.memberIds.includes(action.profileId)) {
				state.group.current.memberIds.push(action.profileId);
			}
			break;
		}
		case 'removeMember': {
			if (!state.group.current) break;
			state.group.current.memberIds = state.group.current.memberIds.filter(
				(id) => id !== action.profileId
			);
			break;
		}
		case 'createSession': {
			const members = action.memberIds.filter((id) => !!id);
			state.group.current = {
				id: `g-${Date.now().toString(36)}`,
				name: (action.name ?? '').trim() || defaultName(),
				memberIds: members,
				startedAt: Date.now(),
				filters: action.filters
			};
			state.group.matches = [];
			break;
		}
		case 'clearGroup': {
			state.group.current = null;
			state.group.matches = [];
			break;
		}
		case 'addMatch': {
			// Don't double-add for the same game.
			if (!state.group.matches.some((m) => m.gameId === action.match.gameId)) {
				state.group.matches.push(action.match);
			}
			break;
		}
		case 'like': {
			const b = ensureBucket(action.profileId);
			b.history.push({
				gameId: action.gameId,
				direction: 'like',
				at: Date.now(),
				profileId: action.profileId
			});
			b.currentIndex++;
			break;
		}
		case 'pass': {
			const b = ensureBucket(action.profileId);
			b.history.push({
				gameId: action.gameId,
				direction: 'pass',
				at: Date.now(),
				profileId: action.profileId
			});
			b.currentIndex++;
			break;
		}
		case 'resetAllSwipes': {
			state.swipes.byProfile = {};
			break;
		}
		case 'resetProfileSwipes': {
			delete state.swipes.byProfile[action.profileId];
			break;
		}
		case 'closeSession': {
			const g = state.group.current;
			if (!g) break;
			const matches = [...state.group.matches];
			const archived = {
				id: `s-${Date.now().toString(36)}`,
				name: g.name,
				startedAt: g.startedAt ?? Date.now(),
				endedAt: Date.now(),
				memberIds: [...g.memberIds],
				gameIds: state.games.catalog.map((x) => x.id),
				matches,
				winnerGameId: matches[0]?.gameId
			};
			state.sessions.closed.unshift(archived);
			state.group.current = null;
			state.group.matches = [];
			state.swipes.byProfile = {};
			break;
		}
		case 'clearAllSessions': {
			state.sessions.closed = [];
			break;
		}
		case 'addCustomProfile': {
			// Guard against collisions; replace on dup id (idempotent).
			const idx = state.customProfiles.items.findIndex((p) => p.id === action.profile.id);
			if (idx >= 0) state.customProfiles.items[idx] = action.profile;
			else state.customProfiles.items.push(action.profile);
			break;
		}
		case 'removeCustomProfile': {
			state.customProfiles.items = state.customProfiles.items.filter(
				(p) => p.id !== action.id
			);
			break;
		}
		default: {
			// Exhaustiveness check
			const _exhaustive: never = action;
			void _exhaustive;
		}
	}
	persist();
	broadcast();
	return state;
}

// Used by SessionFilters type users; re-export to keep client/server in sync
export type { SessionFilters };
