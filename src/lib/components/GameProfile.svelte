<script lang="ts">
	import { goto } from '$app/navigation';
	import { getGame } from '$lib/state/games.svelte';
	import Button from './Button.svelte';
	import StatsRow from './StatsRow.svelte';

	let { id }: { id: number } = $props();

	const game = $derived(getGame(id));

	const decorPalette = [
		'--decor-peach',
		'--decor-sky',
		'--decor-mint',
		'--decor-cream',
		'--decor-lavender',
		'--decor-cyan',
		'--decor-pink'
	];

	function chipColor(i: number): string {
		return `var(${decorPalette[i % decorPalette.length]})`;
	}

	function playersLabel(min?: number, max?: number): string | null {
		if (!min && !max) return null;
		if (min && max && min !== max) return `${min}–${max}`;
		return String(min ?? max);
	}

	function playTimeLabel(min?: number, max?: number, single?: number): string | null {
		if (min && max && min !== max) return `${min}–${max} min`;
		const v = single ?? min ?? max;
		return v ? `${v} min` : null;
	}

	function ageLabel(min?: number): string | null {
		return min ? `Age ${min}+` : null;
	}

	function weightLabel(w?: number | null): string {
		return w == null ? '—' : `${w.toFixed(1)} / 5`;
	}

	function ratingLabel(r?: number): string {
		return r == null ? '—' : `${r.toFixed(1)} / 10`;
	}

	function stripHtml(s: string): string {
		return s
			.replace(/&#10;/g, '\n')
			.replace(/&amp;/g, '&')
			.replace(/&quot;/g, '"')
			.replace(/&#39;/g, "'")
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/<[^>]+>/g, '');
	}

	const cleanDescription = $derived(game?.description ? stripHtml(game.description) : '');
	const playersText = $derived(playersLabel(game?.minPlayers, game?.maxPlayers));
	const playTimeText = $derived(
		playTimeLabel(game?.minPlayTime, game?.maxPlayTime, game?.playingTime)
	);
	const ageText = $derived(ageLabel(game?.minAge));

	const breadcrumbs = $derived(
		game ? ['Catalog', game.name] : ['Catalog']
	);

	const tags = $derived([...(game?.categories ?? []), ...(game?.mechanics ?? [])]);

	function back() {
		goto('/dashboard');
	}
</script>

<div class="page">
	{#if !game}
		<div class="empty">
			<div class="empty__inner">
				<h2 class="empty__title">Game not found</h2>
				<p class="empty__body">
					This game isn't in the catalog yet. Ask the host to add it from the admin upload screen.
				</p>
				<Button variant="primary" onclick={back}>Back to dashboard</Button>
			</div>
		</div>
	{:else}
		<div class="content">
			<!-- Breadcrumb / title section -->
			<div class="crumbs">
				<StatsRow items={breadcrumbs} />
			</div>

			<!-- Hero: image on left, key info on right -->
			<section class="hero">
				<div class="hero__media">
					{#if game.image}
						<img class="hero__img" src={game.image} alt={game.name} />
					{:else if game.thumbnail}
						<img class="hero__img" src={game.thumbnail} alt={game.name} />
					{:else}
						<div class="hero__img hero__img--placeholder">
							<span class="hero__placeholder-text">{game.name}</span>
						</div>
					{/if}
				</div>

				<div class="hero__info">
					{#if game.yearPublished}
						<div class="hero__year">{game.yearPublished}</div>
					{/if}
					<h1 class="hero__title">{game.name}</h1>
					{#if cleanDescription}
						<p class="hero__tagline">{cleanDescription.split('\n')[0]}</p>
					{/if}

					<div class="stats-grid">
						{#if playersText}
							<div class="stat">
								<span class="stat__label">PLAYERS</span>
								<span class="stat__value">{playersText}</span>
							</div>
						{/if}
						{#if playTimeText}
							<div class="stat">
								<span class="stat__label">PLAY TIME</span>
								<span class="stat__value">{playTimeText}</span>
							</div>
						{/if}
						{#if game.averageWeight != null}
							<div class="stat">
								<span class="stat__label">COMPLEXITY</span>
								<span class="stat__value">{weightLabel(game.averageWeight)}</span>
							</div>
						{/if}
						{#if ageText}
							<div class="stat">
								<span class="stat__label">BEST FOR</span>
								<span class="stat__value">{ageText}</span>
							</div>
						{/if}
					</div>

					<div class="actions">
						<Button variant="secondary" onclick={back}>Back to dashboard</Button>
					</div>
				</div>
			</section>

			<!-- Bottom: description, tags, details -->
			<section class="bottom">
				<div class="bottom__main">
					{#if cleanDescription}
						<div class="block">
							<h2 class="block__title">About this game</h2>
							<p class="block__body">{cleanDescription}</p>
						</div>
					{/if}

					{#if tags.length > 0}
						<div class="block">
							<span class="block__eyebrow">MECHANICS &amp; THEMES</span>
							<div class="chips">
								{#each tags as tag, i (tag + i)}
									<span class="chip" style:background={chipColor(i)}>{tag}</span>
								{/each}
							</div>
						</div>
					{/if}
				</div>

				<aside class="bottom__side">
					<h2 class="block__title">Details</h2>
					<div class="details">
						{#if game.designers && game.designers.length > 0}
							<div class="detail">
								<span class="detail__label">Designer</span>
								<span class="detail__value">{game.designers.join(', ')}</span>
							</div>
						{/if}
						{#if game.yearPublished}
							<div class="detail">
								<span class="detail__label">Year published</span>
								<span class="detail__value">{game.yearPublished}</span>
							</div>
						{/if}
						{#if game.minAge}
							<div class="detail">
								<span class="detail__label">Min age</span>
								<span class="detail__value">{game.minAge}+</span>
							</div>
						{/if}
						<div class="detail">
							<span class="detail__label">Weight (complexity)</span>
							<span class="detail__value">{weightLabel(game.averageWeight)}</span>
						</div>
						{#if game.averageRating != null}
							<div class="detail">
								<span class="detail__label">BGG Rating</span>
								<span class="detail__value">{ratingLabel(game.averageRating)}</span>
							</div>
						{/if}
						{#if game.usersRated != null}
							<div class="detail">
								<span class="detail__label">Users rated</span>
								<span class="detail__value">{game.usersRated.toLocaleString()}</span>
							</div>
						{/if}
					</div>
				</aside>
			</section>
		</div>
	{/if}
</div>

<style>
	.page {
		min-height: calc(100vh - 80px);
		background: var(--surface-primary);
	}

	.content {
		max-width: 1200px;
		margin: 0 auto;
		padding: 28px 120px 32px;
		display: flex;
		flex-direction: column;
		gap: 28px;
	}

	.crumbs {
		padding: 4px 0;
	}

	/* Hero */
	.hero {
		display: grid;
		grid-template-columns: 600px 1fr;
		gap: 32px;
		align-items: start;
	}

	.hero__media {
		width: 100%;
	}

	.hero__img {
		width: 100%;
		height: 380px;
		object-fit: cover;
		border-radius: var(--radius-xl);
		display: block;
		box-shadow:
			0 4px 6px rgba(0, 0, 0, 0.03),
			0 16px 40px rgba(0, 0, 0, 0.07);
	}

	.hero__img--placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--decor-mint);
		color: var(--accent-on);
	}

	.hero__placeholder-text {
		font-family: var(--font-heading);
		font-size: var(--text-3xl);
		font-weight: var(--font-weight-semibold);
		color: #ffffff;
		letter-spacing: 2px;
		text-align: center;
		padding: 16px;
		text-transform: uppercase;
	}

	.hero__info {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.hero__year {
		display: inline-block;
		align-self: flex-start;
		padding: 4px 10px;
		border-radius: var(--radius-pill);
		background: var(--surface-secondary);
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-secondary);
		letter-spacing: 0.6px;
	}

	.hero__title {
		font-family: var(--font-heading);
		font-size: var(--text-4xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
		line-height: 1.05;
		margin: 0;
	}

	.hero__tagline {
		font-family: var(--font-body);
		font-size: var(--text-base);
		color: var(--foreground-secondary);
		line-height: 1.4;
		margin: 0;
	}

	/* Stats grid */
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: 8px;
	}

	.stat {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 14px;
		border-radius: var(--radius-lg);
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
	}

	.stat__label {
		font-family: var(--font-caption);
		font-size: 10px;
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-tertiary);
		letter-spacing: 0.5px;
	}

	.stat__value {
		font-family: var(--font-heading);
		font-size: var(--text-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}

	.actions {
		display: flex;
		gap: 10px;
		margin-top: 4px;
	}

	/* Bottom */
	.bottom {
		display: grid;
		grid-template-columns: 1fr 380px;
		gap: 32px;
		align-items: start;
	}

	.bottom__main {
		display: flex;
		flex-direction: column;
		gap: 24px;
	}

	.bottom__side {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 20px;
		border-radius: var(--radius-lg);
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		box-shadow:
			0 4px 6px rgba(0, 0, 0, 0.03),
			0 16px 40px rgba(0, 0, 0, 0.07);
	}

	.block {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.block__title {
		font-family: var(--font-heading);
		font-size: var(--text-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
		margin: 0;
	}

	.block__body {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		line-height: 1.6;
		margin: 0;
		white-space: pre-wrap;
	}

	.block__eyebrow {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-tertiary);
		letter-spacing: 0.6px;
	}

	/* Chips */
	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		padding: 6px 12px;
		border-radius: var(--radius-pill);
		font-family: var(--font-caption);
		font-size: 12px;
		font-weight: var(--font-weight-medium);
		color: var(--foreground-primary);
	}

	/* Details */
	.details {
		display: flex;
		flex-direction: column;
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-subtle);
		overflow: hidden;
	}

	.detail {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 12px 16px;
		gap: 12px;
	}

	.detail:nth-child(even) {
		background: var(--surface-secondary);
	}

	.detail__label {
		font-family: var(--font-caption);
		font-size: 12px;
		font-weight: var(--font-weight-medium);
		color: var(--foreground-secondary);
	}

	.detail__value {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
		text-align: right;
	}

	/* Empty state */
	.empty {
		min-height: calc(100vh - 80px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 40px;
	}

	.empty__inner {
		max-width: 480px;
		text-align: center;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 16px;
		padding: 40px;
		background: var(--surface-secondary);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-subtle);
	}

	.empty__title {
		font-family: var(--font-heading);
		font-size: var(--text-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
		margin: 0;
	}

	.empty__body {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		margin: 0;
	}
</style>
