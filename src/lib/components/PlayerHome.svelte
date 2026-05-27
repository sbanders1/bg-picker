<script lang="ts">
	import { goto } from '$app/navigation';
	import { profile } from '$lib/state/profile.svelte';
	import { games } from '$lib/state/games.svelte';
	import { group, joinGroup } from '$lib/state/group.svelte';
	import { getHistory, getCurrentIndex } from '$lib/state/swipes.svelte';
	import { profileById } from '$lib/profiles';
	import Button from './Button.svelte';

	// Guard: drop to picker if no profile selected.
	$effect(() => {
		if (!profile.id) goto('/');
	});

	// Time-of-day greeting (browser-only; SSR shows a neutral fallback).
	let now = $state(Date.now());
	$effect(() => {
		const id = setInterval(() => (now = Date.now()), 60_000);
		return () => clearInterval(id);
	});
	const greeting = $derived.by(() => {
		const h = new Date(now).getHours();
		if (h < 12) return 'Good morning,';
		if (h < 18) return 'Good afternoon,';
		return 'Good evening,';
	});
	const firstName = $derived(profile.name.split(/\s+/)[0] || 'Player');
	const isAdmin = $derived(profile.isAdmin === true);

	// Session summary. "Live session" means a group exists — catalog is intentionally
	// preserved across session closes, so catalog size alone is NOT a session signal.
	const hasActiveSession = $derived(!!group.current);
	const sessionName = $derived(group.current?.name ?? 'No active session');
	const queueCount = $derived(games.catalog.length);
	const playerCount = $derived(group.current?.memberIds.length ?? 0);
	const matchCount = $derived(group.matches.length);
	const stackIndex = $derived(getCurrentIndex(profile.id));
	const stackRemaining = $derived(
		hasActiveSession ? Math.max(0, queueCount - stackIndex) : 0
	);
	const finishedStack = $derived(
		hasActiveSession && queueCount > 0 && stackIndex >= queueCount
	);
	const canSeeDashboard = $derived(hasActiveSession && (isAdmin || finishedStack));

	// Recent swipes for the current profile (newest first).
	const recentSwipes = $derived(
		getHistory(profile.id).slice(-5).reverse()
	);

	// Latest match.
	const latestMatch = $derived(group.matches.at(-1));
	const latestMatchGame = $derived(
		latestMatch ? games.byId[latestMatch.gameId] : undefined
	);

	function timeAgo(ts: number): string {
		const diff = Math.max(0, now - ts);
		const m = Math.floor(diff / 60_000);
		if (m < 1) return 'just now';
		if (m < 60) return `${m}m ago`;
		const h = Math.floor(m / 60);
		if (h < 24) return `${h}h ago`;
		const d = Math.floor(h / 24);
		return d === 1 ? 'yesterday' : `${d}d ago`;
	}

	function resumeCTA() {
		if (stackRemaining > 0) goto('/swipe');
		else if (canSeeDashboard) goto('/group');
		else goto('/swipe');
	}
	const ctaLabel = $derived(
		stackRemaining > 0 ? 'Resume swiping' : finishedStack ? 'View results' : 'Start swiping'
	);

	function startNewSession() {
		joinGroup(profile.id);
		// Host lands on catalog to set up; if catalog already has games, go straight to swiping.
		goto(games.catalog.length === 0 ? '/admin' : '/swipe');
	}
</script>

