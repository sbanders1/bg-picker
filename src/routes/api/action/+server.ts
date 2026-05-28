import type { RequestHandler } from './$types';
import { applyAction } from '$lib/server/state';
import type { Action } from '$lib/types';

/**
 * Universal mutation endpoint. Accepts an Action object, applies it to server
 * state, persists, broadcasts via SSE, and returns the updated state.
 */
export const POST: RequestHandler = async ({ request }) => {
	let action: Action;
	try {
		action = (await request.json()) as Action;
	} catch {
		return new Response(JSON.stringify({ error: 'invalid JSON' }), {
			status: 400,
			headers: { 'content-type': 'application/json' }
		});
	}
	if (!action || typeof action !== 'object' || typeof action.type !== 'string') {
		return new Response(JSON.stringify({ error: 'missing action.type' }), {
			status: 400,
			headers: { 'content-type': 'application/json' }
		});
	}
	const next = applyAction(action);
	return new Response(JSON.stringify(next), {
		headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
	});
};
