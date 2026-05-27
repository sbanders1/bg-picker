<script lang="ts">
	import { goto } from '$app/navigation';
	import { group } from '$lib/state/group.svelte';
	import { getGame } from '$lib/state/games.svelte';
	import { profile } from '$lib/state/profile.svelte';
	import { profileById, type SeedProfile } from '$lib/profiles';
	import Button from './Button.svelte';
	import StatsRow from './StatsRow.svelte';

	// Bounce to the picker if no active profile.
	$effect(() => {
		if (!profile.id) goto('/');
	});

	const latestMatch = $derived(group.matches[group.matches.length - 1]);
	const game = $derived(latestMatch ? getGame(latestMatch.gameId) : undefined);

	const playerCount = $derived(latestMatch?.profileIds.length ?? 0);

	// Resolve match participants through the roster; cap at 5 chips and split across
	// the two decorative rails (ceil/2 on the left, rest on the right).
	function fallbackSeed(id: string, idx: number): SeedProfile {
		return {
			id,
			name: `Player ${idx + 1}`,
			initial: String(idx + 1),
			bg: 'var(--surface-tertiary)',
			fg: 'var(--foreground-secondary)'
		};
	}
	const matchedProfiles = $derived(
		(latestMatch?.profileIds ?? [])
			.slice(0, 5)
			.map((id, i): SeedProfile => profileById(id) ?? fallbackSeed(id, i))
	);
	const leftChips = $derived(matchedProfiles.slice(0, Math.ceil(matchedProfiles.length / 2)));
	const rightChips = $derived(matchedProfiles.slice(Math.ceil(matchedProfiles.length / 2)));

	const statsItems = $derived.by(() => {
		if (!game) return [];
		const out: string[] = [];
		if (game.minPlayers && game.maxPlayers) {
			out.push(
				game.minPlayers === game.maxPlayers
					? `${game.minPlayers} players`
					: `${game.minPlayers}–${game.maxPlayers} players`
			);
		}
		if (game.minPlayTime && game.maxPlayTime) {
			out.push(
				game.minPlayTime === game.maxPlayTime
					? `${game.minPlayTime} min`
					: `${game.minPlayTime}–${game.maxPlayTime} min`
			);
		} else if (game.playingTime) {
			out.push(`${game.playingTime} min`);
		}
		if (game.categories && game.categories.length > 0) {
			out.push(game.categories[0]);
		}
		return out;
	});

	const playersLabel = $derived.by(() => {
		if (!game) return '';
		if (game.minPlayers && game.maxPlayers) {
			return game.minPlayers === game.maxPlayers
				? `${game.minPlayers}`
				: `${game.minPlayers}–${game.maxPlayers}`;
		}
		return '—';
	});

	const durationLabel = $derived.by(() => {
		if (!game) return '';
		if (game.minPlayTime && game.maxPlayTime) {
			return game.minPlayTime === game.maxPlayTime
				? `${game.minPlayTime} min`
				: `${game.minPlayTime}–${game.maxPlayTime} min`;
		}
		if (game.playingTime) return `${game.playingTime} min`;
		return '—';
	});

	const complexityLabel = $derived.by(() => {
		const w = game?.averageWeight;
		if (w == null) return '—';
		if (w < 2) return 'Light';
		if (w < 3) return 'Medium-Light';
		if (w < 4) return 'Medium';
		if (w < 4.5) return 'Medium-Heavy';
		return 'Heavy';
	});

	const themeLabel = $derived(game?.categories?.[0] ?? '—');

	// 15 confetti circles — single SVG, decorative coordinates lifted from frame V6BJy
	// (1440x900 viewport). Distributed across the 8 --decor-* palette tokens.
	const confetti = [
		{ cx: 120, cy: 140, r: 9, color: 'peach' },
		{ cx: 200, cy: 90, r: 5, color: 'sky' },
		{ cx: 260, cy: 170, r: 7, color: 'mint' },
		{ cx: 140, cy: 300, r: 4, color: 'cream' },
		{ cx: 60, cy: 410, r: 8, color: 'lavender' },
		{ cx: 220, cy: 500, r: 5, color: 'peach' },
		{ cx: 80, cy: 640, r: 6, color: 'cyan' },
		{ cx: 420, cy: 110, r: 3, color: 'mint' },
		{ cx: 640, cy: 90, r: 3, color: 'lavender' },
		{ cx: 860, cy: 100, r: 3, color: 'sky' },
		{ cx: 1020, cy: 120, r: 4, color: 'pink' },
		{ cx: 1240, cy: 90, r: 5, color: 'purple' },
		{ cx: 1180, cy: 200, r: 6, color: 'sky' },
		{ cx: 1320, cy: 140, r: 8, color: 'mint' },
		{ cx: 1360, cy: 620, r: 6, color: 'cyan' }
	] as const;

	function tokenFor(name: string) {
		return `var(--decor-${name})`;
	}

	function back() {
		goto('/swipe');
	}
	function startNight() {
		goto('/group');
	}