<div class="page">
	<main class="content">
		<section class="greeting">
			<p class="greeting__line">{greeting}</p>
			<h1 class="greeting__name">{firstName}</h1>
		</section>

		<section class="hero" class:hero--idle={!hasActiveSession}>
			<div class="hero__main">
				<span class="hero__eyebrow">
					<span class="hero__dot" aria-hidden="true"></span>
					{hasActiveSession ? 'LIVE SESSION' : 'NO ACTIVE SESSION'}
				</span>
				<h2 class="hero__title">{sessionName}</h2>
				{#if hasActiveSession}
					<div class="hero__stats">
						<span class="hero__stat">
							<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
								stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<rect x="3" y="3" width="7" height="7" />
								<rect x="14" y="3" width="7" height="7" />
								<rect x="14" y="14" width="7" height="7" />
								<rect x="3" y="14" width="7" height="7" />
							</svg>
							{queueCount} game{queueCount === 1 ? '' : 's'} in queue
						</span>
						<span class="hero__stat">
							<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
								stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
								<circle cx="9" cy="7" r="4" />
								<path d="M23 21v-2a4 4 0 0 0-3-3.87" />
							</svg>
							{playerCount} player{playerCount === 1 ? '' : 's'}
						</span>
						<span class="hero__stat">
							<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
								<path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.65-9.5 9-9.5 9z" />
							</svg>
							{matchCount} match{matchCount === 1 ? '' : 'es'} so far
						</span>
					</div>
					<p class="hero__caption">
						{#if queueCount === 0}
							{isAdmin
								? "Add games to the catalog to kick off tonight's session."
								: 'Waiting for the host to add games.'}
						{:else if stackRemaining > 0}
							{stackRemaining} game{stackRemaining === 1 ? '' : 's'} left in your stack
						{:else}
							You've swiped them all — check how the group voted.
						{/if}
					</p>
				{:else}
					<p class="hero__caption">
						{isAdmin
							? 'Your last session is archived. Start a fresh one when you’re ready.'
							: 'No game night is running. Ask the host to start one.'}
					</p>
				{/if}
			</div>
			<div class="hero__cta">
				{#if hasActiveSession && queueCount > 0}
					<Button variant="secondary" size="lg" onclick={resumeCTA}>
						{ctaLabel}
						<span aria-hidden="true">→</span>
					</Button>
				{:else if hasActiveSession && isAdmin}
					<Button variant="secondary" size="lg" onclick={() => goto('/admin')}>
						Add games <span aria-hidden="true">→</span>
					</Button>
				{:else if !hasActiveSession && isAdmin}
					<Button variant="secondary" size="lg" onclick={startNewSession}>
						Start new session <span aria-hidden="true">→</span>
					</Button>
				{/if}
			</div>
		</section>

		<section class="nav-row">
			{#if isAdmin}
				<a href="/admin" class="nav-card">
					<div class="nav-card__top">
						<span class="nav-card__icon" style:background="var(--decor-sky)" style:color="#3F6FA8">
							<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
								stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<rect x="3" y="3" width="7" height="7" />
								<rect x="14" y="3" width="7" height="7" />
								<rect x="14" y="14" width="7" height="7" />
								<rect x="3" y="14" width="7" height="7" />
							</svg>
						</span>
						<span class="nav-card__count">{queueCount} added</span>
					</div>
					<h3 class="nav-card__title">Game Catalog</h3>
					<p class="nav-card__sub">Browse every board game in tonight's library.</p>
					<span class="nav-card__cta">Browse catalog <span aria-hidden="true">›</span></span>
				</a>
			{/if}

			<a
				href="/group"
				class="nav-card"
				class:nav-card--disabled={!canSeeDashboard}
				onclick={(e) => {
					if (!canSeeDashboard) e.preventDefault();
				}}
			>
				<div class="nav-card__top">
					<span class="nav-card__icon" style:background="var(--decor-mint)" style:color="#3A8A5C">
						<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
							stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
							<line x1="6" y1="20" x2="6" y2="14" />
							<line x1="12" y1="20" x2="12" y2="10" />
							<line x1="18" y1="20" x2="18" y2="4" />
						</svg>
					</span>
					{#if canSeeDashboard}
						<span class="nav-card__badge">LIVE</span>
					{:else}
						<span class="nav-card__count">Locked</span>
					{/if}
				</div>
				<h3 class="nav-card__title">Group Dashboard</h3>
				<p class="nav-card__sub">
					{canSeeDashboard
						? "See who's voted and how games are tracking."
						: 'Finish your swipe stack to unlock.'}
				</p>
				<span class="nav-card__cta">
					{canSeeDashboard ? 'Open dashboard' : 'Locked'} <span aria-hidden="true">›</span>
				</span>
			</a>

			{#if isAdmin}
				<a class="nav-card" href="/sessions">
					<div class="nav-card__top">
						<span class="nav-card__icon" style:background="var(--decor-cream)" style:color="#9A7A38">
							<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor"
								stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
								<circle cx="12" cy="12" r="10" />
								<polyline points="12 6 12 12 16 14" />
							</svg>
						</span>
						<span class="nav-card__count">Archive</span>
					</div>
					<h3 class="nav-card__title">Past Sessions</h3>
					<p class="nav-card__sub">Look back at previous game nights and what the group picked.</p>
					<span class="nav-card__cta">See history <span aria-hidden="true">›</span></span>
				</a>
			{/if}
		</section>

		<section class="recent">
			<div class="recent__main">
				<header class="recent__head">
					<h2 class="recent__title">Your recent swipes</h2>
					<a href="/swipe" class="recent__more">See all</a>
				</header>
				{#if recentSwipes.length === 0}
					<div class="recent__empty">
						{hasActiveSession
							? "You haven't swiped any games yet — head to Vote."
							: 'Nothing to swipe yet.'}
					</div>
				{:else}
					<ul class="recent__list">
						{#each recentSwipes as s, i (s.at + '-' + i)}
							{@const g = games.byId[s.gameId]}
							<li class="recent__item">
								<span
									class="recent__thumb"
									style:background-image={g?.thumbnail || g?.image
										? `url(${g.thumbnail ?? g.image})`
										: 'var(--surface-tertiary)'}
									aria-hidden="true"
								></span>
								<div class="recent__meta">
									<a class="recent__name" href={`/game/${s.gameId}`}>
										{g?.name ?? `Game #${s.gameId}`}
									</a>
									<span class="recent__time">{timeAgo(s.at)}</span>
								</div>
								<span class="recent__reaction recent__reaction--{s.direction}">
									{s.direction === 'like' ? 'Liked' : 'Passed'}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<aside class="latest">
				<span class="latest__eyebrow">LATEST MATCH</span>
				{#if latestMatch && latestMatchGame}
					<div class="latest__game">{latestMatchGame.name}</div>
					{#if latestMatchGame.categories?.[0]}
						<span class="latest__cat">{latestMatchGame.categories[0]}</span>
					{/if}
					<div class="latest__avatars">
						{#each latestMatch.profileIds.slice(0, 5) as id (id)}
							{@const seed = profileById(id)}
							<span
								class="latest__avatar"
								style:background={seed?.bg ?? 'var(--surface-tertiary)'}
								style:color={seed?.fg ?? 'var(--foreground-secondary)'}
							>
								{seed?.initial ?? '?'}
							</span>
						{/each}
						{#if latestMatch.profileIds.length > 5}
							<span class="latest__avatar latest__avatar--more">
								+{latestMatch.profileIds.length - 5}
							</span>
						{/if}
					</div>
					<a class="latest__view" href={`/game/${latestMatchGame.id}`}>
						View match <span aria-hidden="true">→</span>
					</a>
				{:else}
					<p class="latest__empty">No matches yet — keep swiping to find one.</p>
				{/if}
			</aside>
		</section>
	</main>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		min-height: calc(100vh - var(--nav-height));
		background: var(--surface-primary);
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
	}
	.brand__mark {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-md);
		background: var(--accent-primary);
	}
	.brand__name {
		font-family: var(--font-heading);
		font-size: var(--text-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}

	.switch-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-pill);
		background: var(--surface-primary);
		color: var(--foreground-secondary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: background 0.15s ease, color 0.15s ease;
	}
	.switch-pill:hover {
		background: var(--surface-secondary);
		color: var(--foreground-primary);
	}

	.content {
		flex: 1;
		max-width: 1200px;
		width: 100%;
		margin: 0 auto;
		padding: 40px 120px;
		display: flex;
		flex-direction: column;
		gap: 28px;
	}

	/* Greeting */
	.greeting__line {
		margin: 0 0 4px;
		font-family: var(--font-body);
		font-size: var(--text-base);
		color: var(--foreground-secondary);
	}
	.greeting__name {
		margin: 0;
		font-family: var(--font-heading);
		font-size: var(--text-3xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
		letter-spacing: -1px;
	}

	/* Active session hero */
	.hero {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 32px;
		padding: 28px 32px;
		background: var(--accent-primary);
		color: var(--accent-on);
		border-radius: var(--radius-xl);
		box-shadow:
			0 4px 6px rgba(0, 0, 0, 0.04),
			0 16px 40px rgba(0, 0, 0, 0.08);
	}
	.hero--idle {
		background: var(--surface-secondary);
		color: var(--foreground-primary);
	}
	.hero__main {
		display: flex;
		flex-direction: column;
		gap: 12px;
		flex: 1;
	}
	.hero__eyebrow {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 4px 10px;
		border-radius: var(--radius-pill);
		background: rgba(255, 255, 255, 0.18);
		color: var(--accent-on);
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.6px;
		width: fit-content;
	}
	.hero--idle .hero__eyebrow {
		background: var(--surface-tertiary);
		color: var(--foreground-secondary);
	}
	.hero__dot {
		width: 6px;
		height: 6px;
		border-radius: var(--radius-pill);
		background: currentColor;
	}
	.hero__title {
		margin: 0;
		font-family: var(--font-heading);
		font-size: var(--text-2xl);
		font-weight: var(--font-weight-semibold);
		letter-spacing: -0.5px;
	}
	.hero__stats {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
		font-family: var(--font-body);
		font-size: var(--text-sm);
	}
	.hero__stat {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		opacity: 0.92;
	}
	.hero__caption {
		margin: 0;
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		opacity: 0.86;
	}

	/* Nav cards */
	.nav-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 20px;
	}
	.nav-card {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 24px;
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-lg);
		box-shadow:
			0 2px 4px rgba(0, 0, 0, 0.03),
			0 12px 28px rgba(0, 0, 0, 0.05);
		text-decoration: none;
		color: inherit;
		transition: transform 0.12s ease, box-shadow 0.12s ease;
	}
	.nav-card:hover {
		transform: translateY(-2px);
		box-shadow:
			0 4px 8px rgba(0, 0, 0, 0.05),
			0 16px 36px rgba(0, 0, 0, 0.08);
	}
	.nav-card--disabled {
		opacity: 0.62;
		cursor: not-allowed;
		pointer-events: none;
	}
	.nav-card__top {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.nav-card__icon {
		width: 40px;
		height: 40px;
		border-radius: var(--radius-md);
		display: inline-flex;
		align-items: center;
		justify-content: center;
	}
	.nav-card__count {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.nav-card__badge {
		padding: 2px 10px;
		border-radius: var(--radius-pill);
		background: var(--success);
		color: var(--accent-on);
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.5px;
	}
	.nav-card__title {
		margin: 0;
		font-family: var(--font-heading);
		font-size: var(--text-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.nav-card__sub {
		margin: 0;
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		line-height: 1.45;
		flex: 1;
	}
	.nav-card__cta {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--accent-primary);
	}

	/* Recent activity */
	.recent {
		display: grid;
		grid-template-columns: 1fr 380px;
		gap: 20px;
	}
	.recent__main {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.recent__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.recent__title {
		margin: 0;
		font-family: var(--font-heading);
		font-size: var(--text-lg);
		font-weight: var(--font-weight-semibold);
	}
	.recent__more {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-medium);
		color: var(--accent-primary);
		text-decoration: none;
	}
	.recent__more:hover { text-decoration: underline; }
	.recent__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.recent__empty {
		padding: 24px;
		text-align: center;
		background: var(--surface-secondary);
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-lg);
		color: var(--foreground-secondary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
	}
	.recent__item {
		display: flex;
		align-items: center;
		gap: 14px;
		padding: 12px 14px;
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
	}
	.recent__thumb {
		width: 48px;
		height: 48px;
		border-radius: var(--radius-md);
		background-size: cover;
		background-position: center;
		background-color: var(--surface-tertiary);
		flex: 0 0 auto;
	}
	.recent__meta {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}
	.recent__name {
		font-family: var(--font-body);
		font-size: var(--text-base);
		font-weight: var(--font-weight-medium);
		color: var(--foreground-primary);
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.recent__name:hover { color: var(--accent-primary); }
	.recent__time {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		color: var(--foreground-tertiary);
	}
	.recent__reaction {
		padding: 4px 10px;
		border-radius: var(--radius-pill);
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
	}
	.recent__reaction--like {
		background: var(--decor-mint);
		color: #2f7a57;
	}
	.recent__reaction--pass {
		background: var(--decor-peach);
		color: #9a3838;
	}

	/* Latest match sidebar */
	.latest {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 20px;
		background: var(--surface-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-lg);
	}
	.latest__eyebrow {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.6px;
		color: var(--foreground-tertiary);
	}
	.latest__game {
		font-family: var(--font-heading);
		font-size: var(--text-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.latest__cat {
		padding: 3px 10px;
		border-radius: var(--radius-pill);
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		color: var(--foreground-secondary);
		width: fit-content;
	}
	.latest__avatars {
		display: inline-flex;
		gap: -8px;
	}
	.latest__avatar {
		width: 32px;
		height: 32px;
		border-radius: var(--radius-pill);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-heading);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		border: 2px solid var(--surface-secondary);
		margin-left: -8px;
	}
	.latest__avatar:first-child { margin-left: 0; }
	.latest__avatar--more {
		background: var(--surface-tertiary);
		color: var(--foreground-secondary);
	}
	.latest__view {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--accent-primary);
		text-decoration: none;
	}
	.latest__view:hover { text-decoration: underline; }
	.latest__empty {
		margin: 0;
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
	}
</style>
