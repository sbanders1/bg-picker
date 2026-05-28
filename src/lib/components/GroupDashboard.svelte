<script lang="ts">
	import { goto } from '$app/navigation';
	import { group } from '$lib/state/group.svelte';
	import { games } from '$lib/state/games.svelte';
	import { getAllHistory, getHistory, getCurrentIndex, resetAll } from '$lib/state/swipes.svelte';
	import { clearGroup, joinGroup, removeMember } from '$lib/state/group.svelte';
	import { closeSession } from '$lib/state/sessions.svelte';
	import { applySessionFilters } from '$lib/filters';
	import { profileById, SEED_PROFILES } from '$lib/profiles';
	import { profile } from '$lib/state/profile.svelte';
	import Button from './Button.svelte';
	import Card from './Card.svelte';
	import NavPill from './NavPill.svelte';
	import StatsRow from './StatsRow.svelte';
	import type { Game, SwipeRecord } from '$lib/types';

	type Filter = 'all' | 'matched';
	let filter = $state<Filter>('all');

	// Dashboard access rules:
	//   - No profile → bounce to picker.
	//   - No active session (post-close) → bounce home; there's no dashboard to show.
	//   - Host → always allowed (once a session exists).
	//   - Non-host → allowed only after they've swiped through every game in the
	//     catalog (so they can't peek at how others voted while still voting).
	$effect(() => {
		if (!profile.id) {
			goto('/');
			return;
		}
		if (!group.current) {
			goto('/');
			return;
		}
		if (profile.isAdmin) return;
		// Non-host: gate on the SESSION catalog so they unlock the dashboard once
		// they've voted on every game that's actually in play (excluded / filtered
		// games shouldn't be required to swipe through).
		const total = applySessionFilters(games.catalog, group.current?.filters).length;
		const idx = getCurrentIndex(profile.id);
		if (total === 0 || idx < total) {
			goto('/swipe');
		}
	});

	const allSwipes = $derived(getAllHistory());
	const swiperIds = $derived(new Set(allSwipes.map((s) => s.profileId)));

	// "Session catalog" = the games actually in play after the host's filters
	// (complexity range, time range, fit, exclusions). Progress + the games table
	// both run off this; the unfiltered catalog is no longer the source of truth.
	const sessionCatalog = $derived(applySessionFilters(games.catalog, group.current?.filters));

	// Session members are now authoritative: `createSession` and `joinGroup` both
	// set memberIds explicitly, and closing/starting a session resets swipes — so
	// we no longer need to union in stale swiperIds from prior sessions.
	const memberIds = $derived(group.current?.memberIds ?? []);
	const memberCount = $derived(memberIds.length);
	const doneCount = $derived(memberIds.filter((id) => swiperIds.has(id)).length);

	// Session progress: percentage of (members × SESSION games) swipes covered.
	// Uses the filtered catalog so 100% means "every member voted on every game
	// that's actually in the session" — not "every game in the entire library".
	const totalPossibleSwipes = $derived(memberCount * sessionCatalog.length);
	const sessionPct = $derived(
		totalPossibleSwipes === 0
			? 0
			: Math.min(100, Math.round((allSwipes.length / totalPossibleSwipes) * 100))
	);

	// Per-game tally.
	type GameRow = {
		game: Game;
		likes: number;
		passes: number;
		voters: string[];
		matched: boolean;
		stillVoting: boolean;
	};

	const rows = $derived.by<GameRow[]>(() => {
		const byGame = new Map<number, SwipeRecord[]>();
		for (const s of allSwipes) {
			if (!byGame.has(s.gameId)) byGame.set(s.gameId, []);
			byGame.get(s.gameId)!.push(s);
		}
		// Iterate the filtered session catalog (not the full library) so excluded
		// games + games trimmed by complexity/play-time/fit don't show as rows.
		return sessionCatalog.map((g) => {
			const recs = byGame.get(g.id) ?? [];
			const likes = recs.filter((r) => r.direction === 'like').length;
			const passes = recs.filter((r) => r.direction === 'pass').length;
			const voters = recs.map((r) => r.profileId);
			const matched = memberCount > 0 && likes >= memberCount;
			const stillVoting = recs.length < Math.max(1, memberCount);
			return { game: g, likes, passes, voters, matched, stillVoting };
		});
	});

	const sortedRows = $derived([...rows].sort((a, b) => b.likes - a.likes));

	const filteredRows = $derived.by(() => {
		if (filter === 'matched') return sortedRows.filter((r) => r.matched);
		return sortedRows;
	});

	const matchedCount = $derived(rows.filter((r) => r.matched).length);
	const topMatch = $derived(rows.find((r) => r.matched)?.game);

	// Resolve a profileId to its display name + avatar via the canonical roster.
	// Unknown ids (e.g. ad-hoc adds) get a generic "Player N" fallback.
	function memberDisplay(id: string, index: number) {
		const seed = profileById(id);
		if (seed) return { name: seed.name, initial: seed.initial, bg: seed.bg, fg: seed.fg };
		return {
			name: `Player ${index + 1}`,
			initial: String(index + 1),
			bg: 'var(--surface-tertiary)',
			fg: 'var(--foreground-secondary)'
		};
	}

	// Deterministic decor-palette color from any string id — used for the game tag chips.
	const decorTokens = [
		'var(--decor-peach)',
		'var(--decor-sky)',
		'var(--decor-mint)',
		'var(--decor-cream)',
		'var(--decor-lavender)',
		'var(--decor-cyan)',
		'var(--decor-pink)',
		'var(--decor-purple)'
	];
	function tagBg(id: string) {
		let h = 0;
		for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
		return decorTokens[h % decorTokens.length];
	}

	function tagFromGame(g: Game): string {
		const c = g.categories?.[0];
		if (c) return c.slice(0, 2).toUpperCase();
		return g.name.slice(0, 2).toUpperCase();
	}

	function memberDoneCount(memberId: string) {
		return getHistory(memberId).length;
	}

	function resetSession() {
		if (!confirm('Reset the session? This clears all swipes and matches. The game catalog stays.')) {
			return;
		}
		resetAll();
		clearGroup();
		goto('/');
	}

	function endSession() {
		if (!group.current) return;
		const matches = group.matches.length;
		const msg = matches
			? `Close "${group.current.name}"? It'll be archived with ${matches} match${matches === 1 ? '' : 'es'}; live swipes reset, catalog stays.`
			: `Close "${group.current.name}"? It'll be archived (no matches recorded yet); live swipes reset, catalog stays.`;
		if (!confirm(msg)) return;
		closeSession();
		goto('/sessions');
	}

	// --- Add Player picker ---
	let addPlayerOpen = $state(false);
	// Seed roster members who aren't yet part of this session.
	const availableSeeds = $derived(
		SEED_PROFILES.filter((p) => !memberIds.includes(p.id))
	);
	function addSeed(id: string) {
		joinGroup(id);
		addPlayerOpen = false;
	}

	function confirmRemoveMember(id: string, name: string) {
		if (!confirm(`Remove ${name} from this session?`)) return;
		removeMember(id);
	}
