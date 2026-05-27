<script lang="ts">
	import { goto } from '$app/navigation';
	import { setProfile } from '$lib/state/profile.svelte';
	import { group, joinGroup } from '$lib/state/group.svelte';
	import { SEED_PROFILES, type SeedProfile } from '$lib/profiles';
	import Header from './Header.svelte';
	import StatsRow from './StatsRow.svelte';

	const row1 = $derived(SEED_PROFILES.slice(0, 4));
	const row2 = $derived(SEED_PROFILES.slice(4, 7));

	const queueCount = 24;
	const matchCount = $derived(group.matches?.length ?? 7);

	function pick(p: SeedProfile) {
		setProfile({
			id: p.id,
			name: p.name,
			avatar: p.initial,
			isAdmin: p.isAdmin ?? false
		});
		joinGroup(p.id);
		// Land on the root; the smart `/` renders PlayerHome once a profile is set.
		goto('/');
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
							{#if p.isAdmin}
								<span class="avatar__crown" aria-hidden="true" title="Host">
									<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
										<path d="M5 18h14v2H5v-2zm0-10l3.5 4L12 5l3.5 7L19 8v8H5V8z" />
									</svg>
								</span>
							{/if}
						</span>
						<span class="tile__name-row">
							<span class="tile__name">{p.name}</span>
							{#if p.isAdmin}
								<span class="tile__role">HOST</span>
							{/if}
						</span>
					</button>
				{/each}
			</div>
			<div class="grid__row">
				{#each row2 as p (p.id)}
					<button class="tile" type="button" onclick={() => pick(p)}>
						<span class="avatar" style:background={p.bg}>
							<span class="avatar__initial" style:color={p.fg}>{p.initial}</span>
							{#if p.isAdmin}
								<span class="avatar__crown" aria-hidden="true" title="Host">
									<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
										<path d="M5 18h14v2H5v-2zm0-10l3.5 4L12 5l3.5 7L19 8v8H5V8z" />
									</svg>
								</span>
							{/if}
						</span>
						<span class="tile__name-row">
							<span class="tile__name">{p.name}</span>
							{#if p.isAdmin}
								<span class="tile__role">HOST</span>
							{/if}
						</span>
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
		min-height: calc(100vh - var(--nav-height));
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
		position: relative;
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
	.avatar__crown {
		position: absolute;
		bottom: -2px;
		right: -2px;
		width: 30px;
		height: 30px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: var(--accent-primary);
		color: var(--accent-on);
		border: 3px solid var(--surface-primary);
		border-radius: var(--radius-pill);
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
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

	.tile__name-row {
		display: inline-flex;
		align-items: center;
		gap: 8px;
	}
	.tile__name {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-medium);
		color: var(--foreground-primary);
	}
	.tile__role {
		padding: 2px 8px;
		border-radius: var(--radius-pill);
		background: var(--accent-primary);
		color: var(--accent-on);
		font-family: var(--font-caption);
		font-size: var(--text-xs);
		font-weight: var(--font-weight-semibold);
		letter-spacing: 0.6px;
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
