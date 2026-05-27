<script lang="ts">
	import { goto } from '$app/navigation';
	import { games } from '$lib/state/games.svelte';
	import { swipes, like, pass } from '$lib/state/swipes.svelte';
	import { profile } from '$lib/state/profile.svelte';
	import { group, addMatch } from '$lib/state/group.svelte';
	import Button from './Button.svelte';
	import Card from './Card.svelte';
	import StatsRow from './StatsRow.svelte';

	const total = $derived(games.catalog.length);
	const index = $derived(swipes.currentIndex);
	const currentGame = $derived(index < total ? games.catalog[index] : undefined);
	const done = $derived(total > 0 && index >= total);
	const likeCount = $derived(
		swipes.history.filter((h) => h.direction === 'like').length
	);
	const passCount = $derived(
		swipes.history.filter((h) => h.direction === 'pass').length
	);

	const initial = $derived(
		profile.name ? profile.name.charAt(0).toUpperCase() : '?'
	);

	const heroLabel = $derived(currentGame?.name?.toUpperCase() ?? '');

	function playerCountLabel(g: typeof currentGame): string | null {
		if (!g) return null;
		if (g.minPlayers && g.maxPlayers) {
			return g.minPlayers === g.maxPlayers
				? `${g.minPlayers} players`
				: `${g.minPlayers}-${g.maxPlayers} players`;
		}
		if (g.minPlayers) return `${g.minPlayers}+ players`;
		return null;
	}

	function playTimeLabel(g: typeof currentGame): string | null {
		if (!g) return null;
		if (g.minPlayTime && g.maxPlayTime && g.minPlayTime !== g.maxPlayTime) {
			return `${g.minPlayTime}-${g.maxPlayTime} min`;
		}
		if (g.playingTime) return `${g.playingTime} min`;
		if (g.minPlayTime) return `${g.minPlayTime} min`;
		return null;
	}

	function complexityLabel(g: typeof currentGame): string | null {
		if (!g || g.averageWeight == null) return null;
		return `${g.averageWeight.toFixed(1)} weight`;
	}

	const stats = $derived.by(() => {
		const items: string[] = [];
		const p = playerCountLabel(currentGame);
		const t = playTimeLabel(currentGame);
		const c = complexityLabel(currentGame);
		if (p) items.push(p);
		if (t) items.push(t);
		if (c) items.push(c);
		return items;
	});

	const badges = $derived(
		[...(currentGame?.categories ?? []), ...(currentGame?.mechanics ?? [])].slice(0, 3)
	);

	function onLike() {
		if (!currentGame) return;
		const gameId = currentGame.id;
		like(gameId, profile.id);
		// v1 simulate: every 5th like is a match
		if (likeCount + 1 > 0 && (likeCount + 1) % 5 === 0) {
			addMatch({
				gameId,
				at: Date.now(),
				profileIds: [profile.id]
			});
			goto('/match');
		}
	}

	function onPass() {
		if (!currentGame) return;
		pass(currentGame.id, profile.id);
	}

	function handleKey(e: KeyboardEvent) {
		if (done || !currentGame) return;
		if (e.key === 'ArrowRight') {
			e.preventDefault();
			onLike();
		} else if (e.key === 'ArrowLeft') {
			e.preventDefault();
			onPass();
		}
	}
</script>

<svelte:window onkeydown={handleKey} />

