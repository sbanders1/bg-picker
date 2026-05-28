/**
 * Client-side helpers for talking to the server-state API. Used by the
 * `.svelte.ts` state modules to fire-and-forget POSTs and to fetch the
 * full snapshot at startup or after an SSE "stateChanged" event.
 */
import type { Action, ServerState } from '$lib/types';

/** Fetch the full shared-state snapshot from the server. */
export async function fetchServerState(): Promise<ServerState | null> {
	if (typeof fetch === 'undefined') return null;
	try {
		const res = await fetch('/api/state', { cache: 'no-store' });
		if (!res.ok) return null;
		return (await res.json()) as ServerState;
	} catch {
		return null;
	}
}

/**
 * Fire-and-forget mutation. Returns void so callers don't have to await — the
 * client has already updated its local optimistic state by the time this runs.
 * Server-side SSE will broadcast to other clients and trigger their refetch.
 * If the POST fails for any reason, the next refetch will reconcile.
 */
export function postAction(action: Action): void {
	if (typeof fetch === 'undefined') return;
	void fetch('/api/action', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(action)
	}).catch(() => {
		/* swallowed — next SSE-triggered refetch will heal */
	});
}
