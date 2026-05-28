import type { RequestHandler } from './$types';
import { getState } from '$lib/server/state';

/** Returns the full server-side shared state snapshot. */
export const GET: RequestHandler = async () => {
	return new Response(JSON.stringify(getState()), {
		headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
	});
};
