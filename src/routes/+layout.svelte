<script lang="ts">
	import { onMount } from 'svelte';
	import '../app.css';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { init as initProfile, profile, clearProfile } from '$lib/state/profile.svelte';
	import {
		init as initGames,
		games,
		applyServerSnapshot as applyGames
	} from '$lib/state/games.svelte';
	import {
		init as initGroup,
		applyServerSnapshot as applyGroup
	} from '$lib/state/group.svelte';
	import {
		init as initSwipes,
		getCurrentIndex,
		applyServerSnapshot as applySwipes
	} from '$lib/state/swipes.svelte';
	import { init as initSettings } from '$lib/state/settings.svelte';
	import {
		init as initSessions,
		applyServerSnapshot as applySessions
	} from '$lib/state/sessions.svelte';
	import {
		init as initCustomProfiles,
		applyServerSnapshot as applyCustomProfiles
	} from '$lib/state/customProfiles.svelte';
	import { fetchServerState } from '$lib/sync';
	import { profileById, initialsOf } from '$lib/profiles';
	import { goto } from '$app/navigation';

	let { children } = $props();

	/** Refresh every shared (server-side) slice from one snapshot. */
	async function syncFromServer() {
		const snap = await fetchServerState();
		if (!snap) return;
		applyCustomProfiles(snap.customProfiles);
		applyGames(snap.games.catalog);
		applyGroup(snap.group);
		applySwipes(snap.swipes);
		applySessions(snap.sessions);
	}

	let eventSource: EventSource | null = null;

	onMount(() => {
		// Shared state lives on the server — hydrate everything from one snapshot
		// (ordered so initProfile's heal-check sees the populated group).
		(async () => {
			await initCustomProfiles();
			await initGames();
			await initGroup();
			await initSwipes();
			await initSessions();
			// Local-only slices (per-device): settings + profile last so the profile
			// heal sees the already-loaded group state.
			initSettings();
			initProfile();
		})();

		// Live multiplayer sync via Server-Sent Events. Every action on any client
		// triggers a "stateChanged" event from the server; we refetch the full
		// snapshot. Cheap on LAN, simpler than diff-based sync.
		if (typeof window !== 'undefined' && 'EventSource' in window) {
			eventSource = new EventSource('/api/sync');
			eventSource.addEventListener('stateChanged', () => {
				void syncFromServer();
			});
			// Auto-reconnect is built into EventSource; nothing to do on error here.
		}

		return () => {
			if (eventSource) eventSource.close();
			eventSource = null;
		};
	});

	const path = $derived(page.url.pathname);

	// Chrome is hidden when nobody's logged in (so the picker stands alone on `/`).
	const loggedIn = $derived(!!profile.id);

	const seedForActive = $derived(profileById(profile.id));
	const activeInitials = $derived(initialsOf(profile.name));

	// Dashboard visibility: host always; non-host only after they've swiped all games.
	const canSeeDashboard = $derived.by(() => {
		if (!loggedIn) return false;
		if (profile.isAdmin) return true;
		const total = games.catalog.length;
		if (total === 0) return false;
		return getCurrentIndex(profile.id) >= total;
	});

	// Pill active matchers.
	const isHomeActive = $derived(path === '/');
	const isCatalogActive = $derived(path === '/admin');
	const isDashboardActive = $derived(path === '/group' || path.startsWith('/match'));
	const isSwipeActive = $derived(path === '/swipe');
	const isSessionsActive = $derived(path === '/sessions');

	function logout() {
		menuOpen = false;
		clearProfile();
		goto('/');
	}

	let menuOpen = $state(false);
	let menuEl: HTMLElement | null = $state(null);
	let triggerEl: HTMLElement | null = $state(null);

	function toggleMenu() {
		menuOpen = !menuOpen;
	}
	function onDocClick(e: MouseEvent) {
		if (!menuOpen) return;
		const t = e.target as Node;
		if (menuEl?.contains(t) || triggerEl?.contains(t)) return;
		menuOpen = false;
	}
	function onWinKey(e: KeyboardEvent) {
		if (menuOpen && e.key === 'Escape') {
			menuOpen = false;
			triggerEl?.focus();
		}
	}
</script>