</script>

<div class="screen">
	<svg
		class="confetti"
		viewBox="0 0 1440 820"
		preserveAspectRatio="xMidYMid slice"
		aria-hidden="true"
		focusable="false"
	>
		{#each confetti as c, i (i)}
			<circle cx={c.cx} cy={c.cy} r={c.r} fill={tokenFor(c.color)} opacity="0.85" />
		{/each}
	</svg>

	<main class="content">
		{#if !latestMatch || !game}
			<div class="empty">
				<h2 class="empty__title">No matches yet</h2>
				<p class="empty__sub">Keep swiping — when everyone agrees, you'll see it here.</p>
				<div class="empty__cta">
					<Button variant="primary" size="lg" onclick={back}>Back to swiping</Button>
				</div>
			</div>
		{:else}
			<header class="hero">
				<div class="hero__badge">
					<span class="hero__badge-dot" aria-hidden="true"></span>
					<span class="hero__badge-text">EVERYONE SWIPED RIGHT</span>
				</div>
				<h1 class="hero__title">It's a Match!</h1>
				<p class="hero__sub">
					{#if playerCount > 0}
						All {playerCount} player{playerCount === 1 ? '' : 's'} want to play tonight
					{:else}
						Everyone wants to play tonight
					{/if}
				</p>
			</header>

			<section class="center">
				<aside class="rail rail--left" aria-hidden="true">
					{#each leftChips as p (p.id)}
						<div class="chip">
							<span class="chip__avatar" style:background={p.bg} style:color={p.fg}>
								{p.initial}
							</span>
							<span class="chip__meta">
								<span class="chip__name">{p.name}</span>
								<span class="chip__status">picked tonight</span>
							</span>
						</div>
					{/each}
				</aside>

				<article class="card">
					<div class="card__hero" style:background={tokenFor('mint')}>
						{#if game.image || game.thumbnail}
							<img class="card__img" src={game.image ?? game.thumbnail} alt="" />
						{:else}
							<span class="card__hero-title">{game.name.toUpperCase()}</span>
						{/if}
					</div>
					<div class="card__body">
						<h2 class="card__title">{game.name}</h2>
						{#if statsItems.length > 0}
							<StatsRow items={statsItems} />
						{/if}
						{#if game.categories && game.categories.length > 0}
							<div class="card__tags">
								{#each game.categories.slice(0, 3) as cat (cat)}
									<span class="tag">{cat}</span>
								{/each}
							</div>
						{/if}
					</div>
				</article>

				<aside class="rail rail--right" aria-hidden="true">
					{#each rightChips as p (p.id)}
						<div class="chip">
							<span class="chip__avatar" style:background={p.bg} style:color={p.fg}>
								{p.initial}
							</span>
							<span class="chip__meta">
								<span class="chip__name">{p.name}</span>
								<span class="chip__status">picked tonight</span>
							</span>
						</div>
					{/each}
				</aside>
			</section>

			<div class="facts">
				<div class="fact">
					<span class="fact__label">Players:</span>
					<span class="fact__value">{playersLabel}</span>
				</div>
				<div class="fact">
					<span class="fact__label">Duration:</span>
					<span class="fact__value">{durationLabel}</span>
				</div>
				<div class="fact">
					<span class="fact__label">Complexity:</span>
					<span class="fact__value">{complexityLabel}</span>
				</div>
				<div class="fact">
					<span class="fact__label">Theme:</span>
					<span class="fact__value">{themeLabel}</span>
				</div>
			</div>

			<div class="actions">
				<Button variant="secondary" size="lg" onclick={back}>Keep swiping</Button>
				<Button variant="primary" size="lg" onclick={startNight}>See all matches</Button>
			</div>
		{/if}
	</main>
</div>

<style>
	.screen {
		position: relative;
		min-height: calc(100vh - var(--nav-height));
		background: var(--surface-primary);
		overflow: hidden;
	}

	.confetti {
		position: absolute;
		inset: 80px 0 0 0;
		width: 100%;
		height: calc(100% - 80px);
		pointer-events: none;
		z-index: 0;
	}

	.content {
		position: relative;
		z-index: 1;
		max-width: 1200px;
		margin: 0 auto;
		padding: 24px 120px 40px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 24px;
	}

	/* Hero */
	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 10px;
		text-align: center;
	}
	.hero__badge {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 14px;
		border-radius: var(--radius-pill);
		background: var(--decor-cream);
		color: #9a6f1f;
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.8px;
	}
	.hero__badge-dot {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-pill);
		background: #c28f2a;
	}
	.hero__title {
		font-family: var(--font-heading);
		font-size: var(--text-5xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
		line-height: 1.1;
	}
	.hero__sub {
		font-family: var(--font-body);
		font-size: var(--text-lg);
		color: var(--foreground-secondary);
		margin: 0;
	}

	/* Center row */
	.center {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 32px;
		width: 100%;
	}
	.rail {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.rail--left {
		align-items: flex-end;
	}
	.rail--right {
		align-items: flex-start;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 8px 14px 8px 8px;
		border-radius: var(--radius-pill);
		background: var(--surface-primary);
		box-shadow:
			0 4px 6px rgba(0, 0, 0, 0.03),
			0 16px 40px rgba(0, 0, 0, 0.07);
	}
	.chip__avatar {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-pill);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-heading);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.chip__meta {
		display: flex;
		flex-direction: column;
		gap: 1px;
		line-height: 1.2;
	}
	.chip__name {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.chip__status {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		color: var(--foreground-tertiary);
	}

	/* Match card */
	.card {
		width: 380px;
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-xl);
		overflow: hidden;
		box-shadow:
			0 4px 6px rgba(0, 0, 0, 0.03),
			0 16px 40px rgba(0, 0, 0, 0.07);
	}
	.card__hero {
		height: 300px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 24px;
	}
	.card__img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.card__hero-title {
		font-family: var(--font-heading);
		font-size: var(--text-3xl);
		font-weight: var(--font-weight-semibold);
		color: var(--surface-primary);
		letter-spacing: 2px;
		text-align: center;
	}
	.card__body {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 20px 24px 24px;
	}
	.card__title {
		font-family: var(--font-heading);
		font-size: var(--text-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.card__tags {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}
	.tag {
		padding: 4px 10px;
		border-radius: var(--radius-pill);
		background: var(--surface-secondary);
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		color: var(--foreground-secondary);
	}

	/* Facts row */
	.facts {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: 10px;
	}
	.fact {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 10px 16px;
		border-radius: var(--radius-pill);
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		font-family: var(--font-body);
		font-size: var(--text-sm);
	}
	.fact__label {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-medium);
		color: var(--foreground-tertiary);
	}
	.fact__value {
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}

	/* Actions */
	.actions {
		display: flex;
		gap: 14px;
		align-items: center;
	}

	/* Empty state */
	.empty {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 80px 20px;
		text-align: center;
	}
	.empty__title {
		font-family: var(--font-heading);
		font-size: var(--text-3xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.empty__sub {
		font-family: var(--font-body);
		font-size: var(--text-base);
		color: var(--foreground-secondary);
		margin: 0;
	}
	.empty__cta {
		margin-top: 12px;
	}
</style>
