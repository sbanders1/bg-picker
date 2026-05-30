/**
 * Reactive viewport state. Components read `viewport.isMobile` (or any of the
 * other booleans) to branch DOM/markup based on screen size.
 *
 * One single `resize` listener is attached during init for the lifetime of the
 * page. This IS a legitimate `$effect`-style side effect (browser API binding
 * with cleanup) — but we use an imperative init function rather than an
 * effect so callers control when it runs (in onMount, after layout hydrates).
 *
 * Why not pure CSS media queries? Most layout adjustments DO go in CSS
 * (`@media (max-width: var(--bp-mobile))`). This module exists for the cases
 * where the *DOM tree itself* needs to differ — e.g., a table on desktop
 * becoming a card-list on mobile. CSS can't restructure DOM.
 */

const BP_MOBILE = 720;
const BP_TABLET = 1024;

export const viewport = $state({
	width: 0,
	height: 0,
	isMobile: false,
	isTablet: false,
	isDesktop: true
});

let listenerAttached = false;

export function init() {
	if (typeof window === 'undefined') return;
	if (listenerAttached) return;

	const update = () => {
		const w = window.innerWidth;
		viewport.width = w;
		viewport.height = window.innerHeight;
		viewport.isMobile = w < BP_MOBILE;
		viewport.isTablet = w >= BP_MOBILE && w < BP_TABLET;
		viewport.isDesktop = w >= BP_TABLET;
	};

	update();
	window.addEventListener('resize', update, { passive: true });
	// Listener stays for the lifetime of the page — layout is mounted for the
	// whole session, no cleanup necessary.
	listenerAttached = true;
}
