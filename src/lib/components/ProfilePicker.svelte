<script lang="ts">
	import { goto } from '$app/navigation';
	import { setProfile } from '$lib/state/profile.svelte';
	import { group } from '$lib/state/group.svelte';
	import Header from './Header.svelte';
	import StatsRow from './StatsRow.svelte';

	type SeedProfile = {
		id: string;
		name: string;
		initial: string;
		bg: string;
		fg: string;
	};

	// Seed roster — matches the design frame (UbcSG). Each tile pairs a decor
	// pastel background with a deeper sibling shade for the initial.
	const profiles: SeedProfile[] = [
		{ id: 'alex', name: 'Alex', initial: 'A', bg: 'var(--decor-peach)', fg: '#B85C4A' },
		{ id: 'jordan', name: 'Jordan', initial: 'J', bg: 'var(--decor-sky)', fg: '#3F6FA8' },
		{ id: 'sam', name: 'Sam', initial: 'S', bg: 'var(--decor-mint)', fg: '#3A8A5C' },
		{ id: 'casey', name: 'Casey', initial: 'C', bg: 'var(--decor-cream)', fg: '#A67E2F' },
		{ id: 'riley', name: 'Riley', initial: 'R', bg: 'var(--decor-lavender)', fg: '#7B4FA8' },
		{ id: 'morgan', name: 'Morgan', initial: 'M', bg: 'var(--decor-cyan)', fg: '#3F8BA0' },
		{ id: 'taylor', name: 'Taylor', initial: 'T', bg: 'var(--decor-pink)', fg: '#A8508F' }
	];

	const row1 = $derived(profiles.slice(0, 4));
	const row2 = $derived(profiles.slice(4, 7));

	const queueCount = 24;
	const matchCount = $derived(group.matches?.length ?? 7);

	function pick(p: SeedProfile) {
		setProfile({ id: p.id, name: p.name, avatar: p.initial });
		goto('/admin');
	}

	function addNewPlayer() {
		// Stub — design shows an "Add new player" tile; no flow defined yet.
	}
</script>

<div class="screen">
	<Header>
		{#snippet leading()}
			<div class="brand">
				<div class="brand__mark" aria-hidden="true"></div>
				<span class="brand__name">GameMatch</span>
			</div>
		{/snippet}
		{#snippet trailing()}
			<div class="host-pill" aria-label="Host mode">
				<svg
					class="host-pill__icon"
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
					<circle cx="12" cy="12" r="3" />
					<path
						d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
					/>
				</svg>
				<span>Host</span>
			</div>
		{/snippet}
	</Header>

	<main class="main">
		<div class="hero">
			<h1 class="hero__title">Who's playing?</h1>
			<p class="hero__sub">Select your profile to start swiping</p>
		</div>

		<div class="grid">
			<div class="grid__row">
				{#each row1 as p (p.id)}
					<button class="tile" type="button" onclick={() => pick(p)}>
						<span class="avatar" style:background={p.bg}>
							<span class="avatar__initial" style:color={p.fg}>{p.initial}</span>
						</span>
						<span class="tile__name">{p.name}</span>
					</button>
				{/each}
			</div>
			<div class="grid__row">
				{#each row2 as p (p.id)}
					<button class="tile" type="button" onclick={() => pick(p)}>
						<span class="avatar" style:background={p.bg}>
							<span class="avatar__initial" style:color={p.fg}>{p.initial}</span>
						</span>
						<span class="tile__name">{p.name}</span>
					</button>
				{/each}
				<button class="tile" type="button" onclick={addNewPlayer}>
					<span class="avatar avatar--add" aria-hidden="true">
						<svg
							viewBox="0 0 24 24"
							width="36"
							height="36"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<line x1="12" y1="5" x2="12" y2="19" />
							<line x1="5" y1="12" x2="19" y2="12" />
						</svg>
					</span>
					<span class="tile__name tile__name--muted">Add new player</span>
				</button>
			</div>
		</div>
	</main>

	<footer class="footer">
		<StatsRow items={[`${queueCount} games in queue`, `${matchCount} matches so far`]} />
	</footer>
</div>

<style>
	.screen {
		display: flex;
		flex-direction: column;
		min-height: 100vh;
		background: var(--surface-primary);
	}

	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
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
		letter-spacing: -0.3px;
		color: var(--foreground-primary);
	}

	.host-pill {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 8px 14px;
		border-radius: var(--radius-pill);
		border: 1px solid var(--border-subtle);
		color: var(--foreground-secondary);
		font-family: var(--font-caption);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-medium);
	}
	.host-pill__icon {
		color: var(--foreground-secondary);
	}

	.main {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 56px;
		padding: 32px 64px;
	}

	.hero {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
	}
	.hero__title {
		font-family: var(--font-heading);
		font-size: var(--text-4xl);
		font-weight: var(--font-weight-semibold);
		letter-spacing: -1.2px;
		color: var(--foreground-primary);
		text-align: center;
	}
	.hero__sub {
		margin: 0;
		font-family: var(--font-body);
		font-size: var(--text-base);
		color: var(--foreground-secondary);
		text-align: center;
	}

	.grid {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 36px;
	}
	.grid__row {
		display: flex;
		align-items: flex-start;
		gap: 32px;
	}

	.tile {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 14px;
		padding: 0;
		background: transparent;
		border: none;
		cursor: pointer;
		font: inherit;
		transition: transform 0.15s ease;
	}
	.tile:hover .avatar {
		transform: translateY(-2px);
	}
	.tile:active .avatar {
		transform: translateY(0);
	}

	.avatar {
		width: 120px;
		height: 120px;
		border-radius: var(--radius-pill);
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-shadow:
			0 4px 6px rgba(0, 0, 0, 0.03),
			0 16px 40px rgba(0, 0, 0, 0.07);
		transition: transform 0.15s ease;
	}
	.avatar__initial {
		font-family: var(--font-heading);
		font-size: 44px;
		font-weight: var(--font-weight-semibold);
		letter-spacing: -0.5px;
		line-height: 1;
	}
	.avatar--add {
		background: var(--surface-primary);
		border: 2px solid var(--border-subtle);
		box-shadow: none;
		color: var(--foreground-tertiary);
	}

	.tile__name {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-medium);
		color: var(--foreground-primary);
	}
	.tile__name--muted {
		color: var(--foreground-secondary);
	}

	.footer {
		display: flex;
		justify-content: center;
		padding: 24px 64px 32px;
	}
</style>
