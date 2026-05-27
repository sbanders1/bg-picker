<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		active = false,
		onclick,
		children
	}: {
		active?: boolean;
		onclick?: (e: MouseEvent) => void;
		children: Snippet;
	} = $props();
</script>

<button class="pill" class:pill--active={active} {onclick} type="button">
	{@render children()}
</button>

<style>
	.pill {
		border: none;
		background: var(--surface-secondary);
		color: var(--foreground-secondary);
		padding: 6px 14px;
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: var(--font-weight-medium);
		border-radius: var(--radius-pill);
		cursor: pointer;
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}
	.pill:hover {
		background: var(--surface-tertiary);
	}
	.pill--active {
		background: var(--accent-primary);
		color: var(--accent-on);
	}
	.pill--active:hover {
		background: var(--accent-primary);
		opacity: 0.92;
	}
</style>
