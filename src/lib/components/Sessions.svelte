<script lang="ts">
	import { goto } from '$app/navigation';
	import { profile } from '$lib/state/profile.svelte';
	import { group, joinGroup } from '$lib/state/group.svelte';
	import { games } from '$lib/state/games.svelte';
	import { getAllHistory } from '$lib/state/swipes.svelte';
	import { sessions, closeSession } from '$lib/state/sessions.svelte';
	import { profileById } from '$lib/profiles';
	import Button from './Button.svelte';
	import Card from './Card.svelte';

	// Sessions is host-only.
	$effect(() => {
		if (!profile.id) {
			goto('/');
		} else if (!profile.isAdmin) {
			goto('/swipe');
		}
	});

	const activeSession = $derived(group.current);
	const closed = $derived(sessions.closed);

	const totalSessions = $derived(closed.length + (activeSession ? 1 : 0));
	const matchesThisYear = $derived.by(() => {
		const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
		const fromClosed = closed.reduce(
			(n, s) => n + s.matches.filter((m) => m.at >= yearStart).length,
			0
		);
		const fromActive = group.matches.filter((m) => m.at >= yearStart).length;
		return fromClosed + fromActive;
	});

	const activeHost = $derived.by(() => {
		if (!activeSession) return undefined;
		const adminId = activeSession.memberIds.find((id) => profileById(id)?.isAdmin);
		return adminId ? profileById(adminId) : undefined;
	});

	const activeAllSwipes = $derived(getAllHistory());
	const activeMatchCount = $derived(group.matches.length);

	function fmtDate(ts: number): string {
		return new Date(ts).toLocaleDateString(undefined, {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
	function fmtShortDate(ts: number): string {
		return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
	}
	function fmtTime(ts: number): string {
		return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
	}

	function confirmCloseSession() {
		if (!activeSession) return;
		if (
			!confirm(
				`Close "${activeSession.name}"? It'll be archived to closed sessions and your live swipes will reset. The game catalog stays.`
			)
		) {
			return;
		}
		closeSession();
		// After closing, no active session exists. Stay on /sessions to see the archive.
	}

	function startNewSession() {
		// "Only one can be active at a time" — guard by offering to close first.
		if (activeSession) {
			if (
				!confirm(
					`Close "${activeSession.name}" and start a new session? Current swipes will reset; catalog stays.`
				)
			) {
				return;
			}
			closeSession();
		}
		joinGroup(profile.id);
		// Host lands on catalog if it's empty (so they can curate), otherwise straight to swiping.
		goto(games.catalog.length === 0 ? '/admin' : '/swipe');
	}

	function winnerName(winnerId?: number, gameIds?: number[]): string {
		if (winnerId == null) return '—';
		// Look up via games.byId; falls back to "Game #id" if the catalog has since changed.
		const g = games.byId[winnerId];
		if (g?.name) return g.name;
		return `Game #${winnerId}`;
	}

	let q = $state('');
	const filteredClosed = $derived.by(() => {
		const term = q.trim().toLowerCase();
		if (!term) return closed;
		return closed.filter(
			(s) =>
				s.name.toLowerCase().includes(term) ||
				winnerName(s.winnerGameId, s.gameIds).toLowerCase().includes(term)
		);
	});
</script>

<div class="page">
	<header class="head">
		<div>
			<h1 class="head__title">Sessions</h1>
			<p class="head__sub">All voting sessions. Only one can be active at a time.</p>
		</div>
		<div class="head__actions">
			<p class="head__hint">
				{activeSession
					? 'Closing the active session will archive it first.'
					: 'Start a new game night.'}
			</p>
			<Button variant="primary" onclick={startNewSession}>
				<span aria-hidden="true">+</span>
				New session
			</Button>
		</div>
	</header>

	<section class="metrics">
		<Card padding={20}>
			<div class="metric">
				<span class="metric__label">ACTIVE SESSIONS</span>
				<div class="metric__row">
					<strong class="metric__value">{activeSession ? 1 : 0}</strong>
					<svg class="metric__icon" viewBox="0 0 24 24" width="20" height="20" fill="none"
						stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
						aria-hidden="true">
						<polygon points="5 3 19 12 5 21 5 3" />
					</svg>
				</div>
			</div>
		</Card>
		<Card padding={20}>
			<div class="metric">
				<span class="metric__label">TOTAL SESSIONS</span>
				<div class="metric__row">
					<strong class="metric__value">{totalSessions}</strong>
					<svg class="metric__icon" viewBox="0 0 24 24" width="20" height="20" fill="none"
						stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
						aria-hidden="true">
						<rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
						<line x1="16" y1="2" x2="16" y2="6" />
						<line x1="8" y1="2" x2="8" y2="6" />
						<line x1="3" y1="10" x2="21" y2="10" />
					</svg>
				</div>
			</div>
		</Card>
		<Card padding={20}>
			<div class="metric">
				<span class="metric__label">MATCHES THIS YEAR</span>
				<div class="metric__row">
					<strong class="metric__value">{matchesThisYear}</strong>
					<svg class="metric__icon" viewBox="0 0 24 24" width="20" height="20" fill="currentColor"
						aria-hidden="true">
						<path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.65-9.5 9-9.5 9z" />
					</svg>
				</div>
			</div>
		</Card>
	</section>

	{#if activeSession}
		<section class="active">
			<header class="active__head">
				<div>
					<span class="active__chip">
						<span class="active__dot" aria-hidden="true"></span>
						LIVE — OPEN
					</span>
					<h2 class="active__title">
						{activeSession.name} — {fmtShortDate(activeSession.startedAt ?? Date.now())}
					</h2>
					<p class="active__meta">
						Opened {fmtTime(activeSession.startedAt ?? Date.now())}{activeHost
							? ` — Hosted by ${activeHost.name.split(/\s+/)[0]}`
							: ''}
					</p>
				</div>
				<div class="active__actions">
					<Button variant="primary" onclick={() => goto('/group')}>View live dashboard</Button>
					<Button variant="ghost" onclick={confirmCloseSession}>Close session</Button>
				</div>
			</header>

			<div class="active__divider" aria-hidden="true"></div>

			<div class="active__stats">
				<div class="active__stat">
					<span class="active__statLabel">PLAYERS</span>
					<div class="avatars">
						{#each activeSession.memberIds.slice(0, 6) as id (id)}
							{@const seed = profileById(id)}
							<span
								class="avatar"
								style:background={seed?.bg ?? 'var(--surface-tertiary)'}
								style:color={seed?.fg ?? 'var(--foreground-secondary)'}
							>
								{seed?.initial ?? '?'}
							</span>
						{/each}
						{#if activeSession.memberIds.length > 6}
							<span class="avatar avatar--more">+{activeSession.memberIds.length - 6}</span>
						{/if}
					</div>
				</div>
				<div class="active__stat">
					<span class="active__statLabel">GAMES</span>
					<span class="active__statValue">{games.catalog.length}</span>
				</div>
				<div class="active__stat">
					<span class="active__statLabel">MATCHES</span>
					<span class="active__statValue">
						<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
							<path d="M12 21s-7-4.35-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.65-9.5 9-9.5 9z" />
						</svg>
						{activeMatchCount}
					</span>
				</div>
				<div class="active__stat">
					<span class="active__statLabel">VOTES</span>
					<span class="active__statValue">{activeAllSwipes.length}</span>
				</div>
				<p class="active__note">
					Only one session can be open at a time. Close to archive and start fresh.
				</p>
			</div>
		</section>
	{:else}
		<section class="active active--empty">
			<div>
				<h2 class="active__title">No active session</h2>
				<p class="active__meta">Pick a profile and join to start a new game night.</p>
			</div>
			<Button variant="primary" onclick={() => goto('/')}>Go home</Button>
		</section>
	{/if}

	<section class="closed">
		<header class="closed__head">
			<h2 class="closed__title">Closed sessions</h2>
			<div class="closed__tools">
				<label class="closed__search">
					<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor"
						stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<circle cx="11" cy="11" r="7" />
						<line x1="21" y1="21" x2="16.65" y2="16.65" />
					</svg>
					<input
						type="text"
						placeholder="Search sessions"
						bind:value={q}
						aria-label="Search closed sessions"
					/>
				</label>
				<span class="closed__sort">Most recent</span>
			</div>
		</header>

		{#if filteredClosed.length === 0}
			<div class="closed__empty">
				{closed.length === 0
					? 'No closed sessions yet. They\'ll appear here after a host closes one.'
					: 'No matches for that search.'}
			</div>
		{:else}
			<div class="table">
				<div class="table__head">
					<span class="col col--name">NAME</span>
					<span class="col col--date">DATE</span>
					<span class="col col--players">PLAYERS</span>
					<span class="col col--num">GAMES</span>
					<span class="col col--num">MATCHES</span>
					<span class="col col--winner">WINNING GAME</span>
					<span class="col col--status">STATUS</span>
				</div>

				{#each filteredClosed as s (s.id)}
					<div class="row">
						<span class="col col--name">{s.name}</span>
						<span class="col col--date">{fmtDate(s.endedAt)}</span>
						<span class="col col--players">
							<div class="avatars">
								{#each s.memberIds.slice(0, 5) as id (id)}
									{@const seed = profileById(id)}
									<span
										class="avatar avatar--sm"
										style:background={seed?.bg ?? 'var(--surface-tertiary)'}
										style:color={seed?.fg ?? 'var(--foreground-secondary)'}
									>{seed?.initial ?? '?'}</span>
								{/each}
								{#if s.memberIds.length > 5}
									<span class="avatar avatar--sm avatar--more">+{s.memberIds.length - 5}</span>
								{/if}
							</div>
						</span>
						<span class="col col--num">{s.gameIds.length}</span>
						<span class="col col--num">{s.matches.length}</span>
						<span class="col col--winner">
							{#if s.winnerGameId != null}
								<a class="winner" href={`/game/${s.winnerGameId}`}>
									{winnerName(s.winnerGameId, s.gameIds)}
								</a>
							{:else}
								<span class="winner winner--none">No winner</span>
							{/if}
						</span>
						<span class="col col--status">
							<span class="status">CLOSED</span>
						</span>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>

<style>
	.page {
		max-width: 1280px;
		margin: 0 auto;
		padding: 24px 48px 32px;
		display: flex;
		flex-direction: column;
		gap: 20px;
		background: var(--surface-secondary);
		min-height: calc(100vh - var(--nav-height));
	}

	/* Heading */
	.head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 24px;
	}
	.head__title {
		margin: 0 0 4px;
		font-family: var(--font-heading);
		font-size: var(--text-3xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
		letter-spacing: -0.5px;
	}
	.head__sub {
		margin: 0;
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
	}
	.head__actions {
		display: inline-flex;
		align-items: center;
		gap: 14px;
	}
	.head__hint {
		margin: 0;
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		color: var(--foreground-tertiary);
		max-width: 220px;
		text-align: right;
	}

	/* Metric cards row */
	.metrics {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}
	.metric {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.metric__label {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.6px;
		color: var(--foreground-tertiary);
	}
	.metric__row {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.metric__value {
		font-family: var(--font-heading);
		font-size: var(--text-3xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.metric__icon {
		color: var(--foreground-tertiary);
	}

	/* Active session callout */
	.active {
		padding: 24px;
		border-radius: var(--radius-xl);
		background: linear-gradient(135deg, var(--decor-sky), var(--surface-primary));
		border: 1px solid #cfe4f4;
		box-shadow:
			0 4px 6px rgba(0, 0, 0, 0.04),
			0 16px 40px rgba(0, 0, 0, 0.06);
	}
	.active__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 24px;
	}
	.active__chip {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px;
		border-radius: var(--radius-pill);
		background: rgba(74, 159, 216, 0.18);
		color: var(--accent-primary);
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.6px;
	}
	.active__dot {
		width: 6px;
		height: 6px;
		border-radius: var(--radius-pill);
		background: var(--accent-primary);
	}
	.active__title {
		margin: 6px 0 4px;
		font-family: var(--font-heading);
		font-size: var(--text-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.active__meta {
		margin: 0;
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
	}
	.active__actions {
		display: inline-flex;
		gap: 8px;
		align-items: center;
	}
	.active__divider {
		height: 1px;
		background: #d6e7f2;
		margin: 16px 0;
	}
	.active__stats {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 48px;
	}
	.active--empty {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.active__stat {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}
	.active__statLabel {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.5px;
		color: var(--foreground-tertiary);
	}
	.active__statValue {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-heading);
		font-size: var(--text-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.active__note {
		flex: 1;
		text-align: right;
		margin: 0;
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		color: var(--foreground-tertiary);
	}

	/* Avatar groups (overlap) */
	.avatars {
		display: inline-flex;
	}
	.avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		margin-left: -8px;
		border-radius: var(--radius-pill);
		border: 2px solid var(--surface-primary);
		font-family: var(--font-heading);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
	}
	.avatar:first-child {
		margin-left: 0;
	}
	.avatar--sm {
		width: 26px;
		height: 26px;
		font-size: var(--text-xs);
	}
	.avatar--more {
		background: var(--surface-tertiary);
		color: var(--foreground-secondary);
	}

	/* Closed sessions */
	.closed {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.closed__head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.closed__title {
		margin: 0;
		font-family: var(--font-heading);
		font-size: var(--text-lg);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.closed__tools {
		display: inline-flex;
		align-items: center;
		gap: 12px;
	}
	.closed__search {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 12px;
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-pill);
		color: var(--foreground-tertiary);
	}
	.closed__search input {
		border: 0;
		background: transparent;
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--foreground-primary);
		outline: none;
		width: 160px;
	}
	.closed__search input::placeholder {
		color: var(--foreground-tertiary);
	}
	.closed__sort {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		color: var(--foreground-tertiary);
	}
	.closed__empty {
		padding: 32px;
		text-align: center;
		background: var(--surface-primary);
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-lg);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
	}

	.table {
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-lg);
		box-shadow:
			0 4px 6px rgba(0, 0, 0, 0.03),
			0 16px 40px rgba(0, 0, 0, 0.06);
		overflow: hidden;
	}
	.table__head,
	.row {
		display: grid;
		grid-template-columns: 1.6fr 1fr 1.2fr 0.7fr 0.7fr 1.2fr 0.8fr;
		align-items: center;
		gap: 16px;
		padding: 14px 20px;
	}
	.table__head {
		background: var(--surface-secondary);
		border-bottom: 1px solid var(--border-subtle);
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.5px;
		color: var(--foreground-tertiary);
	}
	.row {
		border-bottom: 1px solid var(--border-subtle);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--foreground-primary);
	}
	.row:last-child {
		border-bottom: 0;
	}
	.col--name {
		font-weight: var(--font-weight-medium);
	}
	.col--num {
		font-variant-numeric: tabular-nums;
	}
	.winner {
		font-weight: var(--font-weight-medium);
		color: var(--foreground-primary);
		text-decoration: none;
	}
	.winner:hover {
		color: var(--accent-primary);
	}
	.winner--none {
		color: var(--foreground-tertiary);
	}
	.status {
		display: inline-flex;
		padding: 3px 10px;
		border-radius: var(--radius-pill);
		background: var(--surface-secondary);
		color: var(--foreground-secondary);
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.5px;
	}
</style>
