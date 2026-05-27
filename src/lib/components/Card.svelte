<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		padding = 16,
		children
	}: {
		padding?: number;
		children: Snippet;
	} = $props();
</script>

<div class="card" style:padding="{padding}px">
	{@render children()}
</div>

<style>
	.card {
		background: var(--surface-secondary);
		border-radius: var(--radius-lg);
		border: 1px solid var(--border-subtle);
	}
</style>
