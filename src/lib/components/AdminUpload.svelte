<script lang="ts">
	import { goto } from '$app/navigation';
	import { games, addGame } from '$lib/state/games.svelte';
	import type { BggSearchResult, Game } from '$lib/types';
	import Header from './Header.svelte';
	import Button from './Button.svelte';
	import StatsRow from './StatsRow.svelte';
	import GradientFade from './GradientFade.svelte';

	// A small rotation of background tints used for the game card hero (matches design).
	const HERO_COLORS = [
		'#E8845A',
		'#7BA374',
		'#5B8FC9',
		'#C9485B',
		'#8B6FB8',
		'#4A9D9C',
		'#D4A85A',
		'#3A4A5C'
	];

	function heroColor(id: number, index: number): string {
		return HERO_COLORS[(id + index) % HERO_COLORS.length];
	}

	let query = $state('');
	let results = $state<BggSearchResult[]>([]);
	let searching = $state(false);
	let searchError = $state<string | null>(null);
	let addingId = $state<number | null>(null);
	let addError = $state<string | null>(null);

	let debounce: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		const q = query.trim();
		if (debounce) clearTimeout(debounce);
		if (!q) {
			results = [];
			searchError = null;
			searching = false;
			return;
		}
		searching = true;
		debounce = setTimeout(() => {
			void runSearch(q);
		}, 300);
	});

	async function runSearch(q: string) {
		searchError = null;
		try {
			const r = await fetch(
				`/api/bgg/search?query=${encodeURIComponent(q)}&type=boardgame`
			);
			if (!r.ok) throw new Error(`HTTP ${r.status}`);
			const data = (await r.json()) as { results?: BggSearchResult[] };
			results = data.results ?? [];
		} catch {
			searchError = "Couldn't reach BGG — try again later";
			results = [];
		} finally {
			searching = false;
		}
	}

	async function pickResult(r: BggSearchResult) {
		addingId = r.id;
		addError = null;
		try {
			const res = await fetch(`/api/bgg/thing?id=${r.id}&stats=1`);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data = (await res.json()) as { games?: Game[] };
			const g = data.games?.[0];
			if (!g) throw new Error('No game returned');
			addGame(g);
			// Clear the search so the catalog shows through.
			query = '';
			results = [];
		} catch {
			addError = "Couldn't reach BGG — try again later";
		} finally {
			addingId = null;
		}
	}

	function statsFor(g: Game): string[] {
		const out: string[] = [];
		if (g.minPlayers && g.maxPlayers) {
			out.push(
				g.minPlayers === g.maxPlayers
					? `${g.minPlayers} players`
					: `${g.minPlayers}-${g.maxPlayers} players`
			);
		} else if (g.minPlayers) {
			out.push(`${g.minPlayers}+ players`);
		}
		if (g.playingTime) out.push(`${g.playingTime} min`);
		return out;
	}

	function startSession() {
		goto('/swipe');
	}

	function goBack() {
		history.length > 1 ? history.back() : goto('/');
	}

	let catalogCount = $derived(games.catalog.length);
	let canStart = $derived(catalogCount > 0);
</script>