<div class="swiping">
	<header class="hdr">
		<div class="hdr__brand">
			<div class="hdr__logo" aria-hidden="true">
				<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
					stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					<rect x="3" y="3" width="18" height="18" rx="3" />
					<circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
					<circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none" />
					<circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
					<circle cx="8" cy="16" r="1.2" fill="currentColor" stroke="none" />
					<circle cx="16" cy="16" r="1.2" fill="currentColor" stroke="none" />
				</svg>
			</div>
			<span class="hdr__title">GameMatch</span>
		</div>

		<div class="chip">
			<span class="chip__avatar" aria-hidden="true">{initial}</span>
			<span class="chip__meta">
				<span class="chip__label">Swiping as</span>
				<span class="chip__name">{profile.name || 'Guest'}</span>
			</span>
		</div>

		<button class="switch" type="button" onclick={() => goto('/profile')}>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
				stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
				<path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
				<path d="M21 3v5h-5" />
				<path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
				<path d="M3 21v-5h5" />
			</svg>
			Switch Profile
		</button>
	</header>

	<main class="main">
		{#if done}
			<div class="empty">
				<h2 class="empty__title">All swiped</h2>
				<p class="empty__body">You're through the stack — head back to the dashboard.</p>
				<Button variant="primary" size="lg" onclick={() => goto('/group')}>
					{#snippet children()}Back to dashboard{/snippet}
				</Button>
			</div>
		{:else if !currentGame}
			<div class="empty">
				<h2 class="empty__title">No games yet</h2>
				<p class="empty__body">Add games in admin to start voting.</p>
				<Button variant="primary" size="lg" onclick={() => goto('/admin')}>
					{#snippet children()}Go to admin{/snippet}
				</Button>
			</div>
		{:else}
			<section class="progress" aria-label="Swipe progress">
				<div class="progress__label">
					<span class="progress__eyebrow">GAME</span>
					<span class="progress__count">{index + 1}</span>
					<span class="progress__total">of {total}</span>
				</div>
				<div class="progress__dots" aria-hidden="true">
					{#each games.catalog as _, i (i)}
						<span
							class="dot"
							class:dot--done={i < index}
							class:dot--active={i === index}
						></span>
					{/each}
				</div>
			</section>

			<div class="stack" aria-live="polite">
				<div class="peek peek--two" aria-hidden="true">
					<div class="peek__hero peek__hero--two"></div>
				</div>
				<div class="peek peek--one" aria-hidden="true">
					<div class="peek__hero peek__hero--one"></div>
				</div>

				<article class="card" {...{ key: currentGame.id }}>
					<div class="card__hero">
						<span class="card__heroText">{heroLabel}</span>
					</div>

					<div class="card__body">
						<div class="card__row">
							<h2 class="card__title">{currentGame.name}</h2>
							{#if currentGame.bayesAverage || currentGame.averageRating}
								<span class="card__rating">
									<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"
										aria-hidden="true">
										<path d="M12 2l2.9 6.9L22 10l-5.5 4.7L18.2 22 12 18.3 5.8 22l1.7-7.3L2 10l7.1-1.1L12 2z" />
									</svg>
									{(currentGame.bayesAverage ?? currentGame.averageRating ?? 0).toFixed(1)}
								</span>
							{/if}
						</div>

						{#if stats.length}
							<StatsRow items={stats} />
						{/if}

						{#if currentGame.description}
							<p class="card__desc">{currentGame.description}</p>
						{/if}

						{#if badges.length}
							<div class="badges">
								{#each badges as b (b)}
									<span class="badge">{b}</span>
								{/each}
							</div>
						{/if}
					</div>
				</article>
			</div>

			<div class="actions">
				<button
					class="circle circle--pass"
					type="button"
					onclick={onPass}
					aria-label="Pass on {currentGame.name}"
				>
					<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor"
						stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M18 6L6 18" />
						<path d="M6 6l12 12" />
					</svg>
				</button>

				<button class="circle circle--star" type="button" aria-label="Super like (coming soon)" disabled>
					<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path d="M12 2l2.9 6.9L22 10l-5.5 4.7L18.2 22 12 18.3 5.8 22l1.7-7.3L2 10l7.1-1.1L12 2z" />
					</svg>
				</button>

				<button
					class="circle circle--like"
					type="button"
					onclick={onLike}
					aria-label="Like {currentGame.name}"
				>
					<svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
						<path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.65-9.5 9-9.5 9z" />
					</svg>
				</button>
			</div>

			<div class="hints" aria-hidden="true">
				<span class="hint">← Pass</span>
				<span class="hint">↑ Super</span>
				<span class="hint">→ Play</span>
			</div>
		{/if}
	</main>

	<footer class="vote">
		<div class="vote__left">
			<div class="vote__meta">
				<span class="vote__eyebrow">WHO'S VOTING</span>
				<span class="vote__count">
					{group.current
						? `${Math.min(index, total)} of ${group.current.memberIds.length || 1} done`
						: `${index} swiped`}
				</span>
			</div>
			<div class="vote__avatars">
				{#if group.current?.memberIds?.length}
					{#each group.current.memberIds as memberId (memberId)}
						<span
							class="vote__avatar"
							class:vote__avatar--self={memberId === profile.id}
						>{memberId.charAt(0).toUpperCase()}</span>
					{/each}
				{:else}
					<span class="vote__avatar vote__avatar--self">{initial}</span>
				{/if}
			</div>
		</div>

		<div class="vote__right">
			<span class="tally tally--like">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.65-9.5 9-9.5 9z" />
				</svg>
				{likeCount}
			</span>
			<span class="tally tally--pass">
				<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
					stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
					<path d="M18 6L6 18" />
					<path d="M6 6l12 12" />
				</svg>
				{passCount}
			</span>
			<span class="vote__divider" aria-hidden="true"></span>
			<Button variant="secondary" size="md" onclick={() => goto('/group')}>
				{#snippet children()}End Round{/snippet}
			</Button>
		</div>
	</footer>
</div>

<style>
	.swiping {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--surface-primary);
		color: var(--foreground-primary);
	}

	/* Header */
	.hdr {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 24px 40px;
		background: var(--surface-primary);
		border-bottom: 1px solid var(--border-subtle);
	}
	.hdr__brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
	}
	.hdr__logo {
		width: 32px;
		height: 32px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--accent-primary);
		color: var(--accent-on);
		border-radius: var(--radius-md);
	}
	.hdr__title {
		font-family: var(--font-heading);
		font-size: 22px;
		font-weight: var(--font-weight-bold);
		letter-spacing: -0.4px;
		color: var(--foreground-primary);
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 6px 16px 6px 6px;
		background: var(--surface-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-pill);
	}
	.chip__avatar {
		width: 32px;
		height: 32px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-pill);
		background: var(--warning);
		color: var(--accent-on);
		font-family: var(--font-heading);
		font-weight: var(--font-weight-bold);
		font-size: 14px;
	}
	.chip__meta {
		display: inline-flex;
		flex-direction: column;
		line-height: 1.2;
	}
	.chip__label {
		font-family: var(--font-caption);
		font-size: 12px;
		color: var(--foreground-secondary);
	}
	.chip__name {
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.switch {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: none;
		border: none;
		color: var(--foreground-secondary);
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: var(--font-weight-medium);
		cursor: pointer;
	}
	.switch:hover {
		color: var(--foreground-primary);
	}

	/* Main */
	.main {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		padding: 20px 40px 16px;
	}

	.progress {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
	}
	.progress__label {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.progress__eyebrow {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-tertiary);
		letter-spacing: 1.2px;
	}
	.progress__count {
		font-family: var(--font-heading);
		font-size: 14px;
		font-weight: var(--font-weight-bold);
		color: var(--foreground-primary);
	}
	.progress__total {
		font-family: var(--font-caption);
		font-size: 12px;
		color: var(--foreground-secondary);
	}
	.progress__dots {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-pill);
		background: var(--surface-tertiary);
	}
	.dot--done {
		background: var(--foreground-tertiary);
	}
	.dot--active {
		width: 24px;
		background: var(--accent-primary);
	}

	/* Card stack */
	.stack {
		position: relative;
		width: 560px;
		max-width: 100%;
		height: 520px;
	}
	.peek {
		position: absolute;
		width: 430px;
		height: 500px;
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-xl);
		box-shadow:
			0 6px 18px rgba(15, 23, 42, 0.1),
			0 20px 40px rgba(15, 23, 42, 0.08);
		overflow: hidden;
	}
	.peek__hero {
		height: 240px;
		border-top-left-radius: var(--radius-xl);
		border-top-right-radius: var(--radius-xl);
	}
	.peek--one {
		top: 14px;
		left: 51px;
		transform: rotate(3deg);
		opacity: 0.8;
	}
	.peek--two {
		top: 24px;
		left: 83px;
		transform: rotate(-4deg);
		opacity: 0.55;
	}
	.peek__hero--one {
		background: #e8b7b0;
	}
	.peek__hero--two {
		background: #b7d0c2;
	}

	.card {
		position: absolute;
		top: 0;
		left: 65px;
		width: 430px;
		height: 500px;
		display: flex;
		flex-direction: column;
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-xl);
		overflow: hidden;
		box-shadow:
			0 2px 6px rgba(15, 23, 42, 0.08),
			0 12px 32px rgba(15, 23, 42, 0.12),
			0 32px 60px rgba(15, 23, 42, 0.13);
		animation: card-in 0.25s ease-out;
	}
	@keyframes card-in {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.98);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}
	.card__hero {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 260px;
		background: linear-gradient(135deg, #5b7c99 0%, #3d5a73 100%);
	}
	.card__heroText {
		font-family: var(--font-heading);
		font-size: 48px;
		font-weight: var(--font-weight-extrabold);
		color: rgba(255, 255, 255, 0.93);
		letter-spacing: 6px;
		text-align: center;
		padding: 0 16px;
	}
	.card__body {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 22px 24px 20px;
		flex: 1;
		overflow: hidden;
	}
	.card__row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}
	.card__title {
		font-family: var(--font-heading);
		font-size: var(--text-xl);
		font-weight: var(--font-weight-bold);
		color: var(--foreground-primary);
	}
	.card__rating {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
		background: var(--surface-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-pill);
		padding: 4px 10px;
	}
	.card__rating svg {
		color: var(--warning);
	}
	.card__desc {
		font-family: var(--font-body);
		font-size: 13.5px;
		line-height: 1.55;
		color: var(--foreground-secondary);
		margin: 0;
		display: -webkit-box;
		-webkit-line-clamp: 4;
		line-clamp: 4;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: auto;
	}
	.badge {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-secondary);
		background: var(--surface-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-pill);
		padding: 4px 10px;
	}

	/* Actions */
	.actions {
		display: flex;
		align-items: center;
		gap: 24px;
	}
	.circle {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border: none;
		cursor: pointer;
		border-radius: var(--radius-pill);
		background: var(--surface-primary);
		transition:
			transform 0.1s ease,
			opacity 0.15s ease,
			box-shadow 0.15s ease;
		box-shadow:
			0 4px 10px rgba(15, 23, 42, 0.12),
			0 16px 36px rgba(15, 23, 42, 0.15);
	}
	.circle:active:not(:disabled) {
		transform: scale(0.94);
	}
	.circle:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
	.circle--pass {
		width: 64px;
		height: 64px;
		border: 2px solid var(--danger);
		color: var(--danger);
	}
	.circle--pass:hover {
		background: var(--surface-secondary);
	}
	.circle--star {
		width: 52px;
		height: 52px;
		background: var(--warning);
		color: var(--accent-on);
	}
	.circle--like {
		width: 64px;
		height: 64px;
		background: var(--success);
		color: var(--accent-on);
	}
	.circle--like:hover {
		opacity: 0.92;
	}

	/* Keyboard hints */
	.hints {
		display: inline-flex;
		gap: 14px;
	}
	.hint {
		font-family: var(--font-caption);
		font-size: 10.5px;
		font-weight: var(--font-weight-medium);
		color: var(--foreground-tertiary);
		background: var(--surface-secondary);
		border-radius: var(--radius-sm);
		padding: 3px 8px;
	}

	/* Voting bar */
	.vote {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 14px 40px;
		background: var(--surface-secondary);
		border-top: 1px solid var(--border-subtle);
	}
	.vote__left {
		display: inline-flex;
		align-items: center;
		gap: 14px;
	}
	.vote__meta {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.vote__eyebrow {
		font-family: var(--font-caption);
		font-size: 10px;
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-tertiary);
		letter-spacing: 1px;
	}
	.vote__count {
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.vote__avatars {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.vote__avatar {
		width: 36px;
		height: 36px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-pill);
		background: var(--surface-tertiary);
		color: var(--accent-on);
		font-family: var(--font-heading);
		font-weight: var(--font-weight-bold);
		font-size: 14px;
		opacity: 0.55;
	}
	.vote__avatar--self {
		background: var(--warning);
		border: 2px solid var(--accent-primary);
		opacity: 1;
	}
	.vote__right {
		display: inline-flex;
		align-items: center;
		gap: 18px;
	}
	.tally {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-body);
		font-size: 13px;
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.tally--like {
		color: var(--foreground-primary);
	}
	.tally--like svg {
		color: var(--success);
	}
	.tally--pass svg {
		color: var(--danger);
	}
	.vote__divider {
		width: 1px;
		height: 24px;
		background: var(--border-subtle);
	}

	/* Empty state */
	.empty {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 12px;
		text-align: center;
		padding: 80px 24px;
	}
	.empty__title {
		font-family: var(--font-heading);
		font-size: var(--text-2xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.empty__body {
		font-family: var(--font-body);
		font-size: var(--text-base);
		color: var(--foreground-secondary);
		margin: 0 0 8px;
	}
</style>