<svelte:window onclick={onDocClick} onkeydown={onWinKey} />

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if loggedIn}
	<header class="appbar" aria-label="Main navigation">
		<a class="appbar__brand" href="/" aria-label="GameMatch home">
			<span class="appbar__mark" aria-hidden="true"></span>
			<span class="appbar__name">GameMatch</span>
		</a>

		<nav class="pills" aria-label="Sections">
			<a class="pill" class:pill--active={isHomeActive} href="/">Home</a>
			<a class="pill" class:pill--active={isSwipeActive} href="/swipe">Vote</a>
			{#if canSeeDashboard}
				<a class="pill" class:pill--active={isDashboardActive} href="/group">Dashboard</a>
			{/if}
			{#if profile.isAdmin}
				<a class="pill" class:pill--active={isCatalogActive} href="/admin">Catalog</a>
				<a class="pill" class:pill--active={isSessionsActive} href="/sessions">Sessions</a>
			{/if}
		</nav>

		<div class="appbar__right">
			<button
				bind:this={triggerEl}
				type="button"
				class="me-avatar"
				onclick={toggleMenu}
				aria-haspopup="menu"
				aria-expanded={menuOpen}
				aria-label="Account menu — signed in as {profile.name}"
			>
				<span
					class="me-avatar__circle"
					style:background={seedForActive?.bg ?? 'var(--surface-tertiary)'}
					style:color={seedForActive?.fg ?? 'var(--foreground-secondary)'}
				>
					{activeInitials}
				</span>
				<span class="me-avatar__name">{profile.name.split(/\s+/)[0]}</span>
				<svg
					class="me-avatar__caret"
					viewBox="0 0 24 24"
					width="14"
					height="14"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<polyline points="6 9 12 15 18 9" />
				</svg>
			</button>

			{#if menuOpen}
				<div class="menu" bind:this={menuEl} role="menu" aria-label="Account">
					<div class="menu__header">
						<span class="menu__name">{profile.name}</span>
						{#if profile.isAdmin}
							<span class="menu__role">HOST</span>
						{/if}
					</div>
					<button type="button" class="menu__item" role="menuitem" onclick={logout}>
						<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
							stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
							<polyline points="16 17 21 12 16 7" />
							<line x1="21" y1="12" x2="9" y2="12" />
						</svg>
						Log out
					</button>
				</div>
			{/if}
		</div>
	</header>
{/if}

<div class:page-frame={loggedIn}>
	{@render children()}
</div>

<style>
	.page-frame {
		padding-top: var(--nav-height);
	}

	.appbar {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: var(--nav-height);
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
		padding: 0 40px;
		background: var(--surface-primary);
		border-bottom: 1px solid var(--border-subtle);
		z-index: 50;
	}

	.appbar__brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		text-decoration: none;
		color: inherit;
		min-width: 140px;
	}
	.appbar__mark {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-md);
		background: var(--accent-primary);
	}
	.appbar__name {
		font-family: var(--font-heading);
		font-size: var(--text-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}

	.pills {
		display: inline-flex;
		align-items: center;
		gap: 4px;
	}
	.pill {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 8px 14px;
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--foreground-secondary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-medium);
		text-decoration: none;
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease;
	}
	.pill:hover {
		background: var(--surface-secondary);
		color: var(--foreground-primary);
	}
	.pill--active {
		background: var(--surface-secondary);
		color: var(--foreground-primary);
	}
	.appbar__right {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 12px;
		min-width: 140px;
		justify-content: flex-end;
	}

	.me-avatar {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 4px 12px 4px 4px;
		border: 0;
		border-radius: var(--radius-pill);
		background: var(--surface-secondary);
		text-decoration: none;
		color: inherit;
		cursor: pointer;
		font: inherit;
		transition: background 0.15s ease;
	}
	.me-avatar:hover,
	.me-avatar[aria-expanded='true'] {
		background: var(--surface-tertiary);
	}
	.me-avatar__circle {
		width: 32px;
		height: 32px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-pill);
		font-family: var(--font-heading);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.4px;
		border: 2px solid var(--surface-primary);
	}
	.me-avatar__name {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-medium);
		color: var(--foreground-primary);
	}
	.me-avatar__caret {
		color: var(--foreground-tertiary);
	}

	/* Dropdown menu (anchored to the avatar). */
	.menu {
		position: absolute;
		top: calc(100% + 8px);
		right: 0;
		min-width: 220px;
		padding: 6px;
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-lg);
		box-shadow:
			0 6px 12px rgba(0, 0, 0, 0.05),
			0 18px 40px rgba(0, 0, 0, 0.12);
		display: flex;
		flex-direction: column;
		gap: 2px;
		z-index: 70;
	}
	.menu__header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 8px 10px;
		border-bottom: 1px solid var(--border-subtle);
		margin-bottom: 4px;
	}
	.menu__name {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.menu__role {
		padding: 2px 8px;
		border-radius: var(--radius-pill);
		background: var(--accent-primary);
		color: var(--accent-on);
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.5px;
	}
	.menu__item {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 9px 10px;
		border: 0;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--foreground-primary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		text-align: left;
	}
	.menu__item:hover {
		background: var(--surface-secondary);
	}
	.menu__item:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: -2px;
	}
</style>
