import type { RequestHandler } from './$types';
import { XMLParser } from 'fast-xml-parser';
import { env } from '$env/dynamic/private';
import type { BggSearchResult, Game, Rank } from '$lib/types';

const BGG = 'https://boardgamegeek.com/xmlapi2';
const UA = 'GameMatch/0.1 (https://github.com/sbanders1/bg-picker)';
const RETRY_DELAY_MS = 5000;
const MAX_RETRIES = 3;
const RATE_INTERVAL_MS = 600; // ~100 req/min, well under BGG community guidance

// Auth token (from .env, server-side only — never reaches the client bundle).
// BGG's XML API2 doesn't publicly document token auth; we send it as a standard
// Bearer header. If BGG expects it elsewhere (cookie / query param), change only
// authHeaders() below.
const BGG_TOKEN = env.BGG_API_TOKEN?.trim();

function authHeaders(): Record<string, string> {
	const headers: Record<string, string> = {
		'User-Agent': UA,
		Accept: 'application/xml,text/xml,*/*'
	};
	if (BGG_TOKEN) headers.Authorization = `Bearer ${BGG_TOKEN}`;
	return headers;
}

let nextAllowed = 0;
async function throttle() {
	const wait = Math.max(0, nextAllowed - Date.now());
	if (wait > 0) await new Promise((r) => setTimeout(r, wait));
	nextAllowed = Date.now() + RATE_INTERVAL_MS;
}

async function fetchXml(url: string, attempt = 0): Promise<string> {
	await throttle();
	const res = await fetch(url, { headers: authHeaders() });
	if (res.status === 202) {
		if (attempt >= MAX_RETRIES) throw new Error('BGG returned 202 after max retries');
		await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
		return fetchXml(url, attempt + 1);
	}
	if (res.status === 503) {
		if (attempt >= MAX_RETRIES) throw new Error('BGG throttled (503) after max retries');
		await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
		return fetchXml(url, attempt + 1);
	}
	if (!res.ok) {
		const body = await res.text().catch(() => '');
		throw new Error(`BGG ${res.status}: ${body.slice(0, 200)}`);
	}
	return res.text();
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });

function asArray<T>(v: T | T[] | undefined | null): T[] {
	if (v == null) return [];
	return Array.isArray(v) ? v : [v];
}

function decodeHtml(s: string): string {
	return s
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#10;/g, '\n')
		.replace(/&#13;/g, '\r')
		.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSearch(xml: string): BggSearchResult[] {
	const parsed = parser.parse(xml);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const items = asArray<any>(parsed?.items?.item);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return items.map((it: any) => ({
		id: parseInt(String(it.id), 10),
		name: it.name?.value ?? '',
		yearPublished: it.yearpublished?.value
			? parseInt(String(it.yearpublished.value), 10)
			: undefined
	}));
}

// XML parser output is inherently dynamic; we accept `any` at the boundary
// and rely on the typed `Game` return shape for downstream safety.
/* eslint-disable @typescript-eslint/no-explicit-any */
function parseThing(xml: string): Game[] {
	const parsed = parser.parse(xml);
	const items = asArray<any>(parsed?.items?.item);
	return items.map((it: any): Game => {
		const names = asArray<any>(it.name);
		const primary = names.find((n) => n.type === 'primary') ?? names[0];
		const links = asArray<any>(it.link);
		const stats: any = it.statistics?.ratings;
		const weightRaw = stats?.averageweight?.value ? parseFloat(stats.averageweight.value) : null;
		const weight = weightRaw === 0 || weightRaw === null ? null : weightRaw;

		const numAttr = (key: string): number | undefined => {
			const v = it[key]?.value;
			return v != null ? parseInt(String(v), 10) : undefined;
		};
		const numStat = (key: string, float = false): number | undefined => {
			const v = stats?.[key]?.value;
			return v != null ? (float ? parseFloat(String(v)) : parseInt(String(v), 10)) : undefined;
		};

		return {
			id: parseInt(String(it.id), 10),
			name: primary?.value ?? '',
			yearPublished: numAttr('yearpublished'),
			description: it.description ? decodeHtml(String(it.description)) : undefined,
			image: typeof it.image === 'string' ? it.image : undefined,
			thumbnail: typeof it.thumbnail === 'string' ? it.thumbnail : undefined,
			minPlayers: numAttr('minplayers'),
			maxPlayers: numAttr('maxplayers'),
			playingTime: numAttr('playingtime'),
			minPlayTime: numAttr('minplaytime'),
			maxPlayTime: numAttr('maxplaytime'),
			minAge: numAttr('minage'),
			categories: links.filter((l: any) => l.type === 'boardgamecategory').map((l: any) => l.value),
			mechanics: links.filter((l: any) => l.type === 'boardgamemechanic').map((l: any) => l.value),
			designers: links.filter((l: any) => l.type === 'boardgamedesigner').map((l: any) => l.value),
			usersRated: numStat('usersrated'),
			averageRating: numStat('average', true),
			bayesAverage: numStat('bayesaverage', true),
			averageWeight: weight,
			ranks: asArray<any>(stats?.ranks?.rank).map(
				(r: any): Rank => ({
					id: String(r.id),
					name: r.name,
					friendlyname: r.friendlyname,
					value: r.value === 'Not Ranked' || r.value == null ? null : parseInt(String(r.value), 10)
				})
			)
		};
	});
}
/* eslint-enable @typescript-eslint/no-explicit-any */

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

export const GET: RequestHandler = async ({ params, url }) => {
	const endpoint = params.endpoint;
	const sp = url.searchParams;
	try {
		if (endpoint === 'search') {
			const query = sp.get('query')?.trim();
			if (!query) return json({ error: 'missing query' }, 400);
			const type = sp.get('type') ?? 'boardgame';
			const exact = sp.get('exact') === '1' ? '&exact=1' : '';
			const xml = await fetchXml(
				`${BGG}/search?query=${encodeURIComponent(query)}&type=${encodeURIComponent(type)}${exact}`
			);
			return json({ results: parseSearch(xml) });
		}
		if (endpoint === 'thing') {
			const id = sp.get('id')?.trim();
			if (!id) return json({ error: 'missing id' }, 400);
			const stats = sp.get('stats') !== '0' ? '&stats=1' : '';
			const xml = await fetchXml(`${BGG}/thing?id=${encodeURIComponent(id)}${stats}`);
			return json({ games: parseThing(xml) });
		}
		return json({ error: `unknown endpoint '${endpoint}' (use search or thing)` }, 404);
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		return json({ error: message }, 502);
	}
};
