<script lang="ts">
	import { goto } from '$app/navigation';
	import { profile } from '$lib/state/profile.svelte';
	import { group, createSession } from '$lib/state/group.svelte';
	import { games } from '$lib/state/games.svelte';
	import { resetAll as resetSwipes } from '$lib/state/swipes.svelte';
	import { closeSession } from '$lib/state/sessions.svelte';
	import { SEED_PROFILES } from '$lib/profiles';
	import { customProfiles } from '$lib/state/customProfiles.svelte';
	import {
		COMPLEXITY_BANDS,
		complexityLabel,
		complexityBandIndex,
		passesSessionFilters
	} from '$lib/filters';
	import type { ComplexityBand, SessionFilters } from '$lib/types';
	import Button from './Button.svelte';

	let { open = $bindable(false) }: { open: boolean } = $props();

	function defaultName() {
		const d = new Date();
		const weekday = d.toLocaleDateString(undefined, { weekday: 'long' });
		const md = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
		return `${weekday} Game Night – ${md}`;
	}

	// Form state — reset every time the modal opens so stale values don't leak.
	let name = $state(defaultName());
	let selectedIds = $state<string[]>([]);
	let complexityMin = $state<ComplexityBand>('light');
	let complexityMax = $state<ComplexityBand>('medium');
	let playTimeMin = $state(25);
	let playTimeMax = $state(75);
	let fitToggle = $state(false);
	let excludedGameIds = $state<number[]>([]);

	$effect(() => {
		if (open) {
			name = defaultName();
			// Default roster: the host plus everyone currently in the active group.
			const seeded = new Set<string>();
			if (profile.id) seeded.add(profile.id);
			for (const id of group.current?.memberIds ?? []) seeded.add(id);
			selectedIds = [...seeded];
			// Inherit current filters if present, otherwise sensible defaults.
			const f = group.current?.filters;
			complexityMin = f?.complexityMin ?? 'light';
			complexityMax = f?.complexityMax ?? 'medium';
			playTimeMin = f?.playTimeMin ?? 25;
			playTimeMax = f?.playTimeMax ?? 75;
			fitToggle = f?.fitPlayers != null;
			excludedGameIds = [...(f?.excludedGameIds ?? [])];
		}
	});

	const playerCount = $derived(selectedIds.length);
	const fitPlayers = $derived(playerCount || 1);

	const allProfiles = $derived([...SEED_PROFILES, ...customProfiles.items]);

	const availableSeeds = $derived(
		allProfiles.filter((p) => !selectedIds.includes(p.id))
	);

	// Live filter preview — shows how many catalog games would survive.
	const previewFilters = $derived<SessionFilters>({
		complexityMin,
		complexityMax,
		playTimeMin,
		playTimeMax,
		fitPlayers: fitToggle ? fitPlayers : undefined,
		excludedGameIds: excludedGameIds.length ? excludedGameIds : undefined
	});
	const previewMatches = $derived(
		games.catalog.filter((g) => passesSessionFilters(g, previewFilters)).length
	);

	function toggleMember(id: string) {
		if (selectedIds.includes(id)) selectedIds = selectedIds.filter((x) => x !== id);
		else selectedIds = [...selectedIds, id];
	}

	function selectBand(b: ComplexityBand) {
		const idx = complexityBandIndex(b);
		const minIdx = complexityBandIndex(complexityMin);
		const maxIdx = complexityBandIndex(complexityMax);
		// Outside-left → set new min. Outside-right → set new max. Inside → collapse to that one band.
		if (idx < minIdx) complexityMin = b;
		else if (idx > maxIdx) complexityMax = b;
		else if (idx === minIdx && idx !== maxIdx) complexityMin = b;
		else if (idx === maxIdx && idx !== minIdx) complexityMax = b;
		else {
			complexityMin = b;
			complexityMax = b;
		}
	}

	function bandSelected(b: ComplexityBand): boolean {
		const idx = complexityBandIndex(b);
		return idx >= complexityBandIndex(complexityMin) && idx <= complexityBandIndex(complexityMax);
	}
	function bandIsEndpoint(b: ComplexityBand): boolean {
		return b === complexityMin || b === complexityMax;
	}

	function toggleExcluded(id: number) {
		if (excludedGameIds.includes(id)) excludedGameIds = excludedGameIds.filter((x) => x !== id);
		else excludedGameIds = [...excludedGameIds, id];
	}

	function onPlayTimeMinInput(e: Event) {
		const v = +(e.target as HTMLInputElement).value;
		playTimeMin = Math.min(v, playTimeMax);
	}
	function onPlayTimeMaxInput(e: Event) {
		const v = +(e.target as HTMLInputElement).value;
		playTimeMax = Math.max(v, playTimeMin);
	}

	function cancel() {
		open = false;
	}

	function createAndOpen() {
		// Close the existing session first so it gets archived to /sessions history.
		if (group.current) {
			closeSession();
		} else {
			// No active group to archive, but make sure swipes are clean.
			resetSwipes();
		}
		createSession({
			name: name.trim() || defaultName(),
			memberIds: selectedIds.length ? selectedIds : profile.id ? [profile.id] : [],
			filters: {
				complexityMin,
				complexityMax,
				playTimeMin,
				playTimeMax,
				fitPlayers: fitToggle ? fitPlayers : undefined,
				excludedGameIds: excludedGameIds.length ? excludedGameIds : undefined
			}
		});
		open = false;
		goto(games.catalog.length === 0 ? '/admin' : '/swipe');
	}
