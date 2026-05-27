<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { init as initProfile, profile } from '$lib/state/profile.svelte';
	import { init as initGames, games } from '$lib/state/games.svelte';
	import { init as initGroup } from '$lib/state/group.svelte';
	import { init as initSwipes, getCurrentIndex } from '$lib/state/swipes.svelte';
	import { init as initSettings } from '$lib/state/settings.svelte';
	import { profileById, initialsOf } from '$lib/profiles';

	let { children } = $props();

	$effect(() => {
		initSettings();
		initProfile();
		initGames();
		initGroup();
		initSwipes();
	});

	const path = $derived(page.url.pathname);
	const onPicker = $derived(path === '/' || path === '/profile');
	// Hide nav until a profile is picked — the picker is the entry, no chrome needed there.
	const showNav = $derived(!!profile.id);
	// Avatar appears once a profile is set, on every screen except the picker itself.
	const showAvatar = $derived(!!profile.id && !onPicker);
	const seedForActive = $derived(profileById(profile.id));
	const activeInitials = $derived(initialsOf(profile.name));
	const homeActive = $derived(onPicker);
	// Group tab is visible to the host always, and to non-hosts only after they've
	// finished swiping every game in the catalog.
	const canSeeDashboard = $derived.by(() => {
		if (!profile.id) return false;
		if (profile.isAdmin) return true;
		const total = games.catalog.length;
		if (total === 0) return false;
		return getCurrentIndex(profile.id) >= total;
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

{#if showAvatar}
	<a
		class="active-avatar"
		href="/"
		aria-label="Switch profile — currently {profile.name || 'Guest'}"
		title="Switch profile"
	>
		<span
			class="active-avatar__circle"
			style:background={seedForActive?.bg ?? 'var(--surface-tertiary)'}
			style:color={seedForActive?.fg ?? 'var(--foreground-secondary)'}
		>
			{activeInitials}
		</span>
	</a>
{/if}

{#if showNav}
	<nav class="appnav" aria-label="Main navigation">
		<a href="/" class="appnav__tab" class:appnav__tab--active={homeActive}>
			<svg
				viewBox="0 0 24 24"
				width="22"
				height="22"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
				<circle cx="9" cy="7" r="4" />
				<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
				<path d="M16 3.13a4 4 0 0 1 0 7.75" />
			</svg>
			<span>Players</span>
		</a>

		<a href="/swipe" class="appnav__tab" class:appnav__tab--active={path === '/swipe'}>
			<svg
				viewBox="0 0 24 24"
				width="22"
				height="22"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				aria-hidden="true"
			>
				<path
					d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
				/>
			</svg>
			<span>Vote</span>
		</a>

		{#if canSeeDashboard}
			<a
				href="/group"
				class="appnav__tab"
				class:appnav__tab--active={path === '/group' || path.startsWith('/match')}
			>
				<svg
					viewBox="0 0 24 24"
					width="22"
					height="22"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<line x1="6" y1="20" x2="6" y2="14" />
					<line x1="12" y1="20" x2="12" y2="10" />
					<line x1="18" y1="20" x2="18" y2="4" />
				</svg>
				<span>Group</span>
			</a>

			<a href="/admin" class="appnav__tab" class:appnav__tab--active={path === '/admin'}>
				<svg
					viewBox="0 0 24 24"
					width="22"
					height="22"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<rect x="3" y="3" width="7" height="7" />
					<rect x="14" y="3" width="7" height="7" />
					<rect x="14" y="14" width="7" height="7" />
					<rect x="3" y="14" width="7" height="7" />
				</svg>
				<span>Catalog</span>
			</a>
		{/if}
	</nav>
{/if}

<style>
	.appnav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		height: var(--nav-height);
		background: var(--surface-primary);
		border-top: 1px solid var(--border-subtle);
		padding: 8px 0 12px;
		box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.04);
		z-index: 50;
	}

	.appnav__tab {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		text-decoration: none;
		color: var(--foreground-tertiary);
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-medium);
		letter-spacing: 0.2px;
		transition: color 0.15s ease;
	}
	.appnav__tab:hover {
		color: var(--foreground-secondary);
	}
	.appnav__tab--active {
		color: var(--accent-primary);
	}

	/* Floating top-right active-player avatar. Positioned BELOW the standard 80px
	 * header band so it never overlaps each screen's own trailing header content
	 * (Mock/Live toggle, Back, Switch Profile, etc.). On screens without a header
	 * (GroupDashboard, GameProfile) it sits at the natural top-right of content. */
	.active-avatar {
		position: fixed;
		top: 96px;
		right: 18px;
		display: inline-flex;
		text-decoration: none;
		z-index: 60;
		border-radius: var(--radius-pill);
	}
	.active-avatar__circle {
		width: 44px;
		height: 44px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-pill);
		font-family: var(--font-heading);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.5px;
		box-shadow:
			0 2px 6px rgba(0, 0, 0, 0.06),
			0 8px 20px rgba(0, 0, 0, 0.12);
		border: 2px solid var(--surface-primary);
		transition: transform 0.15s ease, box-shadow 0.15s ease;
	}
	.active-avatar:hover .active-avatar__circle,
	.active-avatar:focus-visible .active-avatar__circle {
		transform: translateY(-2px);
		box-shadow:
			0 4px 8px rgba(0, 0, 0, 0.08),
			0 12px 28px rgba(0, 0, 0, 0.16);
	}
	.active-avatar:focus-visible {
		outline: 2px solid var(--accent-primary);
		outline-offset: 4px;
	}
</style>