<div class="page">
	<Header title={undefined}>
		{#snippet leading()}
			<div class="brand">
				<span class="brand__dot" aria-hidden="true"></span>
				<span class="brand__name">GameMatch</span>
			</div>
		{/snippet}
		{#snippet trailing()}
			<button class="back" type="button" onclick={goBack}>
				<span class="back__arrow" aria-hidden="true">&larr;</span>
				Back
			</button>
			<span class="avatar" aria-hidden="true"></span>
		{/snippet}
	</Header>

	<div class="scroll">
		<div class="body">
			<section class="intro">
				<h1 class="intro__title">Manage Game Library</h1>
				<p class="intro__subtitle">Add board games for tonight's vote</p>
			</section>

			<section class="search" aria-label="Add a game">
				<label class="search__field">
					<span class="search__icon" aria-hidden="true">+</span>
					<input
						type="text"
						placeholder="Search BoardGameGeek to add a game…"
						bind:value={query}
						aria-label="Search BoardGameGeek"
					/>
					{#if searching}
						<span class="search__hint">Searching…</span>
					{/if}
				</label>

				{#if searchError}
					<p class="search__error" role="alert">{searchError}</p>
				{:else if results.length > 0}
					<ul class="search__results">
						{#each results.slice(0, 8) as r (r.id)}
							<li>
								<button
									type="button"
									class="search__result"
									onclick={() => pickResult(r)}
									disabled={addingId !== null}
								>
									<span class="search__name">{r.name}</span>
									{#if r.yearPublished}
										<span class="search__year">{r.yearPublished}</span>
									{/if}
									<span class="search__add">
										{addingId === r.id ? 'Adding…' : 'Add'}
									</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}

				{#if addError}
					<p class="search__error" role="alert">{addError}</p>
				{/if}
			</section>

			<section class="games">
				<div class="games__head">
					<div class="games__title-row">
						<h2 class="games__title">Tonight's Games</h2>
						<span class="games__count">{catalogCount}</span>
					</div>
					<span class="games__sort">Sorted by added</span>
				</div>

				{#if catalogCount === 0}
					<div class="empty">
						<p class="empty__text">
							No games yet. Search above to add games from BoardGameGeek.
						</p>
					</div>
				{:else}
					<div class="grid">
						{#each games.catalog as g, i (g.id)}
							<article class="card">
								<div class="card__hero" style:background={heroColor(g.id, i)}>
									{#if g.thumbnail || g.image}
										<img
											src={g.thumbnail ?? g.image}
											alt=""
											class="card__img"
											loading="lazy"
										/>
									{/if}
									{#if g.categories && g.categories.length > 0}
										<span class="card__chip">{g.categories[0]}</span>
									{/if}
									<div class="card__shade" aria-hidden="true"></div>
								</div>
								<div class="card__body">
									<div class="card__title-row">
										<h3 class="card__title">{g.name}</h3>
									</div>
									<StatsRow items={statsFor(g)} />
								</div>
							</article>
						{/each}
					</div>
				{/if}
			</section>
		</div>

		<GradientFade position="bottom" height={120} />

		<div class="cta">
			<Button variant="primary" size="lg" disabled={!canStart} onclick={startSession}>
				Start Voting Session
				<span class="cta__arrow" aria-hidden="true">&rarr;</span>
			</Button>
		</div>
	</div>
</div>

<style>
	.page {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--surface-primary);
	}

	.brand {
		display: inline-flex;
		align-items: center;
		gap: 10px;
	}
	.brand__dot {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-pill);
		background: var(--accent-primary);
	}
	.brand__name {
		font-family: var(--font-heading);
		font-size: var(--text-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}

	.back {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 8px 14px;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		background: var(--surface-primary);
		color: var(--foreground-secondary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
	}
	.back:hover {
		background: var(--surface-secondary);
	}
	.back__arrow {
		font-size: var(--text-sm);
	}

	.avatar {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-pill);
		background: var(--decor-purple);
		border: 2px solid var(--surface-primary);
		box-shadow: 0 0 0 1px var(--border-subtle);
	}

	.scroll {
		position: relative;
		flex: 1;
		overflow: hidden;
	}

	.body {
		display: flex;
		flex-direction: column;
		gap: 28px;
		max-width: 1280px;
		margin: 0 auto;
		padding: 32px 80px 160px;
	}

	.intro {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.intro__title {
		font-family: var(--font-heading);
		font-size: var(--text-2xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
		margin: 0;
	}
	.intro__subtitle {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
		margin: 0;
	}

	.search {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.search__field {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 14px 18px;
		background: var(--surface-secondary);
		border: 2px solid var(--border-subtle);
		border-radius: var(--radius-xl);
	}
	.search__field:focus-within {
		border-color: var(--accent-primary);
	}
	.search__icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: var(--radius-pill);
		background: var(--accent-primary);
		color: var(--accent-on);
		font-weight: var(--font-weight-bold);
		font-size: var(--text-sm);
	}
	.search__field input {
		flex: 1;
		border: 0;
		background: transparent;
		font-family: var(--font-body);
		font-size: var(--text-base);
		color: var(--foreground-primary);
		outline: none;
	}
	.search__field input::placeholder {
		color: var(--foreground-tertiary);
	}
	.search__hint {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		color: var(--foreground-tertiary);
	}
	.search__error {
		margin: 0;
		font-family: var(--font-caption);
		font-size: var(--text-sm);
		color: var(--danger);
	}
	.search__results {
		list-style: none;
		margin: 0;
		padding: 6px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-lg);
	}
	.search__result {
		display: flex;
		align-items: center;
		gap: 10px;
		width: 100%;
		padding: 10px 12px;
		background: transparent;
		border: 0;
		border-radius: var(--radius-md);
		cursor: pointer;
		text-align: left;
		font-family: var(--font-body);
		color: var(--foreground-primary);
	}
	.search__result:hover:not(:disabled) {
		background: var(--surface-secondary);
	}
	.search__result:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
	.search__name {
		flex: 1;
		font-size: var(--text-base);
		font-weight: var(--font-weight-medium);
	}
	.search__year {
		font-family: var(--font-caption);
		font-size: var(--text-sm);
		color: var(--foreground-tertiary);
	}
	.search__add {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--accent-primary);
	}

	.games {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	.games__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.games__title-row {
		display: inline-flex;
		align-items: center;
		gap: 10px;
	}
	.games__title {
		font-family: var(--font-heading);
		font-size: var(--text-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
		margin: 0;
	}
	.games__count {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 3px 10px;
		background: var(--surface-tertiary);
		color: var(--foreground-secondary);
		font-family: var(--font-body);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		border-radius: var(--radius-pill);
	}
	.games__sort {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		color: var(--foreground-tertiary);
	}

	.empty {
		padding: 40px 24px;
		text-align: center;
		background: var(--surface-secondary);
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-lg);
	}
	.empty__text {
		margin: 0;
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 20px;
	}
	@media (max-width: 1100px) {
		.grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
	@media (max-width: 800px) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.body {
			padding: 24px 24px 160px;
		}
	}

	.card {
		display: flex;
		flex-direction: column;
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-lg);
		overflow: hidden;
		box-shadow:
			0 4px 6px rgba(0, 0, 0, 0.03),
			0 16px 40px rgba(0, 0, 0, 0.07);
	}
	.card__hero {
		position: relative;
		height: 160px;
		overflow: hidden;
	}
	.card__img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}
	.card__shade {
		position: absolute;
		inset: 0;
		background: linear-gradient(to bottom, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.33));
		pointer-events: none;
	}
	.card__chip {
		position: absolute;
		top: 12px;
		left: 12px;
		padding: 6px 10px;
		background: rgba(255, 255, 255, 0.15);
		color: var(--accent-on);
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-medium);
		border-radius: var(--radius-pill);
		backdrop-filter: blur(4px);
	}
	.card__body {
		display: flex;
		flex-direction: column;
		gap: 4px;
		padding: 14px;
	}
	.card__title-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}
	.card__title {
		margin: 0;
		font-family: var(--font-heading);
		font-size: var(--text-base);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.cta {
		position: absolute;
		right: 32px;
		bottom: 32px;
		z-index: 2;
	}
	.cta__arrow {
		font-size: var(--text-base);
	}
</style>