</script>

{#if open}
	<div
		class="ns-backdrop"
		role="presentation"
		onclick={cancel}
		onkeydown={(e) => { if (e.key === 'Escape') cancel(); }}
	>
		<div
			class="ns-modal"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-labelledby="ns-title"
			onclick={(e) => e.stopPropagation()}
			onkeydown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); cancel(); } }}
		>
			<!-- HEADER -->
			<header class="ns-head">
				<div class="ns-head__text">
					<h2 id="ns-title" class="ns-head__title">New Session</h2>
					<p class="ns-head__sub">Start a fresh round of voting for tonight's group.</p>
				</div>
				<button class="ns-head__close" type="button" aria-label="Close" onclick={cancel}>
					<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor"
						stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
						<path d="M18 6L6 18" />
						<path d="M6 6l12 12" />
					</svg>
				</button>
			</header>

			<!-- BODY -->
			<div class="ns-body">
				{#if group.current}
					<div class="ns-warn" role="status">
						<svg class="ns-warn__icon" viewBox="0 0 24 24" width="18" height="18" fill="none"
							stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
							aria-hidden="true">
							<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
							<line x1="12" y1="9" x2="12" y2="13" />
							<line x1="12" y1="17" x2="12.01" y2="17" />
						</svg>
						<span>
							This will close the current session — <strong>"{group.current.name}"</strong> will be archived. Creating a new session will start it automatically.
						</span>
					</div>
				{/if}

				<!-- Session name -->
				<div class="ns-field">
					<label class="ns-field__label" for="ns-name">SESSION NAME</label>
					<input
						id="ns-name"
						class="ns-input"
						type="text"
						bind:value={name}
						placeholder={defaultName()}
					/>
				</div>

				<!-- Players -->
				<div class="ns-field">
					<div class="ns-field__head">
						<span class="ns-field__label">PLAYERS</span>
						<span class="ns-field__count">{playerCount} PLAYER{playerCount === 1 ? '' : 'S'}</span>
					</div>
					<div class="ns-chips">
						{#each allProfiles as p (p.id)}
							{@const active = selectedIds.includes(p.id)}
							<button
								type="button"
								class="ns-chip"
								class:ns-chip--active={active}
								onclick={() => toggleMember(p.id)}
							>
								<span class="ns-chip__avatar" style:background={p.bg} style:color={p.fg}>
									{p.initial}
								</span>
								<span class="ns-chip__name">{p.name.split(/\s+/)[0]}</span>
								{#if active}
									<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
										stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
										<path d="M18 6L6 18" />
										<path d="M6 6l12 12" />
									</svg>
								{/if}
							</button>
						{/each}
						{#if availableSeeds.length > 0}
							<details class="ns-add-player">
								<summary>+ Add player</summary>
								<div class="ns-add-player__list">
									{#each availableSeeds as p (p.id)}
										<button
											type="button"
											class="ns-add-player__row"
											onclick={() => toggleMember(p.id)}
										>
											<span class="ns-chip__avatar" style:background={p.bg} style:color={p.fg}>
												{p.initial}
											</span>
											{p.name}
											{#if p.isAdmin}<span class="ns-add-player__role">HOST</span>{/if}
										</button>
									{/each}
								</div>
							</details>
						{/if}
					</div>
				</div>

				<!-- Filters -->
				<div class="ns-filters">
					<div class="ns-filters__head">
						<div>
							<span class="ns-field__label">Filter the catalog</span>
							<p class="ns-filters__sub">Choose games to include in tonight's voting.</p>
						</div>
						<span class="ns-filters__preview" title="Games that pass current filters">
							{previewMatches} game{previewMatches === 1 ? '' : 's'} match
						</span>
					</div>

					<!-- Complexity band range -->
					<section class="ns-filterRow">
						<header class="ns-filterRow__head">
							<span class="ns-filterRow__label">Complexity</span>
							<span class="ns-filterRow__value">
								{complexityLabel(complexityMin)}
								{complexityMin !== complexityMax ? `to ${complexityLabel(complexityMax)}` : ''}
							</span>
						</header>
						<div class="ns-bands" role="group" aria-label="Complexity range">
							{#each COMPLEXITY_BANDS as b (b)}
								<button
									type="button"
									class="ns-band"
									class:ns-band--in={bandSelected(b)}
									class:ns-band--end={bandSelected(b) && bandIsEndpoint(b)}
									onclick={() => selectBand(b)}
								>
									{complexityLabel(b)}
								</button>
							{/each}
						</div>
					</section>

					<!-- Play time range -->
					<section class="ns-filterRow">
						<header class="ns-filterRow__head">
							<span class="ns-filterRow__label">Estimated play time</span>
							<span class="ns-filterRow__value">{playTimeMin} – {playTimeMax} min</span>
						</header>
						<div class="ns-range">
							<input
								type="range"
								min="0"
								max="180"
								step="5"
								value={playTimeMin}
								oninput={onPlayTimeMinInput}
								aria-label="Minimum play time"
							/>
							<input
								type="range"
								min="0"
								max="180"
								step="5"
								value={playTimeMax}
								oninput={onPlayTimeMaxInput}
								aria-label="Maximum play time"
							/>
						</div>
					</section>

					<!-- Fit players toggle -->
					<section class="ns-filterRow ns-filterRow--row">
						<div class="ns-filterRow__textBlock">
							<span class="ns-filterRow__label">Only games that fit {fitPlayers} player{fitPlayers === 1 ? '' : 's'}</span>
							<span class="ns-filterRow__hint">
								Hides games whose min/max player range doesn't include the session size.
							</span>
						</div>
						<button
							type="button"
							class="ns-toggle"
							class:ns-toggle--on={fitToggle}
							role="switch"
							aria-checked={fitToggle}
							aria-label="Only show games that fit the current player count"
							onclick={() => (fitToggle = !fitToggle)}
						>
							<span class="ns-toggle__thumb"></span>
						</button>
					</section>

					<!-- Excluded games -->
					<section class="ns-filterRow">
						<header class="ns-filterRow__head">
							<span class="ns-filterRow__label">Exclude specific games</span>
							<span class="ns-filterRow__value">
								{excludedGameIds.length} excluded
							</span>
						</header>
						{#if games.catalog.length === 0}
							<p class="ns-empty">No games in the catalog yet.</p>
						{:else}
							<div class="ns-exclude">
								{#each games.catalog as g (g.id)}
									{@const ex = excludedGameIds.includes(g.id)}
									<button
										type="button"
										class="ns-ex"
										class:ns-ex--on={ex}
										onclick={() => toggleExcluded(g.id)}
										title={ex ? 'Click to include' : 'Click to exclude'}
									>
										{#if ex}
											<svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor"
												stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
												<path d="M18 6L6 18" />
												<path d="M6 6l12 12" />
											</svg>
										{/if}
										{g.name}
									</button>
								{/each}
							</div>
						{/if}
					</section>
				</div>
			</div>

			<!-- FOOTER -->
			<footer class="ns-foot">
				<span class="ns-foot__hint">
					You can edit filters anytime during the session.
				</span>
				<div class="ns-foot__actions">
					<Button variant="ghost" onclick={cancel}>Cancel</Button>
					<Button variant="primary" onclick={createAndOpen} disabled={selectedIds.length === 0}>
						Create &amp; open session
					</Button>
				</div>
			</footer>
		</div>
	</div>
{/if}

<style>
	.ns-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(26, 26, 26, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 40px;
		z-index: 120;
		animation: fade 0.18s ease-out;
	}
	@keyframes fade {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	.ns-modal {
		width: 100%;
		max-width: 720px;
		max-height: calc(100vh - 80px);
		overflow: hidden;
		background: var(--surface-primary);
		border-radius: var(--radius-xl);
		display: flex;
		flex-direction: column;
		box-shadow:
			0 8px 24px rgba(0, 0, 0, 0.15),
			0 24px 60px rgba(0, 0, 0, 0.2);
	}

	/* Header */
	.ns-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
		padding: 24px 28px 20px;
		border-bottom: 1px solid var(--border-subtle);
	}
	.ns-head__title {
		margin: 0 0 4px;
		font-family: var(--font-heading);
		font-size: var(--text-xl);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.ns-head__sub {
		margin: 0;
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
	}
	.ns-head__close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: var(--radius-pill);
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		color: var(--foreground-secondary);
		cursor: pointer;
		flex: 0 0 auto;
	}
	.ns-head__close:hover {
		background: var(--surface-secondary);
		color: var(--foreground-primary);
	}

	/* Body */
	.ns-body {
		display: flex;
		flex-direction: column;
		gap: 24px;
		padding: 24px 28px 28px;
		overflow-y: auto;
	}

	/* Warn callout */
	.ns-warn {
		display: flex;
		gap: 12px;
		align-items: flex-start;
		padding: 12px 16px;
		background: #fffbef;
		border: 1px solid #f0e3b5;
		border-radius: var(--radius-md);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: #6e5520;
		line-height: 1.4;
	}
	.ns-warn__icon {
		flex: 0 0 auto;
		color: #c28f2a;
	}

	/* Field */
	.ns-field {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.ns-field__head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}
	.ns-field__label {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-tertiary);
		letter-spacing: 0.5px;
	}
	.ns-field__count {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-tertiary);
		letter-spacing: 0.5px;
	}
	.ns-input {
		width: 100%;
		padding: 12px 14px;
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		font-family: var(--font-body);
		font-size: var(--text-base);
		color: var(--foreground-primary);
		outline: none;
	}
	.ns-input:focus {
		border-color: var(--accent-primary);
		box-shadow: 0 0 0 3px rgba(74, 159, 216, 0.15);
	}

	/* Player chips */
	.ns-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		align-items: center;
	}
	.ns-chip {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 6px 12px 6px 6px;
		background: var(--surface-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-pill);
		color: var(--foreground-primary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: background 0.12s ease, border-color 0.12s ease;
	}
	.ns-chip:hover {
		background: var(--surface-tertiary);
	}
	.ns-chip--active {
		background: var(--surface-primary);
		border-color: var(--accent-primary);
		color: var(--foreground-primary);
		box-shadow: 0 0 0 1px var(--accent-primary);
	}
	.ns-chip__avatar {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: var(--radius-pill);
		font-family: var(--font-heading);
		font-size: 11px;
		font-weight: var(--font-weight-semibold);
	}

	/* Add player dropdown */
	.ns-add-player {
		position: relative;
	}
	.ns-add-player summary {
		list-style: none;
		cursor: pointer;
		padding: 6px 12px;
		background: var(--surface-primary);
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-pill);
		color: var(--foreground-secondary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-medium);
	}
	.ns-add-player summary::-webkit-details-marker {
		display: none;
	}
	.ns-add-player summary:hover {
		background: var(--surface-secondary);
		color: var(--foreground-primary);
	}
	.ns-add-player__list {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		min-width: 200px;
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 6px;
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-lg);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
		z-index: 2;
	}
	.ns-add-player__row {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 8px 10px;
		border: 0;
		border-radius: var(--radius-md);
		background: transparent;
		color: var(--foreground-primary);
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
	}
	.ns-add-player__row:hover {
		background: var(--surface-secondary);
	}
	.ns-add-player__role {
		margin-left: auto;
		padding: 1px 6px;
		border-radius: var(--radius-pill);
		background: var(--accent-primary);
		color: var(--accent-on);
		font-family: var(--font-caption);
		font-size: 10px;
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.4px;
	}

	/* Filters block */
	.ns-filters {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}
	.ns-filters__head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 16px;
	}
	.ns-filters__sub {
		margin: 4px 0 0;
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--foreground-secondary);
	}
	.ns-filters__preview {
		padding: 4px 10px;
		border-radius: var(--radius-pill);
		background: var(--surface-secondary);
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-secondary);
	}

	.ns-filterRow {
		padding: 14px 16px;
		background: var(--surface-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		display: flex;
		flex-direction: column;
		gap: 10px;
	}
	.ns-filterRow--row {
		flex-direction: row;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
	}
	.ns-filterRow__head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
	}
	.ns-filterRow__label {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-semibold);
		color: var(--foreground-primary);
	}
	.ns-filterRow__value {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		color: var(--foreground-tertiary);
	}
	.ns-filterRow__textBlock {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.ns-filterRow__hint {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		color: var(--foreground-tertiary);
	}

	/* Complexity band selector */
	.ns-bands {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 6px;
	}
	.ns-band {
		padding: 8px 10px;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		background: var(--surface-primary);
		color: var(--foreground-secondary);
		font-family: var(--font-body);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
	}
	.ns-band:hover {
		background: var(--surface-tertiary);
	}
	.ns-band--in {
		background: rgba(74, 159, 216, 0.12);
		color: var(--accent-primary);
		border-color: rgba(74, 159, 216, 0.4);
	}
	.ns-band--end {
		background: var(--accent-primary);
		color: var(--accent-on);
		border-color: var(--accent-primary);
	}

	/* Play time range (two stacked sliders) */
	.ns-range {
		display: grid;
		grid-template-columns: 1fr;
		gap: 4px;
	}
	.ns-range input[type='range'] {
		width: 100%;
		accent-color: var(--accent-primary);
	}

	/* Toggle */
	.ns-toggle {
		position: relative;
		width: 44px;
		height: 24px;
		border: 0;
		border-radius: var(--radius-pill);
		background: var(--surface-tertiary);
		cursor: pointer;
		transition: background 0.15s ease;
		padding: 0;
	}
	.ns-toggle--on {
		background: var(--accent-primary);
	}
	.ns-toggle__thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 20px;
		height: 20px;
		border-radius: var(--radius-pill);
		background: var(--surface-primary);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
		transition: transform 0.15s ease;
	}
	.ns-toggle--on .ns-toggle__thumb {
		transform: translateX(20px);
	}

	/* Excluded games chip list */
	.ns-exclude {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		max-height: 120px;
		overflow-y: auto;
	}
	.ns-ex {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		padding: 5px 10px;
		border-radius: var(--radius-pill);
		background: var(--surface-primary);
		border: 1px solid var(--border-subtle);
		color: var(--foreground-secondary);
		font-family: var(--font-body);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-medium);
		cursor: pointer;
		transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
	}
	.ns-ex:hover {
		background: var(--surface-tertiary);
	}
	.ns-ex--on {
		background: rgba(226, 106, 106, 0.12);
		color: var(--danger);
		border-color: rgba(226, 106, 106, 0.4);
	}
	.ns-empty {
		margin: 0;
		font-family: var(--font-body);
		font-size: var(--text-sm);
		color: var(--foreground-tertiary);
	}

	/* Footer */
	.ns-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 16px 28px 20px;
		background: var(--surface-secondary);
		border-top: 1px solid var(--border-subtle);
	}
	.ns-foot__hint {
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		color: var(--foreground-tertiary);
	}
	.ns-foot__actions {
		display: inline-flex;
		gap: 10px;
		align-items: center;
	}
</style>