</script>

{#if !group.current}
	<div class="empty">
		<div class="empty__card">
			<h2>No group yet</h2>
			<p>Pick a profile to start a session.</p>
			<Button variant="primary" size="lg" onclick={() => goto('/')}>
				Go home
			</Button>
		</div>
	</div>
{:else}
	<div class="page">
		<!-- Title section -->
		<section class="title-row">
			<div class="title-row__lead">
				<span class="status-chip">
					<span class="status-chip__dot"></span>
					VOTING IN PROGRESS
				</span>
				<h1 class="title">Group Dashboard</h1>
				<p class="subtitle">
					Live results from tonight's swipe session — who's still voting and which games are
					trending.
				</p>
			</div>

			<div class="metrics">
				<Card padding={16}>
					<div class="metric">
						<span class="metric__label">Players</span>
						<div class="metric__value">
							<strong>{doneCount}</strong>
							<span class="metric__suffix">/ {memberCount}</span>
						</div>
					</div>
				</Card>
				<Card padding={16}>
					<div class="metric">
						<span class="metric__label">Games</span>
						<div class="metric__value">
							<strong>{sessionCatalog.length}</strong>
							<span class="metric__suffix">
								{sessionCatalog.length === games.catalog.length
									? 'in pool'
									: `of ${games.catalog.length} (filtered)`}
							</span>
						</div>
					</div>
				</Card>
				<Card padding={16}>
					<div class="metric">
						<span class="metric__label">Matches</span>
						<div class="metric__value">
							<strong>{matchedCount}</strong>
							<span class="metric__suffix">so far</span>
						</div>
					</div>
				</Card>
			</div>
		</section>

		<!-- Progress bar -->
		<section class="progress">
			<div class="progress__top">
				<span class="progress__label">Session progress</span>
				<span class="progress__pct">{sessionPct}% of votes cast</span>
			</div>
			<div class="progress__track">
				<div class="progress__bar" style:width="{sessionPct}%"></div>
			</div>
		</section>

		<!-- 2-column grid -->
		<section class="columns">
			<!-- Players panel -->
			<aside class="panel panel--players">
				<header class="panel__head">
					<h2 class="panel__title">Players</h2>
					<span class="panel__meta">{doneCount} / {memberCount} done</span>
				</header>

				<ul class="players">
					{#each memberIds as id, i (id)}
						{@const isMe = id === profile.id}
						{@const d = memberDisplay(id, i)}
						{@const done = memberDoneCount(id)}
						{@const hasVoted = done > 0}
						<li class="player" class:player--me={isMe}>
							<span class="avatar" style:background={d.bg} style:color={d.fg}>{d.initial}</span>
							<div class="player__info">
								<span class="player__name">{d.name}{isMe ? ' (you)' : ''}</span>
								<span class="player__sub">
									{hasVoted ? `${done} swipes` : 'Hasn’t started'}
								</span>
							</div>
							<span class="tag" class:tag--idle={!hasVoted}>
								{hasVoted ? 'Voting' : 'Idle'}
							</span>
							{#if profile.isAdmin && !isMe}
								<button
									type="button"
									class="player__remove"
									aria-label="Remove {d.name} from this session"
									title="Remove {d.name}"
									onclick={() => confirmRemoveMember(id, d.name)}
								>
									<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
										stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
										<path d="M18 6L6 18" />
										<path d="M6 6l12 12" />
									</svg>
								</button>
							{/if}
						</li>
					{/each}
				</ul>

				{#if profile.isAdmin}
					<button
						type="button"
						class="add-player"
						onclick={() => (addPlayerOpen = true)}
						title="Add another player to this session"
					>
						<span aria-hidden="true">+</span>
						Add Player
					</button>
				{/if}
			</aside>

			<!-- Games & Votes panel -->
			<section class="panel panel--games">
				<header class="panel__head">
					<div>
						<h2 class="panel__title">Games &amp; Votes</h2>
						<span class="panel__meta">Sorted by most yes votes</span>
					</div>
					<div class="filters">
						<NavPill active={filter === 'all'} onclick={() => (filter = 'all')}>All</NavPill>
						<NavPill active={filter === 'matched'} onclick={() => (filter = 'matched')}>
							Matched
						</NavPill>
					</div>
				</header>

				<div class="table">
					<div class="table__head">
						<span class="col col--game">GAME</span>
						<span class="col col--votes">VOTES</span>
						<span class="col col--status">STATUS</span>
						<span class="col col--players">PLAYERS</span>
					</div>

					{#if filteredRows.length === 0}
						<div class="empty-row">No games to show. Add some from the admin screen.</div>
					{/if}

					{#each filteredRows as row (row.game.id)}
						{@const yesPct =
							memberCount > 0 ? Math.round((row.likes / memberCount) * 100) : 0}
						{@const noPct =
							memberCount > 0 ? Math.round((row.passes / memberCount) * 100) : 0}
						<div class="row" class:row--matched={row.matched}>
							<div class="col col--game">
								<span class="game-tag" style:background={tagBg(String(row.game.id))}>
									{tagFromGame(row.game)}
								</span>
								<div class="game-meta">
									<span class="game-meta__name">{row.game.name}</span>
									<StatsRow
										items={[
											row.game.minPlayers && row.game.maxPlayers
												? `${row.game.minPlayers}-${row.game.maxPlayers} players`
												: 'Players varies',
											row.game.playingTime
												? `${row.game.playingTime} min`
												: 'Time varies',
											row.game.categories?.[0] ?? 'Strategy'
										]}
									/>
								</div>
							</div>

							<div class="col col--votes">
								<div class="bar">
									<span class="bar__label">{row.likes} yes</span>
									<div class="bar__track">
										<div class="bar__fill bar__fill--yes" style:width="{yesPct}%"></div>
									</div>
								</div>
								<div class="bar">
									<span class="bar__label">{row.passes} no</span>
									<div class="bar__track">
										<div class="bar__fill bar__fill--no" style:width="{noPct}%"></div>
									</div>
								</div>
							</div>

							<div class="col col--status">
								{#if row.matched}
									<span class="status status--match">Match</span>
								{:else if row.stillVoting}
									<span class="status status--voting">Voting</span>
								{:else}
									<span class="status status--no">No match</span>
								{/if}
							</div>

							<div class="col col--players">
								{#each row.voters.slice(0, 5) as voterId, vi (vi)}
									{@const v = memberDisplay(voterId, vi)}
									<span class="stack-avatar" style:background={v.bg} style:color={v.fg}>
										{v.initial}
									</span>
								{/each}
								{#if row.voters.length > 5}
									<span class="stack-avatar stack-avatar--more">
										+{row.voters.length - 5}
									</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>
		</section>

		<!-- Footer -->
		<footer class="footer">
			<div class="footer__info">
				<span aria-hidden="true" class="footer__icon">i</span>
				A game becomes a match when every player swipes right.
			</div>
			<div class="footer__actions">
				{#if profile.isAdmin}
					<Button variant="ghost" onclick={resetSession}>Reset session</Button>
					<Button variant="ghost" onclick={endSession}>Close session</Button>
					<Button variant="secondary" onclick={() => goto('/admin')}>Add games</Button>
					<Button
						variant="primary"
						onclick={() => goto('/swipe')}
						disabled={sessionCatalog.length === 0}
					>
						{topMatch ? `Start with ${topMatch.name}` : 'Start swiping'}
					</Button>
				{/if}
			</div>
		</footer>
	</div>
{/if}

{#if addPlayerOpen}
	<div
		class="addp-backdrop"
		role="presentation"
		onclick={() => (addPlayerOpen = false)}
		onkeydown={(e) => { if (e.key === 'Escape') addPlayerOpen = false; }}
	>
		<div
			class="addp-modal"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-labelledby="addp-title"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); addPlayerOpen = false; } }}
		>
			<header class="addp-modal__head">
				<h3 id="addp-title" class="addp-modal__title">Add a player</h3>
				<button
					type="button"
					class="addp-modal__close"
					aria-label="Close"
					onclick={() => (addPlayerOpen = false)}
				>
					<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
						stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M18 6L6 18" />
						<path d="M6 6l12 12" />
					</svg>
				</button>
			</header>
			<p class="addp-modal__sub">
				Pick from your roster. They'll show up as a player on the dashboard and will need to vote
				before a game can match.
			</p>
			{#if availableSeeds.length === 0}
				<div class="addp-modal__empty">Everyone in the roster is already in this session.</div>
			{:else}
				<ul class="addp-modal__list">
					{#each availableSeeds as p (p.id)}
						<li>
							<button type="button" class="addp-row" onclick={() => addSeed(p.id)}>
								<span class="addp-row__avatar" style:background={p.bg} style:color={p.fg}>
									{p.initial}
								</span>
								<span class="addp-row__name">{p.name}</span>
								{#if p.isAdmin}
									<span class="addp-row__role">HOST</span>
								{/if}
								<span class="addp-row__add" aria-hidden="true">+ Add</span>
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
{/if}

<style>
	.page {
		display: flex;
		flex-direction: column;
		gap: 28px;
		padding: 32px 120px 40px;
		max-width: 1440px;
		margin: 0 auto;
		background: var(--surface-primary);
	}

	/* Empty state */
	.empty {
		display: flex;
		justify-content: center;
		padding: 80px 24px;
	}
	.empty__card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 12px;
		padding: 40px;
		background: var(--surface-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-lg);
		max-width: 480px;
		text-align: center;
	}
	.empty__card h2 {
		font-family: var(--font-heading);
		font-size: var(--text-xl);
		color: var(--foreground-primary);
	}
	.empty__card p {
		margin: 0 0 8px;
		color: var(--foreground-secondary);
		font-size: var(--text-sm);
	}

	/* Title row */
	.title-row {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 24px;
	}
	.title-row__lead {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.status-chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		background: var(--decor-mint);
		color: #2f7a57;
		padding: 4px 10px;
		border-radius: var(--radius-pill);
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.5px;
		width: fit-content;
	}
	.status-chip__dot {
		width: 8px;
		height: 8px;
		border-radius: var(--radius-pill);
		background: var(--success);
	}
	.title {
		font-family: var(--font-heading);
		font-size: var(--text-3xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.subtitle {
		margin: 0;
		color: var(--foreground-secondary);
		font-size: 15px;
		max-width: 560px;
	}

	.metrics {
		display: flex;
		gap: 16px;
	}
	.metric {
		display: flex;
		flex-direction: column;
		gap: 6px;
		min-width: 104px;
	}
	.metric__label {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-medium);
		color: var(--foreground-tertiary);
		letter-spacing: 0.4px;
	}
	.metric__value {
		display: flex;
		align-items: baseline;
		gap: 6px;
	}
	.metric__value strong {
		font-family: var(--font-heading);
		font-size: var(--text-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.metric__suffix {
		font-size: var(--text-sm);
		color: var(--foreground-tertiary);
	}
	/* Override Card surface to white to match panel cards in design */
	.metrics :global(.card) {
		background: var(--surface-primary);
		box-shadow:
			0 4px 6px rgba(0, 0, 0, 0.03),
			0 16px 40px rgba(0, 0, 0, 0.07);
	}

	/* Progress */
	.progress {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.progress__top {
		display: flex;
		justify-content: space-between;
		font-size: var(--text-sm);
	}
	.progress__label {
		color: var(--foreground-primary);
		font-weight: var(--font-weight-medium);
	}
	.progress__pct {
		color: var(--foreground-secondary);
		font-family: var(--font-caption);
		font-size: 12px;
	}
	.progress__track {
		height: 8px;
		background: var(--surface-tertiary);
		border-radius: var(--radius-pill);
		overflow: hidden;
	}
	.progress__bar {
		height: 100%;
		background: var(--accent-primary);
		border-radius: var(--radius-pill);
		transition: width 0.3s ease;
	}

	/* Columns */
	.columns {
		display: grid;
		grid-template-columns: 340px 1fr;
		gap: 24px;
		align-items: start;
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 16px;
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-lg);
		padding: 20px;
		box-shadow:
			0 4px 6px rgba(0, 0, 0, 0.03),
			0 16px 40px rgba(0, 0, 0, 0.07);
	}

	.panel__head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 12px;
	}
	.panel__title {
		font-family: var(--font-heading);
		font-size: 18px;
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.panel__meta {
		font-family: var(--font-caption);
		font-size: 12px;
		color: var(--foreground-secondary);
	}

	/* Players list */
	.players {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.player {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 10px 12px;
		border-radius: var(--radius-md);
		background: var(--surface-primary);
	}
	.player--me {
		background: #fff8eb;
	}
	.avatar {
		width: 36px;
		height: 36px;
		border-radius: var(--radius-pill);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-caption);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
		flex: 0 0 auto;
	}
	.player__info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		flex: 1;
		min-width: 0;
	}
	.player__name {
		font-size: var(--text-sm);
		font-weight: var(--font-weight-medium);
		color: var(--foreground-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.player__sub {
		font-family: var(--font-caption);
		font-size: 11px;
		color: var(--foreground-tertiary);
	}
	.tag {
		font-family: var(--font-caption);
		font-size: 11px;
		font-weight: var(--font-weight-semibold);
		padding: 4px 8px;
		border-radius: var(--radius-pill);
		background: var(--decor-mint);
		color: #2f7a57;
	}
	.tag--idle {
		background: var(--surface-tertiary);
		color: var(--foreground-tertiary);
	}
	.player__remove {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 22px;
		height: 22px;
		border: 0;
		border-radius: var(--radius-pill);
		background: transparent;
		color: var(--foreground-tertiary);
		cursor: pointer;
		flex: 0 0 auto;
		opacity: 0;
		transition:
			opacity 0.15s ease,
			background 0.15s ease,
			color 0.15s ease;
	}
	.player:hover .player__remove,
	.player:focus-within .player__remove {
		opacity: 0.55;
	}
	.player__remove:hover,
	.player__remove:focus-visible {
		opacity: 1;
		background: var(--surface-tertiary);
		color: var(--danger);
	}
	.add-player {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 8px;
		padding: 10px 12px;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--foreground-secondary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		text-decoration: none;
	}
	.add-player:hover:not(:disabled) {
		background: var(--surface-secondary);
	}
	.add-player:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	/* Add Player modal */
	.addp-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(26, 26, 26, 0.45);
		backdrop-filter: blur(3px);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24px;
		z-index: 90;
	}
	.addp-modal {
		width: 100%;
		max-width: 440px;
		background: var(--surface-primary);
		border-radius: var(--radius-xl);
		border: 1px solid var(--border-subtle);
		box-shadow:
			0 10px 20px rgba(0, 0, 0, 0.08),
			0 24px 60px rgba(0, 0, 0, 0.18);
		padding: 20px 20px 16px;
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.addp-modal__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.addp-modal__title {
		margin: 0;
		font-family: var(--font-heading);
		font-size: var(--text-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.addp-modal__close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: 0;
		border-radius: var(--radius-pill);
		background: var(--surface-secondary);
		color: var(--foreground-secondary);
		cursor: pointer;
	}
	.addp-modal__close:hover {
		background: var(--surface-tertiary);
		color: var(--foreground-primary);
	}
	.addp-modal__sub {
		margin: 0 0 6px;
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
	}
	.addp-modal__empty {
		padding: 24px;
		text-align: center;
		background: var(--surface-secondary);
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-lg);
		color: var(--foreground-secondary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
	}
	.addp-modal__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.addp-row {
		display: inline-flex;
		align-items: center;
		gap: 12px;
		width: 100%;
		padding: 10px 12px;
		border: 0;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--foreground-primary);
		font: inherit;
		cursor: pointer;
		text-align: left;
	}
	.addp-row:hover {
		background: var(--surface-secondary);
	}
	.addp-row__avatar {
		width: 36px;
		height: 36px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-pill);
		font-family: var(--font-heading);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
	}
	.addp-row__name {
		flex: 1;
		font-family: var(--font-body);
		font-size: var(--text-base);
		font-weight: var(--font-weight-medium);
	}
	.addp-row__role {
		padding: 2px 8px;
		border-radius: var(--radius-pill);
		background: var(--accent-primary);
		color: var(--accent-on);
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.4px;
	}
	.addp-row__add {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--accent-primary);
	}

	/* Filters */
	.filters {
		display: flex;
		gap: 6px;
	}

	/* Table */
	.table {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.table__head {
		display: grid;
		grid-template-columns: minmax(0, 2.2fr) 200px 120px minmax(0, 1fr);
		gap: 16px;
		padding: 8px 12px;
		border-bottom: 1px solid var(--border-subtle);
		font-family: var(--font-caption);
		font-size: 10px;
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-tertiary);
		letter-spacing: 0.6px;
	}
	.row {
		display: grid;
		grid-template-columns: minmax(0, 2.2fr) 200px 120px minmax(0, 1fr);
		gap: 16px;
		align-items: center;
		padding: 10px 12px;
		border-radius: var(--radius-md);
		background: var(--surface-primary);
	}
	.row--matched {
		background: #f2faf6;
		border: 1px solid #c7e8d6;
	}

	.col {
		min-width: 0;
	}
	.col--game {
		display: flex;
		align-items: center;
		gap: 14px;
	}
	.game-tag {
		width: 44px;
		height: 44px;
		border-radius: var(--radius-md);
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-caption);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-bold);
		color: var(--foreground-primary);
		flex: 0 0 auto;
	}
	.game-meta {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}
	.game-meta__name {
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.col--votes {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.bar {
		display: grid;
		grid-template-columns: 56px 1fr;
		align-items: center;
		gap: 8px;
	}
	.bar__label {
		font-family: var(--font-caption);
		font-size: 11px;
		color: var(--foreground-secondary);
	}
	.bar__track {
		height: 6px;
		background: var(--surface-tertiary);
		border-radius: var(--radius-pill);
		overflow: hidden;
	}
	.bar__fill {
		height: 100%;
		border-radius: var(--radius-pill);
	}
	.bar__fill--yes {
		background: var(--success);
	}
	.bar__fill--no {
		background: var(--danger);
	}

	.status {
		display: inline-flex;
		align-items: center;
		padding: 4px 10px;
		border-radius: var(--radius-pill);
		font-family: var(--font-caption);
		font-size: 11px;
		font-weight: var(--font-weight-semibold);
	}
	.status--match {
		background: var(--decor-mint);
		color: #2f7a57;
	}
	.status--voting {
		background: var(--decor-cream);
		color: #8a6b1f;
	}
	.status--no {
		background: var(--surface-tertiary);
		color: var(--foreground-tertiary);
	}

	.col--players {
		display: flex;
		align-items: center;
	}
	.stack-avatar {
		width: 28px;
		height: 28px;
		border-radius: var(--radius-pill);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-caption);
		font-size: 10px;
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
		margin-left: -6px;
		border: 2px solid var(--surface-primary);
	}
	.stack-avatar:first-child {
		margin-left: 0;
	}
	.stack-avatar--more {
		background: var(--surface-tertiary);
		color: var(--foreground-secondary);
	}

	.empty-row {
		padding: 24px 12px;
		text-align: center;
		color: var(--foreground-tertiary);
		font-size: var(--text-sm);
	}

	/* Footer */
	.footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 16px 4px 0;
		gap: 16px;
	}
	.footer__info {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-caption);
		font-size: 12px;
		color: var(--foreground-secondary);
	}
	.footer__icon {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 14px;
		height: 14px;
		border-radius: var(--radius-pill);
		border: 1px solid var(--foreground-tertiary);
		font-family: var(--font-caption);
		font-size: 9px;
		font-weight: var(--font-weight-bold);
		color: var(--foreground-tertiary);
	}
	.footer__actions {
		display: flex;
		gap: 12px;
	}

	@media (max-width: 960px) {
		.page {
			padding: 24px 24px 32px;
		}
		.title-row {
			flex-direction: column;
			align-items: stretch;
		}
		.columns {
			grid-template-columns: 1fr;
		}
		.row,
		.table__head {
			grid-template-columns: minmax(0, 1.6fr) 1fr;
		}
		.col--status,
		.col--players {
			display: none;
		}
	}
</style>
