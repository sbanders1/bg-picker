import type { RequestHandler } from './$types';
import { subscribe } from '$lib/server/state';

/**
 * Server-Sent Events stream. Every connected client receives a "stateChanged"
 * event each time the server applies an action — they refetch /api/state in
 * response. Simpler than diffing; payloads are small.
 */
export const GET: RequestHandler = async () => {
	let unsubscribe: (() => void) | null = null;
	let pingTimer: ReturnType<typeof setInterval> | null = null;

	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();
			const send = (event: string, data: string) => {
				try {
					controller.enqueue(encoder.encode(`event: ${event}\ndata: ${data}\n\n`));
				} catch {
					/* controller closed */
				}
			};

			// Initial hello so clients know they're connected.
			send('hello', JSON.stringify({ at: Date.now() }));

			unsubscribe = subscribe(() => {
				send('stateChanged', JSON.stringify({ at: Date.now() }));
			});

			// Keepalive ping every 25s — keeps proxies/load balancers from closing idle
			// connections, and lets the client detect a silently-dead stream.
			pingTimer = setInterval(() => send('ping', String(Date.now())), 25_000);
		},
		cancel() {
			if (unsubscribe) unsubscribe();
			if (pingTimer) clearInterval(pingTimer);
		}
	});

	return new Response(stream, {
		headers: {
			'content-type': 'text/event-stream',
			'cache-control': 'no-cache, no-transform',
			connection: 'keep-alive'
		}
	});
};
